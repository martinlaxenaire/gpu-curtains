import { generateMips } from '../../utils/renderer-utils'
import { PipelineManager } from '../pipelines/PipelineManager'
import { DOMElement } from '../DOMElement'
import { Scene } from '../Scene'

export class GPURenderer {
  constructor({ container, pixelRatio = 1, renderingScale = 1 }) {
    this.type = 'Renderer'
    this.ready = false

    this.gpu = navigator.gpu

    this.pixelRatio = pixelRatio ?? window.devicePixelRatio ?? 1
    this.renderingScale = renderingScale

    if (!this.gpu) {
      console.warn('WebGPU not supported!')
      return
    }

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

    this.setRendererObjects()
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
      // TODO
      alphaMode: 'premultiplied', // or "opaque"
      //viewFormats: []
    })

    this.setPipelineManager()
    this.setScene()
    this.setRenderPass()

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

  /** PIPELINES **/

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

    return this.device.createSampler(options)
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

  /** RENDER TEXTURES **/

  createDepthTexture() {
    return this.device.createTexture({
      label: 'GPURenderer depth attachment texture',
      size: [this.canvas.width, this.canvas.height],
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
      sampleCount: this.renderPass.sampleCount,
    })
  }

  setRenderPassDepth() {
    if (!this.renderPass) return

    // set view
    if (this.renderPass.depth) {
      // Destroy the previous depth target
      this.renderPass.depth.destroy()
    }

    this.renderPass.depth = this.createDepthTexture()

    this.renderPass.descriptor.depthStencilAttachment.view = this.renderPass.depth.createView()
  }

  setRenderPassView() {
    if (!this.renderPass) return

    // set view
    if (this.renderPass.target) {
      // Destroy the previous render target
      this.renderPass.target.destroy()
    }

    this.renderPass.target = this.createTexture({
      label: 'GPURenderer color attachment texture',
      size: [this.canvas.width, this.canvas.height],
      sampleCount: this.renderPass.sampleCount,
      format: this.preferredFormat,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    })

    this.renderPass.descriptor.colorAttachments[0].view = this.renderPass.target.createView()
  }

  setRenderPass() {
    this.renderPass = {
      sampleCount: 4, // TODO option
    }

    if (!this.device) return

    const depthTexture = this.createDepthTexture()

    this.renderPass = {
      ...this.renderPass,
      target: null,
      depth: depthTexture,
      descriptor: {
        label: 'GPURenderer pass descriptor',
        colorAttachments: [
          {
            // view: <- to be filled out when we set our render pass view
            view: null,
            // clear values
            clearValue: [0, 0, 0, 0],
            // loadOp: 'clear' specifies to clear the texture to the clear value before drawing
            // The other option is 'load' which means load the existing contents of the texture into the GPU so we can draw over what's already there.
            loadOp: 'clear',
            // storeOp: 'store' means store the result of what we draw.
            // We could also pass 'discard' which would throw away what we draw.
            // see https://webgpufundamentals.org/webgpu/lessons/webgpu-multisampling.html
            storeOp: 'store',
          },
        ],
        depthStencilAttachment: {
          view: depthTexture.createView(),

          depthClearValue: 1.0,
          depthLoadOp: 'clear',
          depthStoreOp: 'store',
        },
      },
    }

    this.setRenderPassView()
    //this.setRenderPassDepth()
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
    this.setSize(boundingRect ?? this.domElement.element.getBoundingClientRect())

    // reset render textures
    this.setRenderPassView()
    this.setRenderPassDepth()

    this.onResize()
  }

  onResize() {
    /* will be overridden */
  }

  /** OBJECTS **/

  setRendererObjects() {
    // keep track of planes, textures, etc.
    this.meshes = []
    this.textures = []
  }

  /** RENDER **/

  onBeforeRenderPass() {
    /* will be overridden */
  }

  onBeginRenderPass(pass) {
    this.scene.render(pass)
  }

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

    // Get the current texture from the canvas context and
    // set it as the texture to render to.
    this.renderPass.descriptor.colorAttachments[0].resolveTarget = this.context.getCurrentTexture().createView()

    const encoder = this.device.createCommandEncoder({ label: 'our encoder' })

    // make a render pass encoder to encode render specific commands
    /** @type {GPURenderPassEncoder} **/
    const pass = encoder.beginRenderPass(/** @type {GPURenderPassDescriptor} **/ this.renderPass.descriptor)

    this.onBeginRenderPass(pass)

    pass.end()

    const commandBuffer = encoder.finish()
    this.device.queue.submit([commandBuffer])

    // end of render, reset current pipeline ID
    // TODO in scene class instead?
    this.pipelineManager.resetCurrentPipeline()

    this.onAfterRenderPass()
  }

  destroy() {
    this.meshes.forEach((mesh) => mesh.destroy())

    this.textures.forEach((texture) => texture.destroy())

    this.renderPass?.target?.destroy()
    this.renderPass?.depth?.destroy()
    //this.context?.getCurrentTexture()?.destroy()

    this.device?.destroy()
    this.context?.unconfigure()
  }
}
