import { GPUCameraRenderer, GPUCameraRendererParams } from '../../core/renderers/GPUCameraRenderer';
import { DOMMeshType } from '../../core/renderers/GPURenderer';
export declare class GPUCurtainsRenderer extends GPUCameraRenderer {
    domMeshes: DOMMeshType[];
    constructor({ container, pixelRatio, sampleCount, preferredFormat, production, onError, camera, }: GPUCameraRendererParams);
    onCameraPositionChanged(): void;
    setRendererObjects(): void;
    onResize(): void;
}
