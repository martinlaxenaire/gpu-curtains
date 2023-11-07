import { CameraRenderer, isCameraRenderer } from '../../utils/renderer-utils'
import { DOMFrustum } from '../DOM/DOMFrustum'
import MeshBaseMixin, { MeshBaseClass, MeshBaseOptions, MeshBaseParams, MixinConstructor } from './MeshBaseMixin'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { DOMElementBoundingRect, RectCoords } from '../DOM/DOMElement'
import { Mat4 } from '../../math/Mat4'
import { RenderTexture } from '../textures/RenderTexture'
import { Texture } from '../textures/Texture'
import { RenderMaterial } from '../materials/RenderMaterial'
import { AllowedGeometries, RenderMaterialParams } from '../../types/Materials'
import { ProjectedObject3DMatrices } from '../objects3D/ProjectedObject3D'

/**
 * Base parameters used to create a TransformedMesh
 */
export interface TransformedMeshBaseParams {
  /** Whether this TransformedMesh should be frustum culled (not drawn when outside of [camera]{@link CameraRenderer#camera} frustum) */
  frustumCulled: boolean
  /** Margins (in pixels) to applied to the [DOM Frustum]{@link MeshTransformedBaseClass#domFrustum} to determine if this TransformedMesh should be frustum culled or not */
  DOMFrustumMargins: RectCoords
}

/** Parameters used to create a TransformedMesh */
export interface TransformedMeshParameters extends MeshBaseParams, TransformedMeshBaseParams {}

