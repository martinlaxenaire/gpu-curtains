import { DOMObject3D } from '../objects3D/DOMObject3D';
import { MeshBaseParams } from '../../core/meshes/MeshBaseMixin';
import { GPUCurtainsRenderer } from '../renderers/GPUCurtainsRenderer';
import { GPUCurtains } from '../GPUCurtains';
import { Texture } from '../../core/textures/Texture';
import { AllowedGeometries } from '../../types/Materials';
export interface DOMMeshBaseParams extends MeshBaseParams {
    autoloadSources?: boolean;
    watchScroll?: boolean;
}
export interface DOMMeshParams extends DOMMeshBaseParams {
    geometry: AllowedGeometries;
}
declare const DOMMesh_base: import("../../core/meshes/MeshBaseMixin").MixinConstructor<import("../../core/meshes/MeshTransformedMixin").MeshTransformedBaseClass> & import("../../core/meshes/MeshBaseMixin").MixinConstructor<import("../../core/meshes/MeshBaseMixin").MeshBaseClass> & typeof DOMObject3D;
export declare class DOMMesh extends DOMMesh_base {
    autoloadSources: boolean;
    _sourcesReady: boolean;
    _onLoadingCallback: (texture: Texture) => void;
    constructor(renderer: GPUCurtainsRenderer | GPUCurtains, element: string | HTMLElement, parameters: DOMMeshParams);
    get ready(): boolean;
    set ready(value: boolean);
    get sourcesReady(): boolean;
    set sourcesReady(value: boolean);
    get DOMMeshReady(): boolean;
    addToScene(): void;
    removeFromScene(): void;
    setInitSources(): void;
    resetDOMElement(element: string | HTMLElement): void;
    /** EVENTS **/
    onLoading(callback: (texture: Texture) => void): DOMMesh;
}
export {};
