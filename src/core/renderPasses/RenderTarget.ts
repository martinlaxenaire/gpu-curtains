import { isRenderer, Renderer } from '../renderers/utils'
import { RenderPass, RenderPassOptions, RenderPassParams } from './RenderPass'
import { Texture } from '../textures/Texture'
import { generateUUID } from '../../utils/utils'
import { GPUCurtains } from '../../curtains/GPUCurtains'

/**
 * Options used to create a {@link RenderTarget}.
 */
export interface RenderTargetOptions extends RenderPassParams {
  /** Whether we should add this {@link RenderTarget} to our {@link core/scenes/Scene.Scene | Scene} to let it handle the rendering process automatically. Default to `true`. */
  autoRender: boolean
  /** {@link core/textures/Texture.TextureBaseParams | Texture name} to use for the {@link RenderTarget} render texture. Default to `'renderTexture'`. */
  renderTextureName: string
  /** Whether we should draw into this {@link RenderTarget} after having rendered to the screen first. Default to `false`. */
  isPostTarget: boolean
}

/**
 * Parameters used to create a {@link RenderTarget}.
 */
export interface RenderTargetParams extends Partial<RenderTargetOptions> {}

/**
 * Used to draw to {@link RenderPass#viewTextures | RenderPass view textures} (and eventually {@link RenderPass#depthTexture | depth texture}) instead of directly to screen.
 *
 * The meshes assigned to a {@link RenderTarget} will be drawn before the other objects in the {@link core/scenes/Scene.Scene | Scene} rendering loop.
 *
 * Can also be assigned as ShaderPass {@link core/renderPasses/ShaderPass.ShaderPass#inputTarget | input} or {@link core/renderPasses/ShaderPass.ShaderPass#outputTarget | output} targets.
 *
 * If the {@link RenderPass} created handle color attachments, then a {@link RenderTarget#renderTexture | Texture} will be created to update and/or resolve the content of the current view. This {@link RenderTarget#renderTexture | Texture} could therefore usually be used to access the current content of this {@link RenderTarget}.
 *
 * @example
 * ```javascript
 * // set our main GPUCurtains instance
 * const gpuCurtains = new GPUCurtains({
 *   container: '#canvas' // selector of our WebGPU canvas container
 * })
 *
 * // set the GPU device
 * // note this is asynchronous
 * await gpuCurtains.setDevice()
 *
 * const outputTarget = new RenderTarget(gpuCurtains, {
 *   label: 'My render target',
 * })
 * ```
 */
export class RenderTarget {
  /** {@link Renderer} used by this {@link RenderTarget}. */
  renderer: Renderer
  /** The type of the {@link RenderTarget}. */
  type: string
  /** The universal unique id of this {@link RenderTarget}. */
  readonly uuid: string

  /** Options used to create this {@link RenderTarget}. */
  options: RenderTargetOptions

  /** {@link RenderPass} used by this {@link RenderTarget}. */
  renderPass: RenderPass
  /** {@link Texture} that will be resolved by the {@link renderPass} when {@link RenderPass#updateView | setting the current texture}. */
  renderTexture?: Texture

  /** Whether we should add this {@link RenderTarget} to our {@link core/scenes/Scene.Scene | Scene} to let it handle the rendering process automatically. */
  #autoRender = true

  /**
   * RenderTarget constructor
   * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link RenderTarget}.
   * @param parameters - {@link RenderTargetParams | parameters} use to create this {@link RenderTarget}.
   */
  constructor(renderer: Renderer | GPUCurtains, parameters = {} as RenderTargetParams) {
    this.type = 'RenderTarget'

    renderer = isRenderer(renderer, this.type)
    this.renderer = renderer

    this.uuid = generateUUID()

    const { label, colorAttachments, depthTexture, autoRender, renderTextureName, isPostTarget, ...renderPassParams } =
      parameters

    // use depth texture from params
    // OR renderer render pass depth texture if options match
    const depthTextureToUse = !!depthTexture
      ? depthTexture
      : this.renderer.renderPass.options.sampleCount === (parameters.sampleCount ?? 4) &&
        (!renderPassParams.qualityRatio || renderPassParams.qualityRatio === 1) &&
        !renderPassParams.fixedSize &&
        (!parameters.depthFormat || parameters.depthFormat === this.renderer.renderPass.depthTexture.options.format)
      ? this.renderer.renderPass.depthTexture
      : null

    this.options = {
      label,
      ...renderPassParams,
      ...(depthTextureToUse && { depthTexture: depthTextureToUse }),
      ...(colorAttachments && { colorAttachments }),
      renderTextureName: renderTextureName ?? 'renderTexture',
      autoRender: autoRender === undefined ? true : autoRender,
      isPostTarget: !!isPostTarget,
    }

    if (autoRender !== undefined) {
      this.#autoRender = autoRender
    }

    this.renderPass = new RenderPass(this.renderer, {
      label: this.options.label ? `${this.options.label} Render Pass` : 'Render Target Render Pass',
      ...(colorAttachments && { colorAttachments }),
      depthTexture: this.options.depthTexture,
      ...renderPassParams,
    })

    if (renderPassParams.useColorAttachments !== false) {
      // this is the texture that will be resolved when setting the current render pass texture
      this.renderTexture = new Texture(this.renderer, {
        label: this.options.label ? `${this.options.label} Render Texture` : 'Render Target render texture',
        name: this.options.renderTextureName,
        format:
          colorAttachments && colorAttachments.length && colorAttachments[0].targetFormat
            ? colorAttachments[0].targetFormat
            : this.renderer.options.context.format,
        ...(this.options.qualityRatio !== undefined && { qualityRatio: this.options.qualityRatio }),
        ...(this.options.fixedSize !== undefined && { fixedSize: this.options.fixedSize }),
        usage: ['copySrc', 'copyDst', 'renderAttachment', 'textureBinding'],
      })
    }

    this.addToScene()
  }

