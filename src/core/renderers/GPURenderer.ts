import { generateMips } from './utils'
import { PipelineManager } from '../pipelines/PipelineManager'
import { DOMElement, DOMElementBoundingRect } from '../DOM/DOMElement'
import { Scene } from '../scenes/Scene'
import { RenderPass } from '../renderPasses/RenderPass'
import { generateUUID, throwError, throwWarning } from '../../utils/utils'

import { ComputePass } from '../computePasses/ComputePass'
import { PingPongPlane } from '../../curtains/meshes/PingPongPlane'
import { ShaderPass } from '../renderPasses/ShaderPass'
import { RenderTarget } from '../renderPasses/RenderTarget'
import { Texture } from '../textures/Texture'
import { Sampler } from '../samplers/Sampler'

import { DOMMesh } from '../../curtains/meshes/DOMMesh'
import { Plane } from '../../curtains/meshes/Plane'
import { Mesh } from '../meshes/Mesh'
import { TasksQueueManager } from '../../utils/TasksQueueManager'
import { AllowedBindGroups } from '../../types/BindGroups'
import { RenderTexture } from '../textures/RenderTexture'
import { GPUDeviceManager } from './GPUDeviceManager'

/**
 * Parameters used to create a {@link GPURenderer}
 */
export interface GPURendererParams {
  /** The {@link GPUDeviceManager} used to create this {@link GPURenderer} */
  deviceManager: GPUDeviceManager
  /** [HTML Element]{@link HTMLElement} or selector used as a container for our [canvas]{@link GPURenderer#canvas} */
  container: string | HTMLElement
  /** Pixel ratio to use for rendering */
  pixelRatio?: number
  /** Whether to use multisampling, and if so its value */
  sampleCount?: GPUSize32
  /** Flag indicating whether we're running the production mode or not. If not, useful warnings could be logged to the console */
  production?: boolean
  /** Texture rendering [preferred format]{@link GPUTextureFormat} */
  preferredFormat?: GPUTextureFormat
  /** Set the [context]{@link GPUCanvasContext} alpha mode */
  alphaMode?: GPUCanvasAlphaMode
}

// TODO should be GPUCurtainsRenderer props?
export type DOMMeshType = DOMMesh | Plane
export type MeshType = Mesh | DOMMeshType
export type SceneObject = MeshType | ComputePass | PingPongPlane | ShaderPass

//export type MeshType = Mesh | DOMMeshType | typeof MeshBaseMixin<any>

/**
 * GPURenderer class:
 * Base renderer class, that could possibly used to render compute passes and draw meshes, even tho it is strongly advised to use the {@link GPUCurtainsRenderer} class instead.
 * A renderer is responsible for:
 * - Everything related to the WebGPU [adapter]{@link GPUAdapter}, [device]{@link GPUDevice} and [context]{@link GPUCanvasContext}
 * - Handling the [canvas]{@link HTMLCanvasElement} onto everything is drawn
 * - Keeping track of every specific class objects created relative to computing and rendering
 * - Creating a {@link Scene} class that will take care of the rendering process of all previously mentioned objects
 * - Handling the {@link PipelineManager}
 */
export class GPURenderer {
  /** The type of the {@link GPURenderer} */
  type: string
  /** The universal unique id of this {@link GPURenderer} */
  readonly uuid: string

  /** The {@link GPUDeviceManager} used to create this {@link GPURenderer} */
  deviceManager: GPUDeviceManager

  /** [canvas]{@link HTMLCanvasElement} onto everything is drawn */
  canvas: HTMLCanvasElement
  /** The WebGPU [context]{@link GPUCanvasContext} used */
  context: null | GPUCanvasContext
  /** Texture rendering [preferred format]{@link GPUTextureFormat} */
  preferredFormat: null | GPUTextureFormat
  /** Set the [context]{@link GPUCanvasContext} alpha mode */
  alphaMode?: GPUCanvasAlphaMode

  /** The final [render pass]{@link RenderPass} to render our result to screen */
  renderPass: RenderPass
  /** The {@link Scene} used */
  scene: Scene

  /** An array containing all our created {@link ComputePass} */
  computePasses: ComputePass[]
  /** An array containing all our created {@link PingPongPlane} */
  pingPongPlanes: PingPongPlane[]
  /** An array containing all our created {@link ShaderPass} */
  shaderPasses: ShaderPass[]
  /** An array containing all our created {@link RenderTarget} */
  renderTargets: RenderTarget[]
  /** An array containing all our created [Meshes]{@link MeshType} */
  meshes: MeshType[]
  // TODO keep track of RenderTexture as well?
  /** An array containing all our created {@link Texture} */
  textures: Texture[]
  /** An array to keep track of the newly uploaded [textures]{@link Texture} and set their [sourceUploaded]{@link Texture#sourceUploaded} property */
  texturesQueue: Texture[]

