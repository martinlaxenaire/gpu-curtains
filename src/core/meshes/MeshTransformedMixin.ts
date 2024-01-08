import { CameraRenderer, isCameraRenderer } from '../renderers/utils'
import { DOMFrustum } from '../DOM/DOMFrustum'
import MeshBaseMixin, { MeshBaseClass, MeshBaseOptions, MeshBaseParams, MixinConstructor } from './MeshBaseMixin'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { DOMElementBoundingRect, RectCoords } from '../DOM/DOMElement'
import { Mat4 } from '../../math/Mat4'
import { RenderMaterialParams } from '../../types/Materials'
import { ProjectedObject3D } from '../objects3D/ProjectedObject3D'
import { DOMObject3D } from '../../curtains/objects3D/DOMObject3D'
import default_projected_vsWgsl from '../shaders/chunks/default_projected_vs.wgsl'
import default_normal_fsWgsl from '../shaders/chunks/default_normal_fs.wgsl'

/**
 * Base parameters used to create a TransformedMesh
 */
export interface TransformedMeshBaseParams {
  /** Whether this TransformedMesh should be frustum culled (not drawn when outside of {@link CameraRenderer#camera | camera} frustum) */
  frustumCulled: boolean
  /** Margins (in pixels) to applied to the {@link MeshTransformedBaseClass#domFrustum | DOM Frustum} to determine if this TransformedMesh should be frustum culled or not */
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
 * MeshTransformedBaseClass - MeshTransformedBase typescript definition
 */
export declare class MeshTransformedBaseClass extends MeshBaseClass {
  /** The TransformedMesh {@link DOMFrustum} class object */
  domFrustum: DOMFrustum
  /** Whether this TransformedMesh should be frustum culled (not drawn when outside of {@link CameraRenderer#camera | camera} frustum) */
  frustumCulled: boolean
  /** Margins (in pixels) to applied to the {@link MeshTransformedBaseClass#domFrustum | DOM Frustum} to determine if this TransformedMesh should be frustum culled or not */
  DOMFrustumMargins: RectCoords

  // callbacks
  /** function assigned to the {@link onReEnterView} callback */
  _onReEnterViewCallback: () => void
  /** function assigned to the {@link onLeaveView} callback */
  _onLeaveViewCallback: () => void

  /**
   * {@link MeshTransformedBaseClass} constructor
   * @param renderer - our {@link CameraRenderer} class object
   * @param element - a DOM HTML Element that can be bound to a Mesh
   * @param parameters - {@link MeshBaseParams | Mesh base parameters}
   */
  constructor(renderer: CameraRenderer, element: HTMLElement | null, parameters: MeshBaseParams)

  /**
   * Set default shaders if one or both of them are missing
   */
  setShaders(): void

  /**
   * Override {@link MeshBaseClass} method to add the domFrustum
   */
  computeGeometry(): void

  /**
   * Set a Mesh matrices uniforms inputs then call {@link MeshBaseClass} super method
   * @param meshParameters - {@link RenderMaterialParams | RenderMaterial parameters}
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
  shouldUpdateMatrixStack(): void

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
   * @param callback - callback to run when {@link MeshTransformedBaseClass} is reentering the view frustum
   * @returns - our Mesh
   */
  onReEnterView: (callback: () => void) => MeshTransformedBaseClass
  /**
   * Assign a callback function to _onLeaveViewCallback
   * @param callback - callback to run when {@link MeshTransformedBaseClass} is leaving the view frustum
   * @returns - our Mesh
   */
  onLeaveView: (callback: () => void) => MeshTransformedBaseClass

  /**
   * Called before rendering the Mesh to update matrices and {@link DOMFrustum}.
   * First, we update our matrices to have fresh results. It eventually calls onAfterMatrixStackUpdate() if at least one matrix has been updated.
   * Then we check if we need to update the {@link DOMFrustum} projected bounding rectangle.
   * Finally we call {@link MeshBaseClass#onBeforeRenderPass | Mesh base onBeforeRenderPass} super
   */
  onBeforeRenderPass(): void

