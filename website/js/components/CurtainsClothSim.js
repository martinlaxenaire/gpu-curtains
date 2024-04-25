import { BindGroup, ComputePass, Plane, PlaneGeometry, Vec2, Vec3 } from '../../../dist/esm/index.mjs'
import { computeClothSim } from '../shaders/compute-cloth.wgsl.js'
import { clothFs, clothVs } from '../shaders/curtains-cloth.wgsl.js'

// Ported and adapted from https://github.com/Yuu6883/WebGPUDemo
export class CurtainsClothSim {
  constructor({ gpuCurtains }) {
    this.gpuCurtains = gpuCurtains

    this._ready = false
    this.showTween = null

    this.init()
  }

  get ready() {
    return this._ready
  }

  set ready(value) {
    if (value && !this.ready && this.plane) {
      this.showTween = gsap
        .timeline()
        .set(this.computeForcesPass.uniforms.interaction.wind.value, {
          z: -3,
        })
        .to(this.plane.uniforms.global.opacity, {
          value: 1,
          duration: 1,
        })
        .set(
          this.computeForcesPass.uniforms.interaction.wind.value,
          {
            z: 0,
          },
          2
        )

      this._ready = value
    }
  }

  init() {
    this.isActive = true

    this.simulationSpeed = 2

    this.clothDefinition = new Vec2(40)

    this.clothGeometry = new PlaneGeometry({
      widthSegments: this.clothDefinition.x,
      heightSegments: this.clothDefinition.y,
    })

    this.positionArray = this.clothGeometry.getAttributeByName('position').array.slice()

    this.vertexPositionArray = new Float32Array((this.positionArray.length * 4) / 3)

    this.normalPositionArray = new Float32Array(this.vertexPositionArray.length)
    this.vertexVelocityArray = new Float32Array(this.vertexPositionArray.length)
    this.vertexForceArray = new Float32Array(this.vertexPositionArray.length)

    // padded!
    for (let i = 0, j = 0; i < this.vertexPositionArray.length; i += 4, j += 3) {
      this.vertexPositionArray[i] = this.positionArray[j]
      this.vertexPositionArray[i + 1] = this.positionArray[j + 1]
      this.vertexPositionArray[i + 2] = this.positionArray[j + 2]

      const xPosIndex = Math.round((this.positionArray[j] + 1) * 0.5 * this.clothDefinition.x)
      const isFixed = this.positionArray[j + 1] === 1 && xPosIndex % 4 === 0

      this.vertexPositionArray[i + 3] = isFixed ? -1 : 0 // fixed point

      // explicitly set normals
      this.normalPositionArray[i] = 0
      this.normalPositionArray[i + 1] = 0
      this.normalPositionArray[i + 2] = 1
    }

    this.computeBindGroup = new BindGroup(this.gpuCurtains.renderer, {
      label: 'Cloth simulation compute bind group',
      uniforms: {
        dimension: {
          struct: {
            size: {
              type: 'vec2f',
              value: this.clothDefinition,
            },
          },
        },
        params: {
          struct: {
            deltaTime: {
              type: 'f32',
              value: 0.002 * this.simulationSpeed,
            },
            mass: {
              type: 'f32',
              value: 1,
            },
            dampingConstant: {
              type: 'f32',
              value: 50,
            },
            floor: {
              type: 'f32',
              value: -1.25,
            },
            gravity: {
              type: 'vec3f',
              value: new Vec3(0, -0.0981, 0),
            },
          },
        },
        interaction: {
          struct: {
            pointerPosition: {
              type: 'vec2f',
              value: new Vec2(Infinity),
            },
            pointerVelocity: {
              type: 'vec2f',
              value: new Vec2(0), // pointer velocity divided by plane size
            },
            pointerSize: {
              type: 'f32',
              value: 0.85, // 1 is full plane
            },
            pointerStrength: {
              type: 'f32',
              value: 250,
            },
            wind: {
              type: 'vec3f',
              value: new Vec3(0, 0, 0),
            },
          },
        },
      },
      storages: {
        clothVertex: {
          access: 'read_write', // we want a readable AND writable buffer!
          usage: ['vertex'], // we're going to use this buffer as a vertex buffer along default usages
          struct: {
            position: {
              type: 'array<vec4f>',
              value: this.vertexPositionArray,
            },
            normal: {
              type: 'array<vec4f>',
              value: this.normalPositionArray,
            },
            force: {
              type: 'array<vec4f>',
              value: this.vertexForceArray,
            },
            velocity: {
              type: 'array<vec4f>',
              value: this.vertexVelocityArray,
            },
          },
        },
      },
    })

    // first our compute pass
    this.computeForcesPass = new ComputePass(this.gpuCurtains, {
      label: 'Compute forces',
      shaders: {
        compute: {
          code: computeClothSim,
          entryPoint: 'calc_forces',
        },
      },
      autoRender: false, // we will manually take care of rendering
      bindGroups: [this.computeBindGroup],
      dispatchSize: [Math.ceil((this.clothDefinition.x + 1) / 14), Math.ceil((this.clothDefinition.y + 1) / 14)],
    })

    this.computeUpdatePass = new ComputePass(this.gpuCurtains, {
      label: 'Compute update',
      shaders: {
        compute: {
          code: computeClothSim,
          entryPoint: 'update',
        },
      },
      autoRender: false, // we will manually take care of rendering
      bindGroups: [this.computeBindGroup],
      dispatchSize: [Math.ceil(((this.clothDefinition.x + 1) * (this.clothDefinition.y + 1)) / 256)],
    })

    this.computeNormalPass = new ComputePass(this.gpuCurtains, {
      label: 'Compute normal',
      shaders: {
        compute: {
          code: computeClothSim,
          entryPoint: 'calc_normal',
        },
      },
      autoRender: false, // we will manually take care of rendering
      bindGroups: [this.computeBindGroup],
      dispatchSize: [Math.ceil((this.clothDefinition.x + 1) / 14), Math.ceil((this.clothDefinition.y + 1) / 14)],
    })

    // now use renderer onBeforeRender callback to render our compute passes
    // nb sims compute per render impacts the speed at which the simulation runs
    const nbSimsComputePerRender = Math.min(50, Math.ceil(75 / this.simulationSpeed))

    // add a task to our renderer onBeforeRenderScene tasks queue manager
    this.computeTaskId = this.gpuCurtains.renderer.onBeforeRenderScene.add((commandEncoder) => {
      if (!this.isActive) return

      // set bind groups if needed
      if (!this.computeForcesPass.ready) this.computeForcesPass.onBeforeRenderPass()
      if (!this.computeUpdatePass.ready) this.computeUpdatePass.onBeforeRenderPass()
      if (!this.computeNormalPass.ready) this.computeNormalPass.onBeforeRenderPass()

      // now if the compute passes are not ready, do not render them
      if (!this.computeForcesPass.ready || !this.computeUpdatePass.ready || !this.computeNormalPass.ready) return

      this.ready = true

      for (let i = 0; i < nbSimsComputePerRender; i++) {
        const forcePass = commandEncoder.beginComputePass()
        this.computeForcesPass.render(forcePass)
        forcePass.end()

        const updatePass = commandEncoder.beginComputePass()
        this.computeUpdatePass.render(updatePass)
        updatePass.end()
      }

      const normalPass = commandEncoder.beginComputePass()
      this.computeNormalPass.render(normalPass)
      normalPass.end()
    })

    this.clothGeometry.addVertexBuffer({
      name: 'clothAttributes',
      // add the compute bind group vertex buffer right away
      buffer: this.computeBindGroup.getBindingByName('clothVertex')?.buffer,
      attributes: [
        {
          name: 'clothPosition',
          type: 'vec4f',
          bufferFormat: 'float32x4',
          size: 4,
          array: this.vertexPositionArray,
        },
        {
          name: 'clothNormal',
          type: 'vec4f',
          bufferFormat: 'float32x4',
          size: 4,
          array: this.normalPositionArray,
        },
        {
          name: 'clothForce',
          type: 'vec4f',
          bufferFormat: 'float32x4',
          size: 4,
          array: this.vertexForceArray,
        },
        {
          name: 'clothVelocity',
          type: 'vec4f',
          bufferFormat: 'float32x4',
          size: 4,
          array: this.vertexVelocityArray,
        },
      ],
    })

    const params = {
      geometry: this.clothGeometry,
      domFrustumMargins: {
        bottom: 300,
      },
      shaders: {
        vertex: {
          code: clothVs,
          entryPoint: 'main',
        },
        fragment: {
          code: clothFs,
          entryPoint: 'main',
        },
      },
      cullMode: 'none',
      uniforms: {
        global: {
          struct: {
            opacity: {
              type: 'f32',
              value: 0,
            },
          },
        },
      },
    }

    this.plane = new Plane(this.gpuCurtains, '#cloth', params)

    const canvasTexture = this.plane.createTexture({
      label: 'Canvas texture',
      name: 'canvasTexture',
    })

    // create our text texture as soon as our plane has been created
    // first we need a canvas
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    const writeCanvasText = () => {
      const htmlPlane = this.plane.domElement.element

      const htmlPlaneWidth = this.plane.boundingRect.width
      const htmlPlaneHeight = this.plane.boundingRect.height

      const canvasResolution = window.devicePixelRatio * 2

      // set sizes
      canvas.width = htmlPlaneWidth * canvasResolution
      canvas.height = htmlPlaneHeight * canvasResolution

      context.width = htmlPlaneWidth
      context.height = htmlPlaneHeight

      context.scale(canvasResolution, canvasResolution)

      const textStyle = window.getComputedStyle(htmlPlane.querySelector('span'))

      // draw our title with the original style
      context.fillStyle = textStyle.color
      context.font = `${textStyle.fontStyle} ${textStyle.fontWeight} ${parseFloat(textStyle.fontSize)}px ${
        textStyle.fontFamily
      }`

      context.lineHeight = textStyle.lineHeight

      context.textAlign = 'center'

      // vertical alignment is a bit hacky
      context.textBaseline = 'middle'
      context.fillText(htmlPlane.innerText, htmlPlaneWidth * 0.5, htmlPlaneHeight * 0.5)
    }

    writeCanvasText()

    canvasTexture.loadCanvas(canvas)

    this.plane.domElement.element.classList.add('canvas-texture-ready')

    this.plane
      .onAfterResize(() => {
        writeCanvasText()
        canvasTexture.resize()
      })
      .onReEnterView(() => {
        this.isActive = true
      })
      .onLeaveView(() => {
        this.isActive = false
      })

    this.pointer = new Vec2(Infinity)
    this.velocity = new Vec2(0)
    this.minVelocity = new Vec2(-100)
    this.maxVelocity = new Vec2(100)
    this.pointerTimer = null

    window.addEventListener('mousemove', this.onPointerMove.bind(this))
    window.addEventListener('touchmove', this.onPointerMove.bind(this))
  }

