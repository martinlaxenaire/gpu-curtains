/// <reference types="dist" />
import { Renderer } from '../../utils/renderer-utils';
import { MeshType } from '../renderers/GPURenderer';
import { ShaderPass } from '../renderPasses/ShaderPass';
import { PingPongPlane } from '../../curtains/meshes/PingPongPlane';
import { ComputePass } from '../computePasses/ComputePass';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { RenderTarget } from '../renderPasses/RenderTarget';
import { ProjectionStack, RenderPassEntry, RenderPassEntries } from '../../types/core/scenes/Scene';
export declare class Scene {
    renderer: Renderer;
    computePassEntries: ComputePass[];
    renderPassEntries: RenderPassEntries;
    constructor({ renderer }: {
        renderer: Renderer | GPUCurtains;
    });
    addComputePass(computePass: ComputePass): void;
    removeComputePass(computePass: ComputePass): void;
    addRenderTarget(renderTarget: RenderTarget): void;
    removeRenderTarget(renderTarget: RenderTarget): void;
    getMeshProjectionStack(mesh: MeshType): ProjectionStack;
    addMesh(mesh: MeshType): void;
    removeMesh(mesh: MeshType): void;
    addShaderPass(shaderPass: ShaderPass): void;
    removeShaderPass(shaderPass: ShaderPass): void;
    addPingPongPlane(pingPongPlane: PingPongPlane): void;
    removePingPongPlane(pingPongPlane: PingPongPlane): void;
    renderSinglePassEntry(commandEncoder: GPUCommandEncoder, renderPassEntry: RenderPassEntry): void;
    render(commandEncoder: GPUCommandEncoder): void;
    onAfterCommandEncoder(): void;
}