  /** Whether to use multisampling, and if so its value */
  sampleCount: GPUSize32
  /** Pixel ratio to use for rendering */
  pixelRatio: number
  /** Flag indicating whether we're running the production mode or not. If not, useful warnings could be logged to the console */
  production: boolean
  /** [DOM Element]{@link DOMElement} that will contain our canvas */
  domElement: DOMElement
  /** Document [body]{@link HTMLBodyElement} [DOM Element]{@link DOMElement} used to trigger resize when the document body size changes */
  documentBody: DOMElement

  /** Allow to add callbacks to be executed at each render before the {@link GPUCommandEncoder} is created */
  onBeforeCommandEncoderCreation: TasksQueueManager
  /** Allow to add callbacks to be executed at each render after the {@link GPUCommandEncoder} has been created but before the {@link Scene} is rendered */
  onBeforeRenderScene: TasksQueueManager
  /** Allow to add callbacks to be executed at each render after the {@link GPUCommandEncoder} has been created and after the {@link Scene} has been rendered */
  onAfterRenderScene: TasksQueueManager
  /** Allow to add callbacks to be executed at each render after the {@link Scene} has been rendered and the {@link GPUCommandEncoder} has been submitted */
  onAfterCommandEncoderSubmission: TasksQueueManager

  // callbacks / events
  /** function assigned to the [onBeforeRender]{@link GPURenderer#onBeforeRender} callback */
  _onBeforeRenderCallback = (commandEncoder: GPUCommandEncoder) => {
    /* allow empty callback */
  }
  /** function assigned to the [onAfterRender]{@link GPURenderer#onAfterRender} callback */
  _onAfterRenderCallback = (commandEncoder: GPUCommandEncoder) => {
    /* allow empty callback */
  }
  /** function assigned to the [onAfterResize]{@link GPURenderer#onAfterResize} callback */
  _onAfterResizeCallback: () => void = () => {
    /* allow empty callback */
  }

  /**
   * GPURenderer constructor
   * @param parameters - [parameters]{@link GPURendererParams} used to create this {@link GPURenderer}
   */
  constructor({
    deviceManager,
    container,
    pixelRatio = 1,
    sampleCount = 4,
    production = false,
    preferredFormat,
    alphaMode = 'premultiplied',
  }: GPURendererParams) {
    this.type = 'GPURenderer'
    this.uuid = generateUUID()

    this.deviceManager = deviceManager
    this.deviceManager.addRenderer(this)

    this.pixelRatio = pixelRatio ?? window.devicePixelRatio ?? 1
    this.sampleCount = sampleCount
    this.production = production
    this.alphaMode = alphaMode

    this.preferredFormat = preferredFormat ?? this.deviceManager.gpu?.getPreferredCanvasFormat()

    this.setTasksQueues()
    this.setRendererObjects()

    // needed to get container bounding box
    this.domElement = new DOMElement({
      element: container,
    })

    // create the canvas
    if (container instanceof HTMLCanvasElement) {
      this.canvas = container
    } else {
      this.canvas = document.createElement('canvas')
      // append the canvas
      this.domElement.element.appendChild(this.canvas)
    }

    // now track any change in the document body size, and resize our scene
    // TODO this is called only once!!
    this.documentBody = new DOMElement({
      element: document.body,
      onSizeChanged: () => this.resize(),
    })

    this.texturesQueue = []

    // device is already available? create the context!
    if (this.deviceManager.device) {
      this.setContext()
    }
  }

  /**
   * Set [canvas]{@link GPURenderer#canvas} size
   * @param boundingRect - new [DOM Element]{@link GPURenderer#domElement} [bounding rectangle]{@link DOMElement#boundingRect}
   */
  setSize(boundingRect: DOMElementBoundingRect) {
    const devicePixelRatio = window.devicePixelRatio ?? 1
    const scaleBoundingRect = this.pixelRatio / devicePixelRatio

    this.canvas.style.width = Math.floor(boundingRect.width) + 'px'
    this.canvas.style.height = Math.floor(boundingRect.height) + 'px'

    const renderingSize = {
      width: Math.floor(boundingRect.width * scaleBoundingRect),
      height: Math.floor(boundingRect.height * scaleBoundingRect),
    }

    this.canvas.width = this.device
      ? Math.min(renderingSize.width, this.device.limits.maxTextureDimension2D)
      : renderingSize.width
    this.canvas.height = this.device
      ? Math.min(renderingSize.height, this.device.limits.maxTextureDimension2D)
      : renderingSize.height
  }

