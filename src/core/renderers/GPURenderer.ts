import { generateMips } from './utils'
import { PipelineManager } from '../pipelines/PipelineManager'
import { DOMElement, DOMElementBoundingRect } from '../DOM/DOMElement'
import { Scene } from '../scenes/Scene'
import { RenderPass } from '../renderPasses/RenderPass'
import { throwError, throwWarning } from '../../utils/utils'

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

/**
 * Parameters used to create a {@link GPURenderer}
 */
export interface GPURendererParams {
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
  /** Callback to run if there's any error while trying to set up the [adapter]{@link GPUAdapter}, [device]{@link GPUDevice} or [context]{@link GPUCanvasContext} */
  onError?: () => void
}

// TODO should be GPUCurtainsRenderer props?
export type DOMMeshType = DOMMesh | Plane
export type MeshType = Mesh | DOMMeshType

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
  /** Flag indicating whether the {@link GPURenderer} is ready, i.e. its [adapter]{@link GPURenderer#adapter} and [device]{@link GPURenderer#device} have been successfully created */
  ready: boolean
  /** navigator {@link GPU} object */
  gpu: null | GPU
  /** [canvas]{@link HTMLCanvasElement} onto everything is drawn */
  canvas: HTMLCanvasElement
  /** The WebGPU [context]{@link GPUCanvasContext} used */
  context: null | GPUCanvasContext
  /** Texture rendering [preferred format]{@link GPUTextureFormat} */
  preferredFormat: null | GPUTextureFormat
  /** The WebGPU [adapter]{@link GPUAdapter} used */
  adapter: GPUAdapter | void
  /** The WebGPU [device]{@link GPUDevice} used */
  device: GPUDevice | null

  /** Callback to run if there's any error while trying to set up the [adapter]{@link GPUAdapter}, [device]{@link GPUDevice} or [context]{@link GPUCanvasContext} */
  onError: () => void

  /** The final [render pass]{@link RenderPass} to render our result to screen */
  renderPass: RenderPass
  /** The {@link PipelineManager} used */
  pipelineManager: PipelineManager
  /** The {@link Scene} used */
  scene: Scene

  /** An array containing all our created {@link GPUBuffer} */
  buffers: GPUBuffer[]
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
  /** An array containing all our created {@link Sampler} */
  samplers: Sampler[]
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

  // TODO
  onBeforeCommandEncoderCreation: TasksQueueManager
  onBeforeRenderScene: TasksQueueManager
  onAfterRenderScene: TasksQueueManager
  onAfterCommandEncoderSubmission: TasksQueueManager

  // callbacks / events
  /** function assigned to the [onBeforeRender]{@link GPURenderer#onBeforeRender} callback */
  _onBeforeRenderCallback = (commandEncoder: GPUCommandEncoder) => {
    /* allow empty callback */
  }
  /** function assigned to the [onAfterRender]{@link GPURenderer#onAfterRender} callback */
  _onAfterRenderCallback = (commandEncoder) => {
    /* allow empty callback */
  }

  /**
   * GPURenderer constructor
   * @param parameters - [parameters]{@link GPURendererParams} used to create this {@link GPURenderer}
   */
  constructor({
    container,
    pixelRatio = 1,
    sampleCount = 4,
    production = false,
    preferredFormat,
    onError = () => {
      /* allow empty callbacks */
    },
  }: GPURendererParams) {
    this.type = 'GPURenderer'
    this.ready = false

    this.gpu = navigator.gpu

    this.pixelRatio = pixelRatio ?? window.devicePixelRatio ?? 1
    this.sampleCount = sampleCount
    this.production = production
    this.preferredFormat = preferredFormat

    this.onError = onError

    if (!this.gpu) {
      setTimeout(() => {
        this.onError()
        throwError("GPURenderer: WebGPU is not supported on your browser/OS. No 'gpu' object in 'navigator'.")
      }, 0)
    }

    this.setTasksQueues()
    this.setRendererObjects()

    // create the canvas
    this.canvas = document.createElement('canvas')

    // needed to get container bounding box
    this.domElement = new DOMElement({
      element: container,
    })

    // now track any change in the document body size, and resize our scene
    this.documentBody = new DOMElement({
      element: document.body,
      onSizeChanged: () => this.resize(),
    })

    this.texturesQueue = []
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

  /**
   * Set our [context]{@link GPURenderer#context} if possible and set [main render pass]{@link GPURenderer#renderPass}, [pipeline manager]{@link GPURenderer#pipelineManager} and [scene]{@link GPURenderer#scene}
   * @returns - void promise result
   */
  async setContext(): Promise<void> {
    this.context = this.canvas.getContext('webgpu')

    await this.setAdapterAndDevice()

    if (this.device) {
      this.preferredFormat = this.preferredFormat ?? this.gpu?.getPreferredCanvasFormat()

      this.context.configure({
        device: this.device,
        format: this.preferredFormat,
        // needed so we can copy textures for post processing usage
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST,
        // TODO
        alphaMode: 'premultiplied', // or "opaque"
        //viewFormats: []
      })

      this.setMainRenderPass()
      this.setPipelineManager()
      this.setScene()

      // append the canvas and we're ready!
      this.domElement.element.appendChild(this.canvas)

      // ready to start
      this.ready = true
    }
  }

  /**
   * Set our [adapter]{@link GPURenderer#adapter} and [device]{@link GPURenderer#device} if possible
   * @returns - void promise result
   */
  async setAdapterAndDevice(): Promise<void> {
    this.adapter = await this.gpu?.requestAdapter().catch(() => {
      setTimeout(() => {
        this.onError()
        throwError("GPURenderer: WebGPU is not supported on your browser/OS. 'requestAdapter' failed.")
      }, 0)
    })

    try {
      this.device = await (this.adapter as GPUAdapter)?.requestDevice()
    } catch (error) {
      setTimeout(() => {
        this.onError()
        throwError(`GPURenderer: WebGPU is not supported on your browser/OS. 'requestDevice' failed: ${error}`)
      }, 0)
    }

    this.device?.lost.then((info) => {
      throwWarning(`GPURenderer: WebGPU device was lost: ${info.message}`)

      // 'reason' will be 'destroyed' if we intentionally destroy the device.
      if (info.reason !== 'destroyed') {
        // try again...
      }
    })
  }

  /* PIPELINES, SCENE & MAIN RENDER PASS */

  /**
   * Set our [main render pass]{@link GPURenderer#renderPass} that will be used to render the result of our draw commands back to the screen
   */
  setMainRenderPass() {
    // TODO is this.renderPass still needed?
    this.renderPass = new RenderPass(/** @type {GPURenderer} **/ this, {
      label: 'Main Render pass',
      depth: true,
    })
  }

  /**
   * Set our [pipeline manager]{@link GPURenderer#pipelineManager}
   */
  setPipelineManager() {
    this.pipelineManager = new PipelineManager({
      renderer: this,
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
   * Remove a [buffer]{@link GPUBuffer} from our [buffers array]{@link GPURenderer#buffers}
   * @param buffer - [buffer]{@link GPUBuffer} to remove
   */
  removeBuffer(buffer: GPUBuffer) {
    this.buffers = this.buffers.filter((b) => {
      return b.label !== buffer.label && b.usage !== buffer.usage && b.size !== buffer.size
    })
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
    // return this.device.importExternalTexture({ source: videoFrame })
    return this.device?.importExternalTexture({ source: video })
  }

  /**
   * Check if a {@link Sampler} has already been created with the same [parameters]{@link Sampler#options}.
   * Use it if found, else create a new one and add it to the [samplers array]{@link GPURenderer#samplers}.
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
      const gpuSampler: GPUSampler = this.device?.createSampler({ label: sampler.label, ...sampler.options })

      this.samplers.push(sampler)

      return gpuSampler
    }
  }

  /* OBJECTS & TASKS */

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
    this.buffers = []
    this.computePasses = []
    this.pingPongPlanes = []
    this.shaderPasses = []
    this.renderTargets = []
    this.meshes = []
    this.samplers = []
    this.textures = []
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

  /* RENDER */

  /**
   * Set the current [render pass descriptor]{@link RenderPass#descriptor} texture [view]{@link GPURenderPassColorAttachment#view} or [resolveTarget]{@link GPURenderPassColorAttachment#resolveTarget} (depending on whether we're using multisampling)
   * @param renderPass - current [render pass]{@link RenderPass}
   * @param renderTexture - [render texture]{@link GPUTexture} to use, or the [context]{@link GPURenderer#context} [current texture]{@link GPUTexture} if null
   * @returns - the [current render texture]{@link GPUTexture}
   */
  setRenderPassCurrentTexture(renderPass: RenderPass, renderTexture: GPUTexture | null = null) {
    if (!renderTexture) renderTexture = this.context.getCurrentTexture()

    if (this.sampleCount > 1) {
      renderPass.descriptor.colorAttachments[0].resolveTarget = renderTexture.createView()
    } else {
      renderPass.descriptor.colorAttachments[0].view = renderTexture.createView()
    }

    return renderTexture
  }

  /**
   * Function to run just before our [command encoder]{@link GPUCommandEncoder} is created at each [render]{@link GPURenderer#render} call
   */
  onBeforeCommandEncoder() {
    /* will be overridden */
  }

  /**
   * Function to run just after our [command encoder]{@link GPUCommandEncoder} has been submitted at each [render]{@link GPURenderer#render} call
   */
  onAfterCommandEncoder() {
    /* will be overridden */
    this.scene.onAfterCommandEncoder()
  }

  /**
   * Called at each draw call to create a [command encoder]{@link GPUCommandEncoder}, render our scene and its content and handle our [textures queue]{@link GPURenderer#texturesQueue}
   */
  render() {
    if (!this.ready) return

    // now render!
    this.onBeforeCommandEncoder()
    this.onBeforeCommandEncoderCreation.execute()

    const commandEncoder = this.device?.createCommandEncoder({ label: 'Renderer command encoder' })

    this._onBeforeRenderCallback && this._onBeforeRenderCallback(commandEncoder)
    this.onBeforeRenderScene.execute(commandEncoder)

    this.scene.render(commandEncoder)

    this._onAfterRenderCallback && this._onAfterRenderCallback(commandEncoder)
    this.onAfterRenderScene.execute(commandEncoder)

    const commandBuffer = commandEncoder.finish()
    this.device?.queue.submit([commandBuffer])

    // now handle textures

    // first check if media textures without parent need to be uploaded
    // TODO safe?
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

    this.onAfterCommandEncoder()
    this.onAfterCommandEncoderSubmission.execute()
  }

  /**
   * Destroy our {@link GPURenderer} and everything that needs to be destroyed as well
   */
  destroy() {
    this.domElement?.destroy()
    this.documentBody?.destroy()

    this.meshes.forEach((mesh) => mesh.remove())

    //this.textures.forEach((texture) => texture.destroy())
    this.textures = []
    this.texturesQueue = []

    // destroy render passes
    this.renderPass?.destroy()

    this.renderTargets.forEach((renderTarget) => renderTarget.destroy())
    this.shaderPasses.forEach((shaderPass) => shaderPass.remove())
    this.pingPongPlanes.forEach((pingPongPlane) => pingPongPlane.remove())

    this.device?.destroy()
    this.context?.unconfigure()
  }
}
