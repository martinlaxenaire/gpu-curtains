import { GPURenderer, MeshType } from '../renderers/GPURenderer'
import { ShaderPass } from '../renderPasses/ShaderPass'
import { PingPongPlane } from '../../curtains/meshes/PingPongPlane'
import { RenderPass } from '../renderPasses/RenderPass'
import { RenderTexture } from '../textures/RenderTexture'
import { RenderTarget } from '../renderPasses/RenderTarget'

type IsProjectedStacks = 'unProjected' | 'projected'
type MeshStacksTypes = 'opaque' | 'transparent'
type ShaderPassStacksTypes = 'shaderPasses'
type RenderTargetStacksTypes = 'renderTargets'
type PingPongPlaneStacksType = 'pingPong'
type StacksTypes = MeshStacksTypes | ShaderPassStacksTypes | PingPongPlaneStacksType | RenderTargetStacksTypes

type StackContentStructure<T extends StacksTypes> = T extends ShaderPassStacksTypes
  ? ShaderPass[]
  : T extends PingPongPlaneStacksType
  ? PingPongPlane[]
  : T extends RenderTargetStacksTypes
  ? MeshType[]
  : T extends MeshStacksTypes
  ? MeshType[]
  : Array<MeshType | ShaderPass>

type ProjectedStacks = Record<MeshStacksTypes, StackContentStructure<MeshStacksTypes>>
type UnprojectedStacks = Record<StacksTypes, StackContentStructure<StacksTypes>>

type StackStructure<T extends IsProjectedStacks> = T extends 'unProjected'
  ? UnprojectedStacks
  : T extends 'projected'
  ? ProjectedStacks
  : never

type StructureMappedStackType<T extends IsProjectedStacks> = { [K in T]: StackStructure<K> }
type Stacks = StructureMappedStackType<IsProjectedStacks>

interface RenderStack {
  renderPass: RenderPass
  renderTexture: RenderTexture
  stack: Stacks
}

export class Scene {
  renderer: GPURenderer
  renderStacks: RenderStack[]

  constructor({ renderer: GPURenderer })

  addStack(renderPass: RenderPass, renderTexture?: RenderTexture | null): RenderStack
  get toScreenStack(): RenderStack

  addRenderTarget(renderTarget: RenderTarget)
  removeRenderTarget(renderTarget: RenderTarget)

  addMesh(mesh: MeshType)
  removeMesh(mesh: MeshType)

  addShaderPass(shaderPass: ShaderPass)
  removeShaderPass(shaderPass: ShaderPass)

  addPingPongPlane(pingPongPlane: PingPongPlane)
  removePingPongPlane(pingPongPlane: PingPongPlane)

  render(commandEncoder: GPUCommandEncoder)
}
