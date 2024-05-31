/// <reference types="dist" />
import { CameraRenderer } from '../../renderers/utils';
import { DOMFrustum } from '../../DOM/DOMFrustum';
import { MeshBaseClass, MeshBaseOptions, MeshBaseParams, MixinConstructor } from './MeshBaseMixin';
import { DOMElementBoundingRect, RectCoords } from '../../DOM/DOMElement';
import { RenderMaterialParams } from '../../../types/Materials';
import { ProjectedObject3D } from '../../objects3D/ProjectedObject3D';
/**
 * Base parameters used to create a ProjectedMesh
 */
export interface ProjectedMeshBaseParams {
    /** Whether this ProjectedMesh should be frustum culled (not drawn when outside of {@link CameraRenderer#camera | camera} frustum) */
    frustumCulling?: boolean;
    /** Margins (in pixels) to applied to the {@link ProjectedMeshBaseClass#domFrustum | DOM Frustum} to determine if this ProjectedMesh should be frustum culled or not */
    DOMFrustumMargins?: RectCoords;
}
/** Parameters used to create a ProjectedMesh */
export interface ProjectedMeshParameters extends MeshBaseParams, ProjectedMeshBaseParams {
}
/** Parameters used to create a Projected Render Material */
export interface ProjectedRenderMaterialParams extends RenderMaterialParams, ProjectedMeshBaseParams {
}
/** Base options used to create this ProjectedMesh */
export interface ProjectedMeshBaseOptions extends MeshBaseOptions, ProjectedMeshBaseParams {
}
/**
 * This class describes the properties and methods to set up a Projected Mesh (i.e. a basic {@link MeshBaseClass | Mesh} with {@link ProjectedObject3D} transformations matrices and a {@link core/camera/Camera.Camera | Camera} to use for projection), implemented in the {@link ProjectedMeshBaseMixin}:
 * - Handle the frustum culling (check if the {@link ProjectedObject3D} currently lies inside the {@link core/camera/Camera.Camera | Camera} frustum)
 * - Add callbacks for when the Mesh enters or leaves the {@link core/camera/Camera.Camera | Camera} frustum
 */
export declare class ProjectedMeshBaseClass extends MeshBaseClass {
    /** The {@link CameraRenderer} used */
    renderer: CameraRenderer;
    /** The ProjectedMesh {@link DOMFrustum} class object */
    domFrustum: DOMFrustum;
    /** Whether this ProjectedMesh should be frustum culled (not drawn when outside of {@link CameraRenderer#camera | camera} frustum) */
    frustumCulling: boolean;
    /** Margins (in pixels) to applied to the {@link ProjectedMeshBaseClass#domFrustum | DOM Frustum} to determine if this ProjectedMesh should be frustum culled or not */
    DOMFrustumMargins: RectCoords;
    /** Options used to create this {@link ProjectedMeshBaseClass} */
    options: ProjectedMeshBaseOptions;
    /** function assigned to the {@link onReEnterView} callback */
    _onReEnterViewCallback: () => void;
    /** function assigned to the {@link onLeaveView} callback */
    _onLeaveViewCallback: () => void;
    /**
     * {@link ProjectedMeshBaseClass} constructor
     * @param renderer - our {@link CameraRenderer} class object
     * @param element - a DOM HTML Element that can be bound to a Mesh
     * @param parameters - {@link ProjectedMeshParameters | Projected Mesh base parameters}
     */
    constructor(renderer: CameraRenderer, element: HTMLElement | null, parameters: ProjectedMeshParameters);
    /**
     * Set default shaders if one or both of them are missing
     */
    setShaders(): void;
    /**
     * Set a Mesh matrices uniforms inputs then call {@link MeshBaseClass} super method
     * @param meshParameters - {@link RenderMaterialParams | RenderMaterial parameters}
     */
    setMaterial(meshParameters: ProjectedRenderMaterialParams): void;
    /**
     * Get the visible property value
     */
    get visible(): boolean;
    /**
     * Set the visible property value
     * @param value - new visibility value
     */
    set visible(value: boolean);
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
     * Callback to execute when a Mesh is reentering the view frustum.
     * @param callback - callback to run when {@link ProjectedMeshBaseClass} is reentering the view frustum
     * @returns - our Mesh
     */
    onReEnterView: (callback: () => void) => ProjectedMeshBaseClass;
    /**
     * Callback to execute when a Mesh is leaving the view frustum.
     * @param callback - callback to run when {@link ProjectedMeshBaseClass} is leaving the view frustum
     * @returns - our Mesh
     */
    onLeaveView: (callback: () => void) => ProjectedMeshBaseClass;
    /**
     * Check if the Mesh lies inside the {@link CameraRenderer#camera | camera} view frustum or not.
     */
    checkFrustumCulling(): void;
    /**
     * Tell our matrices bindings to update if needed and call {@link MeshBaseClass#onBeforeRenderPass | Mesh base onBeforeRenderPass} super.
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
 * Used to add the properties and methods defined in {@link ProjectedMeshBaseClass} to the {@link MeshBaseClass} and mix it with a given Base of type {@link ProjectedObject3D} or {@link curtains/objects3D/DOMObject3D.DOMObject3D | DOMObject3D}.
 * @exports
 * @param Base - the class to mix onto, should be of {@link ProjectedObject3D} or {@link curtains/objects3D/DOMObject3D.DOMObject3D | DOMObject3D} type
 * @returns - the mixed classes, creating a Projected Mesh.
 */
declare function ProjectedMeshBaseMixin<TBase extends MixinConstructor<ProjectedObject3D>>(Base: TBase): MixinConstructor<ProjectedMeshBaseClass> & TBase;
export { ProjectedMeshBaseMixin };
