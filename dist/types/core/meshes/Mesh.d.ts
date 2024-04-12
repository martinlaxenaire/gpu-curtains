import { CameraRenderer } from '../renderers/utils';
import { ProjectedObject3D } from '../objects3D/ProjectedObject3D';
import { MeshBaseParams } from './mixins/MeshBaseMixin';
import { GPUCurtains } from '../../curtains/GPUCurtains';
declare const Mesh_base: import("./mixins/MeshBaseMixin").MixinConstructor<import("./mixins/ProjectedMeshBaseMixin").ProjectedMeshBaseClass> & typeof ProjectedObject3D;
/**
 * Create a 3D Mesh.
 *
 * A 3D Mesh is a basically a {@link ProjectedObject3D} with a {@link core/geometries/Geometry.Geometry | Geometry} and a {@link core/materials/RenderMaterial.RenderMaterial | RenderMaterial}.
 *
 * You need to pass at least a valid {@link core/geometries/Geometry.Geometry | Geometry} as parameter.<br>
 * If no shaders are provided, it will use the normals colors as default shading.
 *
 * ## Shaders bindings and default attributes and uniforms
 *
 * The shaders are automatically patched with the input {@link core/bindGroups/BindGroup.BindGroup | bind groups} and {@link core/bindings/BufferBinding.BufferBinding | bindings} defined in your parameters object, as well as some default attributes and uniforms (see {@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry | RenderPipelineEntry}).
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
 * ```
 */
export declare class Mesh extends Mesh_base {
    /**
     * Mesh constructor
     * @param renderer - {@link CameraRenderer} object or {@link GPUCurtains} class object used to create this {@link Mesh}
     * @param parameters - {@link MeshBaseParams | parameters} use to create this {@link Mesh}
     */
    constructor(renderer: CameraRenderer | GPUCurtains, parameters: MeshBaseParams);
}
export {};
