import { isRenderer } from '../../utils/renderer-utils'

export class RenderPass {
  constructor({ renderer, label = 'Render Pass', depth = true }) {
    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    if (!isRenderer(renderer, 'RenderPass')) {
      console.warn('RenderPass fail')
      return
    }

    this.renderer = renderer
    this.options = {
      label,
      depth,
    }

    this.size = {
      width: this.renderer.boundingRect.width,
      height: this.renderer.boundingRect.height,
    }

    this.sampleCount = this.renderer.sampleCount

    // if needed, create a depth texture before our descriptor
    if (this.options.depth) this.createDepthTexture()
    this.createRenderTexture()

    this.setRenderPassDescriptor()

    //this.setRenderPassView()
  }

  createDepthTexture() {
    this.depthTexture = this.renderer.device.createTexture({
      label: this.options.label + ' depth attachment texture',
      size: [this.size.width, this.size.height],
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
      sampleCount: this.sampleCount,
    })
  }

  createRenderTexture() {
    this.renderTexture = this.renderer.device.createTexture({
      label: this.options.label + ' color attachment texture',
      size: [this.size.width, this.size.height],
      sampleCount: this.sampleCount,
      format: this.renderer.preferredFormat,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING,
    })
  }

  resetRenderPassDepth() {
    if (this.depthTexture) {
      // Destroy the previous depth target
      this.depthTexture.destroy()
    }

    // recreate depth texture
    this.createDepthTexture()

    this.descriptor.depthStencilAttachment.view = this.depthTexture.createView()
  }

  resetRenderPassView() {
    // set view
    if (this.renderTexture) {
      // Destroy the previous render target
      this.renderTexture.destroy()
    }

    this.createRenderTexture()

    this.descriptor.colorAttachments[0].view = this.renderTexture.createView()
  }

  setRenderPassDescriptor() {
    this.descriptor = {
      label: this.options.label + ' descriptor',
      colorAttachments: [
        {
          // view: <- to be filled out when we set our render pass view
          view: this.renderTexture.createView(),
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
      ...(this.options.depth && {
        depthStencilAttachment: {
          view: this.depthTexture.createView(),

          depthClearValue: 1.0,
          depthLoadOp: 'clear',
          depthStoreOp: 'store',
        },
      }),
    }
  }

  resize(boundingRect) {
    this.size = {
      width: boundingRect.width,
      height: boundingRect.height,
    }

    // reset textures
    if (this.options.depth) this.resetRenderPassDepth()
    this.resetRenderPassView()
  }

  destroy() {
    this.renderTexture?.destroy()
    this.depthTexture?.destroy()
  }
}
