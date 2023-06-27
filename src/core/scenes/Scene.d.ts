import { GPURenderer, MeshTypes } from '../renderers/GPURenderer'
import { ShaderPass } from '../renderPasses/ShaderPass'

type IsProjectedStacks = 'unprojected' | 'projected'
type MeshStacksTypes = 'opaque' | 'transparent'
type ShaderPassStacksTypes = 'shaderPasses'
type StacksTypes = MeshStacksTypes | ShaderPassStacksTypes

type StackContentStructure<T extends StacksTypes> = T extends ShaderPassStacksTypes
  ? ShaderPass[]
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

  //render(pass: GPURenderPassEncoder)
  render(commandEncoder: GPUCommandEncoder)
}
