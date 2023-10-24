import { isCameraRenderer } from '../../utils/renderer-utils'
import { DOMFrustum } from '../frustum/DOMFrustum'

const defaultMeshParams = {
  useProjection: true,
  // frustum culling and visibility
  frustumCulled: true,
  DOMFrustumMargins: {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
}

const MeshTransformedMixin = (superclass) =>
  class extends superclass {
    // callbacks / events
    _onReEnterViewCallback = () => {
      /* allow empty callback */
    }
    _onLeaveViewCallback = () => {
      /* allow empty callback */
    }

    constructor(renderer, element, parameters) {
      parameters = { ...defaultMeshParams, ...parameters }

      super(renderer, element, parameters)

      this.type = 'MeshTransformed'

      // we could pass our curtains object OR our curtains renderer object
      renderer = (renderer && renderer.renderer) || renderer

      isCameraRenderer(renderer, parameters.label ? parameters.label + ' ' + this.type : this.type)

      this.renderer = renderer

      const { label, geometry, shaders } = parameters

      this.options = {
        label,
        shaders,
        ...(this.options ?? {}), // merge possible lower options?
      }

      // explicitly needed for DOM Frustum
      this.geometry = geometry

      // update model and projection matrices right away
      // TODO is it the most performant way?
      this.updateModelMatrix()
      this.updateProjectionMatrixStack()
    }

    // totally override MeshBaseMixin setMesh
    setMeshMaterial(meshParameters) {
      const { frustumCulled, DOMFrustumMargins, ...meshMaterialOptions } = meshParameters

      // add matrices uniforms
      const matricesUniforms = {
        label: 'Matrices',
        bindings: {
          model: {
            name: 'model',
            type: 'mat4x4f',
            value: this.modelMatrix,
            onBeforeUpdate: () => {
              matricesUniforms.bindings.model.value = this.modelMatrix
            },
          },
          modelView: {
            // model view matrix (model matrix multiplied by camera view matrix)
            name: 'modelView',
            type: 'mat4x4f',
            value: this.modelViewMatrix,
            onBeforeUpdate: () => {
              matricesUniforms.bindings.modelView.value = this.modelViewMatrix
            },
          },
          modelViewProjection: {
            name: 'modelViewProjection',
            type: 'mat4x4f',
            value: this.modelViewProjectionMatrix,
            onBeforeUpdate: () => {
              matricesUniforms.bindings.modelViewProjection.value = this.modelViewProjectionMatrix
            },
          },
        },
      }

      meshMaterialOptions.uniforms.matrices = matricesUniforms

      super.setMeshMaterial(meshMaterialOptions)

      this.domFrustum = new DOMFrustum({
        boundingBox: this.geometry.boundingBox,
        modelViewProjectionMatrix: this.modelViewProjectionMatrix,
        containerBoundingRect: this.renderer.boundingRect,
        DOMFrustumMargins,
        onReEnterView: () => {
          this._onReEnterViewCallback && this._onReEnterViewCallback()
        },
        onLeaveView: () => {
          this._onLeaveViewCallback && this._onLeaveViewCallback()
        },
      })

      this.frustumCulled = frustumCulled
      this.DOMFrustumMargins = this.domFrustum.DOMFrustumMargins
    }

    resize(boundingRect = null) {
      if (this.domFrustum) this.domFrustum.setContainerBoundingRect(this.renderer.boundingRect)

      super.resize(boundingRect)
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

      if (this.material) {
        this.material.shouldUpdateInputsBindings('matrices')
      }

      if (this.domFrustum) this.domFrustum.shouldUpdate = true
    }

    updateProjectionMatrixStack() {
      super.updateProjectionMatrixStack()

      if (this.domFrustum) this.domFrustum.shouldUpdate = true
    }

    /** EVENTS **/

    onReEnterView(callback) {
      if (callback) {
        this._onReEnterViewCallback = callback
      }

      return this
    }

    onLeaveView(callback) {
      if (callback) {
        this._onLeaveViewCallback = callback
      }

      return this
    }

    /** Render loop **/

    /**
     *
     * @param pass
     */
    onBeforeRenderPass() {
      if (this.domFrustum.shouldUpdate && this.frustumCulled) {
        this.domFrustum.computeProjectedToDocumentCoords()
        this.domFrustum.shouldUpdate = false
      }

      super.onBeforeRenderPass()
    }

    onRenderPass(pass) {
      this._onRenderCallback && this._onRenderCallback()

      // TODO check if frustumCulled
      if (this.domFrustum.isIntersecting || !this.frustumCulled) {
        this.material.render(pass)
      }
    }
  }

export default MeshTransformedMixin
