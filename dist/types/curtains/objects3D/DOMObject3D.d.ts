import { ProjectedObject3D } from '../../core/objects3D/ProjectedObject3D';
import { GPUCurtainsRenderer } from '../renderers/GPUCurtainsRenderer';
import { GPUCurtains } from '../GPUCurtains';
import { DOMElement, DOMElementBoundingRect, RectBBox } from '../../core/DOM/DOMElement';
import { Vec3 } from '../../math/Vec3';
import { Camera } from '../../core/camera/Camera';
import { Object3DTransforms } from '../../core/objects3D/Object3D';
export interface DOMObject3DSize {
    world: RectBBox;
    document: RectBBox;
}
export interface DOMObject3DTransforms extends Omit<Object3DTransforms, 'origin' | 'position'> {
    origin: {
        model: Vec3;
        world: Vec3;
    };
    position: {
        world: Vec3;
        document: Vec3;
    };
}
export interface DOMObject3DParams {
    watchScroll?: boolean;
}
export declare class DOMObject3D extends ProjectedObject3D {
    #private;
    renderer: GPUCurtainsRenderer;
    camera: Camera;
    size: DOMObject3DSize;
    domElement: DOMElement;
    watchScroll: boolean;
    transforms: DOMObject3DTransforms;
    constructor(renderer: GPUCurtainsRenderer | GPUCurtains, element: string | HTMLElement, parameters: DOMObject3DParams);
    setDOMElement(element: string | HTMLElement): void;
    resetDOMElement(element: string | HTMLElement): void;
    updateSizeAndPosition(): void;
    updateSizePositionAndProjection(): void;
    resize(boundingRect?: DOMElementBoundingRect | null): void;
    /*** BOUNDING BOXES GETTERS ***/
    /***
     Useful to get our plane HTML element bounding rectangle without triggering a reflow/layout
  
     returns :
     @boundingRectangle (obj): an object containing our plane HTML element bounding rectangle (width, height, top, bottom, right and left properties)
     ***/
    get boundingRect(): DOMElementBoundingRect;
    /** TRANSFOMS **/
    setTransforms(): void;
    get documentPosition(): Vec3;
    set documentPosition(value: Vec3);
    get worldScale(): Vec3;
    get worldPosition(): Vec3;
    get transformOrigin(): Vec3;
    set transformOrigin(value: Vec3);
    get worldTransformOrigin(): Vec3;
    set worldTransformOrigin(value: Vec3);
    /***
     This will set our plane position by adding plane computed bounding box values and computed relative position values
     ***/
    applyPosition(): void;
    applyDocumentPosition(): void;
    applyTransformOrigin(): void;
    /** MATRICES **/
    updateModelMatrix(): void;
    /***
     This function takes pixel values along X and Y axis and convert them to world space coordinates
  
     params :
     @vector (Vec3): position to convert on X, Y and Z axes
  
     returns :
     @worldPosition: plane's position in WebGL space
     ***/
    documentToWorldSpace(vector?: Vec3): Vec3;
    setWorldSizes(): void;
    setWorldTransformOrigin(): void;
    updateScrollPosition(lastXDelta?: number, lastYDelta?: number): void;
    destroy(): void;
}