  /**
   * Reset this {@link RenderTarget} {@link RenderTarget.renderer | renderer}. Also set the {@link renderPass} renderer.
   * @param renderer - New {@link Renderer} or {@link GPUCurtains} instance to use.
   */
  setRenderer(renderer: Renderer | GPUCurtains) {
    if (this.renderer) {
      this.removeFromScene()
    }

    renderer = isRenderer(renderer, this.type)
    this.renderer = renderer

    if (this.options.depthTexture) {
      this.options.depthTexture.setRenderer(this.renderer)
    }

    this.renderPass.setRenderer(this.renderer)

    if (this.renderTexture) {
      this.renderTexture.setRenderer(this.renderer)
    }

    this.addToScene()
  }

  /**
   * Get the textures outputted by the {@link renderPass} if any, which means its {@link RenderPass.viewTextures | viewTextures} if not multisampled, or the {@link RenderPass.resolveTargets | resolveTargets} else.
   *
   * Since some {@link RenderPass} might not have any view textures (or in case the first resolve target is `null`), the first element can be the {@link RenderTarget.renderTexture | RenderTarget renderTexture} itself.
   *
   * @readonly
   */
  get outputTextures(): Texture[] {
    return !this.renderPass.outputTextures.length
      ? !this.renderTexture
        ? []
        : [this.renderTexture]
      : this.renderPass.outputTextures.map((texture, index) => {
          return index === 0 && this.renderPass.options.renderToSwapChain ? this.renderTexture : texture
        })
  }

  /**
   * Add the {@link RenderTarget} to the renderer and the {@link core/scenes/Scene.Scene | Scene}
   */
  addToScene() {
    this.renderer.renderTargets.push(this)

    if (this.#autoRender) {
      this.renderer.scene.addRenderTarget(this)
    }
  }

  /**
   * Remove the {@link RenderTarget} from the renderer and the {@link core/scenes/Scene.Scene | Scene}
   */
  removeFromScene() {
    if (this.#autoRender) {
      this.renderer.scene.removeRenderTarget(this)
    }

    this.renderer.renderTargets = this.renderer.renderTargets.filter((renderTarget) => renderTarget.uuid !== this.uuid)
  }

  /**
   * Update our {@link RenderTarget} {@link renderTexture} and {@link renderPass} quality ratio.
   * @param qualityRatio - New quality ratio to use.
   */
  setQualityRatio(qualityRatio = 1) {
    this.options.qualityRatio = qualityRatio
    this.renderTexture?.setQualityRatio(qualityRatio)
    this.renderPass?.setQualityRatio(qualityRatio)
  }

  /**
   * Resize our {@link renderPass}.
   */
  resize() {
    // reset the newly created depth texture
    if (this.options.depthTexture) {
      this.renderPass.options.depthTexture.texture = this.options.depthTexture.texture
    }

    this.renderPass?.resize()
  }

  /**
   * Remove our {@link RenderTarget}. Alias of {@link RenderTarget#destroy}.
   */
  remove() {
    this.destroy()
  }

  /**
   * Destroy our {@link RenderTarget}.
   */
  destroy() {
    // release mesh struct
    this.renderer.meshes.forEach((mesh) => {
      if (mesh.outputTarget && mesh.outputTarget.uuid === this.uuid) {
        mesh.setOutputTarget(null)
      }
    })

    // release shader passes struct
    this.renderer.shaderPasses.forEach((shaderPass) => {
      if (shaderPass.outputTarget && shaderPass.outputTarget.uuid === this.uuid) {
        // force render target to null before removing / re-adding to scene
        shaderPass.outputTarget = null
        shaderPass.setOutputTarget(null)
      }
    })

    // remove from scene and renderer array
    this.removeFromScene()

    this.renderPass?.destroy()
    this.renderTexture?.destroy()
  }
}
