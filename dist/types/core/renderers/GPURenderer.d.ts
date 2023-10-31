/// <reference types="dist" />
import { PipelineManager } from '../pipelines/PipelineManager';
import { DOMElement, DOMElementBoundingRect } from '../DOM/DOMElement';
import { Scene } from '../scenes/Scene';
import { RenderPass } from '../renderPasses/RenderPass';
import { ComputePass } from '../computePasses/ComputePass';
import { PingPongPlane } from '../../curtains/meshes/PingPongPlane';
import { ShaderPass } from '../renderPasses/ShaderPass';
import { RenderTarget } from '../renderPasses/RenderTarget';
import { Texture } from '../textures/Texture';
import { Sampler } from '../samplers/Sampler';
import { DOMMesh } from '../../curtains/meshes/DOMMesh';
import { Plane } from '../../curtains/meshes/Plane';
import { Mesh } from '../meshes/Mesh';
export interface GPURendererParams {
    container: string | HTMLElement;
    pixelRatio?: number;
    sampleCount?: GPUSize32;
    production?: boolean;
    preferredFormat?: GPUTextureFormat;
    onError?: () => void;
}
export type DOMMeshType = DOMMesh | Plane;
export type MeshType = Mesh | DOMMeshType;
export declare class GPURenderer {
    type: string;
    ready: boolean;
    gpu: null | GPU;
    canvas: HTMLCanvasElement;
    context: null | GPUCanvasContext;
    preferredFormat: null | GPUTextureFormat;
    adapter: GPUAdapter | void;
    device: GPUDevice | null;
    onError: () => void;
    renderPass: RenderPass;
    pipelineManager: PipelineManager;
    scene: Scene;
    computePasses: ComputePass[];
    pingPongPlanes: PingPongPlane[];
    shaderPasses: ShaderPass[];
    renderTargets: RenderTarget[];
    meshes: MeshType[];
    samplers: Sampler[];
    textures: Texture[];
    texturesQueue: Texture[];
    sampleCount: GPUSize32;
    pixelRatio: number;
    production: boolean;
    domElement: DOMElement;
    documentBody: DOMElement;
    _onBeforeRenderCallback: (commandEncoder: GPUCommandEncoder) => void;
    _onAfterRenderCallback: (commandEncoder: any) => void;
    constructor({ container, pixelRatio, sampleCount, production, preferredFormat, onError, }: GPURendererParams);
    /**
     * Set Canvas size
     */
    setSize(boundingRect: DOMElementBoundingRect): void;
    resize(boundingRect?: DOMElementBoundingRect | null): void;
    onResize(): void;
    get boundingRect(): DOMElementBoundingRect;
    get pixelRatioBoundingRect(): DOMElementBoundingRect;
    /**
     * Set Context
     *
     * @returns {Promise<void>}
     */
    setContext(): Promise<void>;
    /**
     * Set Adapter and Device
     *
     * @returns {Promise<void>}
     */
    setAdapterAndDevice(): Promise<void>;
    /** PIPELINES, SCENE & MAIN RENDER PASS **/
    setMainRenderPass(): void;
    setPipelineManager(): void;
    setScene(): void;
    /** BUFFERS & BINDINGS **/
    createBuffer(bufferDescriptor: GPUBufferDescriptor): GPUBuffer;
    queueWriteBuffer(buffer: GPUBuffer, bufferOffset: GPUSize64, data: BufferSource): void;
    createBindGroupLayout(bindGroupLayoutDescriptor: GPUBindGroupLayoutDescriptor): GPUBindGroupLayout;
    createBindGroup(bindGroupDescriptor: GPUBindGroupDescriptor): GPUBindGroup;
    /** SHADERS & PIPELINES **/
    createShaderModule(shaderModuleDescriptor: GPUShaderModuleDescriptor): GPUShaderModule;
    createPipelineLayout(pipelineLayoutDescriptor: GPUPipelineLayoutDescriptor): GPUPipelineLayout;
    createRenderPipeline(pipelineDescriptor: GPURenderPipelineDescriptor): GPURenderPipeline;
    createRenderPipelineAsync(pipelineDescriptor: GPURenderPipelineDescriptor): Promise<GPURenderPipeline>;
    createComputePipeline(pipelineDescriptor: GPUComputePipelineDescriptor): GPUComputePipeline;
    createComputePipelineAsync(pipelineDescriptor: GPUComputePipelineDescriptor): Promise<GPUComputePipeline>;
    /** TEXTURES **/
    addTexture(texture: Texture): void;
    setTexture(texture: Texture): void;
    createSampler(sampler: Sampler): GPUSampler;
    createTexture(options: GPUTextureDescriptor): GPUTexture;
    uploadTexture(texture: Texture): void;
    importExternalTexture(video: HTMLVideoElement): GPUExternalTexture;
    /** OBJECTS **/
    setRendererObjects(): void;
    /** EVENTS **/
    onBeforeRender(callback: (commandEncoder?: GPUCommandEncoder) => void): this;
    onAfterRender(callback: (commandEncoder?: GPUCommandEncoder) => void): this;
    /** RENDER **/
    setRenderPassCurrentTexture(renderPass: RenderPass, renderTexture?: GPUTexture | null): GPUTexture;
    onBeforeCommandEncoder(): void;
    onAfterCommandEncoder(): void;
    /**
     * Called at each draw call to render our scene and its content
     * Also create shader modules if not already created
     */
    render(): void;
    destroy(): void;
}
