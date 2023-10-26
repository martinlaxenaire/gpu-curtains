import { generateMips } from '../../utils/renderer-utils'
import { PipelineManager } from '../pipelines/PipelineManager'
import { DOMElement } from '../DOMElement'
import { Scene } from '../scenes/Scene'
import { RenderPass } from '../renderPasses/RenderPass'
import { throwWarning, throwError, logError } from '../../utils/utils'
import { Sampler } from '../samplers/Sampler'

export class GPURenderer {
  // callbacks / events
  _onBeforeRenderCallback = (commandEncoder) => {
    /* allow empty callback */
  }
  _onAfterRenderCallback = (commandEncoder) => {
    /* allow empty callback */
  }

  constructor({
    container,
    pixelRatio = 1,
    sampleCount = 4,
    production = false,
    preferredFormat,
    onError = () => {
      /* allow empty callbacks */
    },
  }) {
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
   * Set Canvas size
   */
  setSize(boundingRect) {
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

  resize(boundingRect = null) {
    if (!this.domElement) return

    if (!boundingRect) boundingRect = this.domElement.element.getBoundingClientRect()

    this.setSize(boundingRect)

    this.onResize()
  }

  onResize() {
    // resize render & shader passes
    this.renderPass?.resize(this.pixelRatioBoundingRect)
    this.renderTargets.forEach((renderTarget) => renderTarget.resize(this.pixelRatioBoundingRect))
    this.pingPongPlanes.forEach((pingPongPlane) => pingPongPlane.resize(this.boundingRect))
    this.shaderPasses.forEach((shaderPass) => shaderPass.resize(this.boundingRect))
    this.computePasses.forEach((computePass) => computePass.resize())
    this.meshes.forEach((mesh) => {
      // resize meshes that do not have a bound DOM element
      if (!mesh.domElement) mesh.resize(this.boundingRect)
    })
  }

  get boundingRect() {
    return this.domElement.boundingRect
  }

  get pixelRatioBoundingRect() {
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
   * Set Context
   *
   * @returns {Promise<void>}
   */
  async setContext() {
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

      // ready to start
      this.ready = true
    }
  }

  /**
   * Set Adapter and Device
   *
   * @returns {Promise<void>}
   */
  async setAdapterAndDevice() {
    this.adapter = await this.gpu?.requestAdapter().catch(() => {
      setTimeout(() => {
        this.onError()
        throwError("GPURenderer: WebGPU is not supported on your browser/OS. 'requestAdapter' failed.")
      }, 0)
    })

    this.device = await this.adapter?.requestDevice().catch(() => {
      setTimeout(() => {
        this.onError()
        throwError("GPURenderer: WebGPU is not supported on your browser/OS. 'requestDevice' failed.")
      }, 0)
    })

    this.device?.lost.then((info) => {
      throwWarning(`GPURenderer: WebGPU device was lost: ${info.message}`)

      // 'reason' will be 'destroyed' if we intentionally destroy the device.
      if (info.reason !== 'destroyed') {
        // try again...
      }
    })
  }

  /** PIPELINES, SCENE & MAIN RENDER PASS **/

  setMainRenderPass() {
    // TODO is this.renderPass still needed?
    this.renderPass = new RenderPass(/** @type {GPURenderer} **/ this, {
      label: 'Main Render pass',
      depth: true,
    })
  }

  setPipelineManager() {
    this.pipelineManager = /** @type {PipelineManager} **/ new PipelineManager({
      renderer: /** @type {GPURenderer} **/ this,
    })
  }

  setScene() {
    this.scene = /** @type {Scene} **/ new Scene({ renderer: /** @type {GPURenderer} **/ this })
  }

  /** BUFFERS & BINDINGS **/

  createBuffer(bufferDescriptor) {
    return this.device?.createBuffer(bufferDescriptor)
  }

  queueWriteBuffer(buffer, bufferOffset, data) {
    this.device?.queue.writeBuffer(buffer, bufferOffset, data)
  }

  createBindGroupLayout(bindGroupLayoutDescriptor) {
    return this.device?.createBindGroupLayout(bindGroupLayoutDescriptor)
  }

  createBindGroup(bindGroupDescriptor) {
    return this.device?.createBindGroup(bindGroupDescriptor)
  }

  /** SHADERS & PIPELINES **/

  createShaderModule(shaderModuleDescriptor) {
    return this.device?.createShaderModule(shaderModuleDescriptor)
  }

  createPipelineLayout(pipelineLayoutDescriptor) {
    return this.device?.createPipelineLayout(pipelineLayoutDescriptor)
  }

  createRenderPipeline(pipelineDescriptor) {
    return this.device?.createRenderPipeline(pipelineDescriptor)
  }

  async createRenderPipelineAsync(pipelineDescriptor) {
    return await this.device?.createRenderPipelineAsync(pipelineDescriptor)
  }

  createComputePipeline(pipelineDescriptor) {
    return this.device?.createComputePipeline(pipelineDescriptor)
  }

  async createComputePipelineAsync(pipelineDescriptor) {
    return await this.device?.createComputePipelineAsync(pipelineDescriptor)
  }

  /** TEXTURES **/

  addTexture(texture) {
    this.textures.push(texture)

    this.setTexture(texture)
  }

  setTexture(texture) {
    if (!texture.texture) {
      // call createTexture on texture class, that is then going to call the renderer createTexture method
      texture.createTexture()
    }
  }

  createSampler(sampler) {
    const existingSampler = this.samplers.find((existingSampler) => {
      return JSON.stringify(existingSampler.options) === JSON.stringify(sampler.options) && existingSampler.sampler
    })

    if (existingSampler) {
      return existingSampler.sampler
    } else {
      const gpuSampler = this.device?.createSampler({ label: sampler.label, ...sampler.options })

      this.samplers.push(sampler)

      return gpuSampler
    }
  }

  createTexture(options) {
    return this.device?.createTexture(options)
  }

  uploadTexture(texture) {
    if (texture.source) {
      try {
        this.device?.queue.copyExternalImageToTexture(
          { source: texture.source, flipY: texture.options.texture.flipY },
          { texture: texture.texture },
          { width: texture.size.width, height: texture.size.height }
        )

        if (texture.texture.mipLevelCount > 1) {
          generateMips(this.device, texture.texture)
        }

        this.texturesQueue.push(texture)
      } catch ({ message }) {
        throwError(`GPURenderer: could not upload texture: ${texture.options.name} because: ${message}`)
      }
    } else {
      this.device?.queue.writeTexture(
        { texture: texture.texture },
        new Uint8Array(texture.options.texture.placeholderColor),
        { bytesPerRow: texture.size.width * 4 },
        { width: texture.size.width, height: texture.size.height }
      )
    }
  }

  importExternalTexture(video) {
    // TODO WebCodecs may be the way to go when time comes!
    // https://developer.chrome.com/blog/new-in-webgpu-113/#use-webcodecs-videoframe-source-in-importexternaltexture
    // see onVideoFrameCallback method in Texture class
    // const videoFrame = new VideoFrame(video)
    // return this.device.importExternalTexture({ source: videoFrame })
    return this.device?.importExternalTexture({ source: video })
  }

  /** OBJECTS **/

  setRendererObjects() {
    // keep track of meshes, textures, etc.
    this.computePasses = []
    this.pingPongPlanes = []
    this.shaderPasses = []
    this.renderTargets = []
    this.meshes = []
    this.samplers = []
    this.textures = []
  }

  /** EVENTS **/

  onBeforeRender(callback) {
    if (callback) {
      this._onBeforeRenderCallback = callback
    }

    return this
  }

  onAfterRender(callback) {
    if (callback) {
      this._onAfterRenderCallback = callback
    }

    return this
  }

  /** RENDER **/

  setRenderPassCurrentTexture(renderPass, renderTexture = null) {
    if (!renderTexture) renderTexture = this.context.getCurrentTexture()

    if (this.sampleCount > 1) {
      renderPass.descriptor.colorAttachments[0].resolveTarget = renderTexture.createView()
    } else {
      renderPass.descriptor.colorAttachments[0].view = renderTexture.createView()
    }

    return renderTexture
  }

  onBeforeCommandEncoder() {
    /* will be overridden */
  }

  onAfterCommandEncoder() {
    /* will be overridden */
    this.scene.onAfterCommandEncoder()
  }

  /**
   * Called at each draw call to render our scene and its content
   * Also create shader modules if not already created
   */
  render() {
    if (!this.ready) return

    // now render!

    this.onBeforeCommandEncoder()

    const commandEncoder = this.device?.createCommandEncoder({ label: 'Renderer command encoder' })

    this._onBeforeRenderCallback && this._onBeforeRenderCallback(commandEncoder)

    this.scene.render(commandEncoder)

    this._onAfterRenderCallback && this._onAfterRenderCallback(commandEncoder)

    const commandBuffer = commandEncoder.finish()
    this.device?.queue.submit([commandBuffer])

    // no need to use device.queue.onSubmittedWorkDone
    // as Kai Ninomiya stated:
    // "Anything you submit() after the copyExternalImageToTexture() is guaranteed to see the result of that call."
    this.texturesQueue.forEach((texture) => {
      texture.sourceUploaded = true
    })

    // clear texture queue
    this.texturesQueue = []

    this.onAfterCommandEncoder()
  }

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
