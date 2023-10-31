import { RectCoords } from '../../../core/DOM/DOMElement';
import { MeshBaseParams } from '../../../core/meshes/MeshBaseMixin';
export interface TransformedMeshParams {
    frustumCulled?: boolean;
    DOMFrustumMargins?: RectCoords;
}
export interface TransformedMeshMaterialParameters extends MeshBaseParams {
    frustumCulled: boolean;
    DOMFrustumMargins: RectCoords;
}
