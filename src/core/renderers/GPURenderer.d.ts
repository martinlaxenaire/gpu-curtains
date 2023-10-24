import { DOMElement, DOMElementBoundingRect } from '../DOMElement'
import { PipelineManager } from '../pipelines/PipelineManager'
import { Texture } from '../textures/Texture'
import { Mesh } from '../meshes/Mesh'
import { Plane } from '../../curtains/meshes/Plane'
import { DOMMesh } from '../../curtains/meshes/DOMMesh'
import { RenderPass } from '../renderPasses/RenderPass'
import { Scene } from '../scenes/Scene'
import { ShaderPass } from '../renderPasses/ShaderPass'
import { PingPongPlane } from '../../curtains/meshes/PingPongPlane'
import { RenderTarget } from '../renderPasses/RenderTarget'
import { ComputePass } from '../computePasses/ComputePass'

interface GPURendererParams {
  container: string | HTMLElement
  pixelRatio?: number
  sampleCount?: GPUSize32
  production?: boolean
  preferredFormat?: GPUTextureFormat
  onError?: () => void
}

type DOMMeshType = DOMMesh | Plane
type MeshType = Mesh | DOMMeshType

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

  onError: () => void

  renderPass: RenderPass
  pipelineManager: PipelineManager
  scene: Scene

  computePasses: ComputePass[]
  pingPongPlanes: PingPongPlane[]
  shaderPasses: ShaderPass[]
  renderTargets: RenderTarget[]
  meshes: MeshType[]
  samplers: Sampler[]
  textures: Texture[]
  texturesQueue: Texture[]

  sampleCount: GPUSize32
  pixelRatio: number
  production: boolean
  domElement: DOMElement
  documentBody: DOMElement

  constructor({ container, pixelRatio, sampleCount, production, preferredFormat, onError }: GPURendererParams)

  setSize(boundingRect: DOMElementBoundingRect)
  resize(boundingRect?: DOMElementBoundingRect | null)
  onResize()

  get boundingRect(): DOMElementBoundingRect
  get pixelRatioBoundingRect(): DOMElementBoundingRect

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
  createComputePipeline(pipelineDescriptor: GPUComputePipelineDescriptor): GPUComputePipeline

  addTexture(texture: Texture)
  setTexture(texture: Texture)
  createSampler(options: GPUSamplerDescriptor): GPUSampler
  createTexture(options: GPUTextureDescriptor): GPUTexture
  uploadTexture(texture: Texture)
  importExternalTexture(video: HTMLVideoElement): GPUExternalTexture

  setRendererObjects()

  _onBeforeRenderCallback: (commandEncoder: GPUCommandEncoder) => void
  _onAfterRenderCallback: (commandEncoder: GPUCommandEncoder) => void
  onBeforeRender: (commandEncoder: GPUCommandEncoder) => GPURenderer
  onAfterRender: (commandEncoder: GPUCommandEncoder) => GPURenderer

  setRenderPassCurrentTexture(renderPass: RenderPass, renderTexture?: GPUTexture): GPUTexture
  onBeforeCommandEncoder()
  //onBeginRenderPass(pass: GPURenderPassEncoder)
  onAfterCommandEncoder()
  render()

  destroy()
}
