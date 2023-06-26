import { GPURenderer, MeshTypes } from '../renderers/GPURenderer'
import { ShaderPass } from '../renderPasses/ShaderPass'

type StacksTypes = 'opaque' | 'transparent' | 'shaderPasses'
type Stacks = Record<StacksTypes, Array<MeshTypes | ShaderPass>>

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
