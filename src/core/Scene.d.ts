import { GPURenderer, MeshTypes } from './renderers/GPURenderer'

type StacksTypes = 'opaque' | 'transparent'
type Stacks = Record<StacksTypes, MeshTypes[]>

export class Scene {
  renderer: GPURenderer
  stacks: Stacks

  constructor({ renderer: GPURenderer })

  setStacks()

  addMesh(mesh: MeshTypes)

  render(pass: GPURenderPassEncoder)
}
