import { Renderer } from '../../types/renderer-utils'
import { ComputeMaterial } from '../materials/ComputeMaterial'
import { MaterialParams, MaterialShaders } from '../materials/Material'

interface ComputePassOptions {
  label: string
  renderOrder?: number
  autoAddToScene?: boolean
  shaders: MaterialShaders
  useAsyncPipeline?: boolean
}

interface ComputePassParams extends Partial<ComputePassOptions>, MaterialParams {}

export class ComputePass {
  type: string
  uuid: string
  index: number
  renderer: Renderer
  renderOrder: number
  #autoAddToScene: boolean

  options: ComputePassOptions

  material: ComputeMaterial

  _ready: boolean

  constructor(renderer: Renderer, parameters: ComputePassParams)

  get ready(): boolean
  set ready(value: boolean)

  setComputeMaterial(computeParameters: MaterialParams)

  addToScene()
  removeFromScene()

  get uniforms(): ComputeMaterial['uniforms']
  get storages(): ComputeMaterial['storages']
  get works(): ComputeMaterial['works']

  resize()

  _onReadyCallback: () => void
  _onBeforeRenderCallback: () => void
  _onRenderCallback: () => void
  _onAfterRenderCallback: () => void
  _onAfterResizeCallback: () => void
  onReady: (callback: () => void) => ComputePass
  onBeforeRender: (callback: () => void) => ComputePass
  onRender: (callback: () => void) => ComputePass
  onAfterRender: (callback: () => void) => ComputePass
  onAfterResize: (callback: () => void) => ComputePass

  onBeforeRenderPass()
  onRenderPass(pass: GPUComputePassEncoder)
  onAfterRenderPass()

  render(pass: GPUComputePassEncoder)

  get canComputePass(): boolean

  copyBufferToResult(commandEncoder: GPUCommandEncoder)
  setWorkGroupsResult()
  getWorkGroupResult({ workGroupName, bindingName }: { workGroupName?: string; bindingName?: string }): Float32Array

  remove()
  destroy()
}
