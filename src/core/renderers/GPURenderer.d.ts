import { DOMElement, DOMElementBoundingRect } from '../DOMElement'
import { PipelineManager } from '../pipelines/PipelineManager'
import { Texture } from '../Texture'
import { Mesh } from '../meshes/Mesh'
import { Plane } from '../../curtains/meshes/Plane'
import { DOMMesh } from '../../curtains/meshes/DOMMesh'

interface GPURendererParams {
  container: string | HTMLElement
  pixelRatio?: number
  renderingScale?: number
}

type MeshTypes = Mesh | DOMMesh | Plane

// interface CustomGPURenderPassDescriptor extends Omit<GPURenderPassDescriptor, 'colorAttachments'> {
//   colorAttachments: Iterable<GPURenderPassColorAttachment>
// }

export interface RenderPass {
  descriptor: GPURenderPassDescriptor
  target: GPUTexture
  depth: GPUTexture
  sampleCount: GPUSize32
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

  renderPass: RenderPass

  pipelineManager: typeof PipelineManager

  meshes: MeshTypes[]
  textures: Texture[]

  pixelRatio: number
  renderingScale: number
  domElement: DOMElement
  documentBody: DOMElement

  constructor({ container, pixelRatio, renderingScale }: GPURendererParams)

  setContext(): Promise<void>
  setAdapterAndDevice(): Promise<void>
  setPipelineManager()

  addTexture(texture: Texture)
  setTexture(texture: Texture)
  createSampler(options: GPUSamplerDescriptor): GPUSampler | boolean
  createTexture(options: GPUTextureDescriptor): GPUTexture | boolean
  uploadTexture(texture: Texture)
  importExternalTexture(video: HTMLVideoElement): GPUExternalTexture

  createDepthTexture(): GPUTexture
  setRenderPassDepth()
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
