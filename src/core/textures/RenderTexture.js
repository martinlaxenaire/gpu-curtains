import { isRenderer } from '../../utils/renderer-utils'
import { SamplerBindings } from '../bindings/SamplerBindings'
import { TextureBindings } from '../bindings/TextureBindings'

const defaultRenderTextureParams = {
  label: 'Texture',
  name: 'texture',
  sampler: {
    addressModeU: 'repeat',
    addressModeV: 'repeat',
    magFilter: 'linear',
    minFilter: 'linear',
    mipmapFilter: 'linear',
  },
  fromTexture: null,
}

export class RenderTexture {
  constructor(renderer, parameters = defaultRenderTextureParams) {
    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    isRenderer(renderer, parameters.label ? parameters.label + ' RenderTexture' : 'RenderTexture')

    this.renderer = renderer

    this.options = { ...defaultRenderTextureParams, ...parameters }

    this.shouldUpdateBindGroup = false

    // sizes
    this.setSourceSize()

    // sampler
    this.createSampler()

    // texture
    this.createTexture()

    // bindings
    this.setBindings()
  }

  setSourceSize() {
    const rendererBoundingRect = this.renderer.pixelRatioBoundingRect

    this.size = {
      width: rendererBoundingRect.width,
      height: rendererBoundingRect.height,
    }
  }

  createSampler() {
    this.sampler = this.renderer.createSampler(this.options.sampler)
  }

  createTexture() {
    if (this.options.fromTexture) {
      this.texture = this.options.fromTexture.texture
      return
    }

    if (this.texture) this.texture.destroy()

    this.texture = this.renderer.createTexture({
      label: this.options.label,
      format: this.renderer.preferredFormat,
      size: [this.size.width, this.size.height],
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_SRC |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT, // TODO?
    })
  }

  setBindings() {
    this.bindings = [
      new SamplerBindings({
        label: this.options.label + ': ' + this.options.name,
        name: this.options.name,
        bindingType: 'sampler',
        resource: this.sampler,
      }),
      new TextureBindings({
        label: this.options.label + ': ' + this.options.name + ' sampler',
        name: this.options.name,
        resource: this.texture,
        bindingType: 'texture',
      }),
    ]
  }

  resize() {
    this.setSourceSize()

    this.createTexture()
    this.shouldUpdateBindGroup = true
  }

  destroy() {
    this.texture?.destroy()
  }
}
