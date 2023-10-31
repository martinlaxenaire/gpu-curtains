import { CameraRenderer, isCameraRenderer } from '../../utils/renderer-utils'
import { DOMFrustum } from '../DOM/DOMFrustum'
import MeshBaseMixin, { MeshBaseClass, MeshBaseOptions, MeshBaseParams, MixinConstructor } from './MeshBaseMixin'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { DOMElementBoundingRect, RectCoords } from '../DOM/DOMElement'
import { Mat4 } from '../../math/Mat4'
import { RenderTexture } from '../textures/RenderTexture'
import { Texture } from '../textures/Texture'
import { RenderMaterial } from '../materials/RenderMaterial'
import { AllowedGeometries } from '../../types/Materials'
import { ProjectedObject3DMatrices } from '../objects3D/ProjectedObject3D'

export interface TransformedMeshParams {
  frustumCulled?: boolean
  DOMFrustumMargins?: RectCoords
}

export interface TransformedMeshBaseParameters extends MeshBaseParams {
  frustumCulled: boolean
  DOMFrustumMargins: RectCoords
}

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

  setMeshMaterial(materialParameters: TransformedMeshBaseParameters): void

  resize(boundingRect: DOMElementBoundingRect | null): void
  applyScale(): void

  get projectedBoundingRect(): DOMElementBoundingRect

  updateSizePositionAndProjection(): void
  updateMatrixStack(): void
  onAfterMatrixStackUpdate(): void

  onReEnterView: (callback: () => void) => MeshTransformedBaseClass
  onLeaveView: (callback: () => void) => MeshTransformedBaseClass

  onBeforeRenderPass(): void
  onRenderPass(pass: GPURenderPassEncoder): void
}

/**
 * MeshBase Mixin:
 * Used to mix Mesh properties and methods defined in {@see MeshTransformedBaseClass} with a {@see MeshBaseMixin} mixed with a given Base of type {@see Object3D}, {@see ProjectedObject3D}, {@see DOMObject3D} or an empty class.
 * @exports MeshTransformedMixin
 * @param {*} Base - the class to mix onto
 * @returns {module:MeshTransformedMixin~MeshTransformedBase} - the mixin class.
 */
