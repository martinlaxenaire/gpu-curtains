/// <reference types="dist" />
import { CameraRenderer } from '../../utils/renderer-utils';
import { DOMFrustum } from '../DOM/DOMFrustum';
import MeshBaseMixin, { MeshBaseClass, MeshBaseOptions, MeshBaseParams, MixinConstructor } from './MeshBaseMixin';
import { DOMElementBoundingRect, RectCoords } from '../DOM/DOMElement';
export interface TransformedMeshParams {
    frustumCulled?: boolean;
    DOMFrustumMargins?: RectCoords;
}
export interface TransformedMeshBaseParameters extends MeshBaseParams {
    frustumCulled: boolean;
    DOMFrustumMargins: RectCoords;
}
export interface TransformedMeshBaseOptions extends MeshBaseOptions {
    frustumCulled?: boolean;
    DOMFrustumMargins?: RectCoords;
}
export declare class MeshTransformedBaseClass extends MeshBaseClass {
    domFrustum: DOMFrustum;
    frustumCulled: boolean;
    DOMFrustumMargins: RectCoords;
    _onReEnterViewCallback: () => void;
    _onLeaveViewCallback: () => void;
    constructor(renderer: CameraRenderer, element: HTMLElement | null, parameters: MeshBaseParams);
    computeGeometry(): void;
    setMaterial(materialParameters: MeshBaseParams): void;
    resize(boundingRect: DOMElementBoundingRect | null): void;
    applyScale(): void;
    get projectedBoundingRect(): DOMElementBoundingRect;
    updateSizePositionAndProjection(): void;
    updateMatrixStack(): void;
    onAfterMatrixStackUpdate(): void;
    onReEnterView: (callback: () => void) => MeshTransformedBaseClass;
    onLeaveView: (callback: () => void) => MeshTransformedBaseClass;
    onBeforeRenderPass(): void;
    onRenderPass(pass: GPURenderPassEncoder): void;
}
/**
 * MeshBase Mixin:
 * Used to mix Mesh properties and methods defined in {@see MeshTransformedBaseClass} with a {@see MeshBaseMixin} mixed with a given Base of type {@see Object3D}, {@see ProjectedObject3D}, {@see DOMObject3D} or an empty class.
 * @exports MeshTransformedMixin
 * @param {*} Base - the class to mix onto
 * @returns {module:MeshTransformedMixin~MeshTransformedBase} - the mixin class.
 */
declare function MeshTransformedMixin<TBase extends ReturnType<typeof MeshBaseMixin>>(Base: TBase): MixinConstructor<MeshTransformedBaseClass> & TBase;
export default MeshTransformedMixin;
