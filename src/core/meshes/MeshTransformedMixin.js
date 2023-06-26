import { isCameraRenderer } from '../../utils/renderer-utils'
import { Material } from '../materials/Material'
import { Texture } from '../textures/Texture'
import { BufferBindings } from '../bindings/BufferBindings'
import { Geometry } from '../geometries/Geometry'
import { DOMFrustum } from '../frustum/DOMFrustum'
import { generateUUID } from '../../utils/utils'
import MeshBaseMixin from './MeshBaseMixin'

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
  // callbacks / events
  onReEnterView: () => {
    /* allow empty callback */
  },
  onLeaveView: () => {
    /* allow empty callback */
  },
}

const MeshTransformedMixin = (superclass) =>
  class extends MeshBaseMixin(superclass) {
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

      const { label, geometry, shaders, onReEnterView, onLeaveView, ...meshParameters } = parameters

      this.options = {
        label,
        shaders,
        ...(this.options ?? {}), // merge possible lower options?
      }

      this.onReEnterView = onReEnterView
      this.onLeaveView = onLeaveView

      // explicitly needed for DOM Frustum
      this.geometry = geometry
    }

    // totally override MeshBaseMixin setMesh
    setMeshMaterial(meshParameters) {
      const { frustumCulled, DOMFrustumMargins, ...meshMaterialOptions } = meshParameters

      super.setMeshMaterial(meshMaterialOptions)

      this.domFrustum = new DOMFrustum({
        boundingBox: this.geometry.boundingBox,
        modelViewProjectionMatrix: this.modelViewProjectionMatrix,
        containerBoundingRect: this.renderer.boundingRect,
        DOMFrustumMargins,
        onReEnterView: () => {
          this.onReEnterView()
        },
        onLeaveView: () => {
          this.onLeaveView()
        },
      })

      this.frustumCulled = frustumCulled
      this.DOMFrustumMargins = this.domFrustum.DOMFrustumMargins

      this.renderer.meshes.push(this)
      this.renderer.scene.addMesh(this)
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
      this.setMatricesUniformGroup()

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
    onBeforeRenderPass() {
      if (this.domFrustum.shouldUpdate && this.frustumCulled) {
        this.domFrustum.computeProjectedToDocumentCoords()
        this.domFrustum.shouldUpdate = false
      }

      super.onBeforeRenderPass()
    }

    onRenderPass(pass) {
      this.onRender()

      // TODO check if frustumCulled
      if (this.domFrustum.isIntersecting || !this.frustumCulled) {
        this.material.render(pass)
      }
    }

    remove() {
      this.renderer.scene.removeMesh(this)
      this.renderer.meshes = this.renderer.meshes.filter((m) => m.uuid !== this.uuid)
      super.remove()
    }

    // destroy() {
    //   super.destroy()
    // }
  }

export default MeshTransformedMixin