  /**
   * Resize our {@link GPURenderer}
   * @param boundingRect - new [DOM Element]{@link GPURenderer#domElement} [bounding rectangle]{@link DOMElement#boundingRect}
   */
  resize(boundingRect: DOMElementBoundingRect | null = null) {
    if (!this.domElement) return

    if (!boundingRect) boundingRect = this.domElement.element.getBoundingClientRect()

    this.setSize(boundingRect)

    this.onResize()

    this._onAfterResizeCallback && this._onAfterResizeCallback()
  }

  /**
   * Resize all tracked objects
   */
  onResize() {
    // resize render & shader passes
    this.renderPass?.resize(this.pixelRatioBoundingRect)
    this.renderTargets.forEach((renderTarget) => renderTarget.resize(this.pixelRatioBoundingRect))
    this.pingPongPlanes.forEach((pingPongPlane) => pingPongPlane.resize(this.boundingRect))
    this.shaderPasses.forEach((shaderPass) => shaderPass.resize(this.boundingRect))
    this.computePasses.forEach((computePass) => computePass.resize())
    this.meshes.forEach((mesh) => {
      // resize meshes that do not have a bound DOM element
      if (!('domElement' in mesh)) mesh.resize(this.boundingRect)
    })
  }

  /**
   * Get our [DOM Element]{@link GPURenderer#domElement} [bounding rectangle]{@link DOMElement#boundingRect}
   */
  get boundingRect(): DOMElementBoundingRect {
    return this.domElement.boundingRect
  }

  /**
   * Get our [DOM Element]{@link GPURenderer#domElement} [bounding rectangle]{@link DOMElement#boundingRect} accounting for current [pixel ratio]{@link GPURenderer#pixelRatio}
   */
  get pixelRatioBoundingRect(): DOMElementBoundingRect {
    const devicePixelRatio = window.devicePixelRatio ?? 1
    const scaleBoundingRect = this.pixelRatio / devicePixelRatio

    return Object.keys(this.domElement.boundingRect).reduce(
      (a, key) => ({ ...a, [key]: this.domElement.boundingRect[key] * scaleBoundingRect }),
      {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      }
    )
  }

  /* USEFUL DEVICE MANAGER OBJECTS */

  /**
   * Get our [device]{@link GPUDeviceManager#device}
   * @readonly
   */
  get device(): GPUDevice | undefined {
    return this.deviceManager.device
  }

  /**
   * Get all the created [samplers]{@link GPUDeviceManager#samplers}
   * @readonly
   */
  get samplers(): Sampler[] {
    return this.deviceManager.samplers
  }

  /**
   * Get all the created [buffers]{@link GPUDeviceManager#buffers}
   * @readonly
   */
  get buffers(): GPUBuffer[] {
    return this.deviceManager.buffers
  }

  /**
   * Get the [pipeline manager]{@link GPUDeviceManager#pipelineManager}
   * @readonly
   */
  get pipelineManager(): PipelineManager {
    return this.deviceManager.pipelineManager
  }

  /**
   * Configure our [context]{@link context} with the given options
   */
  configureContext() {
    this.context.configure({
      device: this.device,
      format: this.preferredFormat,
      alphaMode: this.alphaMode,
      // needed so we can copy textures for post processing usage
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST,
      //viewFormats: []
    })
  }

  /**
   * Set our [context]{@link GPURenderer#context} if possible and set [main render pass]{@link GPURenderer#renderPass} and [scene]{@link GPURenderer#scene}
   */
  setContext() {
    this.context = this.canvas.getContext('webgpu')

    if (this.device) {
      this.configureContext()

      this.setMainRenderPass()
      this.setScene()
    }
  }

  /**
   * Called when the [renderer device]{@link GPURenderer#device} is lost.
   * Force all our scene objects to lose context.
   */
  loseContext() {
    // force all our scene objects to lose context
    this.renderedObjects.forEach((sceneObject) => sceneObject.loseContext())
  }

  /**
   * Called when the [renderer device]{@link GPURenderer#device} should be restored.
   * Reset the adapter, device and configure context again, restore our scene objects context, resize the render textures.
   * @async
   */
  restoreContext() {
    this.configureContext()

    // restore context of all our scene objects
    this.renderedObjects.forEach((sceneObject) => sceneObject.restoreContext())

    // force renderer resize to resize all our render passes textures
    this.onResize()
  }

