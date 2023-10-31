/// <reference types="dist" />
import { CameraRenderer } from '../../utils/renderer-utils';
import { RenderMaterial } from '../materials/RenderMaterial';
import { Texture } from '../textures/Texture';
import { RenderTexture } from '../textures/RenderTexture';
import { CurtainsTextureOptions, TextureDefaultParams } from '../../types/core/textures/Texture';
import { RenderTarget } from '../renderPasses/RenderTarget';
import { RenderTextureParams } from '../../types/core/textures/RenderTexture';
import { Material } from '../materials/Material';
import { DOMElementBoundingRect } from '../DOM/DOMElement';
import { RenderMaterialParams } from '../../types/Materials';
export interface MeshBaseParams extends RenderMaterialParams {
    autoAddToScene: boolean;
    visible?: boolean;
    renderOrder?: number;
    renderTarget?: RenderTarget;
    texturesOptions?: CurtainsTextureOptions;
}
export interface MeshBaseOptions {
    label?: MeshBaseParams['label'];
    shaders: MeshBaseParams['shaders'];
    texturesOptions?: CurtainsTextureOptions;
    renderTarget?: RenderTarget | null;
    autoAddToScene?: boolean;
    useAsyncPipeline?: boolean;
}
export type MixinConstructor<T = {}> = new (...args: any[]) => T;
export declare class MeshBaseClass {
    type: string;
    readonly uuid: string;
    readonly index: number;
    renderer: CameraRenderer;
    options: MeshBaseOptions;
    material: RenderMaterial;
    geometry: MeshBaseParams['geometry'];
    renderTextures: RenderTexture[];
    textures: Texture[];
    renderTarget: null | RenderTarget;
    renderOrder: number;
    transparent: boolean;
    visible: boolean;
    _ready: boolean;
    _onReadyCallback: () => void;
    _onBeforeRenderCallback: () => void;
    _onRenderCallback: () => void;
    _onAfterRenderCallback: () => void;
    _onAfterResizeCallback: () => void;
    onReady: (callback: () => void) => MeshBaseClass;
    onBeforeRender: (callback: () => void) => MeshBaseClass;
    onRender: (callback: () => void) => MeshBaseClass;
    onAfterRender: (callback: () => void) => MeshBaseClass;
    onAfterResize: (callback: () => void) => MeshBaseClass;
    constructor(renderer: CameraRenderer, element: HTMLElement | null, parameters: MeshBaseParams);
    get autoAddToScene(): boolean;
    get ready(): boolean;
    set ready(value: boolean);
    setMeshMaterial(meshParameters: RenderMaterialParams): void;
    setMaterial(materialParameters: RenderMaterialParams): void;
    addToScene(): void;
    removeFromScene(): void;
    createTexture(options: TextureDefaultParams): Texture;
    onTextureCreated(texture: Texture): void;
    createRenderTexture(options: RenderTextureParams): RenderTexture;
    setRenderTarget(renderTarget: RenderTarget | null): void;
    get uniforms(): Material['uniforms'];
    get storages(): Material['storages'];
    resize(boundingRect?: DOMElementBoundingRect): void;
    onBeforeRenderPass(): void;
    onRenderPass(pass: GPURenderPassEncoder): void;
    onAfterRenderPass(): void;
    render(pass: GPURenderPassEncoder): void;
    remove(): void;
    destroy(): void;
}
/**
 * MeshBase Mixin:
 * Used to mix basic Mesh properties and methods defined in {@see MeshBaseClass} with a given Base of type {@see Object3D}, {@see ProjectedObject3D} or an empty class.
 * @exports MeshBaseMixin
 * @param {*} Base - the class to mix onto
 * @returns {module:MeshBaseMixin~MeshBase} - the mixin class.
 */
declare function MeshBaseMixin<TBase extends MixinConstructor>(Base: TBase): MixinConstructor<MeshBaseClass> & TBase;
export default MeshBaseMixin;
