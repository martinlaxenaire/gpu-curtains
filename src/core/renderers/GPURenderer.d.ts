import { DOMElement, DOMElementBoundingRect } from '../DOMElement'
import { PipelineManager } from '../pipelines/PipelineManager'
import { Texture } from '../Texture'

interface GPURendererProps {
  container: string | HTMLElement
  pixelRatio?: number
  renderingScale?: number
}

export class GPURenderer {
  type: string
  ready: boolean
  gpu: null | GPU
  canvas: HTMLCanvasElement
  context: null | GPUCanvasContext
  preferredFormat: null | GPUTextureFormat
  adapter: null | GPUAdapter
  device: null | GPUDevice
  sampleCount: number
  renderPass: null | {
    descriptor: GPURenderPassDescriptor
    target: GPUTexture
    view: GPUTextureView
  } // TODO

  pipelineManager: PipelineManager

  domElement: DOMElement
  documentBody: DOMElement

  constructor({ container, pixelRatio, renderingScale }: GPURendererProps)

  setContext()
  setAdapterAndDevice()
  setPipelineManager()

  setTexture(texture: Texture)
  createSampler(options: GPUSamplerDescriptor): GPUSampler
  createTexture(options: GPUTextureDescriptor): GPUTexture
  uploadTexture(texture: Texture)
  importExternalTexture(video: HTMLVideoElement): GPUExternalTexture
  setRenderPassView()
  setRenderPass()

  setSize(contentRect: DOMElementBoundingRect)
  resize(boundingRect?: DOMElementBoundingRect | null)
  onResize()

  onBeforeRenderPass()
  onBeginRenderPass(pass: GPURenderPassEncoder)
  onAfterRenderPass()
  render()

  destroy()
}
