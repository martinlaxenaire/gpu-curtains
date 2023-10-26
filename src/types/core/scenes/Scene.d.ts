// import { Renderer } from '../../../utils/renderer-utils'
// import { RenderTarget } from '../renderPasses/RenderTarget'
// import { ComputePass } from '../computePasses/ComputePass'
import { MeshType } from '../renderers/GPURenderer'
import { ShaderPass } from '../../../core/renderPasses/ShaderPass'
import { PingPongPlane } from '../../curtains/meshes/PingPongPlane'
import { RenderPass } from '../../../core/renderPasses/RenderPass'
import { RenderTexture } from '../../../core/textures/RenderTexture'

export type ProjectionType = 'unProjected' | 'projected'
export interface ProjectionStack {
  opaque: MeshType[]
  transparent: MeshType[]
}

export type Stack = Record<ProjectionType, ProjectionStack>

export interface RenderPassEntry {
  renderPass: RenderPass
  renderTexture: RenderTexture | null
  onBeforeRenderPass: ((commandEncoder?: GPUCommandEncoder, swapChainTexture?: GPUTexture) => void) | null
  onAfterRenderPass: ((commandEncoder?: GPUCommandEncoder, swapChainTexture?: GPUTexture) => void) | null
  element: MeshType | ShaderPass | PingPongPlane | null
  stack: Stack | null
}

export type RenderPassEntriesType = 'pingPong' | 'renderTarget' | 'screen'
export type RenderPassEntries = Record<RenderPassEntriesType, RenderPassEntry[]>

// export class Scene {
//   renderer: Renderer
//   computePassEntries: ComputePass[]
//   renderPassEntries: RenderPassEntries
//
//   constructor({ renderer: Renderer })
//
//   addComputePass(computePass: ComputePass)
//   removeComputePass(computePass: ComputePass)
//
//   addRenderTarget(renderTarget: RenderTarget)
//   removeRenderTarget(renderTarget: RenderTarget)
//
//   getMeshProjectionStack(mesh: MeshType): ProjectionStack
//   addMesh(mesh: MeshType)
//   removeMesh(mesh: MeshType)
//
//   addShaderPass(shaderPass: ShaderPass)
//   removeShaderPass(shaderPass: ShaderPass)
//
//   addPingPongPlane(pingPongPlane: PingPongPlane)
//   removePingPongPlane(pingPongPlane: PingPongPlane)
//
//   renderSinglePassEntry(commandEncoder: GPUCommandEncoder, renderPassEntry: RenderPassEntry)
//   render(commandEncoder: GPUCommandEncoder)
//   onAfterCommandEncoder()
// }
