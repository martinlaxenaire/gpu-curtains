/// <reference types="dist" />
import { MeshType } from '../../../core/renderers/GPURenderer';
import { ShaderPass } from '../../../core/renderPasses/ShaderPass';
import { PingPongPlane } from '../../../curtains/meshes/PingPongPlane';
import { RenderPass } from '../../../core/renderPasses/RenderPass';
import { RenderTexture } from '../../../core/textures/RenderTexture';
export type ProjectionType = 'unProjected' | 'projected';
export interface ProjectionStack {
    opaque: MeshType[];
    transparent: MeshType[];
}
export type Stack = Record<ProjectionType, ProjectionStack>;
export interface RenderPassEntry {
    renderPass: RenderPass;
    renderTexture: RenderTexture | null;
    onBeforeRenderPass: ((commandEncoder?: GPUCommandEncoder, swapChainTexture?: GPUTexture) => void) | null;
    onAfterRenderPass: ((commandEncoder?: GPUCommandEncoder, swapChainTexture?: GPUTexture) => void) | null;
    element: MeshType | ShaderPass | PingPongPlane | null;
    stack: Stack | null;
}
export type RenderPassEntriesType = 'pingPong' | 'renderTarget' | 'screen';
export type RenderPassEntries = Record<RenderPassEntriesType, RenderPassEntry[]>;
