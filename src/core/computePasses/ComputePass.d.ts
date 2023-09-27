import { Renderer } from '../../types/renderer-utils'
import { ComputeMaterial } from '../materials/ComputeMaterial'
import { MaterialShaders } from '../materials/Material'
import { MeshBindings, MeshBindingsTypes } from '../meshes/MeshBaseMixin'
import { BufferBindings } from '../bindings/BufferBindings'
import { WorkBufferBindings } from '../bindings/WorkBufferBindings'

interface WorkGroupParams {
  name: string
  label: string
  type: string
  dispatchSize?: number | number[]
  value: number[] | Float32Array
}

interface WorkBindings extends MeshBindings {
  dispatchSize?: number | number[]
}

interface ComputePassOptions {
  label: string
  renderOrder: number
  shaders: MaterialShaders
  uniforms: MeshBindings[]
  storages: MeshBindings[]
  works: WorkBindings[]
}

type ComputePassParams = Partial<ComputePassOptions>

type ComputeBindingsTypes = MeshBindingsTypes | 'works'
type ComputeBindingsParams = Record<ComputeBindingsTypes, MeshBindings[] | WorkGroupParams[]>

export class ComputePass {
  type: string
  uuid: string
  index: number
  renderer: Renderer
  renderOrder: number

  options: ComputePassOptions

  material: ComputeMaterial

  constructor(renderer: Renderer, parameters: ComputePassParams)

  setComputeMaterial(computeParameters)

  addToScene()
  removeFromScene()

  createBindings({
    uniforms,
    storages,
    works,
  }: ComputeBindingsParams): Record<MeshBindingsTypes, BufferBindings[] | WorkBufferBindings[]>

  get uniforms(): ComputeMaterial['uniforms']
  get storages(): ComputeMaterial['storages']
  get works(): ComputeMaterial['works']

  onBeforeRender: (callback: () => void) => ComputePass
  onRender: (callback: () => void) => ComputePass
  onAfterRender: (callback: () => void) => ComputePass

  onBeforeRenderPass()
  onRenderPass(pass: GPUComputePassEncoder)
  onAfterRenderPass()

  render(pass: GPUComputePassEncoder)

  get canComputePass(): boolean

  copyBufferToResult(commandEncoder: GPUCommandEncoder)
  setWorkGroupsResult()
  getWorkGroupResult(name: string): Float32Array | null

  remove()
  destroy()
}
