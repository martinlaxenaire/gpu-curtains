import { CameraRenderer, isCameraRenderer } from '../../utils/renderer-utils'
import { DOMFrustum } from '../DOM/DOMFrustum'
import { TransformedMeshMaterialParameters, TransformedMeshParams } from '../../types/core/meshes/MeshTransformedMixin'
import MeshBaseMixin, { MixinConstructor, MeshBaseClass } from './MeshBaseMixin'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { MeshBaseOptions, MeshBaseParams } from '../../types/core/meshes/MeshBaseMixin'
import { DOMElementBoundingRect, RectCoords } from '../DOM/DOMElement'
import { AllowedGeometries } from '../../types/core/materials/RenderMaterial'
import { Mat4 } from '../../math/Mat4'
import { ProjectedObject3DMatrices } from '../../types/core/objects3D/ProjectedObject3D'
import { RenderTexture } from '../textures/RenderTexture'
import { Texture } from '../textures/Texture'
import { RenderMaterial } from '../materials/RenderMaterial'

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

export declare class MeshTransformedBaseClass extends MeshBaseClass {
  domFrustum: DOMFrustum
  frustumCulled: boolean
  DOMFrustumMargins: RectCoords

  // callbacks
  _onReEnterViewCallback: () => void
  _onLeaveViewCallback: () => void

  constructor(renderer: CameraRenderer, element: HTMLElement | null, parameters: MeshBaseParams)

  setMeshMaterial(materialParameters: TransformedMeshMaterialParameters): void

  resize(boundingRect: DOMElementBoundingRect | null): void
  applyScale(): void

  get projectedBoundingRect(): DOMElementBoundingRect

  updateModelMatrix(): void
  updateProjectionMatrixStack(): void

  onReEnterView: (callback: () => void) => MeshTransformedBaseClass
  onLeaveView: (callback: () => void) => MeshTransformedBaseClass

  onBeforeRenderPass(): void
  onRenderPass(pass: GPURenderPassEncoder): void
}

// using ReturnType of the previous mixin
// https://stackoverflow.com/a/65417255/13354068
// that seems to work as well: function MeshTransformedMixin<TBase extends MixinConstructor<MeshBaseClass>>
function MeshTransformedMixin<TBase extends ReturnType<typeof MeshBaseMixin>>(
  Base: TBase
): MixinConstructor<MeshTransformedBaseClass> & TBase {
  return class MeshTransformedBase extends Base {
    domFrustum: DOMFrustum
    frustumCulled: boolean
    DOMFrustumMargins: RectCoords

    // callbacks / events
    _onReEnterViewCallback: () => void = () => {
      /* allow empty callback */
    }
    _onLeaveViewCallback: () => void = () => {
      /* allow empty callback */
    }

    // TODO
    // now force ugly override of all missing properties
    // because typescript gets all confused with the nested mixins
    type: string
    renderer: CameraRenderer
    options: MeshBaseOptions
    geometry: AllowedGeometries
    matrices: ProjectedObject3DMatrices
    modelMatrix: Mat4
    modelViewMatrix: Mat4
    modelViewProjectionMatrix: Mat4
    renderTextures: RenderTexture[]
    textures: Texture[]
    material: RenderMaterial
    _onRenderCallback: () => void

    constructor(...params: any[]) {
      super(
        params[0] as CameraRenderer | GPUCurtains,
        params[1] as HTMLElement | string,
        { ...defaultMeshParams, ...params[2] } as MeshBaseParams
      )

      let renderer = params[0]
      const parameters = { ...defaultMeshParams, ...params[2] } as MeshBaseParams

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

      // @ts-ignore
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

      // @ts-ignore
      super.resize(boundingRect)
    }

    applyScale() {
      // @ts-ignore
      super.applyScale()

      // resize textures on scale change!
      this.textures.forEach((texture) => texture.resize())
    }

    get projectedBoundingRect(): DOMElementBoundingRect {
      return this.domFrustum?.projectedBoundingRect
    }

    updateModelMatrix() {
      // @ts-ignore
      super.updateModelMatrix()

      if (this.material) {
        this.material.shouldUpdateInputsBindings('matrices')
      }

      if (this.domFrustum) this.domFrustum.shouldUpdate = true
    }

    updateProjectionMatrixStack() {
      // @ts-ignore
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

      // @ts-ignore
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
