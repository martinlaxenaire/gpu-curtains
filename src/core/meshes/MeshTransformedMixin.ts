// @ts-nocheck
// TODO fix!

import { CameraRenderer, isCameraRenderer } from '../../utils/renderer-utils'
import { DOMFrustum } from '../DOM/DOMFrustum'
import { TransformedMeshMaterialParameters, TransformedMeshParams } from '../../types/core/meshes/MeshTransformedMixin'
import MeshBaseMixin, { GConstructor, MixinConstructor } from './MeshBaseMixin'
import { DOMObject3D } from '../../curtains/objects3D/DOMObject3D'
import { ProjectedObject3D } from '../objects3D/ProjectedObject3D'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { MeshBaseParams } from '../../types/core/meshes/MeshBaseMixin'
import { DOMElementBoundingRect } from '../DOM/DOMElement'

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
} as TransformedMeshParams

//type TransformedMixinConstructor = GConstructor<MeshBaseMixin<DOMObject3D | ProjectedObject3D>>

//function MeshTransformedMixin<TBase extends TransformedMixinConstructor>(superclass: TBase) {
function MeshTransformedMixin<
  TBase extends ReturnType<typeof MeshBaseMixin<GConstructor<DOMObject3D | ProjectedObject3D>>>
>(Base: TBase) {
  return class MeshTransformedBase extends Base {
    // callbacks / events
    _onReEnterViewCallback: () => void = () => {
      /* allow empty callback */
    }
    _onLeaveViewCallback: () => void = () => {
      /* allow empty callback */
    }

    //constructor(renderer: CameraRenderer | GPUCurtains, element: string | HTMLElement, parameters: MeshBaseParams) {
    constructor(...params: any) {
      let {
        renderer,
        element,
        parameters: { ...defaultMeshParams, ...parameters },
      }: {
        renderer: CameraRenderer | GPUCurtains
        element: HTMLElement | string
        parameters: MeshBaseParams
      } = params

      super(renderer, element, parameters)

      //parameters = { ...defaultMeshParams, ...parameters }

      this.type = 'MeshTransformed'

      // we could pass our curtains object OR our curtains renderer object
      renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as CameraRenderer)

      isCameraRenderer(renderer, parameters.label ? parameters.label + ' ' + this.type : this.type)

      this.renderer = renderer

      const { label, geometry, shaders } = parameters

      this.options = {
        ...(this.options ?? {}), // merge possible lower options?
        label,
        shaders,
      }

      // explicitly needed for DOM Frustum
      this.geometry = geometry

      // update model and projection matrices right away
      // TODO is it the most performant way?
      this.updateModelMatrix()
      this.updateProjectionMatrixStack()
    }

    // totally override MeshBaseMixin setMesh
    setMeshMaterial(meshParameters: TransformedMeshMaterialParameters) {
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

      if (!meshMaterialOptions.inputs) meshMaterialOptions.inputs = { uniforms: {} }

      meshMaterialOptions.inputs.uniforms.matrices = matricesUniforms

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

    resize(boundingRect: DOMElementBoundingRect | null = null) {
      if (this.domFrustum) this.domFrustum.setContainerBoundingRect(this.renderer.boundingRect)

      super.resize(boundingRect)
    }

    applyScale() {
      super.applyScale()

      // resize textures on scale change!
      this.textures.forEach((texture) => texture.resize())
    }

    get projectedBoundingRect(): DOMElementBoundingRect {
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

    onReEnterView(callback: () => void): MeshTransformedBase {
      if (callback) {
        this._onReEnterViewCallback = callback
      }

      return this
    }

    onLeaveView(callback: () => void): MeshTransformedBase {
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

    onRenderPass(pass: GPURenderPassEncoder) {
      this._onRenderCallback && this._onRenderCallback()

      // TODO check if frustumCulled
      if (this.domFrustum.isIntersecting || !this.frustumCulled) {
        this.material.render(pass)
      }
    }
  }
}

export default MeshTransformedMixin
