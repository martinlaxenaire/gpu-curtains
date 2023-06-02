import { Mesh } from './Mesh'
import { UniformBinding } from './bindings/UniformBinding'
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

      // events
      onRender = () => {},
    } = {}
  ) {
    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    if (!renderer || !(renderer.type === 'Renderer' || renderer.type === 'CurtainsRenderer')) {
      return
    }

    super(renderer, element)

    this.type = 'Plane'

    this.options = {
      label,
    }

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
          visibility: binding.visibility,
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
        model: {
          name: 'model',
          type: 'mat4x4f',
          value: this.modelMatrix,
          onBeforeUpdate: () => {
            this.matrixUniformBinding.uniforms.model.value = this.modelMatrix
          },
        },
        modelView: {
          // model view matrix (model matrix multiplied by camera view matrix)
          name: 'modelView',
          type: 'mat4x4f',
          value: this.modelViewMatrix,
          onBeforeUpdate: () => {
            this.matrixUniformBinding.uniforms.modelView.value = this.modelViewMatrix
          },
        },
        // view: {
        //   // camera view matrix
        //   name: 'view',
        //   type: 'mat4x4f',
        //   value: this.viewMatrix,
        //   onBeforeUpdate: () => {
        //     this.matrixUniformBinding.uniforms.view.value = this.viewMatrix
        //   },
        // },
        // projection: {
        //   // camera projection matrix
        //   name: 'projection',
        //   type: 'mat4x4f',
        //   value: this.projectionMatrix,
        //   onBeforeUpdate: () => {
        //     this.matrixUniformBinding.uniforms.projection.value = this.projectionMatrix
        //   },
        // },
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
      this.matrixUniformBinding.shouldUpdateUniform('model')
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

    //this.matrixUniformBinding?.shouldUpdateUniform('view')
    //this.matrixUniformBinding?.shouldUpdateUniform('projection')
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

          texture.loadImage(image.src)
        })
      }

      // load videos
      if (videos.length) {
        //this.loadVideos(videos);

        videos.forEach((video) => {
          //console.log(image.src)
          const texture = this.createTexture({
            // TODO index in texture for bindings
            name: video.getAttribute('data-name') ?? 'texture' + this.textures.length,
          })

          //texture.loadSource(image.src)
          texture.loadVideo(video)
        })
      }

      // load canvases
      if (canvases.length) {
        //this.loadCanvases(canvases);

        canvases.forEach((canvas) => {
          //console.log(image.src)
          const texture = this.createTexture({
            // TODO index in texture for bindings
            name: canvas.getAttribute('data-name') ?? 'texture' + this.textures.length,
          })

          //texture.loadSource(image.src)
          texture.loadCanvas(canvas)
        })
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
