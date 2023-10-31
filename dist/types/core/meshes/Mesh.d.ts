import { CameraRenderer } from '../../utils/renderer-utils';
import { ProjectedObject3D } from '../objects3D/ProjectedObject3D';
import { MeshBaseParams } from './MeshBaseMixin';
import { GPUCurtains } from '../../curtains/GPUCurtains';
declare const Mesh_base: import("./MeshBaseMixin").MixinConstructor<import("./MeshTransformedMixin").MeshTransformedBaseClass> & import("./MeshBaseMixin").MixinConstructor<import("./MeshBaseMixin").MeshBaseClass> & typeof ProjectedObject3D;
/**
 * Mesh class:
 * Create a Mesh, with model and projection matrices.
 * TODO!
 * @extends MeshTransformedMixin
 * @mixes {MeshBaseMixin~ProjectedObject3D}
 */
export declare class Mesh extends Mesh_base {
    constructor(renderer: CameraRenderer | GPUCurtains, parameters?: MeshBaseParams);
}
export {};