  /* PIPELINES, SCENE & MAIN RENDER PASS */

  /**
   * Set our [main render pass]{@link GPURenderer#renderPass} that will be used to render the result of our draw commands back to the screen
   */
  setMainRenderPass() {
    this.renderPass = new RenderPass(this, {
      label: 'Main Render pass',
      depth: true,
    })
  }

  /**
   * Set our [scene]{@link GPURenderer#scene}
   */
  setScene() {
    this.scene = new Scene({ renderer: this })
  }

  /* BUFFERS & BINDINGS */

  /**
   * Create a {@link GPUBuffer}
   * @param bufferDescriptor - [buffer descriptor]{@link GPUBufferDescriptor}
   * @returns - newly created {@link GPUBuffer}
   */
  createBuffer(bufferDescriptor: GPUBufferDescriptor): GPUBuffer {
    const buffer = this.device?.createBuffer(bufferDescriptor)
    this.buffers.push(buffer)
    return buffer
  }

  /**
   * Remove a [buffer]{@link GPUBuffer} from our [buffers array]{@link GPUDeviceManager#buffers}
   * @param buffer - [buffer]{@link GPUBuffer} to remove
   */
  removeBuffer(buffer: GPUBuffer) {
    this.deviceManager.removeBuffer(buffer)
  }

  /**
   * Write to a {@link GPUBuffer}
   * @param buffer - {@link GPUBuffer} to write to
   * @param bufferOffset - [buffer offset]{@link GPUSize64}
   * @param data - [data]{@link BufferSource} to write
   */
  queueWriteBuffer(buffer: GPUBuffer, bufferOffset: GPUSize64, data: BufferSource) {
    this.device?.queue.writeBuffer(buffer, bufferOffset, data)
  }

  /**
   * Copy a source {@link GPUBuffer} into a destination {@link GPUBuffer}
   * @param parameters - parameters used to realize the copy
   * @param parameters.srcBuffer - source {@link GPUBuffer}
   * @param [parameters.dstBuffer] - destination {@link GPUBuffer}. Will create a new one if none provided.
   * @param [parameters.commandEncoder] - [command encoder]{@link GPUCommandEncoder} to use for the copy. Will create a new one and submit the command buffer if none provided.
   * @returns - destination {@link GPUBuffer} after copy
   */
  copyBufferToBuffer({
    srcBuffer,
    dstBuffer,
    commandEncoder,
  }: {
    srcBuffer: GPUBuffer
    dstBuffer?: GPUBuffer
    commandEncoder?: GPUCommandEncoder
  }): GPUBuffer | null {
    if (!srcBuffer) {
      throwWarning(`${this.type}: cannot copy to buffer because the source buffer has not been provided`)
      return null
    }

    if (!dstBuffer) {
      dstBuffer = this.createBuffer({
        label: this.type + ': destination copy buffer from: ' + srcBuffer.label,
        size: srcBuffer.size,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
      })
    }

    // if there's no command encoder provided, we'll have to create one and submit it after the copy process
    const hasCommandEncoder = !!commandEncoder

    if (!hasCommandEncoder) {
      commandEncoder = this.device?.createCommandEncoder({ label: 'Copy buffer command encoder' })
    }

    commandEncoder.copyBufferToBuffer(srcBuffer, 0, dstBuffer, 0, dstBuffer.size)

    if (!hasCommandEncoder) {
      const commandBuffer = commandEncoder.finish()
      this.device?.queue.submit([commandBuffer])
    }

    return dstBuffer
  }

  /* BIND GROUPS & LAYOUTS */

  /**
   * Create a {@link GPUBindGroupLayout}
   * @param bindGroupLayoutDescriptor - [bind group layout descriptor]{@link GPUBindGroupLayoutDescriptor}
   * @returns - newly created {@link GPUBindGroupLayout}
   */
  createBindGroupLayout(bindGroupLayoutDescriptor: GPUBindGroupLayoutDescriptor): GPUBindGroupLayout {
    return this.device?.createBindGroupLayout(bindGroupLayoutDescriptor)
  }

  /**
   * Create a {@link GPUBindGroup}
   * @param bindGroupDescriptor - [bind group descriptor]{@link GPUBindGroupDescriptor}
   * @returns - newly created {@link GPUBindGroup}
   */
  createBindGroup(bindGroupDescriptor: GPUBindGroupDescriptor): GPUBindGroup {
    return this.device?.createBindGroup(bindGroupDescriptor)
  }

