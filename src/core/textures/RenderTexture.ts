import { isRenderer, Renderer } from '../../utils/renderer-utils'
import { TextureBindings, TextureBindingsParams } from '../bindings/TextureBindings'
import { BindGroupBindingElement } from '../../types/BindGroups'
import { RenderTextureParams } from '../../types/core/textures/RenderTexture'
import { GPUCurtains } from '../../curtains/GPUCurtains'

const defaultRenderTextureParams: RenderTextureParams = {
  label: 'Texture',
  name: 'texture',
  fromTexture: null,
}

export class RenderTexture {
  renderer: Renderer
  type: string

  texture: GPUTexture

  size: {
    width: number
    height: number
  }

  options: RenderTextureParams

  bindings: BindGroupBindingElement[]
  shouldUpdateBindGroup: boolean

  constructor(renderer: Renderer | GPUCurtains, parameters = defaultRenderTextureParams) {
    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as Renderer)

    isRenderer(renderer, parameters.label ? parameters.label + ' RenderTexture' : 'RenderTexture')

    this.type = 'RenderTexture'

    this.renderer = renderer

    this.options = { ...defaultRenderTextureParams, ...parameters }

    this.shouldUpdateBindGroup = false

    // sizes
    this.setSourceSize()

    // bindings
    this.setBindings()

    // texture
    this.createTexture()
  }

  setSourceSize() {
    const rendererBoundingRect = this.renderer.pixelRatioBoundingRect

    this.size = {
      width: rendererBoundingRect.width,
      height: rendererBoundingRect.height,
    }
  }

  createTexture() {
    if (this.options.fromTexture) {
      this.texture = this.options.fromTexture.texture
      // update texture binding
      this.textureBinding.resource = this.texture
      return
    }

    this.texture?.destroy()

    this.texture = this.renderer.createTexture({
      label: this.options.label,
      format: this.renderer.preferredFormat,
      size: [this.size.width, this.size.height],
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_SRC |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT, // TODO let user chose?
    })

    // update texture binding
    this.textureBinding.resource = this.texture
  }

  setBindings() {
    this.bindings = [
      new TextureBindings({
        label: this.options.label + ': ' + this.options.name + ' texture',
        name: this.options.name,
        texture: this.texture,
        bindingType: 'texture',
      } as TextureBindingsParams),
    ]
  }

  get textureBinding(): TextureBindings {
    return this.bindings[0] as TextureBindings
  }

  resize() {
    this.setSourceSize()

    this.createTexture()
    this.shouldUpdateBindGroup = true
  }

  destroy() {
    this.texture?.destroy()
    this.texture = null
  }
}