// using ReturnType of the previous mixin
// https://stackoverflow.com/a/65417255/13354068
// that seems to work as well: function MeshTransformedMixin<TBase extends MixinConstructor<MeshBaseClass>>
function MeshTransformedMixin<TBase extends ReturnType<typeof MeshBaseMixin>>(
  Base: TBase
): MixinConstructor<MeshTransformedBaseClass> & TBase {
  /**
   * MeshTransformedBase defines our base properties and methods
   * @mixin
   * @alias MeshTransformedBase
   */
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
    visible: boolean
    matrices: ProjectedObject3DMatrices
    modelMatrix: Mat4
    modelViewMatrix: Mat4
    modelViewProjectionMatrix: Mat4
    renderTextures: RenderTexture[]
    textures: Texture[]
    material: RenderMaterial
    _onRenderCallback: () => void

    /**
     * MeshTransformedBase constructor
     * @typedef {TransformedMeshBaseParameters} TransformedMeshBaseParameters
     * @extends MeshBaseParams
     * @property {boolean} frustumCulled - whether to use frustum culling
     * @property {RectCoords} DOMFrustumMargins - frustum margins to apply when frustum culling
     * 
     * @typedef MeshBaseArrayParams
     * @type {array}
     * @property {(CameraRenderer|GPUCurtains)} 0 - our renderer class object
     * @property {(string|HTMLElement|null)} 1 - the DOM HTML Element that can be bound to a Mesh
     * @property {TransformedMeshBaseParameters} 2 - Mesh parameters

     * @param {MeshBaseArrayParams} params - our MeshBaseMixin parameters
     */
    constructor(...params: any[]) {
      super(
        params[0] as CameraRenderer | GPUCurtains,
        params[1] as HTMLElement | string,
        { ...defaultMeshParams, ...params[2] } as TransformedMeshBaseParameters
      )

      let renderer = params[0]
      const parameters = { ...defaultMeshParams, ...params[2] } as TransformedMeshBaseParameters

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

      // tell the model and projection matrices to update right away
      this.updateSizePositionAndProjection()
    }

    /**
     * Set a Mesh transparent property, set its matrices uniforms inputs, material and then set its {@see DOMFrustum}
     * @param {TransformedMeshBaseParameters} meshParameters
     */
    setMeshMaterial(meshParameters: TransformedMeshBaseParameters) {
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

    /**
     * Resize our MeshTransformedBase
     * @param {?DOMElementBoundingRect} boundingRect - the new bounding rectangle
     */
    resize(boundingRect: DOMElementBoundingRect | null = null) {
      if (this.domFrustum) this.domFrustum.setContainerBoundingRect(this.renderer.boundingRect)

      // @ts-ignore
      super.resize(boundingRect)
    }

    /**
     * Apply scale and resize textures
     */
    applyScale() {
      // @ts-ignore
      super.applyScale()

      // resize textures on scale change!
      this.textures.forEach((texture) => texture.resize())
    }

    /**
     * Get our {@see DOMFrustum} projected bounding rectangle
     * @readonly
     * @type {DOMElementBoundingRect}
     */
    get projectedBoundingRect(): DOMElementBoundingRect {
      return this.domFrustum?.projectedBoundingRect
    }

    /**
     * Tell the model and projection matrices to update.
     * Here because else typescript is confused
     */
    updateSizePositionAndProjection() {
      // @ts-ignore
      super.updateSizePositionAndProjection()
    }

    /**
     * Update the model and projection matrices if needed.
     * Here because else typescript is confused
     */
    updateMatrixStack() {
      // @ts-ignore
      super.updateMatrixStack()
    }

    /**
     * At least one of the matrix has been updated, update according uniforms and frustum
     */
    onAfterMatrixStackUpdate() {
      if (this.material) {
        this.material.shouldUpdateInputsBindings('matrices')
      }

      if (this.domFrustum) this.domFrustum.shouldUpdate = true
    }

    /** EVENTS **/

    /**
     * Assign a callback function to _onReEnterViewCallback
     * @param {function=} callback - callback to run when {@see MeshTransformedBase} is reentering the view frustum
     * @returns {MeshTransformedBase}
     */
    onReEnterView(callback: () => void): MeshTransformedBase {
      if (callback) {
        this._onReEnterViewCallback = callback
      }

      return this
    }

    /**
     * Assign a callback function to _onLeaveViewCallback
     * @param {function=} callback - callback to run when {@see MeshTransformedBase} is leaving the view frustum
     * @returns {MeshTransformedBase}
     */
    onLeaveView(callback: () => void): MeshTransformedBase {
      if (callback) {
        this._onLeaveViewCallback = callback
      }

      return this
    }

    /** Render loop **/

    /**
     * Called before rendering the Mesh to update matrices and {@see DOMFrustum}.
     * First, we update our matrices to have fresh results. It eventually calls onAfterMatrixStackUpdate() if at least one matrix has been updated.
     * Then we check if we need to update the {@see DOMFrustum} projected bounding rectangle.
     */
    onBeforeRenderPass() {
      this.updateMatrixStack()

      if (this.domFrustum.shouldUpdate && this.frustumCulled) {
        this.domFrustum.computeProjectedToDocumentCoords()
        this.domFrustum.shouldUpdate = false
      }

      // @ts-ignore
      super.onBeforeRenderPass()
    }

    /**
     * Only render the Mesh if it is in view frustum.
     * Since render() is actually called before onRenderPass(), we are sure to have fresh frustum bounding rectangle values here.
     * @param {GPURenderPassEncoder} pass
     */
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
