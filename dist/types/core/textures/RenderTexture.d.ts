/// <reference types="dist" />
import { Renderer } from '../../utils/renderer-utils';
import { TextureBindings } from '../bindings/TextureBindings';
import { BindGroupBindingElement } from '../../types/BindGroups';
import { RenderTextureParams } from '../../types/core/textures/RenderTexture';
import { GPUCurtains } from '../../curtains/GPUCurtains';
export declare class RenderTexture {
    renderer: Renderer;
    type: string;
    texture: GPUTexture;
    size: {
        width: number;
        height: number;
    };
    options: RenderTextureParams;
    bindings: BindGroupBindingElement[];
    shouldUpdateBindGroup: boolean;
    constructor(renderer: Renderer | GPUCurtains, parameters?: RenderTextureParams);
    setSourceSize(): void;
    createTexture(): void;
    setBindings(): void;
    get textureBinding(): TextureBindings;
    resize(): void;
    destroy(): void;
}
