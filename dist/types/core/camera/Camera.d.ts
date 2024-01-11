import { Mat4 } from '../../math/Mat4';
import { Object3D, Object3DMatricesType, Object3DTransformMatrix } from '../objects3D/Object3D';
import { RectSize } from '../DOM/DOMElement';
import { Vec3 } from '../../math/Vec3';
/**
 * Defines Camera basic perspective options
 */
export interface CameraBasePerspectiveOptions {
    /** {@link Camera} perspective field of view. Should be greater than 0 and lower than 180 */
    fov?: number;
    /** {@link Camera} near plane, the closest point where a mesh vertex is drawn */
    near?: number;
    /** {@link Camera} far plane, the farthest point where a mesh vertex is drawn */
    far?: number;
}
/**
 * Defines all Camera perspective options
 */
export interface CameraPerspectiveOptions extends CameraBasePerspectiveOptions {
    /** {@link Camera} frustum width */
    width?: number;
    /** {@link Camera} frustum height */
    height?: number;
    /** {@link Camera} pixel ratio */
    pixelRatio?: number;
}
/**
 * An object defining all possible {@link Camera} class instancing parameters
 */
export interface CameraParams extends CameraPerspectiveOptions {
    /** callback to execute when one of the {@link Camera#matrices | camera matrices} changed */
    onMatricesChanged?: () => void;
}
/** Defines all kind of possible {@link core/objects3D/ProjectedObject3D.ProjectedObject3D | ProjectedObject3D} matrix types */
export type CameraObject3DMatricesType = Object3DMatricesType | 'projection' | 'view';
/** Defines all possible {@link Object3DTransformMatrix | matrix object} used by our {@link core/objects3D/ProjectedObject3D.ProjectedObject3D | ProjectedObject3D} */
export type CameraObject3DMatrices = Record<CameraObject3DMatricesType, Object3DTransformMatrix>;
/**
 * Used to create a perspective {@link Camera} and its projection, model and view matrices.
 *
 * {@link curtains/renderers/GPUCurtainsRenderer.GPUCurtainsRenderer | GPUCurtainsRenderer} and {@link core/renderers/GPUCameraRenderer.GPUCameraRenderer | GPUCameraRenderer} automatically create their own {@link Camera} under the hood, so it is unlikely you'd have to create one by yourself.
 *
 * {@link Camera} default perspective settings are:
 * - {@link Camera#fov | field of view}: 50
 * - {@link Camera#near | near plane}: 0.01
 * - {@link Camera#far | far plane}: 150
 *
 * Also note that the {@link Camera} default {@link Camera#position | position} is set at `(0, 0, 10)` so the object created with a default size do not appear too big nor too small.
 */
export declare class Camera extends Object3D {
    #private;
    /** {@link CameraObject3DMatrices | Matrices object} of the {@link Camera} */
    matrices: CameraObject3DMatrices;
    /** The {@link Camera} frustum width and height */
    size: RectSize;
    /** Callback to execute when one of the camera {@link matrices} changed */
    onMatricesChanged?: () => void;
    /** A number representing what CSS perspective value (in pixel) should be used to obtain the same perspective effect as this {@link Camera} */
    CSSPerspective: number;
    /** An object containing the visible width / height at a given z-depth from our camera parameters */
    screenRatio: RectSize;
    /**
     * Camera constructor
     * @param parameters - {@link CameraParams | parameters} used to create our {@link Camera}
     */
    constructor({ fov, near, far, width, height, pixelRatio, onMatricesChanged, }?: CameraParams);
    /**
     * Set our transform and projection matrices
     */
    setMatrices(): void;
    /**
     * Get our view matrix
     * @readonly
     */
    get viewMatrix(): Mat4;
    set viewMatrix(value: Mat4);
    /**
     * Get our projection matrix
     * @readonly
     */
    get projectionMatrix(): Mat4;
    set projectionMatrix(value: Mat4);
    /**
     * Set our projection matrix shouldUpdate flag to true (tell it to update)
     */
    shouldUpdateProjectionMatrix(): void;
    /**
     * Update our model matrix and tell our view matrix to update as well
     */
    updateModelMatrix(): void;
    /**
     * Get the {@link Camera} {@link fov | field of view}
     */
    get fov(): number;
    /**
     * Set the {@link Camera} {@link fov | field of view}. Update the {@link projectionMatrix} only if the field of view actually changed
     * @param fov - new field of view
     */
    set fov(fov: number);
    /**
     * Get the {@link Camera} {@link near} plane value.
     */
    get near(): number;
    /**
     * Set the {@link Camera} {@link near} plane value. Update the {@link projectionMatrix} only if the near plane actually changed
     * @param near - new near plane value
     */
    set near(near: number);
    /**
     * Get / set the {@link Camera} {@link far} plane value.
     */
    get far(): number;
    /**
     * Set the {@link Camera} {@link far} plane value. Update {@link projectionMatrix} only if the far plane actually changed
     * @param far - new far plane value
     */
    set far(far: number);
    /**
     * Get the {@link Camera} {@link pixelRatio} value.
     */
    get pixelRatio(): number;
    /**
     * Set the {@link Camera} {@link pixelRatio} value. Update the {@link CSSPerspective} only if the pixel ratio actually changed
     * @param pixelRatio - new pixel ratio value
     */
    set pixelRatio(pixelRatio: number);
    /**
     * Set the {@link Camera} {@link width} and {@link height}. Update the {@link projectionMatrix} only if the width or height actually changed
     * @param size - {@link width} and {@link height} values to use
     */
    setSize({ width, height }: RectSize): void;
    /**
     * Sets the {@link Camera} perspective. Update the {@link projectionMatrix} if needed.
     * @param parameters - {@link CameraPerspectiveOptions | parameters} to use for the perspective
     */
    setPerspective({ fov, near, far, width, height, pixelRatio, }?: CameraPerspectiveOptions): void;
    /**
     * Callback to run when the camera {@link modelMatrix | model matrix} has been updated
     */
    onAfterMatrixStackUpdate(): void;
    /**
     * Sets a {@link CSSPerspective} property based on {@link size}, {@link pixelRatio} and {@link fov}.<br>
     * Used to translate planes along the Z axis using pixel units as CSS would do.<br>
     * {@link https://stackoverflow.com/questions/22421439/convert-field-of-view-value-to-css3d-perspective-value | See reference}
     */
    setCSSPerspective(): void;
    /**
     * Sets visible width / height at a given z-depth from our {@link Camera} parameters.<br>
     * {@link https://discourse.threejs.org/t/functions-to-calculate-the-visible-width-height-at-a-given-z-depth-from-a-perspective-camera/269 | See reference}
     * @param depth - depth to use for calculations
     */
    setScreenRatios(depth?: number): void;
    /**
     * Rotate this {@link Camera} so it looks at the {@link Vec3 | target}
     * @param target - {@link Vec3 | target} to look at
     */
    lookAt(target?: Vec3): void;
    /**
     * Updates the {@link Camera} {@link projectionMatrix}
     */
    updateProjectionMatrix(): void;
}
