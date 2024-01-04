/// <reference types="dist" />
import { CameraRenderer } from '../renderers/utils';
import { DOMFrustum } from '../DOM/DOMFrustum';
import { MeshBaseClass, MeshBaseOptions, MeshBaseParams, MixinConstructor } from './MeshBaseMixin';
import { DOMElementBoundingRect, RectCoords } from '../DOM/DOMElement';
import { RenderMaterialParams } from '../../types/Materials';
/**
 * Base parameters used to create a TransformedMesh
 */
export interface TransformedMeshBaseParams {
    /** Whether this TransformedMesh should be frustum culled (not drawn when outside of [camera]{@link CameraRenderer#camera} frustum) */
    frustumCulled: boolean;
    /** Margins (in pixels) to applied to the [DOM Frustum]{@link MeshTransformedBaseClass#domFrustum} to determine if this TransformedMesh should be frustum culled or not */
    DOMFrustumMargins: RectCoords;
}
/** Parameters used to create a TransformedMesh */
export interface TransformedMeshParameters extends MeshBaseParams, TransformedMeshBaseParams {
}
/** Base options used to create this TransformedMesh */
export interface TransformedMeshBaseOptions extends MeshBaseOptions, Partial<TransformedMeshBaseParams> {
}
/**
 * MeshTransformedBaseClass - {@link MeshTransformedBase} typescript definition
 */
export declare class MeshTransformedBaseClass extends MeshBaseClass {
    /** The TransformedMesh [DOM Frustum]{@link DOMFrustum} class object */
    domFrustum: DOMFrustum;
    /** Whether this TransformedMesh should be frustum culled (not drawn when outside of [camera]{@link CameraRenderer#camera} frustum) */
    frustumCulled: boolean;
    /** Margins (in pixels) to applied to the [DOM Frustum]{@link MeshTransformedBaseClass#domFrustum} to determine if this TransformedMesh should be frustum culled or not */
    DOMFrustumMargins: RectCoords;
    /** function assigned to the [onReEnterView]{@link MeshTransformedBaseClass#onReEnterView} callback */
    _onReEnterViewCallback: () => void;
    /** function assigned to the [onLeaveView]{@link MeshTransformedBaseClass#onLeaveView} callback */
    _onLeaveViewCallback: () => void;
    /**
     * {@link MeshTransformedBaseClass} constructor
     * @param renderer - our [renderer]{@link CameraRenderer} class object
     * @param element - a DOM HTML Element that can be bound to a Mesh
     * @param parameters - [Mesh base parameters]{@link MeshBaseParams}
     */
    constructor(renderer: CameraRenderer, element: HTMLElement | null, parameters: MeshBaseParams);
    /**
     * Set default shaders if one or both of them are missing
     */
    setShaders(): void;
    /**
     * Override {@link MeshBaseClass} method to add the domFrustum
     */
    computeGeometry(): void;
    /**
     * Set a Mesh matrices uniforms inputs then call {@link MeshBaseClass} super method
     * @param meshParameters - [RenderMaterial parameters]{@link RenderMaterialParams}
     */
    setMaterial(meshParameters: RenderMaterialParams): void;
    /**
     * Resize our Mesh
     * @param boundingRect - the new bounding rectangle
     */
    resize(boundingRect: DOMElementBoundingRect | null): void;
    /**
     * Apply scale and resize textures
     */
    applyScale(): void;
    /**
     * Get our {@link DOMFrustum} projected bounding rectangle
     * @readonly
     */
    get projectedBoundingRect(): DOMElementBoundingRect;
    /**
     * Tell the model and projection matrices to update.
     */
    shouldUpdateMatrixStack(): void;
    /**
     * Update the model and projection matrices if needed.
     */
    updateMatrixStack(): void;
    /**
     * At least one of the matrix has been updated, update according uniforms and frustum
     */
    onAfterMatrixStackUpdate(): void;
    /**
     * Assign a callback function to _onReEnterViewCallback
     * @param callback - callback to run when {@link MeshTransformedBaseClass} is reentering the view frustum
     * @returns - our Mesh
     */
    onReEnterView: (callback: () => void) => MeshTransformedBaseClass;
    /**
     * Assign a callback function to _onLeaveViewCallback
     * @param callback - callback to run when {@link MeshTransformedBaseClass} is leaving the view frustum
     * @returns - our Mesh
     */
    onLeaveView: (callback: () => void) => MeshTransformedBaseClass;
    /**
     * Called before rendering the Mesh to update matrices and {@link DOMFrustum}.
     * First, we update our matrices to have fresh results. It eventually calls onAfterMatrixStackUpdate() if at least one matrix has been updated.
     * Then we check if we need to update the {@link DOMFrustum} projected bounding rectangle.
     * Finally we call [Mesh base onBeforeRenderPass]{@link MeshBaseClass#onBeforeRenderPass} super
     */
    onBeforeRenderPass(): void;
    /**
     * Only render the Mesh if it is in view frustum.
     * Since render() is actually called before onRenderPass(), we are sure to have fresh frustum bounding rectangle values here.
     * @param pass - current render pass
     */
    onRenderPass(pass: GPURenderPassEncoder): void;
}
/**
 * MeshBase Mixin:
 * Used to mix Mesh properties and methods defined in {@link MeshTransformedBaseClass} with a {@link MeshBaseMixin} mixed with a given Base of type {@link ProjectedObject3D} or {@link DOMObject3D}.
 * @exports MeshTransformedMixin
 * @param {*} Base - the class to mix onto, should be of {@link ProjectedObject3D} or {@link DOMObject3D} type
 * @returns {module:MeshTransformedMixin~MeshTransformedBase} - the mixin class.
 */
declare function MeshTransformedMixin<TBase extends MixinConstructor>(Base: TBase): MixinConstructor<MeshTransformedBaseClass> & TBase;
export default MeshTransformedMixin;
