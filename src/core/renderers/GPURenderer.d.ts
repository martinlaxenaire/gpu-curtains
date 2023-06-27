import { DOMElement, DOMElementBoundingRect } from '../DOMElement'
import { PipelineManager } from '../pipelines/PipelineManager'
import { Texture } from '../textures/Texture'
import { Mesh } from '../meshes/Mesh'
import { Plane } from '../../curtains/meshes/Plane'
import { DOMMesh } from '../../curtains/meshes/DOMMesh'
import { RenderPass } from '../renderPasses/RenderPass'
import { Scene } from '../scenes/Scene'
import { ShaderPass } from '../renderPasses/ShaderPass'

interface GPURendererParams {
  container: string | HTMLElement
  pixelRatio?: number
  renderingScale?: number
  sampleCount?: GPUSize32
}

type MeshTypes = Mesh | DOMMesh | Plane

// interface CustomGPURenderPassDescriptor extends Omit<GPURenderPassDescriptor, 'colorAttachments'> {
//   colorAttachments: Iterable<GPURenderPassColorAttachment>
// }

// export interface RenderPass {
//   descriptor: GPURenderPassDescriptor
//   target: GPUTexture
//   depth: GPUTexture
//   sampleCount: GPUSize32
// }

interface Sampler {
  sampler: GPUSampler
  options: GPUSamplerDescriptor
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
  pipelineManager: PipelineManager
  scene: Scene

  renderPasses: RenderPass[]
  shaderPasses: ShaderPass[]
  meshes: MeshTypes[]
  samplers: Sampler[]
  textures: Texture[]

  sampleCount: GPUSize32
  pixelRatio: number
  renderingScale: number
  domElement: DOMElement
  documentBody: DOMElement

  constructor({ container, pixelRatio, renderingScale }: GPURendererParams)

  get boundingRect(): DOMElementBoundingRect

  setContext(): Promise<void>
  setAdapterAndDevice(): Promise<void>

  setMainRenderPass()
  setPipelineManager()
  setScene()

  createBuffer(bufferDescriptor: GPUBufferDescriptor): GPUBuffer
  queueWriteBuffer(buffer: GPUBuffer, bufferOffset: GPUSize64, data: BufferSource | SharedArrayBuffer)
  createBindGroupLayout(bindGroupLayoutDescriptor: GPUBindGroupLayoutDescriptor): GPUBindGroupLayout
  createBindGroup(bindGroupDescriptor: GPUBindGroupDescriptor): GPUBindGroup

  createShaderModule(shaderModuleDescriptor: GPUShaderModuleDescriptor): GPUShaderModule
  createPipelineLayout(pipelineLayoutDescriptor: GPUPipelineLayoutDescriptor): GPUPipelineLayout
  createRenderPipeline(pipelineDescriptor: GPURenderPipelineDescriptor): GPURenderPipeline

  addTexture(texture: Texture)
  setTexture(texture: Texture)
  createSampler(options: GPUSamplerDescriptor): GPUSampler | boolean
  forceCreateTexture(options: GPUTextureDescriptor): GPUTexture
  createTexture(options: GPUTextureDescriptor): GPUTexture | boolean
  uploadTexture(texture: Texture)
  importExternalTexture(video: HTMLVideoElement): GPUExternalTexture

  setSize(contentRect: DOMElementBoundingRect)
  resize(boundingRect?: DOMElementBoundingRect | null)
  onResize()

  setRendererObjects()

  setRenderPassCurrentTexture(renderPass: RenderPass): GPUTexture
  onBeforeRenderPass()
  //onBeginRenderPass(pass: GPURenderPassEncoder)
  onAfterRenderPass()
  render()

  destroy()
}
