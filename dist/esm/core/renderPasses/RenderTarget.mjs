import { isRenderer } from '../renderers/utils.mjs';
import { RenderPass } from './RenderPass.mjs';
import { Texture } from '../textures/Texture.mjs';
import { generateUUID } from '../../utils/utils.mjs';

var __typeError = (msg) => {
  throw TypeError(msg);
};
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), member.set(obj, value), value);
var _autoRender;
class RenderTarget {
  /**
   * RenderTarget constructor
   * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link RenderTarget}
   * @param parameters - {@link RenderTargetParams | parameters} use to create this {@link RenderTarget}
   */
  constructor(renderer, parameters = {}) {
    /** Whether we should add this {@link RenderTarget} to our {@link core/scenes/Scene.Scene | Scene} to let it handle the rendering process automatically */
    __privateAdd(this, _autoRender, true);
    this.type = "RenderTarget";
    renderer = isRenderer(renderer, this.type);
    this.renderer = renderer;
    this.uuid = generateUUID();
    const { label, colorAttachments, depthTexture, autoRender, ...renderPassParams } = parameters;
    const depthTextureToUse = !!depthTexture ? depthTexture : this.renderer.renderPass.options.sampleCount === (parameters.sampleCount ?? 4) && (!renderPassParams.qualityRatio || renderPassParams.qualityRatio === 1) && !renderPassParams.fixedSize ? this.renderer.renderPass.depthTexture : null;
    this.options = {
      label,
      ...renderPassParams,
      ...depthTextureToUse && { depthTexture: depthTextureToUse },
      ...colorAttachments && { colorAttachments },
      autoRender: autoRender === void 0 ? true : autoRender
    };
    if (autoRender !== void 0) {
      __privateSet(this, _autoRender, autoRender);
    }
    this.renderPass = new RenderPass(this.renderer, {
      label: this.options.label ? `${this.options.label} Render Pass` : "Render Target Render Pass",
      ...colorAttachments && { colorAttachments },
      depthTexture: this.options.depthTexture,
      ...renderPassParams
    });
    if (renderPassParams.useColorAttachments !== false) {
      this.renderTexture = new Texture(this.renderer, {
        label: this.options.label ? `${this.options.label} Render Texture` : "Render Target render texture",
        name: "renderTexture",
        format: colorAttachments && colorAttachments.length && colorAttachments[0].targetFormat ? colorAttachments[0].targetFormat : this.renderer.options.context.format,
        ...this.options.qualityRatio !== void 0 && { qualityRatio: this.options.qualityRatio },
        ...this.options.fixedSize !== void 0 && { fixedSize: this.options.fixedSize },
        usage: ["copySrc", "renderAttachment", "textureBinding"]
      });
    }
    this.addToScene();
  }
  /**
   * Reset this {@link RenderTarget} {@link RenderTarget.renderer | renderer}. Also set the {@link renderPass} renderer.
   * @param renderer - New {@link Renderer} or {@link GPUCurtains} instance to use.
   */
  setRenderer(renderer) {
    if (this.renderer) {
      this.removeFromScene();
    }
    renderer = isRenderer(renderer, this.type);
    this.renderer = renderer;
    if (this.options.depthTexture) {
      this.options.depthTexture.setRenderer(this.renderer);
    }
    this.renderPass.setRenderer(this.renderer);
    if (this.renderTexture) {
      this.renderTexture.setRenderer(this.renderer);
    }
    this.addToScene();
  }
  /**
   * Get the textures outputted by the {@link renderPass} if any, which means its {@link RenderPass.viewTextures | viewTextures} if not multisampled, or the {@link RenderPass.resolveTargets | resolveTargets} else.
   *
   * Since some {@link RenderPass} might not have any view textures (or in case the first resolve target is `null`), the first element can be the {@link RenderTarget.renderTexture | RenderTarget renderTexture} itself.
   *
   * @readonly
   */
  get outputTextures() {
    return !this.renderPass.outputTextures.length ? !this.renderTexture ? [] : [this.renderTexture] : this.renderPass.outputTextures.map((texture, index) => {
      return index === 0 && this.renderPass.options.renderToSwapChain ? this.renderTexture : texture;
    });
  }
  /**
   * Add the {@link RenderTarget} to the renderer and the {@link core/scenes/Scene.Scene | Scene}
   */
  addToScene() {
    this.renderer.renderTargets.push(this);
    if (__privateGet(this, _autoRender)) {
      this.renderer.scene.addRenderTarget(this);
    }
  }
  /**
   * Remove the {@link RenderTarget} from the renderer and the {@link core/scenes/Scene.Scene | Scene}
   */
  removeFromScene() {
    if (__privateGet(this, _autoRender)) {
      this.renderer.scene.removeRenderTarget(this);
    }
    this.renderer.renderTargets = this.renderer.renderTargets.filter((renderTarget) => renderTarget.uuid !== this.uuid);
  }
  /**
   * Resize our {@link renderPass}
   */
  resize() {
    if (this.options.depthTexture) {
      this.renderPass.options.depthTexture.texture = this.options.depthTexture.texture;
    }
    this.renderPass?.resize();
  }
  /**
   * Remove our {@link RenderTarget}. Alias of {@link RenderTarget#destroy}
   */
  remove() {
    this.destroy();
  }
  /**
   * Destroy our {@link RenderTarget}
   */
  destroy() {
    this.renderer.meshes.forEach((mesh) => {
      if (mesh.outputTarget && mesh.outputTarget.uuid === this.uuid) {
        mesh.setOutputTarget(null);
      }
    });
    this.renderer.shaderPasses.forEach((shaderPass) => {
      if (shaderPass.outputTarget && shaderPass.outputTarget.uuid === this.uuid) {
        shaderPass.outputTarget = null;
        shaderPass.setOutputTarget(null);
      }
    });
    this.removeFromScene();
    this.renderPass?.destroy();
    this.renderTexture?.destroy();
  }
}
_autoRender = new WeakMap();

export { RenderTarget };
