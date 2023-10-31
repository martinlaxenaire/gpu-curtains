import { Renderer } from '../../utils/renderer-utils';
import { RenderPass } from './RenderPass';
import { RenderTexture } from '../textures/RenderTexture';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { RenderPassParams } from './RenderPass';
import { DOMElementBoundingRect } from '../DOM/DOMElement';
export interface RenderTargetParams extends RenderPassParams {
    autoAddToScene?: boolean;
}
export declare class RenderTarget {
    #private;
    renderer: Renderer;
    type: string;
    uuid: string;
    options: RenderTargetParams;
    renderPass: RenderPass;
    renderTexture: RenderTexture;
    constructor(renderer: Renderer | GPUCurtains, parameters: RenderTargetParams);
    addToScene(): void;
    removeFromScene(): void;
    resize(boundingRect: DOMElementBoundingRect): void;
    remove(): void;
    destroy(): void;
}
