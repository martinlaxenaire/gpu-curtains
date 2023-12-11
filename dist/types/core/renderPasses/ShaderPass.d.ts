import { FullscreenPlane } from '../meshes/FullscreenPlane';
import { Renderer } from '../renderers/utils';
import { RenderTarget } from './RenderTarget';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { MeshBaseRenderParams } from '../meshes/MeshBaseMixin';
/**
 * Parameters used to create a {@link ShaderPass}
 */
interface ShaderPassParams extends MeshBaseRenderParams {
    renderTarget?: RenderTarget;
}
/**
 * ShaderPass class:
 * Used to apply post processing, i.e. render meshes to a [render texture]{@link RenderTexture} and then draw a {@link FullscreenPlane} using that texture as an input.
 * A ShaderPass could either post process the whole scene or just a bunch of meshes using a {@link RenderTarget}.
 */
export declare class ShaderPass extends FullscreenPlane {
    /** {@link RenderTarget} content to use as an input if specified */
    renderTarget: RenderTarget | undefined;
    /**
     * ShaderPass constructor
     * @param renderer - [renderer]{@link Renderer} object or {@link GPUCurtains} class object used to create this {@link ShaderPass}
     * @param parameters - [parameters]{@link ShaderPassParams} use to create this {@link ShaderPass}
     */
    constructor(renderer: Renderer | GPUCurtains, parameters: ShaderPassParams);
    /**
     * Get our main [render texture]{@link RenderTexture}, the one that contains our post processed content
     * @readonly
     */
    get renderTexture(): import("../textures/RenderTexture").RenderTexture;
    /**
     * Assign or remove a {@link RenderTarget} to this {@link ShaderPass}
     * Since this manipulates the {@link Scene} stacks, it can be used to remove a RenderTarget as well.
     * Also copy or remove the [render target render texture]{@link RenderTarget#renderTexture} into the [shader pass render texture]{@link ShaderPass#renderTexture}
     * @param renderTarget - the {@link RenderTarget} to assign or null if we want to remove the current {@link RenderTarget}
     */
    setRenderTarget(renderTarget: RenderTarget | null): void;
    /**
     * Add the {@link ShaderPass} to the renderer and the {@link Scene}
     */
    addToScene(): void;
    /**
     * Remove the {@link ShaderPass} from the renderer and the {@link Scene}
     */
    removeFromScene(): void;
}
export {};
