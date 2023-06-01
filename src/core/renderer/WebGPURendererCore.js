import { generateMips } from '../../utils/renderer-utils'
import { PipelineManager } from '../pipeline/PipelineManager'

export class WebGPURendererCore {
  constructor() {
    this.type = 'RendererCore'
    this.ready = false

    this.gpu = navigator.gpu

    if (!this.gpu) {
      console.warn('WebGPU not supported!')
      return
    }

    // create the canvas
    this.canvas = document.createElement('canvas')

    this.setContext()
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
    this.pipelineManager = new PipelineManager({ renderer: this })
  }

  /** TEXTURES **/

  setTexture(texture) {
    if (!texture.sampler) {
      texture.sampler = this.createSampler(texture.options.sampler)
    }

    if (!texture.texture) {
      // call createTexture on texture class, that is then going to call the renderer createTexture method
      texture.createTexture()
    }
  }

  createSampler(options = {}) {
    if (!this.device) return false

    return this.device.createSampler(options)
  }

  createTexture(options = {}) {
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
        generateMips(this.device)
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
    return this.device.importExternalTexture({ source: video })
  }

  /** RENDER TEXTURES **/

  setRenderPassView() {
    if (!this.renderPass) return

    if (this.renderPass.target !== undefined) {
      // Destroy the previous render target
      this.renderPass.target.destroy()
    }

    this.renderPass.target = this.createTexture({
      size: [this.canvas.width, this.canvas.height],
      sampleCount: this.sampleCount,
      format: this.preferredFormat,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    })

    this.renderPass.view = this.renderPass.target.createView()

    this.renderPass.descriptor.colorAttachments[0].view = this.renderPass.view
  }

  setRenderPass() {
    this.sampleCount = 4 // TODO

    this.renderPass = {
      descriptor: {
        label: 'Renderer canvas renderPass',
        colorAttachments: [
          {
            // view: <- to be filled out when we set our render pass view
            //view: this.renderPass.view,
            // clear values
            clearValue: [0, 0, 0, 0],
            // loadOp: 'clear' specifies to clear the texture to the clear value before drawing
            // The other option is 'load' which means load the existing contents of the texture into the GPU so we can draw over what’s already there.
            loadOp: 'clear',
            // storeOp: 'store' means store the result of what we draw.
            // We could also pass 'discard' which would throw away what we draw.
            // see https://webgpufundamentals.org/webgpu/lessons/webgpu-multisampling.html
            storeOp: 'store',
          },
        ],
      },
    }

    this.setRenderPassView()
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

  resize(boundingRect) {
    this.setSize(boundingRect)
    this.setRenderPassView()
  }

  /**
   * Called at each draw call to render our scene and its content
   * Also create shader modules if not already created
   */
  render() {
    if (!this.ready) return

    // now render!

    // Get the current texture from the canvas context and
    // set it as the texture to render to.
    this.renderPass.descriptor.colorAttachments[0].resolveTarget = this.context.getCurrentTexture().createView()

    const encoder = this.device.createCommandEncoder({ label: 'our encoder' })

    // make a render pass encoder to encode render specific commands
    const pass = encoder.beginRenderPass(this.renderPass.descriptor)

    this.planes.forEach((plane) => plane.render(pass))

    pass.end()

    const commandBuffer = encoder.finish()
    this.device.queue.submit([commandBuffer])
  }

  destroy() {
    // TODO what's best?
    //this.renderPass?.target?.destroy()
    this.context?.getCurrentTexture()?.destroy()

    this.device?.destroy()
    this.context?.unconfigure()
  }
}
