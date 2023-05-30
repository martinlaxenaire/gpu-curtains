import { Mesh } from './Mesh'
import { UniformBinding } from './UniformBinding'
import { Camera } from '../camera/Camera'
import { DOMElement } from './DOMElement'
import { Mat4 } from '../math/Mat4'
import { Quat } from '../math/Quat'
import { Vec3 } from '../math/Vec3'
import { DOM3DObject } from './DOM3DObject'

export class Plane extends DOM3DObject {
  constructor(
    renderer,
    element,
    {
      label = 'Plane',

      // material
      shaders = {},
      bindings = [],

      // geometry
      widthSegments = 1,
      heightSegments = 1,

      // Plane specific params
      alwaysDraw = false,
      visible = true,
      //transparent = false,
      drawCheckMargins = {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      },
      autoloadSources = true,
      watchScroll = true,
      fov = 50,

      // events
      onRender = () => {},
    } = {}
  ) {
    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    if (!renderer || renderer.type !== 'Renderer') {
      return
    }

    super(renderer, element, {
      fov,
    })

    this.type = 'Plane'

    this.renderer = renderer
    this.renderer.planes.push(this)

    this.textures = []

    this.alwaysDraw = alwaysDraw
    this.visible = visible

    this.autoloadSources = autoloadSources

    this.watchScroll = watchScroll

    this.setMatricesUniformGroup()

    this.uniformsBindings = [
      this.matrixUniformBinding,
      ...bindings.map((binding, index) => {
        return new UniformBinding({
          label: binding.label || 'Uniforms' + index,
          name: binding.name || 'uniforms' + index,
          bindIndex: index + 1, // bindIndex 0 is already taken by matrix uniforms
          uniforms: binding.uniforms,
        })
      }),
    ]

    this.mesh = new Mesh(renderer, {
      label,
      shaders,
      widthSegments,
      heightSegments,
      uniformsBindings: this.uniformsBindings,
    })

    console.log(this.mesh)

    this.uniforms = this.mesh.uniforms

    this.setInitSources()

    // callbacks
    this.onRender = onRender
  }

  resize(boundingRect) {
    super.resize(boundingRect)

    this.textures && this.textures.forEach((texture) => texture.resize())

    // TODO onAfterResize callback
  }

  /***
   Init our plane model view and projection matrices and set their uniform locations
   ***/
  setMatricesUniformGroup() {
    this.matrixUniformBinding = new UniformBinding({
      label: 'Matrices',
      name: 'matrices',
      uniforms: {
        world: {
          name: 'world',
          type: 'mat4x4f',
          value: this.worldMatrix,
          onBeforeUpdate: () => {
            this.matrixUniformBinding.uniforms.world.value = this.worldMatrix
          },
        },
        modelView: {
          // model view matrix (world matrix multiplied by camera view matrix)
          name: 'modelView',
          type: 'mat4x4f',
          value: this.modelViewMatrix,
          onBeforeUpdate: () => {
            this.matrixUniformBinding.uniforms.modelView.value = this.modelViewMatrix
          },
        },
        projection: {
          // camera projection matrix
          name: 'projection',
          type: 'mat4x4f',
          value: this.projectionMatrix,
          onBeforeUpdate: () => {
            this.matrixUniformBinding.uniforms.projection.value = this.projectionMatrix
          },
        },
        modelViewProjection: {
          name: 'modelViewProjection',
          type: 'mat4x4f',
          value: this.modelViewProjectionMatrix,
          onBeforeUpdate: () => {
            this.matrixUniformBinding.uniforms.modelViewProjection.value = this.modelViewProjectionMatrix
          },
        },
      },
    })
  }

  updateModelMatrixStack(sizeChanged = false) {
    super.updateModelMatrixStack(sizeChanged)

    if (this.matrixUniformBinding) {
      this.matrixUniformBinding.shouldUpdateUniform('world')
      this.matrixUniformBinding.shouldUpdateUniform('modelView')
      this.matrixUniformBinding.shouldUpdateUniform('modelViewProjection')
    }

    // TODO ugly
    if (sizeChanged) {
      this.textures?.forEach((texture) => texture.resize())
    }
  }

  updateProjectionMatrixStack() {
    super.updateProjectionMatrixStack()

    this.matrixUniformBinding.shouldUpdateUniform('projection')
  }

  /** SOURCES **/

  setInitSources() {
    let loaderSize = 0
    if (this.autoloadSources) {
      const images = this.domElement.element.querySelectorAll('img')
      const videos = this.domElement.element.querySelectorAll('video')
      const canvases = this.domElement.element.querySelectorAll('canvas')

      // load images
      if (images.length) {
        //this.loadImages(images);
        images.forEach((image) => {
          //console.log(image.src)
          const texture = this.createTexture({
            // TODO index in texture for bindings
            name: image.getAttribute('data-name') ?? 'texture' + this.textures.length,
          })

          texture.loadSource(image.src)
        })
      }

      // load videos
      if (videos.length) {
        //this.loadVideos(videos);
      }

      // load canvases
      if (canvases.length) {
        //this.loadCanvases(canvases);
      }

      loaderSize = images.length + videos.length + canvases.length
    }
  }

  createTexture(options = {}) {
    if (!options.name) {
      options.name = 'texture' + this.textures.length
    }

    const texture = this.mesh.createTexture(options)
    texture.parent = this

    this.textures.push(texture)

    return texture
  }

  render(pass) {
    // no point to render if the WebGPU device is not ready
    if (!this.renderer.ready || !this.visible) return

    super.render()

    // TODO move uniform bindings & texture onBeforeRender calls inside Mesh class?
    this.uniformsBindings.forEach((uniformBinding) => {
      uniformBinding.onBeforeRender()
    })

    this.textures.forEach((texture) => {
      texture.textureMatrix.onBeforeRender()
    })

    this.mesh.render(pass)

    this.onRender()
  }

  destroy() {
    this.mesh?.material?.destroy()
  }
}
