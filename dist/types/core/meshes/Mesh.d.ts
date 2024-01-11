import { CameraRenderer } from '../renderers/utils';
import { ProjectedObject3D } from '../objects3D/ProjectedObject3D';
import { MeshBaseParams } from './mixins/MeshBaseMixin';
import { GPUCurtains } from '../../curtains/GPUCurtains';
declare const Mesh_base: import("./mixins/MeshBaseMixin").MixinConstructor<import("./mixins/ProjectedMeshBaseMixin").ProjectedMeshBaseClass> & typeof ProjectedObject3D;
/**
 * Create a Mesh, with model and projection matrices.
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
 * const mesh = new Mesh(gpuCurtains, {
 *   geometry: new BoxGeometry(),
 * })
 * ```
 */
export declare class Mesh extends Mesh_base {
    constructor(renderer: CameraRenderer | GPUCurtains, parameters?: MeshBaseParams);
}
export {};
