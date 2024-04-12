import { Vec3, ComputePass, BoxGeometry, Mesh, ShaderPass } from '../../../dist/esm/index.mjs'
import { computeFeatureInstances } from '../shaders/compute-feature-instances.wgsl.js'
import { featureInstancesFs, featureInstancesVs } from '../shaders/feature-instances.wgsl.js'

// inspired by the https://threejsinstancing.com/ homepage animation
// from Daniel Velasquez: https://twitter.com/anemolito
export class ComputeFeature {
  constructor({ gpuCurtains, scrollObserver }) {
    this.gpuCurtains = gpuCurtains
    this.scrollObserver = scrollObserver

    this.init()
  }

  async init() {
    // number of particles instances
    const nbInstances = 2_000

    const outerRadius = 40
    const innerRadius = 10

    this.renderer = this.gpuCurtains.createCameraRenderer({
      container: '#compute-feature-canvas',
      camera: {
        near: 1,
        far: outerRadius * 3,
      },
    })

    // now the compute pass that is going to place the points on a sphere
    const computeInitDataPass = new ComputePass(this.renderer, {
      label: 'Compute initial position',
      autoRender: false, // we don't want to run this pass each frame
      shaders: {
        compute: {
          code: computeFeatureInstances,
        },
      },
      dispatchSize: Math.ceil(nbInstances / 64), //we divide the vertex count by the workgroup_size
      uniforms: {
        params: {
          struct: {
            outerRadius: {
              type: 'f32',
              value: outerRadius,
            },
            innerRadius: {
              type: 'f32',
              value: innerRadius,
            },
          },
        },
      },
      storages: {
        particles: {
          access: 'read_write',
          struct: {
            position: {
              type: 'array<vec4f>',
              value: new Float32Array(nbInstances * 4),
            },
          },
        },
      },
    })

    // we should wait for pipeline compilation!
    await computeInitDataPass.material.compileMaterial()

    // now run the compute pass just once
    this.renderer.renderOnce([computeInitDataPass])

    const particleBuffer = computeInitDataPass.material.getBindingByName('particles')

    // now the render part
    this.renderer.camera.position.y = outerRadius * 0.25
    this.renderer.camera.position.z = outerRadius * 0.825

    this.renderer.camera.lookAt(new Vec3())

    // pass the instanced vertex buffer attributes
    const featureInstancesGeometry = new BoxGeometry({
      instancesCount: nbInstances, // instancing
      vertexBuffers: [
        {
          stepMode: 'instance',
          name: 'instanceAttributes',
          buffer: particleBuffer?.buffer,
          attributes: [
            {
              name: 'instancePosition',
              type: 'vec4f',
              bufferFormat: 'float32x4',
              size: 4,
              array: new Float32Array(nbInstances * 4),
            },
          ],
        },
      ],
    })

    this.particles = new Mesh(this.renderer, {
      label: 'Particles mesh',
      geometry: featureInstancesGeometry,
      shaders: {
        vertex: {
          code: featureInstancesVs,
        },
        fragment: {
          code: featureInstancesFs,
        },
      },
      frustumCulled: false,
      uniforms: {
        frames: {
          struct: {
            elapsed: {
              type: 'f32',
              value: 0,
            },
          },
        },
      },
    })

    this.particles.onBeforeRender(() => {
      this.particles.rotation.y += 0.0075
      this.particles.uniforms.frames.elapsed.value++
    })

    const shaderPassFs = /* wgsl */ `
      struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) uv: vec2f,
      };

      @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
        var texture: vec4f = textureSample(renderTexture, defaultSampler, fsInput.uv);
        let grey: f32 = dot(texture.rgb, vec3(0.299, 0.587, 0.114));
        let greyRender: vec4f = vec4(vec3(grey), texture.a);
        
        let mixTextures = smoothstep(0.25, 0.95, abs(fsInput.uv.x * 2.0 - 1.0));

        return mix( texture, greyRender, mixTextures );
      }
    `

    this.shaderPass = new ShaderPass(this.renderer, {
      shaders: {
        fragment: {
          code: shaderPassFs,
        },
      },
    })

    this.scrollObserver.observe({
      element: this.renderer.domElement.element,
      visibleRatio: 0,
      hiddenRatio: 0,
      keepObserving: true,
      onElVisible: () => {
        this.shaderPass.visible = true
      },
      onElHidden: () => {
        // if the shader pass is not visible,
        // then everything that's in it is not drawn
        this.shaderPass.visible = false
      },
    })
  }

  destroy() {
    this.particles?.remove()
    this.shaderPass?.remove()
    this.renderer?.destroy()
  }
}
