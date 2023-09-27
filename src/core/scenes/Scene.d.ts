import { GPURenderer, MeshType } from '../renderers/GPURenderer'
import { ShaderPass } from '../renderPasses/ShaderPass'
import { PingPongPlane } from '../../curtains/meshes/PingPongPlane'
import { RenderPass } from '../renderPasses/RenderPass'
import { RenderTexture } from '../textures/RenderTexture'
import { RenderTarget } from '../renderPasses/RenderTarget'
import { ComputePass } from '../computePasses/ComputePass'

type ProjectionType = 'unProjected' | 'projected'
interface ProjectionStack {
  opaque: MeshType[]
  transparent: MeshType[]
}

type Stack = Record<ProjectionType, ProjectionStack>

interface RenderPassEntry {
  renderPass: RenderPass
  renderTexture: RenderTexture | null
  onBeforeRenderPass: ((commandEncoder?: GPUCommandEncoder, swapChainTexture?: GPUTexture) => void) | null
  onAfterRenderPass: ((commandEncoder?: GPUCommandEncoder, swapChainTexture?: GPUTexture) => void) | null
  element: MeshType | ShaderPass | PingPongPlane | null
  stack: Stack | null
}

type RenderPassEntriesType = 'pingPong' | 'renderTarget' | 'screen'
type RenderPassEntries = Record<RenderPassEntriesType, RenderPassEntry[]>

export class Scene {
  renderer: GPURenderer
  computePassEntries: ComputePass[]
  renderPassEntries: RenderPassEntries

  constructor({ renderer: GPURenderer })

  addComputePass(computePass: ComputePass)
  removeComputePass(computePass: ComputePass)

  addRenderTarget(renderTarget: RenderTarget)
  removeRenderTarget(renderTarget: RenderTarget)

  getMeshProjectionStack(mesh: MeshType): ProjectionStack
  addMesh(mesh: MeshType)
  removeMesh(mesh: MeshType)

  addShaderPass(shaderPass: ShaderPass)
  removeShaderPass(shaderPass: ShaderPass)

  addPingPongPlane(pingPongPlane: PingPongPlane)
  removePingPongPlane(pingPongPlane: PingPongPlane)

  renderSinglePassEntry(commandEncoder: GPUCommandEncoder, renderPassEntry: RenderPassEntry)
  render(commandEncoder: GPUCommandEncoder)
  onAfterCommandEncoder()
}