  /* SHADERS & PIPELINES */

  /**
   * Create a {@link GPUShaderModule}
   * @param shaderModuleDescriptor - [shader module descriptor]{@link shaderModuleDescriptor}
   * @returns - newly created {@link GPUShaderModule}
   */
  createShaderModule(shaderModuleDescriptor: GPUShaderModuleDescriptor): GPUShaderModule {
    return this.device?.createShaderModule(shaderModuleDescriptor)
  }

  /**
   * Create a {@link GPUPipelineLayout}
   * @param pipelineLayoutDescriptor - [pipeline layout descriptor]{@link GPUPipelineLayoutDescriptor}
   * @returns - newly created {@link GPUPipelineLayout}
   */
  createPipelineLayout(pipelineLayoutDescriptor: GPUPipelineLayoutDescriptor): GPUPipelineLayout {
    return this.device?.createPipelineLayout(pipelineLayoutDescriptor)
  }

  /**
   * Create a {@link GPURenderPipeline}
   * @param pipelineDescriptor - [render pipeline descriptor]{@link GPURenderPipelineDescriptor}
   * @returns - newly created {@link GPURenderPipeline}
   */
  createRenderPipeline(pipelineDescriptor: GPURenderPipelineDescriptor): GPURenderPipeline {
    return this.device?.createRenderPipeline(pipelineDescriptor)
  }

  /**
   * Asynchronously create a {@link GPURenderPipeline}
   * @async
   * @param pipelineDescriptor - [render pipeline descriptor]{@link GPURenderPipelineDescriptor}
   * @returns - newly created {@link GPURenderPipeline}
   */
  async createRenderPipelineAsync(pipelineDescriptor: GPURenderPipelineDescriptor): Promise<GPURenderPipeline> {
    return await this.device?.createRenderPipelineAsync(pipelineDescriptor)
  }

  /**
   * Create a {@link GPUComputePipeline}
   * @param pipelineDescriptor - [compute pipeline descriptor]{@link GPUComputePipelineDescriptor}
   * @returns - newly created {@link GPUComputePipeline}
   */
  createComputePipeline(pipelineDescriptor: GPUComputePipelineDescriptor): GPUComputePipeline {
    return this.device?.createComputePipeline(pipelineDescriptor)
  }

  /**
   * Asynchronously create a {@link GPUComputePipeline}
   * @async
   * @param pipelineDescriptor - [compute pipeline descriptor]{@link GPUComputePipelineDescriptor}
   * @returns - newly created {@link GPUComputePipeline}
   */
  async createComputePipelineAsync(pipelineDescriptor: GPUComputePipelineDescriptor): Promise<GPUComputePipeline> {
    return await this.device?.createComputePipelineAsync(pipelineDescriptor)
  }

  /* TEXTURES */

  /**
   * Add a [texture]{@link Texture} to our [textures array]{@link GPURenderer#textures}
   * @param texture - [texture]{@link Texture} to add
   */
  addTexture(texture: Texture) {
    this.textures.push(texture)

    this.setTexture(texture)
  }

  /**
   * Remove a [texture]{@link Texture} from our [textures array]{@link GPURenderer#textures}
   * @param texture - [texture]{@link Texture} to remove
   */
  removeTexture(texture: Texture) {
    this.textures = this.textures.filter((t) => t.uuid !== texture.uuid)
  }

  /**
   * Call texture [createTexture]{@link Texture#createTexture} method
   * @param texture - [texture]{@link Texture} to create
   */
  setTexture(texture: Texture) {
    if (!texture.texture) {
      // call createTexture on texture class, that is then going to call the renderer createTexture method
      texture.createTexture()
    }
  }

  /**
   * Create a {@link GPUTexture}
   * @param textureDescriptor - [texture descriptor]{@link GPUTextureDescriptor}
   * @returns - newly created {@link GPUTexture}
   */
  createTexture(textureDescriptor: GPUTextureDescriptor): GPUTexture {
    return this.device?.createTexture(textureDescriptor)
  }

