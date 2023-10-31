/// <reference types="dist" />
import { Renderer } from '../../utils/renderer-utils';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { DOMElementBoundingRect } from '../DOM/DOMElement';
export interface RenderPassParams {
    label?: string;
    depth?: boolean;
    loadOp?: GPULoadOp;
    clearValue?: GPUColor;
}
export declare class RenderPass {
    renderer: Renderer;
    type: string;
    uuid: string;
    options: {
        label: string;
        depth: boolean;
        loadOp: GPULoadOp;
        clearValue: GPUColor;
    };
    size: {
        width: number;
        height: number;
    };
    sampleCount: Renderer['sampleCount'];
    depthTexture: GPUTexture | undefined;
    renderTexture: GPUTexture;
    descriptor: GPURenderPassDescriptor;
    constructor(renderer: Renderer | GPUCurtains, { label, depth, loadOp, clearValue }?: RenderPassParams);
    createDepthTexture(): void;
    createRenderTexture(): void;
    resetRenderPassDepth(): void;
    resetRenderPassView(): void;
    setRenderPassDescriptor(): void;
    setSize(boundingRect: DOMElementBoundingRect): void;
    resize(boundingRect: DOMElementBoundingRect): void;
    setLoadOp(loadOp?: GPULoadOp): void;
    destroy(): void;
}
