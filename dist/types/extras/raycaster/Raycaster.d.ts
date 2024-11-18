import { Vec2 } from '../../math/Vec2';
import { Vec3 } from '../../math/Vec3';
import { CameraRenderer } from '../../core/renderers/utils';
import { Camera } from '../../core/camera/Camera';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { ProjectedMesh } from '../../core/renderers/GPURenderer';
import { IndexBuffer } from '../../core/geometries/IndexedGeometry';
import { VertexBufferAttribute } from '../../types/Geometries';
import { Object3D } from '../../core/objects3D/Object3D';
/**
 * Defines the returned values when an intersection between the {@link Raycaster#ray | ray} and a {@link ProjectedMesh | projected mesh} has been found.
 */
export interface Intersection {
    /** Intersected {@link ProjectedMesh | projected mesh}. */
    object: ProjectedMesh;
    /** Distance from the {@link Raycaster#ray | ray} origin to the intersection point. */
    distance: number;
    /** {@link Vec3 | Coordinate} of the intersection point in {@link object} local space. */
    localPoint: Vec3;
    /** {@link Vec3 | Coordinate} of the intersection point in world space. */
    point: Vec3;
    /** The triangle (as an array of {@link Vec3} vertices) inside which lies the intersection point. */
    triangle: Vec3[];
    /** Index of the triangle in the {@link ProjectedMesh | projected mesh} geometry position or index array. */
    triangleIndex: number;
    /** Interpolated {@link Vec2 | uv coordinates} of the intersection point. */
    uv?: Vec2;
    /** Interpolated {@link Vec3 | normal} of the intersection point, in {@link object} local space. */
    normal?: Vec3;
}
/**
 * Utility to help with raycasting (determining what objects in the 3d space the mouse is over).
 *
 * @example
 * ```javascript
 * // set our main GPUCurtains instance
 * const gpuCurtains = new GPUCurtains({
 *   container: '#canvas' // selector of our WebGPU canvas container
 * })
 *
 * // set the GPU device
 * // note this is asynchronous
 * await gpuCurtains.setDevice()
 *
 * // create a mesh with a box geometry
 * // will use the normals colors as default shading
 * const mesh = new Mesh(gpuCurtains, {
 *   label: 'My mesh',
 *   geometry: new BoxGeometry(),
 * })
 *
 * const raycaster = new Raycaster(gpuCurtains)
 *
 * window.addEventListener('mousemove', (e) => {
 *   raycaster.setFromMouse(e)
 *
 *   const intersections = raycaster.intersectObject(mesh)
 *
 *   if(intersections.length) {
 *     // the mouse is hovering the mesh
 *     mesh.scale.set(1.25)
 *   } else {
 *     // the mouse is not hovering the mesh
 *     mesh.scale.set(1)
 *   }
 * })
 * ```
 */
export declare class Raycaster {
    #private;
    /** The type of the {@link Raycaster}. */
    type: string;
    /** The {@link CameraRenderer} used. */
    renderer: CameraRenderer;
    /** The {@link Camera} used. */
    camera: Camera | null;
    /** Pointer position in normalized device coordinates (in the [-1, 1] range). */
    pointer: Vec2;
    /** Ray used to test for intersections. */
    ray: {
        /** Origin of the ray in world space ({@link Camera} position). */
        origin: Vec3;
        /** Normalized direction of the ray in world space. */
        direction: Vec3;
    };
    /**
     * Raycaster constructor
     * @param renderer - {@link CameraRenderer} object or {@link GPUCurtains} class object used to create this {@link Raycaster}
     */
    constructor(renderer: CameraRenderer | GPUCurtains);
    /**
     * Set the {@link pointer} normalized device coordinates values (in the [-1, 1] range) based on a mouse/pointer/touch event and the {@link CameraRenderer#boundingRect | renderer bounding rectangle}. Useful if the canvas has a fixed position for example, but you might need to directly use {@link setFromNDCCoords} if not.
     * @param e - Mouse, pointer or touch event.
     */
    setFromMouse(e: MouseEvent | PointerEvent | TouchEvent): void;
    /**
     * Set the {@link pointer} normalized device coordinates (in the [-1, 1] range).
     * @param x - input position along the X axis in the [-1, 1] range where `-1` represents the left edge and `1` the right edge.
     * @param y - input position along the Y axis in the [-1, 1] range where `-1` represents the bottom edge and `1` the top edge.
     */
    setFromNDCCoords(x?: number, y?: number): void;
    /**
     * Sets the {@link ray} origin and direction based on the {@link camera} and the normalized device coordinates of the {@link pointer}.
     */
    setRay(): void;
    /**
     * Ray-Triangle Intersection with Möller–Trumbore Algorithm.
     * @param intersectionPoint - {@link Vec3} to store the intersection point if any.
     * @returns - Whether an intersection point has been found or not.
     */
    rayIntersectsTriangle(intersectionPoint: Vec3): boolean;
    /**
     * Find the barycentric contributions of a given intersection point lying inside our current triangle.
     * @param intersectionPoint - Given {@link Vec3 | intersection point}.
     * @returns - {@link Vec3} barycentric contributions.
     */
    getBarycentricCoordinates(intersectionPoint: Vec3): Vec3;
    /**
     * Get a rough estimation of the current normal of our current triangle, in local space.
     * @returns - {@link Vec3} normal.
     */
    getTriangleNormal(): Vec3;
    /**
     * Set our input vector with the desired attribute value at the given offset defined by our triangleIndex, offset and whether we're using and indexed geometry or not.
     * @param triangleIndex - Index of the triangle for which to look our attribute value.
     * @param offset - Index of the point inside our triangle (`0`, `1` or `2`).
     * @param indices - Indexed geometry array if defined or `null`.
     * @param attribute - {@link VertexBufferAttribute | Vertex buffer attribute} to get the value from.
     * @param vector - Input vector to set (can either be a {@link Vec2} or {@link Vec3}).
     */
    setAttributeVectorAtIndex(triangleIndex: number, offset: number, indices: IndexBuffer['array'] | null, attribute: VertexBufferAttribute, vector: Vec2 | Vec3): void;
    /**
     * Test whether the {@link ray} is intersecting a given object, if the is object is actually a {@link ProjectedMesh | projected mesh}.
     * Then, if the recursive flag is set to `true`, test if the {@link Object3D#children | object's children} are intersecting as well.
     * @param object - {@link Object3D | object} to test against.
     * @param recursive - Whether we should also test against the {@link Object3D#children | object's children}. Default to `true`.
     * @param intersections - Already existing {@link Intersection | intersections} if any.
     * @returns - Updated {@link Intersection | intersections}.
     */
    intersectObject(object: Object3D, recursive?: boolean, intersections?: Intersection[]): Intersection[];
    /**
     * Test whether the {@link ray} is intersecting a given array of objects.
     * If the recursive flag is set to `true`, test if each {@link Object3D#children | object's children} are intersecting as well.
     * @param objects - Array of {@link Object3D | objects} to test against.
     * @param recursive - Whether we should also test against each {@link Object3D#children | object's children}. Default to `true`.
     * @param intersections - Already existing {@link Intersection | intersections} if any.
     * @returns - Updated {@link Intersection | intersections}.
     */
    intersectObjects(objects: Object3D[], recursive?: boolean, intersections?: Intersection[]): Intersection[];
}
