import { CameraRenderer } from '../renderers/utils';
import { ProjectedObject3D } from '../objects3D/ProjectedObject3D';
import { MeshBaseParams } from './MeshBaseMixin';
import { GPUCurtains } from '../../curtains/GPUCurtains';
declare const Mesh_base: import("./MeshBaseMixin").MixinConstructor<import("./MeshTransformedMixin").MeshTransformedBaseClass> & typeof ProjectedObject3D;
/**
 * @typedef {object} MeshBaseMixin
 * @extends ProjectedObject3D
 */
/**
 * Mesh class:
 * Create a Mesh, with model and projection matrices.
 * TODO!
 * @extends MeshTransformedMixin
 * @mixes {MeshBaseMixin}
 */
export declare class Mesh extends Mesh_base {
    constructor(renderer: CameraRenderer | GPUCurtains, parameters?: MeshBaseParams);
}
export {};
