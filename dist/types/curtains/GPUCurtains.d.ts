import { GPUCurtainsRenderer } from './renderers/GPUCurtainsRenderer';
import { ScrollManager } from '../utils/ScrollManager';
import { Vec3 } from '../math/Vec3';
import { PingPongPlane } from './meshes/PingPongPlane';
import { ShaderPass } from '../core/renderPasses/ShaderPass';
import { MeshType } from '../core/renderers/GPURenderer';
import { DOMMesh } from './meshes/DOMMesh';
import { Plane } from './meshes/Plane';
import { ComputePass } from '../core/computePasses/ComputePass';
import { Camera } from '../core/camera/Camera';
import { DOMElementBoundingRect } from '../core/DOM/DOMElement';
import { GPUCameraRendererParams } from '../core/renderers/GPUCameraRenderer';
interface GPUCurtainsOptions extends Omit<GPUCameraRendererParams, 'onError'> {
    autoRender?: boolean;
    autoResize?: boolean;
    watchScroll?: boolean;
}
interface GPUCurtainsParams extends Partial<Omit<GPUCurtainsOptions, 'container'>> {
    container?: string | HTMLElement | null;
}
export declare class GPUCurtains {
    type: string;
    options: GPUCurtainsOptions;
    container: HTMLElement;
    renderer: GPUCurtainsRenderer;
    canvas: GPUCurtainsRenderer['canvas'];
    scrollManager: ScrollManager;
    animationFrameID: null | number;
    _onRenderCallback: () => void;
    _onScrollCallback: () => void;
    _onAfterResizeCallback: () => void;
    _onErrorCallback: () => void;
    constructor({ container, pixelRatio, sampleCount, preferredFormat, production, camera, autoRender, autoResize, watchScroll, }: GPUCurtainsParams);
    /**
     * Set container
     *
     * @param container
     */
    setContainer(container: string | HTMLElement): void;
    /**
     * Set renderer
     */
    setRenderer(): void;
    setRendererContext(): Promise<void>;
    /**
     * Set Curtains
     */
    setCurtains(): void;
    /** Renderer objects **/
    get pingPongPlanes(): PingPongPlane[];
    get shaderPasses(): ShaderPass[];
    get meshes(): MeshType[];
    get domMeshes(): DOMMesh[];
    get planes(): Plane[];
    get computePass(): ComputePass[];
    get camera(): Camera;
    setPerspective(fov?: number, near?: number, far?: number): void;
    setCameraPosition(position?: Vec3): void;
    initEvents(): void;
    resize(): void;
    get boundingRect(): DOMElementBoundingRect;
    /**
     * SCROLL
     */
    initScroll(): void;
    updateScroll(lastXDelta?: number, lastYDelta?: number): void;
    getScrollDeltas(): {
        x: number;
        y: number;
    };
    getScrollValues(): {
        x: number;
        y: number;
    };
    /** EVENTS **/
    onRender(callback: () => void): GPUCurtains;
    onScroll(callback: () => void): GPUCurtains;
    onAfterResize(callback: () => void): GPUCurtains;
    onError(callback: () => void): GPUCurtains;
    /***
     This just handles our drawing animation frame
     ***/
    animate(): void;
    render(): void;
    destroy(): void;
}
export {};