  /**
   * Upload a [texture]{@link Texture} to the GPU
   * @param texture - [texture]{@link Texture} to upload
   */
  uploadTexture(texture: Texture) {
    if (texture.source) {
      try {
        this.device?.queue.copyExternalImageToTexture(
          {
            source: texture.source as GPUImageCopyExternalImageSource,
            flipY: texture.options.flipY,
          } as GPUImageCopyExternalImage,
          { texture: texture.texture as GPUTexture },
          { width: texture.size.width, height: texture.size.height }
        )

        if ((texture.texture as GPUTexture).mipLevelCount > 1) {
          generateMips(this.device, texture.texture as GPUTexture)
        }

        // add to our textures queue array to track when it has been uploaded
        this.texturesQueue.push(texture)
      } catch ({ message }) {
        throwError(`GPURenderer: could not upload texture: ${texture.options.name} because: ${message}`)
      }
    } else {
      this.device?.queue.writeTexture(
        { texture: texture.texture as GPUTexture },
        new Uint8Array(texture.options.placeholderColor),
        { bytesPerRow: texture.size.width * 4 },
        { width: texture.size.width, height: texture.size.height }
      )
    }
  }

  /**
   * Import an [external texture]{@link GPUExternalTexture}
   * @param video - [video]{@link HTMLVideoElement} source
   * @returns - [external texture]{@link GPUExternalTexture}
   */
  importExternalTexture(video: HTMLVideoElement): GPUExternalTexture {
    // TODO WebCodecs may be the way to go when time comes!
    // https://developer.chrome.com/blog/new-in-webgpu-113/#use-webcodecs-videoframe-source-in-importexternaltexture
    // see onVideoFrameCallback method in Texture class
    // const videoFrame = new VideoFrame(video)
    // return this.device?.importExternalTexture({ source: videoFrame })
    return this.device?.importExternalTexture({ source: video })
  }

  /**
   * Check if a {@link Sampler} has already been created with the same [parameters]{@link Sampler#options}.
   * Use it if found, else create a new one and add it to the [device manager samplers array]{@link GPUDeviceManager#samplers}.
   * @param sampler - {@link Sampler} to create
   * @returns - the {@link GPUSampler}
   */
  createSampler(sampler: Sampler): GPUSampler {
    const existingSampler = this.samplers.find((existingSampler) => {
      return JSON.stringify(existingSampler.options) === JSON.stringify(sampler.options) && existingSampler.sampler
    })

    if (existingSampler) {
      return existingSampler.sampler
    } else {
      const { type, ...samplerOptions } = sampler.options
      const gpuSampler: GPUSampler = this.device?.createSampler({
        label: sampler.label,
        ...samplerOptions,
      })

      this.samplers.push(sampler)

      return gpuSampler
    }
  }

  /**
   * Remove a [sampler]{@link Sampler} from our [samplers array]{@link GPUDeviceManager#sampler}
   * @param sampler - [sampler]{@link Sampler} to remove
   */
  removeSampler(sampler: Sampler) {
    this.deviceManager.removeSampler(sampler)
  }

  /* OBJECTS & TASKS */

  /**
   * Set different tasks queue managers to execute callbacks at different phases of our render call:
   * - {@link onBeforeCommandEncoderCreation}: callbacks executed before the creation of the command encoder
   * - {@link onBeforeRenderScene}: callbacks executed after the creation of the command encoder and before rendering the {@link Scene}
   * - {@link onAfterRenderScene}: callbacks executed after the creation of the command encoder and after rendering the {@link Scene}
   * - {@link onAfterCommandEncoderSubmission}: callbacks executed after the submission of the command encoder
   */
  setTasksQueues() {
    // TODO
    this.onBeforeCommandEncoderCreation = new TasksQueueManager()
    this.onBeforeRenderScene = new TasksQueueManager()
    this.onAfterRenderScene = new TasksQueueManager()
    this.onAfterCommandEncoderSubmission = new TasksQueueManager()
  }

  /**
   * Set all objects arrays that we'll keep track of
   */
  setRendererObjects() {
    // keep track of meshes, textures, etc.
    this.computePasses = []
    this.pingPongPlanes = []
    this.shaderPasses = []
    this.renderTargets = []
    this.meshes = []
    this.textures = []
  }

  /**
   * Get all this [renderer]{@link GPURenderer} rendered objects (i.e. compute passes, meshes, ping pong planes and shader passes)
   * @readonly
   */
  get renderedObjects(): SceneObject[] {
    return [...this.computePasses, ...this.meshes, ...this.shaderPasses, ...this.pingPongPlanes]
  }

  /**
   * Get all the rendered objects (i.e. compute passes, meshes, ping pong planes and shader passes) created by the [device manager]{@link GPUDeviceManager}
   * @readonly
   */
  get deviceObjects(): SceneObject[] {
    return this.deviceManager.deviceObjects
  }

