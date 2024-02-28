import { isRenderer } from '../renderers/utils.mjs';
import { RenderPass } from './RenderPass.mjs';
import { RenderTexture } from '../textures/RenderTexture.mjs';
import { generateUUID } from '../../utils/utils.mjs';

var __accessCheck = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateGet = (obj, member, getter) => {
  __accessCheck(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateSet = (obj, member, value, setter) => {
  __accessCheck(obj, member, "write to private field");
  setter ? setter.call(obj, value) : member.set(obj, value);
  return value;
};
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
    renderer = renderer && renderer.renderer || renderer;
    isRenderer(renderer, "RenderTarget");
    this.type = "RenderTarget";
    this.renderer = renderer;
    this.uuid = generateUUID();
    const { label, colorAttachments, depthTexture, autoRender, ...renderPassParams } = parameters;
    this.options = {
      label,
      ...renderPassParams,
      ...depthTexture && { depthTexture },
      ...colorAttachments && { colorAttachments },
      autoRender: autoRender === void 0 ? true : autoRender
    };
    if (autoRender !== void 0) {
      __privateSet(this, _autoRender, autoRender);
    }
    this.renderPass = new RenderPass(this.renderer, {
      label: this.options.label ? `${this.options.label} Render Pass` : "Render Target Render Pass",
      ...colorAttachments && { colorAttachments },
      depthTexture: this.options.depthTexture ?? this.renderer.renderPass.depthTexture,
      // reuse renderer depth texture for every pass
      ...renderPassParams
    });
    if (renderPassParams.useColorAttachments !== false) {
      this.renderTexture = new RenderTexture(this.renderer, {
        label: this.options.label ? `${this.options.label} Render Texture` : "Render Target render texture",
        name: "renderTexture",
        format: colorAttachments && colorAttachments.length && colorAttachments[0].targetFormat ? colorAttachments[0].targetFormat : this.renderer.options.preferredFormat,
        ...this.options.qualityRatio !== void 0 && { qualityRatio: this.options.qualityRatio }
      });
    }
    this.addToScene();
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
    this.renderPass.options.depthTexture.texture = this.options.depthTexture ? this.options.depthTexture.texture : this.renderer.renderPass.depthTexture.texture;
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