  onPointerMove(e) {
    const { clientX, clientY } = e.targetTouches && e.targetTouches.length ? e.targetTouches[0] : e

    if (this.pointer.x === Infinity) {
      this.velocity.set(0)
    } else {
      this.velocity.set(clientX - this.pointer.x, clientY - this.pointer.y)
    }

    this.velocity.clamp(this.minVelocity, this.maxVelocity)

    this.pointer.set(clientX, clientY)

    if (this.plane && this.computeForcesPass) {
      if (this.pointerTimer) clearTimeout(this.pointerTimer)

      const pointerVertexCoords = this.plane.mouseToPlaneCoords(this.pointer)
      this.computeForcesPass.uniforms.interaction.pointerPosition.value.copy(pointerVertexCoords)
      this.computeForcesPass.uniforms.interaction.pointerVelocity.value.set(
        this.velocity.x / this.plane.boundingRect.width,
        this.velocity.y / this.plane.boundingRect.height
      )

      this.pointerTimer = setTimeout(() => {
        this.computeForcesPass.uniforms.interaction.pointerPosition.value.set(Infinity)
        this.computeForcesPass.uniforms.interaction.pointerVelocity.value.set(0)
      }, 25)
    }
  }

  destroy() {
    this.isActive = false
    this.showTween?.kill()

    this.gpuCurtains.renderer.onBeforeRenderScene.remove(this.computeTaskId)

    window.removeEventListener('mousemove', this.onPointerMove.bind(this))
    window.removeEventListener('touchmove', this.onPointerMove.bind(this))

    this.computeUpdatePass.remove()
    this.computeNormalPass.remove()
    this.computeForcesPass.remove()

    this.plane.remove()
  }
}
