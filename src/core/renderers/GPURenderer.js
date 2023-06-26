import { generateMips } from '../../utils/renderer-utils'
import { PipelineManager } from '../pipelines/PipelineManager'
import { DOMElement } from '../DOMElement'
import { Scene } from '../scenes/Scene'
import { RenderPass } from '../renderPasses/RenderPass'

export class GPURenderer {
  constructor({ container, pixelRatio = 1, renderingScale = 1, sampleCount = 4 }) {
    this.type = 'Renderer'
    this.ready = false

    this.gpu = navigator.gpu

    this.pixelRatio = pixelRatio ?? window.devicePixelRatio ?? 1
    this.renderingScale = renderingScale
    this.sampleCount = sampleCount

    if (!this.gpu) {
      console.warn('WebGPU not supported!')
      return
    }

    this.setRendererObjects()

    // create the canvas
    this.canvas = document.createElement('canvas')

    // needed to get container bounding box
    this.domElement = new DOMElement({
      element: container,
    })

    this.documentBody = new DOMElement({
      element: document.body,
      onSizeChanged: () => this.resize(),
    })
  }

  get boundingRect() {
    return this.domElement.boundingRect
  }

  /**
   * Set Context
   *
   * @returns {Promise<void>}
   */
  async setContext() {
    this.context = this.canvas.getContext('webgpu')

    this.preferredFormat = this.gpu?.getPreferredCanvasFormat()

    await this.setAdapterAndDevice()

    this.context.configure({
      device: this.device,
      format: this.preferredFormat,
      // needed so we can copy textures for post processing usage
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
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

  /**
   * Set Adapter and Device
   *
   * @returns {Promise<void>}
   */
  async setAdapterAndDevice() {
    this.adapter = await this.gpu?.requestAdapter()
    this.device = await this.adapter?.requestDevice()

    if (!this.device) {
      console.warn('WebGPU not supported!')
      return
    }

    this.device.lost.then((info) => {
      console.error(`WebGPU device was lost: ${info.message}`)

      // 'reason' will be 'destroyed' if we intentionally destroy the device.
      if (info.reason !== 'destroyed') {
        // try again...
      }
    })
  }

  /** PIPELINES, SCENE & MAIN RENDER PASS **/

  setMainRenderPass() {
    // TODO is this.renderPass still needed?
    this.renderPass = new RenderPass({
      renderer: /** @type {GPURenderer} **/ this,
      label: 'Main Render pass',
      depth: true,
    })

    //this.renderPasses.push(this.renderPass)
  }

  setPipelineManager() {
    this.pipelineManager = new PipelineManager({ renderer: /** @type {GPURenderer} **/ this })
  }

  setScene() {
    this.scene = new Scene({ renderer: /** @type {GPURenderer} **/ this })
  }

  /** TEXTURES **/

  addTexture(texture) {
    this.textures.push(texture)
  }

  setTexture(texture) {
    if (!texture.sampler) {
      texture.sampler = this.createSampler(texture.options.sampler)
    }

    if (!texture.texture) {
      // call createTexture on texture class, that is then going to call the renderer createTexture method
      texture.createTexture()
    }
  }

  createSampler(options) {
    if (!this.device) return false

    const existingSampler = this.samplers.find((sampler) => {
      return JSON.stringify(sampler.options) === JSON.stringify(options) && sampler.sampler
    })

    if (existingSampler) {
      return existingSampler.sampler
    } else {
      const sampler = this.device.createSampler(options)

      this.samplers.push({
        sampler,
        options,
      })

      return sampler
    }
  }

  createTexture(options) {
    if (!this.device) return false

    return this.device.createTexture(options)
  }

  uploadTexture(texture) {
    if (texture.source) {
      this.device.queue.copyExternalImageToTexture(
        { source: texture.source, flipY: texture.options.texture.flipY },
        { texture: texture.texture },
        { width: texture.size.width, height: texture.size.height }
      )

      if (texture.texture.mipLevelCount > 1) {
        generateMips(this.device, texture.texture)
      }
    } else {
      this.device.queue.writeTexture(
        { texture: texture.texture },
        new Uint8Array(texture.options.texture.placeholderColor),
        { bytesPerRow: texture.size.width * 4 },
        { width: texture.size.width, height: texture.size.height }
      )
    }
  }

  importExternalTexture(video) {
    // WebCodecs may be the way to go when time comes!
    // https://developer.chrome.com/blog/new-in-webgpu-113/#use-webcodecs-videoframe-source-in-importexternaltexture
    // see onVideoFrameCallback method in Texture class
    // const videoFrame = new VideoFrame(video)
    // return this.device.importExternalTexture({ source: videoFrame })
    return this.device.importExternalTexture({ source: video })
  }

  /**
   * Set Canvas size
   */
  setSize(contentRect) {
    this.canvas.style.width = Math.floor(contentRect.width) + 'px'
    this.canvas.style.height = Math.floor(contentRect.height) + 'px'

    const renderingSize = {
      width: Math.floor(contentRect.width * this.pixelRatio * this.renderingScale),
      height: Math.floor(contentRect.height * this.pixelRatio * this.renderingScale),
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

    // resize render passes
    //this.renderPasses?.forEach((renderPass) => renderPass.resize(boundingRect))
    this.renderPass?.resize(boundingRect)

    this.shaderPasses.forEach((shaderPass) => shaderPass.resize(boundingRect))

    this.onResize()
  }

  onResize() {
    /* will be overridden */
  }

  /** OBJECTS **/

  setRendererObjects() {
    // keep track of planes, textures, etc.
    // TODO still needed?
    this.renderPasses = []
    this.shaderPasses = []
    this.meshes = []
    this.samplers = []
    this.textures = []
  }

  /** RENDER **/

  setRenderPassCurrentTexture(renderPass) {
    const renderTexture = this.context.getCurrentTexture()
    if (this.sampleCount > 1) {
      renderPass.descriptor.colorAttachments[0].resolveTarget = renderTexture.createView()
    } else {
      renderPass.descriptor.colorAttachments[0].view = renderTexture.createView()
    }

    return renderTexture
  }

  onBeforeRenderPass() {
    /* will be overridden */
  }

  // onBeginRenderPass(pass) {
  //   this.scene.render(pass)
  // }

  onAfterRenderPass() {
    /* will be overridden */
  }

  /**
   * Called at each draw call to render our scene and its content
   * Also create shader modules if not already created
   */
  render() {
    if (!this.ready) return

    // now render!

    this.onBeforeRenderPass()

    this.textures.forEach((texture) => this.setTexture(texture))

    const commandEncoder = this.device.createCommandEncoder({ label: 'Renderer command encoder' })

    // Get the current texture from the canvas context and
    // set it as the texture to render to.
    // TODO each pass needs an access to the renderTexture and the commandEncoder

    this.scene.render(commandEncoder)

    const commandBuffer = commandEncoder.finish()
    this.device.queue.submit([commandBuffer])

    // end of render, reset current pipeline ID
    // TODO in scene class instead?
    this.pipelineManager.resetCurrentPipeline()

    this.onAfterRenderPass()
  }

  destroy() {
    this.meshes.forEach((mesh) => mesh.destroy())

    this.textures.forEach((texture) => texture.destroy())

    // destroy render passes
    //this.renderPasses?.forEach((renderPass) => renderPass.destroy())
    this.renderPass?.destroy()

    this.device?.destroy()
    this.context?.unconfigure()
  }
}
