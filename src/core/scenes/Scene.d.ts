import { GPURenderer, MeshTypes } from '../renderers/GPURenderer'
import { ShaderPass } from '../renderPasses/ShaderPass'
import { PingPongPlane } from '../../curtains/meshes/PingPongPlane'

type IsProjectedStacks = 'unprojected' | 'projected'
type MeshStacksTypes = 'opaque' | 'transparent'
type ShaderPassStacksTypes = 'shaderPasses'
type PingPongPlaneStacksType = 'pingPongPlanes'
type StacksTypes = MeshStacksTypes | ShaderPassStacksTypes | PingPongPlaneStacksType

type StackContentStructure<T extends StacksTypes> = T extends ShaderPassStacksTypes
  ? ShaderPass[]
  : T extends PingPongPlaneStacksType
  ? PingPongPlane[]
  : T extends MeshStacksTypes
  ? MeshTypes[]
  : Array<MeshTypes | ShaderPass>

type ProjectedStacks = Record<MeshStacksTypes, StackContentStructure<MeshStacksTypes>>
type UnprojectedStacks = Record<StacksTypes, StackContentStructure<StacksTypes>>

type StackStructure<T extends IsProjectedStacks> = T extends 'unprojected'
  ? UnprojectedStacks
  : T extends 'projected'
  ? ProjectedStacks
  : never

type StructureMappedStackType<T extends IsProjectedStacks> = { [K in T]: StackStructure<K> }
type Stacks = StructureMappedStackType<IsProjectedStacks>

export class Scene {
  renderer: GPURenderer
  stacks: Stacks

  constructor({ renderer: GPURenderer })

  setStacks()

  addMesh(mesh: MeshTypes)
  removeMesh(mesh: MeshTypes)

  addShaderPass(shaderPass: ShaderPass)
  removeShaderPass(shaderPass: ShaderPass)

  addPingPongPlane(pingPongPlane: PingPongPlane)
  removePingPongPlane(pingPongPlane: PingPongPlane)

  render(commandEncoder: GPUCommandEncoder)
}
