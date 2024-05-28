import { Renderer } from '../../core/renderers/utils';
import { RenderTarget } from '../../core/renderPasses/RenderTarget';
import { FullscreenPlane } from '../../core/meshes/FullscreenPlane';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { Texture } from '../../core/textures/Texture';
import { MeshBaseRenderParams } from '../../core/meshes/mixins/MeshBaseMixin';
/**
 * Used to create a special type of {@link FullscreenPlane} that allows to use the previous frame fragment shader output as an input texture.
 *
 * @example
 * ```javascript
 * // set our main GPUCurtains instance
 * const gpuCurtains = new GPUCurtains({
 *   container: '#canvas' // selector of our WebGPU canvas container
 * })
 *
 * // set the GPU device
 * // note this is asynchronous
 * await gpuCurtains.setDevice()
 *
 * // create a PingPongPlane
 * const shaderPass = new PingPongPlane(gpuCurtain, {
 *   label: 'My ping pong plane',
 *   shaders: {
 *     fragment: {
 *       code: pingPongCode, // assume it is a valid WGSL fragment shader
 *     },
 *   },
 * })
 * ```
 */
export declare class PingPongPlane extends FullscreenPlane {
    /** {@link RenderTarget} content to use as an input */
    outputTarget: RenderTarget;
    /**
     * PingPongPlane constructor
     * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link PingPongPlane}
     * @param parameters - {@link MeshBaseRenderParams | parameters} use to create this {@link PingPongPlane}
     */
    constructor(renderer: Renderer | GPUCurtains, parameters?: MeshBaseRenderParams);
    /**
     * Get our main {@link Texture}, the one that contains our ping pong content
     * @readonly
     */
    get renderTexture(): Texture | undefined;
    /**
     * Add the {@link PingPongPlane} to the {@link core/scenes/Scene.Scene | Scene} and optionally to the renderer.
     * @param addToRenderer - whether to add this {@link PingPongPlane} to the {@link Renderer#pingPongPlanes | Renderer pingPongPlanes array}
     */
    addToScene(addToRenderer?: boolean): void;
    /**
     * Remove the {@link PingPongPlane} from the {@link core/scenes/Scene.Scene | Scene} and optionally from the renderer as well.
     * @param removeFromRenderer - whether to remove this {@link PingPongPlane} from the {@link Renderer#pingPongPlanes | Renderer pingPongPlanes array}
     */
    removeFromScene(removeFromRenderer?: boolean): void;
}
