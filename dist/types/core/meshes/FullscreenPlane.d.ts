import { MeshBaseRenderParams } from './mixins/MeshBaseMixin';
import { Renderer } from '../renderers/utils';
import { DOMElementBoundingRect, RectBBox } from '../DOM/DOMElement';
import { Vec2 } from '../../math/Vec2';
import { GPUCurtains } from '../../curtains/GPUCurtains';
declare const FullscreenPlane_base: import("./mixins/MeshBaseMixin").MixinConstructor<import("./mixins/MeshBaseMixin").MeshBaseClass> & {
    new (): {};
};
/**
 * Create a 1x1 quad (or plane) covering the full viewport, useful for postprocessing or background effects.
 *
 * It consists of a {@link PlaneGeometry} and {@link core/materials/RenderMaterial.RenderMaterial | RenderMaterial} and a few utilities method to help create {@link core/textures/Texture.Texture | Texture} and {@link core/textures/RenderTexture.RenderTexture | RenderTexture}.
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
 * // create a fullscreen plane
 * const fullscreenPlane = new FullscreenPlane(gpuCurtains, {
 *   label: 'My fullscreen plane',
 *   shaders: {
 *     fragment: {
 *       code: fragmentCode, // assume it is a valid WGSL fragment shader
 *     },
 *   },
 * })
 * ```
 */
export declare class FullscreenPlane extends FullscreenPlane_base {
    /** The type of the {@link FullscreenPlane} */
    type: string;
    /** Object defining the  {@link FullscreenPlane} size */
    size: {
        /** document HTML size */
        document: RectBBox;
    };
    /**
     * FullscreenPlane constructor
     * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link FullscreenPlane}
     * @param parameters - {@link MeshBaseRenderParams | parameters} use to create this {@link FullscreenPlane}
     */
    constructor(renderer: Renderer | GPUCurtains, parameters?: MeshBaseRenderParams);
    /**
     * Resize our {@link FullscreenPlane}
     * @param boundingRect - the new bounding rectangle
     */
    resize(boundingRect?: DOMElementBoundingRect | null): void;
    /**
     * Take the pointer {@link Vec2 | vector} position relative to the document and returns it relative to our {@link FullscreenPlane}
     * It ranges from -1 to 1 on both axis
     * @param mouseCoords - pointer {@link Vec2 | vector} coordinates
     * @returns - the mapped {@link Vec2 | vector} coordinates in the [-1, 1] range
     */
    mouseToPlaneCoords(mouseCoords?: Vec2): Vec2;
}
export {};
