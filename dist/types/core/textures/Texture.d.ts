/// <reference types="dist" />
import { Renderer } from '../../utils/renderer-utils';
import { TextureBindings } from '../bindings/TextureBindings';
import { BufferBindings } from '../bindings/BufferBindings';
import { Object3D } from '../objects3D/Object3D';
import { BindGroupBindingElement } from '../../types/BindGroups';
import { TextureOptions, TextureParams, TextureParent, TextureSource } from '../../types/core/textures/Texture';
import { GPUCurtains } from '../../curtains/GPUCurtains';
export declare class Texture extends Object3D {
    #private;
    type: string;
    renderer: Renderer;
    texture: null | GPUTexture;
    externalTexture: null | GPUExternalTexture;
    source: TextureSource;
    size: {
        width: number;
        height: number;
    };
    options: TextureOptions;
    textureMatrix: BufferBindings;
    bindings: Array<BindGroupBindingElement>;
    _parent: TextureParent;
    _sourceLoaded: boolean;
    _sourceUploaded: boolean;
    shouldUpdate: boolean;
    shouldUpdateBindGroup: boolean;
    videoFrameCallbackId: null | number;
    _onSourceLoadedCallback: () => void;
    _onSourceUploadedCallback: () => void;
    constructor(renderer: Renderer | GPUCurtains, parameters?: TextureParams);
    setBindings(): void;
    get textureBinding(): TextureBindings;
    get parent(): TextureParent;
    set parent(value: TextureParent);
    get sourceLoaded(): boolean;
    set sourceLoaded(value: boolean);
    get sourceUploaded(): boolean;
    set sourceUploaded(value: boolean);
    setTransforms(): void;
    applyPosition(): void;
    applyRotation(): void;
    applyScale(): void;
    applyTransformOrigin(): void;
    /*** TEXTURE MATRIX ***/
    updateTextureMatrix(): void;
    resize(): void;
    getNumMipLevels(...sizes: number[]): number;
    uploadTexture(): void;
    uploadVideoTexture(): void;
    copy(texture: Texture): void;
    createTexture(): void;
    /** SOURCES **/
    setSourceSize(): void;
    loadImageBitmap(url: string): Promise<ImageBitmap>;
    loadImage(source: string | HTMLImageElement): Promise<void>;
    onVideoFrameCallback(): void;
    onVideoLoaded(video: HTMLVideoElement): void;
    get isVideoSource(): boolean;
    loadVideo(source: string | HTMLVideoElement): void;
    loadCanvas(source: HTMLCanvasElement): void;
    /** EVENTS **/
    onSourceLoaded(callback: () => void): Texture;
    onSourceUploaded(callback: () => void): Texture;
    /** RENDER **/
    render(): void;
    /** DESTROY **/
    destroy(): void;
}