  /**
   * Only render the Mesh if it is in view frustum.
   * Since render() is actually called before onRenderPass(), we are sure to have fresh frustum bounding rectangle values here.
   * @param pass - current render pass
   */
  onRenderPass(pass: GPURenderPassEncoder): void
}

// export type TransformedObject3D = ProjectedObject3D | DOMObject3D
// export type MeshTransformedMixinBaseType<T extends TransformedObject3D> = T extends DOMObject3D
//   ? DOMObject3D
//   : ProjectedObject3D
//
// export type MeshTransformedMixinReturn<T extends TransformedObject3D> = T extends DOMObject3D
//   ? MeshTransformedBaseClass & DOMObject3D
//   : MeshTransformedBaseClass & ProjectedObject3D

/**
 * MeshBase Mixin:
 * Used to mix Mesh properties and methods defined in {@link MeshTransformedBaseClass} with a {@link MeshBaseMixin} mixed with a given Base of type {@link ProjectedObject3D} or {@link DOMObject3D}.
 * @exports MeshTransformedMixin
 * @param {*} Base - the class to mix onto, should be of {@link ProjectedObject3D} or {@link DOMObject3D} type
 * @returns {module:MeshTransformedMixin~MeshTransformedBase} - the mixin class.
 */
// using ReturnType of the previous mixin
// https://stackoverflow.com/a/65417255/13354068
// that seems to work as well: function MeshTransformedMixin<TBase extends MixinConstructor<MeshBaseClass>>

// function MeshTransformedMixin<TBase extends new (...args: any[]) => TransformedObject3D>(
//   Base: TBase
// ): new (...args: any[]) => MeshTransformedMixinReturn<TBase> {
function MeshTransformedMixin<TBase extends MixinConstructor>(
  Base: TBase
): MixinConstructor<MeshTransformedBaseClass> & TBase {
  /**
   * MeshTransformedBase defines our base properties and methods
   * @mixin
   * @alias MeshTransformedBase
   */
  return class MeshTransformedBase extends MeshBaseMixin(Base) {
    /** The TransformedMesh {@link DOMFrustum} class object */
    domFrustum: DOMFrustum
    /** Whether this TransformedMesh should be frustum culled (not drawn when outside of {@link CameraRenderer#camera | camera} frustum) */
    frustumCulled: boolean
    /** Margins (in pixels) to applied to the {@link MeshTransformedBaseClass#domFrustum | DOM Frustum} to determine if this TransformedMesh should be frustum culled or not */
    DOMFrustumMargins: RectCoords

    /** Options used to create this {@link MeshTransformedBaseClass} */
    options: TransformedMeshBaseOptions

    // callbacks / events
    /** function assigned to the {@link onReEnterView} callback */
    _onReEnterViewCallback: () => void = () => {
      /* allow empty callback */
    }
    /** function assigned to the {@link onLeaveView} callback */
    _onLeaveViewCallback: () => void = () => {
      /* allow empty callback */
    }

    // TODO we need to find a way to tell typescript that this mixin can only use ProjectedObject3D | DOMObject3D as Base!
    modelMatrix: Mat4
    modelViewMatrix: Mat4
    modelViewProjectionMatrix: Mat4

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

      const { geometry, frustumCulled, DOMFrustumMargins } = parameters

      this.options = {
        ...(this.options ?? {}), // merge possible lower options?
        frustumCulled,
        DOMFrustumMargins,
      }

      this.setDOMFrustum()

      // explicitly needed for DOM Frustum
      this.geometry = geometry

      // tell the model and projection matrices to update right away
      this.shouldUpdateMatrixStack()
    }

    /* SHADERS */

    /**
     * Set default shaders if one or both of them are missing
     */
    setShaders() {
      let { shaders } = this.options

      if (!shaders) {
        shaders = {
          vertex: {
            code: default_projected_vsWgsl,
            entryPoint: 'main',
          },
          fragment: {
            code: default_normal_fsWgsl,
            entryPoint: 'main',
          },
        }
      } else {
        if (!shaders.vertex || !shaders.vertex.code) {
          shaders.vertex = {
            code: default_projected_vsWgsl,
            entryPoint: 'main',
          }
        }

        if (!shaders.fragment || !shaders.fragment.code) {
          shaders.fragment = {
            code: default_normal_fsWgsl,
            entryPoint: 'main',
          }
        }
      }
    }

    /* GEOMETRY */

    /**
     * Set the Mesh frustum culling
     */
    setDOMFrustum() {
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

      this.DOMFrustumMargins = this.domFrustum.DOMFrustumMargins
      this.frustumCulled = this.options.frustumCulled
      this.domFrustum.shouldUpdate = this.frustumCulled
    }

    /* MATERIAL */

    /**
     * Set a Mesh matrices uniforms inputs then call {@link MeshBaseClass} super method
     * @param meshParameters - {@link RenderMaterialParams | RenderMaterial parameters}
     */
    setMaterial(meshParameters: RenderMaterialParams) {
      // add matrices uniforms
      const matricesUniforms = {
        label: 'Matrices',
        struct: {
          model: {
            name: 'model',
            type: 'mat4x4f',
            value: this.modelMatrix,
            onBeforeUpdate: () => {
              matricesUniforms.struct.model.value = this.modelMatrix
            },
          },
          modelView: {
            // model view matrix (model matrix multiplied by camera view matrix)
            name: 'modelView',
            type: 'mat4x4f',
            value: this.modelViewMatrix,
            onBeforeUpdate: () => {
              matricesUniforms.struct.modelView.value = this.modelViewMatrix
            },
          },
          modelViewProjection: {
            name: 'modelViewProjection',
            type: 'mat4x4f',
            value: this.modelViewProjectionMatrix,
            onBeforeUpdate: () => {
              matricesUniforms.struct.modelViewProjection.value = this.modelViewProjectionMatrix
            },
          },
        },
      }

      // if (!meshParameters.inputs) meshParameters.inputs = { uniforms: {} }
      // meshParameters.inputs.uniforms.matrices = matricesUniforms
      if (!meshParameters.uniforms) meshParameters.uniforms = {}
      meshParameters.uniforms.matrices = matricesUniforms

      super.setMaterial(meshParameters)
    }

    /* SIZE & TRANSFORMS */

    /**
     * Resize our {@link MeshTransformedBaseClass}
     * @param boundingRect - the new bounding rectangle
     */
    resize(boundingRect?: DOMElementBoundingRect | null) {
      if (this.domFrustum) this.domFrustum.setContainerBoundingRect(this.renderer.boundingRect)

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
    shouldUpdateMatrixStack() {
      // @ts-ignore
      super.shouldUpdateMatrixStack()
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
     * @param callback - callback to run when {@link MeshTransformedBaseClass} is reentering the view frustum
     * @returns - our Mesh
     */
    onReEnterView(callback: () => void): MeshTransformedBaseClass {
      if (callback) {
        this._onReEnterViewCallback = callback
      }

      return this
    }

    /**
     * Assign a callback function to _onLeaveViewCallback
     * @param callback - callback to run when {@link MeshTransformedBaseClass} is leaving the view frustum
     * @returns - our Mesh
     */
    onLeaveView(callback: () => void): MeshTransformedBaseClass {
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
     * Finally we call {@link MeshBaseClass#onBeforeRenderPass | Mesh base onBeforeRenderPass} super
     */
    onBeforeRenderPass() {
      this.updateMatrixStack()

      if (this.domFrustum && this.domFrustum.shouldUpdate && this.frustumCulled) {
        this.domFrustum.computeProjectedToDocumentCoords()
        this.domFrustum.shouldUpdate = false
      }

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

      if ((this.domFrustum && this.domFrustum.isIntersecting) || !this.frustumCulled) {
        // render ou material
        this.material.render(pass)
        // then render our geometry
        this.geometry.render(pass)
      }
    }
  } /* as MixinConstructor<MeshTransformedBaseClass & InstanceType<TBase>>*/
}

export default MeshTransformedMixin
