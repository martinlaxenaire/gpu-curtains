import { Renderer } from '../../core/renderers/utils';
import { RenderTarget } from '../../core/renderPasses/RenderTarget';
import { FullscreenPlane } from '../../core/meshes/FullscreenPlane';
import { GPUCurtains } from '../GPUCurtains';
import { RenderTexture } from '../../core/textures/RenderTexture';
import { MeshBaseRenderParams } from '../../core/meshes/MeshBaseMixin';
/**
 * PingPongPlane class:
 * Used to create a special type of [fullscreen quad]{@link FullscreenPlane} that allows to use the previous frame fragment shader output as an input texture.
 */
export declare class PingPongPlane extends FullscreenPlane {
    /** {@link RenderTarget} content to use as an input */
    renderTarget: RenderTarget;
    /**
     * PingPongPlane constructor
     * @param renderer - [renderer]{@link Renderer} object or {@link GPUCurtains} class object used to create this {@link PingPongPlane}
     * @param parameters - [parameters]{@link MeshBaseRenderParams} use to create this {@link PingPongPlane}
     */
    constructor(renderer: Renderer | GPUCurtains, parameters?: MeshBaseRenderParams);
    /**
     * Get our main [render texture]{@link RenderTexture}, the one that contains our ping pong content
     * @readonly
     */
    get renderTexture(): RenderTexture | null;
    /**
     * Add the {@link PingPongPlane} to the renderer and the {@link Scene}
     */
    addToScene(): void;
    /**
     * Remove the {@link PingPongPlane} from the renderer and the {@link Scene}
     */
    removeFromScene(): void;
}
