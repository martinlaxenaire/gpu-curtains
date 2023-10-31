import { Renderer } from '../../utils/renderer-utils';
import { RenderTarget } from '../../core/renderPasses/RenderTarget';
import { FullscreenPlane } from '../../core/meshes/FullscreenPlane';
import { GPUCurtains } from '../GPUCurtains';
import { RenderTexture } from '../../core/textures/RenderTexture';
import { MeshBaseParams } from '../../core/meshes/MeshBaseMixin';
export declare class PingPongPlane extends FullscreenPlane {
    renderTarget: RenderTarget;
    constructor(renderer: Renderer | GPUCurtains, parameters?: MeshBaseParams);
    get renderTexture(): RenderTexture | null;
    addToScene(): void;
    removeFromScene(): void;
}
