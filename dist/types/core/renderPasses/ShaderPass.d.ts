import { FullscreenPlane } from '../meshes/FullscreenPlane';
import { Renderer } from '../../utils/renderer-utils';
import { RenderTarget } from './RenderTarget';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { MeshBaseParams } from '../meshes/MeshBaseMixin';
interface ShaderPassParams extends MeshBaseParams {
    renderTarget?: RenderTarget;
}
export declare class ShaderPass extends FullscreenPlane {
    renderTarget: RenderTarget | undefined;
    constructor(renderer: Renderer | GPUCurtains, parameters: ShaderPassParams);
    get renderTexture(): import("../textures/RenderTexture").RenderTexture;
    addToScene(): void;
    removeFromScene(): void;
}
export {};
