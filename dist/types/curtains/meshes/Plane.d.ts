import { DOMMesh, DOMMeshBaseParams } from './DOMMesh';
import { Vec2 } from '../../math/Vec2';
import { PlaneGeometryParams } from '../../core/geometries/PlaneGeometry';
import { GPUCurtainsRenderer } from '../renderers/GPUCurtainsRenderer';
import { GPUCurtains } from '../GPUCurtains';
interface PlaneParams extends DOMMeshBaseParams, PlaneGeometryParams {
}
export declare class Plane extends DOMMesh {
    constructor(renderer: GPUCurtainsRenderer | GPUCurtains, element: HTMLElement | string, parameters?: PlaneParams);
    mouseToPlaneCoords(mouseCoords?: Vec2): Vec2;
}
export {};