/** @const - Default TransformedMesh parameters to merge with user defined parameters */
const defaultTransformedMeshParams: TransformedMeshBaseParams = {
  //useProjection: true,
  // frustum culling and visibility
  frustumCulled: true,
  DOMFrustumMargins: {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
}

/** Base options used to create this TransformedMesh */
export interface TransformedMeshBaseOptions extends MeshBaseOptions, Partial<TransformedMeshBaseParams> {}

/**
 * MeshTransformedBaseClass - {@link MeshTransformedBase} typescript definition
 */
export declare class MeshTransformedBaseClass extends MeshBaseClass {
  /** The TransformedMesh [DOM Frustum]{@link DOMFrustum} class object */
  domFrustum: DOMFrustum
  /** Whether this TransformedMesh should be frustum culled (not drawn when outside of [camera]{@link CameraRenderer#camera} frustum) */
  frustumCulled: boolean
  /** Margins (in pixels) to applied to the [DOM Frustum]{@link MeshTransformedBaseClass#domFrustum} to determine if this TransformedMesh should be frustum culled or not */
  DOMFrustumMargins: RectCoords

  // callbacks
  /** function assigned to the [onReEnterView]{@link MeshTransformedBaseClass#onReEnterView} callback */
  _onReEnterViewCallback: () => void
  /** function assigned to the [onLeaveView]{@link MeshTransformedBaseClass#onLeaveView} callback */
  _onLeaveViewCallback: () => void

  /**
   * {@link MeshTransformedBaseClass} constructor
   * @param renderer - our [renderer]{@link CameraRenderer} class object
   * @param element - a DOM HTML Element that can be bound to a Mesh
   * @param parameters - [Mesh base parameters]{@link MeshBaseParams}
   */
  constructor(renderer: CameraRenderer, element: HTMLElement | null, parameters: MeshBaseParams)

  /**
   * Override {@link MeshBaseClass} method to add the domFrustum
   */
  computeGeometry(): void

  /**
   * Set a Mesh matrices uniforms inputs then call {@link MeshBaseClass} super method
   * @param meshParameters - [RenderMaterial parameters]{@link RenderMaterialParams}
   */
  setMaterial(meshParameters: RenderMaterialParams): void

  /**
   * Resize our Mesh
   * @param boundingRect - the new bounding rectangle
   */
  resize(boundingRect: DOMElementBoundingRect | null): void
  /**
   * Apply scale and resize textures
   */
  applyScale(): void

  /**
   * Get our {@link DOMFrustum} projected bounding rectangle
   * @readonly
   */
  get projectedBoundingRect(): DOMElementBoundingRect

  /**
   * Tell the model and projection matrices to update.
   */
  updateSizePositionAndProjection(): void
  /**
   * Update the model and projection matrices if needed.
   */
  updateMatrixStack(): void
  /**
   * At least one of the matrix has been updated, update according uniforms and frustum
   */
  onAfterMatrixStackUpdate(): void

  /**
   * Assign a callback function to _onReEnterViewCallback
   * @param callback - callback to run when {@link MeshTransformedBase} is reentering the view frustum
   * @returns - our Mesh
   */
  onReEnterView: (callback: () => void) => MeshTransformedBaseClass
  /**
   * Assign a callback function to _onLeaveViewCallback
   * @param callback - callback to run when {@link MeshTransformedBase} is leaving the view frustum
   * @returns - our Mesh
   */
  onLeaveView: (callback: () => void) => MeshTransformedBaseClass

  /**
   * Called before rendering the Mesh to update matrices and {@link DOMFrustum}.
   * First, we update our matrices to have fresh results. It eventually calls onAfterMatrixStackUpdate() if at least one matrix has been updated.
   * Then we check if we need to update the {@link DOMFrustum} projected bounding rectangle.
   * Finally we call [Mesh base onBeforeRenderPass]{@link MeshBaseClass#onBeforeRenderPass} super
   */
  onBeforeRenderPass(): void
  /**
   * Only render the Mesh if it is in view frustum.
   * Since render() is actually called before onRenderPass(), we are sure to have fresh frustum bounding rectangle values here.
   * @param pass - current render pass
   */
  onRenderPass(pass: GPURenderPassEncoder): void
}

/**
 * MeshBase Mixin:
 * Used to mix Mesh properties and methods defined in {@link MeshTransformedBaseClass} with a {@link MeshBaseMixin} mixed with a given Base of type {@link Object3D}, {@link ProjectedObject3D}, {@link DOMObject3D} or an empty class.
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
    /** The TransformedMesh [DOM Frustum]{@link DOMFrustum} class object */
    domFrustum: DOMFrustum
    /** Whether this TransformedMesh should be frustum culled (not drawn when outside of [camera]{@link CameraRenderer#camera} frustum) */
    frustumCulled: boolean
    /** Margins (in pixels) to applied to the [DOM Frustum]{@link MeshTransformedBaseClass#domFrustum} to determine if this TransformedMesh should be frustum culled or not */
    DOMFrustumMargins: RectCoords

    // callbacks / events
    /** function assigned to the [onReEnterView]{@link MeshTransformedBase#onReEnterView} callback */
    _onReEnterViewCallback: () => void = () => {
      /* allow empty callback */
    }
    /** function assigned to the [onLeaveView]{@link MeshTransformedBase#onLeaveView} callback */
    _onLeaveViewCallback: () => void = () => {
      /* allow empty callback */
    }

    // TODO
    // now force ugly override of all missing properties
    // because typescript gets all confused with the nested mixins
    type: string
    renderer: CameraRenderer
    options: TransformedMeshBaseOptions
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
     * @typedef {TransformedMeshParameters} TransformedMeshBaseParameters
     * @extends MeshBaseParams
     * @property {boolean} frustumCulled - whether to use frustum culling
     * @property {RectCoords} DOMFrustumMargins - frustum margins to apply when frustum culling
     * 
     * @typedef MeshBaseArrayParams
     * @type {array}
     * @property {(CameraRenderer|GPUCurtains)} 0 - our renderer class object
     * @property {(string|HTMLElement|null)} 1 - the DOM HTML Element that can be bound to a Mesh
     * @property {TransformedMeshParameters} 2 - Mesh parameters

     * @param {MeshBaseArrayParams} params - our MeshBaseMixin parameters
     */
    constructor(...params: any[]) {
      super(
        params[0] as CameraRenderer | GPUCurtains,
        params[1] as HTMLElement | string,
        { ...defaultTransformedMeshParams, ...params[2], ...{ useProjection: true } } as TransformedMeshParameters
      )

      let renderer = params[0]

      // for this mesh to use projection!
      const parameters = {
        ...defaultTransformedMeshParams,
        ...params[2],
        ...{ useProjection: true },
      } as TransformedMeshParameters

      this.type = 'MeshTransformed'

      // we could pass our curtains object OR our curtains renderer object
      renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as CameraRenderer)

      isCameraRenderer(renderer, parameters.label ? parameters.label + ' ' + this.type : this.type)

      this.renderer = renderer

      const { label, geometry, shaders, frustumCulled, DOMFrustumMargins } = parameters

      this.options = {
        ...(this.options ?? {}), // merge possible lower options?
        label,
        shaders,
        frustumCulled,
        DOMFrustumMargins,
      }

      // explicitly needed for DOM Frustum
      this.geometry = geometry

      // tell the model and projection matrices to update right away
      this.updateSizePositionAndProjection()
    }

    /* GEOMETRY */

    /**
     * Override {@link MeshBaseClass} method to add the domFrustum
     */
    computeGeometry() {
      if (this.geometry.shouldCompute) {
        this.geometry.computeGeometry()

        this.domFrustum = new DOMFrustum({
          boundingBox: this.geometry.boundingBox,
          modelViewProjectionMatrix: this.modelViewProjectionMatrix,
          containerBoundingRect: this.renderer.boundingRect,
          DOMFrustumMargins: this.options.DOMFrustumMargins,
          onReEnterView: () => {
            this._onReEnterViewCallback && this._onReEnterViewCallback()
          },
          onLeaveView: () => {
            this._onLeaveViewCallback && this._onLeaveViewCallback()
          },
        })

        this.frustumCulled = this.options.frustumCulled
        this.DOMFrustumMargins = this.domFrustum.DOMFrustumMargins
        this.domFrustum.shouldUpdate = this.frustumCulled
      }
    }

    /* MATERIAL */

    /**
     * Set a Mesh matrices uniforms inputs then call {@link MeshBaseClass} super method
     * @param meshParameters - [RenderMaterial parameters]{@link RenderMaterialParams}
     */
    setMaterial(meshParameters: RenderMaterialParams) {
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

      if (!meshParameters.inputs) meshParameters.inputs = { uniforms: {} }

      meshParameters.inputs.uniforms.matrices = matricesUniforms

      // @ts-ignore
      super.setMaterial(meshParameters)
    }

    /* SIZE & TRANSFORMS */

    /**
     * Resize our MeshTransformedBase
     * @param boundingRect - the new bounding rectangle
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
     * Get our {@link DOMFrustum} projected bounding rectangle
     * @readonly
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

    /* EVENTS */

    /**
     * Assign a callback function to _onReEnterViewCallback
     * @param callback - callback to run when {@link MeshTransformedBase} is reentering the view frustum
     * @returns - our Mesh
     */
    onReEnterView(callback: () => void): MeshTransformedBase {
      if (callback) {
        this._onReEnterViewCallback = callback
      }

      return this
    }

    /**
     * Assign a callback function to _onLeaveViewCallback
     * @param callback - callback to run when {@link MeshTransformedBase} is leaving the view frustum
     * @returns - our Mesh
     */
    onLeaveView(callback: () => void): MeshTransformedBase {
      if (callback) {
        this._onLeaveViewCallback = callback
      }

      return this
    }

    /* RENDER */

    /**
     * Called before rendering the Mesh to update matrices and {@link DOMFrustum}.
     * First, we update our matrices to have fresh results. It eventually calls onAfterMatrixStackUpdate() if at least one matrix has been updated.
     * Then we check if we need to update the {@link DOMFrustum} projected bounding rectangle.
     * Finally we call [Mesh base onBeforeRenderPass]{@link MeshBaseClass#onBeforeRenderPass} super
     */
    onBeforeRenderPass() {
      this.updateMatrixStack()

      if (this.domFrustum && this.domFrustum.shouldUpdate && this.frustumCulled) {
        this.domFrustum.computeProjectedToDocumentCoords()
        this.domFrustum.shouldUpdate = false
      }

      // @ts-ignore
      super.onBeforeRenderPass()
    }

    /**
     * Only render the Mesh if it is in view frustum.
     * Since render() is actually called before onRenderPass(), we are sure to have fresh frustum bounding rectangle values here.
     * @param pass - current render pass
     */
    onRenderPass(pass: GPURenderPassEncoder) {
      if (!this.material.ready) return

      this._onRenderCallback && this._onRenderCallback()

      // TODO check if frustumCulled
      if ((this.domFrustum && this.domFrustum.isIntersecting) || !this.frustumCulled) {
        // render ou material
        this.material.render(pass)
        // then render our geometry
        this.geometry.render(pass)
      }
    }
  }
}

export default MeshTransformedMixin