  /**
   * Get whether our {@link GPUDeviceManager} is ready (i.e. its [adapter]{@link GPUDeviceManager#adapter} and [device]{@link GPUDeviceManager#device} are set)
   * @readonly
   */
  get ready(): boolean {
    return this.deviceManager.ready
  }

  /**
   * Get all objects ([Meshes]{@link MeshType} or [Compute passes]{@link ComputePass}) using a given [bind group]{@link AllowedBindGroups}.
   * Useful to know if a resource is used by multiple objects and if it is safe to destroy it or not.
   * @param bindGroup - [bind group]{@link AllowedBindGroups} to check
   */
  getObjectsByBindGroup(bindGroup: AllowedBindGroups): undefined | SceneObject[] {
    return this.deviceObjects.filter((object) => {
      return [
        ...object.material.bindGroups,
        ...object.material.inputsBindGroups,
        ...object.material.clonedBindGroups,
      ].filter((bG) => bG.uuid === bindGroup.uuid)
    })
  }

  /**
   * Get all objects ([Meshes]{@link MeshType} or [Compute passes]{@link ComputePass}) using a given [texture]{@link Texture} or [render texture]{@link RenderTexture}.
   * Useful to know if a resource is used by multiple objects and if it is safe to destroy it or not.
   * @param texture - [texture]{@link Texture} or [render texture]{@link RenderTexture} to check
   */
  getObjectsByTexture(texture: Texture | RenderTexture): undefined | SceneObject[] {
    return this.deviceObjects.filter((object) => {
      return [...object.material.textures, ...object.material.renderTextures].filter((t) => t.uuid === texture.uuid)
    })
  }

  /* EVENTS */

  /**
   * Assign a callback function to _onBeforeRenderCallback
   * @param callback - callback to run just before the [renderer render method]{@link GPURenderer#render} will be executed
   * @returns - our {@link GPURenderer}
   */
  onBeforeRender(callback: (commandEncoder?: GPUCommandEncoder) => void) {
    if (callback) {
      this._onBeforeRenderCallback = callback
    }

    return this
  }

  /**
   * Assign a callback function to _onAfterRenderCallback
   * @param callback - callback to run just after the [renderer render method]{@link GPURenderer#render} has been executed
   * @returns - our {@link GPURenderer}
   */
  onAfterRender(callback: (commandEncoder?: GPUCommandEncoder) => void) {
    if (callback) {
      this._onAfterRenderCallback = callback
    }

    return this
  }

  /**
   * Assign a callback function to _onAfterResizeCallback
   * @param callback - callback to run just after the {@link GPURenderer} has been resized
   * @returns - our {@link GPURenderer}
   */
  onAfterResize(callback: (commandEncoder?: GPUCommandEncoder) => void) {
    if (callback) {
      this._onAfterResizeCallback = callback
    }

    return this
  }

  /* RENDER */

  /**
   * Set the current [render pass descriptor]{@link RenderPass#descriptor} texture [view]{@link GPURenderPassColorAttachment#view} or [resolveTarget]{@link GPURenderPassColorAttachment#resolveTarget} (depending on whether we're using multisampling)
   * @param renderPass - current [render pass]{@link RenderPass}
   * @param renderTexture - [render texture]{@link GPUTexture} to use, or the [context]{@link GPURenderer#context} [current texture]{@link GPUTexture} if null
   * @returns - the [current render texture]{@link GPUTexture}
   */
  setRenderPassCurrentTexture(renderPass: RenderPass, renderTexture: GPUTexture | null = null) {
    if (!renderTexture) {
      renderTexture = this.context.getCurrentTexture()
      renderTexture.label = `${this.type} context current texture`
    }

    if (this.sampleCount > 1) {
      renderPass.descriptor.colorAttachments[0].resolveTarget = renderTexture.createView()
    } else {
      renderPass.descriptor.colorAttachments[0].view = renderTexture.createView()
    }

    return renderTexture
  }

  /**
   * Render a single [Compute pass]{@link ComputePass}
   * @param commandEncoder - current {@link GPUCommandEncoder}
   * @param computePass - [Compute pass]{@link ComputePass}
   */
  renderSingleComputePass(commandEncoder: GPUCommandEncoder, computePass: ComputePass) {
    if (!computePass.canRender) return

    const pass = commandEncoder.beginComputePass()
    computePass.render(pass)
    pass.end()

    computePass.copyBufferToResult(commandEncoder)
  }

