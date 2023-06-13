import { DOMElement, DOMElementBoundingRect } from '../DOMElement'
import { PipelineManager } from '../pipelines/PipelineManager'
import { Texture } from '../Texture'
import { Mesh } from '../meshes/Mesh'
import { Plane } from '../../curtains/meshes/Plane'

interface GPURendererParams {
  container: string | HTMLElement
  pixelRatio?: number
  renderingScale?: number
}

type MeshTypes = Mesh | Plane

export class GPURenderer {
  type: string
  ready: boolean
  gpu: null | GPU
  canvas: HTMLCanvasElement
  context: null | GPUCanvasContext
  preferredFormat: null | GPUTextureFormat
  adapter: null | GPUAdapter
  device: null | GPUDevice

  renderPass: null | {
    descriptor: GPURenderPassDescriptor
    target: GPUTexture
    depth: GPUTexture
    sampleCount: GPUSize32
  }

  pipelineManager: PipelineManager

  meshes: MeshTypes[]
  textures: Texture[]

  pixelRatio: number
  renderingScale: number
  domElement: DOMElement
  documentBody: DOMElement

  constructor({ container, pixelRatio, renderingScale }: GPURendererParams)

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

  setRendererObjects()

  onBeforeRenderPass()
  onBeginRenderPass(pass: GPURenderPassEncoder)
  onAfterRenderPass()
  render()

  destroy()
}
