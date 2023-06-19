import { isCameraRenderer } from '../../utils/renderer-utils'
import { Material } from '../Material'
import { Texture } from '../Texture'
import { BufferBindings } from '../bindings/BufferBindings'
import { Geometry } from '../geometries/Geometry'
import { Vec3 } from '../../math/Vec3'
import { DOMFrustum } from '../frustum/DOMFrustum'

const defaultMeshParams = {
  label: 'Mesh',
  // geometry
  geometry: new Geometry(),
  // material
  shaders: {},
  bindings: [],
  cullMode: 'back',
  depthWriteEnabled: true,
  depthCompare: 'less',
  transparent: false,
  // frustum culling and visibility
  frustumCulled: true,
  DOMFrustumMargins: {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  visible: true,
  // callbacks / events
  onReady: () => {
    /* allow empty callback */
  },
  onRender: () => {
    /* allow empty callback */
  },
  onAfterRender: () => {
    /* allow empty callback */
  },
  onReEnterView: () => {
    /* allow empty callback */
  },
  onLeaveView: () => {
    /* allow empty callback */
  },
  onAfterResize: () => {
    /* allow empty callback */
  },
}

const MeshMixin = (superclass) =>
  class extends superclass {
    constructor(renderer, element, parameters) {
      parameters = { ...defaultMeshParams, ...parameters }

      super(renderer, element, parameters)

      this.type = 'MeshObject'

      // we could pass our curtains object OR our curtains renderer object
      renderer = (renderer && renderer.renderer) || renderer

      if (!isCameraRenderer(renderer, this.type)) {
        console.warn('MeshMixin fail')
        return
      }

      this.renderer = renderer

      const {
        shaders,
        bindings,
        geometry,
        label,
        frustumCulled,
        DOMFrustumMargins,
        visible,
        onReady,
        onRender,
        onAfterRender,
        onReEnterView,
        onLeaveView,
        onAfterResize,
        ...materialOptions
      } = parameters

      this.options = {
        label,
        shaders,
        ...(this.options ?? {}), // merge possible lower options?
      }

      this.onReady = onReady
      this.onRender = onRender
      this.onAfterRender = onAfterRender
      this.onReEnterView = onReEnterView
      this.onLeaveView = onLeaveView
      this.onAfterResize = onAfterResize

      this.setMatricesUniformGroup()
      this.setUniformBindings(bindings)

      this.geometry = geometry

      this.domFrustum = new DOMFrustum({
        boundingBox: this.geometry.boundingBox,
        modelViewProjectionMatrix: this.modelViewProjectionMatrix,
        containerBoundingRect: this.renderer.domElement.boundingRect,
        DOMFrustumMargins,
        onReEnterView: () => {
          // TODO
          if (this.options.label === 'Cube') {
            console.log('Cube reentered view!')
          }
          this.onReEnterView()
        },
        onLeaveView: () => {
          // TODO
          if (this.options.label === 'Cube') {
            console.log('Cube left view!')
          }
          this.onLeaveView()
        },
      })

      this.setMaterial({
        label,
        shaders,
        ...materialOptions,
        uniformsBindings: this.uniformsBindings,
      })

      this.material.setAttributesFromGeometry(this.geometry)

      this.uniforms = this.material.uniforms

      this.textures = []

      this.frustumCulled = frustumCulled
      this.DOMFrustumMargins = this.domFrustum.DOMFrustumMargins

      this.visible = visible

      this.ready = false

      this.renderer.meshes.push(this)
    }

    setMaterial(materialParameters) {
      this.material = new Material(this.renderer, materialParameters)
    }

    /** TEXTURES **/

    createTexture(options) {
      if (!options.name) {
        options.name = 'texture' + this.textures.length
      }

      const texture = new Texture(this.renderer, options)

      this.material.addTextureBinding(texture)

      this.textures.push(texture)

      this.onTextureCreated(texture)

      return texture
    }

    onTextureCreated(texture) {
      /* will be overriden */
      texture.parent = this
    }

    /** UNIFORMS **/

    /***
   Init our plane model view and projection matrices and set their uniform locations
   ***/
    setMatricesUniformGroup() {
      this.matrixUniformBinding = new BufferBindings({
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

    setUniformBindings(bindings) {
      this.uniformsBindings = [
        this.matrixUniformBinding,
        ...bindings.map((binding, index) => {
          return new BufferBindings({
            label: binding.label || 'Uniforms' + index,
            name: binding.name || 'uniforms' + index,
            bindIndex: index + 1, // bindIndex 0 is already taken by matrix uniforms
            uniforms: binding.uniforms,
            visibility: binding.visibility,
          })
        }),
      ]
    }

    resize(boundingRect = null) {
      super.resize(boundingRect)

      if (this.domFrustum) this.domFrustum.setContainerBoundingRect(this.renderer.domElement.boundingRect)

      this.onAfterResize && this.onAfterResize()
    }

    applyScale() {
      super.applyScale()

      // resize textures on scale change!
      this.textures.forEach((texture) => texture.resize())
    }

    get projectedBoundingRect() {
      return this.domFrustum?.projectedBoundingRect
    }

    updateModelMatrix() {
      super.updateModelMatrix()

      if (this.matrixUniformBinding) {
        this.matrixUniformBinding.shouldUpdateUniform('model')
        this.matrixUniformBinding.shouldUpdateUniform('modelView')
        this.matrixUniformBinding.shouldUpdateUniform('modelViewProjection')
      }

      if (this.domFrustum) this.domFrustum.shouldUpdate = true
    }

    updateProjectionMatrixStack() {
      super.updateProjectionMatrixStack()

      if (this.domFrustum) this.domFrustum.shouldUpdate = true
    }

    /** Render loop **/

    /**
     *
     * @param pass
     */
    render(pass) {
      // no point to render if the WebGPU device is not ready
      // TODO shoud a mesh with visible set to false still update its uniforms?
      if (!this.renderer.ready || !this.visible) return

      super.render()

      if (this.domFrustum.shouldUpdate && this.frustumCulled) {
        this.domFrustum.computeProjectedToDocumentCoords()
        this.domFrustum.shouldUpdate = false
      }

      if (this.material && this.material.ready && !this.ready) {
        this.ready = true
        this.onReady()
      }

      this.uniformsBindings.forEach((uniformBinding) => {
        uniformBinding.onBeforeRender()
      })

      this.onRender()

      // TODO check if frustumCulled
      if (this.domFrustum.isIntersecting || !this.frustumCulled) {
        this.material.render(pass)
      }

      this.onAfterRender()
    }

    destroy() {
      // TODO destroy anything else?
      this.material?.destroy()
    }
  }

export default MeshMixin
