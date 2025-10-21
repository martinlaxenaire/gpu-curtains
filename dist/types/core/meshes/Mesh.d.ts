import { CameraRenderer } from '../renderers/utils';
import { ProjectedObject3D } from '../objects3D/ProjectedObject3D';
import { ProjectedMeshParameters } from './mixins/ProjectedMeshBaseMixin';
import { GPUCurtains } from '../../curtains/GPUCurtains';
/** Parameters used to create a {@link Mesh}. */
export interface MeshParams extends Omit<ProjectedMeshParameters, 'useProjection'> {
}
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
 * ### Default shaders
 *
 * If one or all shaders are missing, the library will use default ones.
 *
 * #### Default vertex shader:
 *
 * ```wgsl
 * struct VSOutput {
 *   @builtin(position) position: vec4f,
 *   @location(0) uv: vec2f,
 *   @location(1) normal: vec3f,
 *   @location(2) worldPosition: vec3f,
 *   @location(3) viewDirection: vec3f,
 * };
 *
 * @vertex fn main(
 *   attributes: Attributes,
 * ) -> VSOutput {
 *   var vsOutput: VSOutput;
 *
 *   vsOutput.position = getOutputPosition(attributes.position);
 *   vsOutput.uv = attributes.uv;
 *   vsOutput.normal = getWorldNormal(attributes.normal);
 *   vsOutput.worldPosition = getWorldPosition(attributes.position).xyz;
 *   vsOutput.viewDirection = camera.position - vsOutput.worldPosition;
 *
 *   return vsOutput;
 * }
 * ```
 *
 * #### Default fragment shader:
 *
 * ```wgsl
 * struct VSOutput {
 *   @builtin(position) position: vec4f,
 *   @location(0) uv: vec2f,
 *   @location(1) normal: vec3f,
 * };
 *
 * @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
 *   // normals
 *   return vec4(normalize(fsInput.normal) * 0.5 + 0.5, 1.0);
 * }
 * ```
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
     * @param renderer - {@link CameraRenderer} object or {@link GPUCurtains} class object used to create this {@link Mesh}.
     * @param parameters - {@link MeshParams | parameters} use to create this {@link Mesh}.
     */
    constructor(renderer: CameraRenderer | GPUCurtains, parameters?: MeshParams);
}
export {};