  /**
   * Render a single [Mesh]{@link MeshType}
   * @param commandEncoder - current {@link GPUCommandEncoder}
   * @param mesh - [Mesh]{@link MeshType} to render
   */
  renderSingleMesh(commandEncoder: GPUCommandEncoder, mesh: MeshType) {
    const pass = commandEncoder.beginRenderPass(this.renderPass.descriptor)
    mesh.render(pass)
    pass.end()
  }

  /**
   * Render an array of objects (either [Meshes]{@link MeshType} or [Compute passes]{@link ComputePass}) once. This method won't call any of the renderer render hooks like [onBeforeRender]{@link GPURenderer#onBeforeRender}, [onAfterRender]{@link GPURenderer#onAfterRender}
   * @param objects - Array of [Meshes]{@link MeshType} or [Compute passes]{@link ComputePass} to render
   */
  renderOnce(objects: Array<MeshType | ComputePass>) {
    const commandEncoder = this.device?.createCommandEncoder({
      label: 'Renderer once command encoder',
    })

    this.pipelineManager.resetCurrentPipeline()

    objects.forEach((object) => {
      if (object instanceof ComputePass) {
        this.renderSingleComputePass(commandEncoder, object)
      } else {
        this.renderSingleMesh(commandEncoder, object)
      }
    })

    const commandBuffer = commandEncoder.finish()
    this.device?.queue.submit([commandBuffer])

    this.pipelineManager.resetCurrentPipeline()
  }

  /**
   * Force to clear a {@link GPURenderer} content to its [clear value]{@link RenderPass#options#clearValue} by rendering and empty pass.
   * @param commandEncoder
   */
  forceClear(commandEncoder?: GPUCommandEncoder) {
    // if there's no command encoder provided, we'll have to create one and submit it after the copy process
    const hasCommandEncoder = !!commandEncoder

    if (!hasCommandEncoder) {
      commandEncoder = this.device?.createCommandEncoder({ label: 'Force clear command encoder' })
    }

    this.setRenderPassCurrentTexture(this.renderPass)
    const pass = commandEncoder.beginRenderPass(this.renderPass.descriptor)
    pass.end()

    if (!hasCommandEncoder) {
      const commandBuffer = commandEncoder.finish()
      this.device?.queue.submit([commandBuffer])
    }
  }

  /**
   * Called by the [GPUDeviceManager render method]{@link GPUDeviceManager#render} before the {@link GPUCommandEncoder} has been created
   */
  onBeforeCommandEncoder() {
    if (!this.ready) return
    // now render!
    this.onBeforeCommandEncoderCreation.execute()
  }

  /**
   * Called by the [GPUDeviceManager render method]{@link GPUDeviceManager#render} after the {@link GPUCommandEncoder} has been created.
   * Used to handle our [textures queue]{@link GPURenderer#texturesQueue}
   */
  onAfterCommandEncoder() {
    if (!this.ready) return

    // handle textures
    // first check if media textures without parent need to be uploaded
    this.textures
      .filter((texture) => !texture.parent && texture.sourceLoaded && !texture.sourceUploaded)
      .forEach((texture) => this.uploadTexture(texture))

    // no need to use device.queue.onSubmittedWorkDone
    // as [Kai Ninomiya](https://github.com/kainino0x) stated:
    // "Anything you submit() after the copyExternalImageToTexture() is guaranteed to see the result of that call."
    this.texturesQueue.forEach((texture) => {
      texture.sourceUploaded = true
    })

    // clear texture queue
    this.texturesQueue = []

    this.onAfterCommandEncoderSubmission.execute()
  }

  /**
   * Called at each draw call to render our scene and its content
   * @param commandEncoder - current {@link GPUCommandEncoder}
   */
  render(commandEncoder: GPUCommandEncoder) {
    if (!this.ready) return

    this._onBeforeRenderCallback && this._onBeforeRenderCallback(commandEncoder)
    this.onBeforeRenderScene.execute(commandEncoder)

    this.scene.render(commandEncoder)

    this._onAfterRenderCallback && this._onAfterRenderCallback(commandEncoder)
    this.onAfterRenderScene.execute(commandEncoder)
  }

  /**
   * Destroy our {@link GPURenderer} and everything that needs to be destroyed as well
   */
  destroy() {
    this.domElement?.destroy()
    this.documentBody?.destroy()

    // destroy render passes
    this.renderPass?.destroy()

    this.renderTargets.forEach((renderTarget) => renderTarget.destroy())
    this.renderedObjects.forEach((sceneObject) => sceneObject.remove())

    //this.textures.forEach((texture) => texture.destroy())
    this.textures = []
    this.texturesQueue = []

    this.device?.destroy()
    this.context?.unconfigure()
  }
}
