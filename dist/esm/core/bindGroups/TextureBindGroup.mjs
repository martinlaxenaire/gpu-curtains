import { BindGroup } from './BindGroup.mjs';
import { isRenderer } from '../renderers/utils.mjs';
import { DOMTexture } from '../../curtains/textures/DOMTexture.mjs';
import { BufferBinding } from '../bindings/BufferBinding.mjs';
import { MediaTexture } from '../textures/MediaTexture.mjs';

var __typeError = (msg) => {
  throw TypeError(msg);
};
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), member.set(obj, value), value);
var _transformedTextures;
class TextureBindGroup extends BindGroup {
  /**
   * TextureBindGroup constructor
   * @param  renderer - a {@link Renderer} class object or a {@link GPUCurtains} class object.
   * @param parameters - {@link TextureBindGroupParams | parameters} used to create our {@link TextureBindGroup}.
   */
  constructor(renderer, { label, index = 0, bindings = [], uniforms, storages, textures = [], samplers = [] } = {}) {
    const type = "TextureBindGroup";
    renderer = isRenderer(renderer, type);
    super(renderer, { label, index, bindings, uniforms, storages });
    /**
     * Array containing all the {@link MediaTexture} that handle a transformation {@link MediaTexture#modelMatrix | modelMatrix}.
     * @private
     */
    __privateAdd(this, _transformedTextures);
    this.options = {
      ...this.options,
      // will be filled after
      textures: [],
      samplers: []
    };
    if (textures.length) {
      for (const texture of textures) {
        this.addTexture(texture);
      }
    }
    if (samplers.length) {
      for (const sampler of samplers) {
        this.addSampler(sampler);
      }
    }
    this.type = type;
    this.texturesMatricesBinding = null;
  }
  /**
   * Set or reset this {@link TextureBindGroup} {@link TextureBindGroup.renderer | renderer}, and update the {@link samplers} and {@link textures} renderer as well.
   * @param renderer - New {@link Renderer} or {@link GPUCurtains} instance to use.
   */
  setRenderer(renderer) {
    const shadowTextures = /* @__PURE__ */ new Set();
    if (this.renderer && "shadowCastingLights" in this.renderer) {
      this.renderer.shadowCastingLights.forEach((light) => {
        if (light.shadow.isActive && light.shadow.depthTexture) {
          shadowTextures.add(light.shadow.depthTexture.uuid);
        }
      });
    }
    super.setRenderer(renderer);
    if (this.options && this.samplers) {
      this.samplers.forEach((sampler) => {
        sampler.setRenderer(this.renderer);
      });
    }
    if (this.options && this.textures) {
      this.textures.forEach((texture) => {
        if (!shadowTextures.has(texture.uuid)) {
          texture.setRenderer(this.renderer);
        }
      });
    }
  }
  /**
   * Adds a texture to the {@link textures} array and {@link bindings}.
   * @param texture - texture to add.
   */
  addTexture(texture) {
    this.textures.push(texture);
    this.addBindings([...texture.bindings]);
  }
  /**
   * Get the current {@link textures} array.
   * @readonly
   */
  get textures() {
    return this.options.textures;
  }
  /**
   * Adds a sampler to the {@link samplers} array and {@link bindings}.
   * @param sampler
   */
  addSampler(sampler) {
    this.samplers.push(sampler);
    this.addBindings([sampler.binding]);
  }
  /**
   * Get the current {@link samplers} array.
   * @readonly
   */
  get samplers() {
    return this.options.samplers;
  }
  /**
   * Get whether the GPU bind group is ready to be created.
   * It can be created if it has {@link BindGroup#bindings} and has not been created yet and all {@link GPUTexture} and {@link GPUSampler} are created.
   * @readonly
   */
  get shouldCreateBindGroup() {
    return !this.bindGroup && !!this.bindings.length && !this.textures.find((texture) => !(texture.texture || texture.externalTexture)) && !this.samplers.find((sampler) => !sampler.sampler);
  }
  /**
   * Set the {@link texturesMatricesBinding} if needed.
   */
  setTexturesMatricesBinding() {
    __privateSet(this, _transformedTextures, this.textures.filter(
      (texture) => (texture instanceof MediaTexture || texture instanceof DOMTexture) && !!texture.transformBinding
    ));
    const texturesBindings = __privateGet(this, _transformedTextures).map((texture) => {
      return texture.transformBinding;
    });
    if (texturesBindings.length) {
      const label = "Textures matrices";
      const name = "texturesMatrices";
      this.texturesMatricesBinding = new BufferBinding({
        label,
        name,
        childrenBindings: texturesBindings.map((textureBinding) => {
          return {
            binding: textureBinding,
            count: 1,
            forceArray: false
          };
        })
      });
      this.texturesMatricesBinding.childrenBindings.forEach((childrenBinding, i) => {
        childrenBinding.inputs.matrix.value = texturesBindings[i].inputs.matrix.value;
      });
      this.texturesMatricesBinding.buffer.consumers.add(this.uuid);
      const hasMatricesBinding = this.bindings.find((binding) => binding.name === name);
      if (!hasMatricesBinding) {
        this.addBinding(this.texturesMatricesBinding);
      }
    }
  }
  /**
   * Create the {@link texturesMatricesBinding} and {@link bindGroup}.
   */
  createBindGroup() {
    this.setTexturesMatricesBinding();
    super.createBindGroup();
  }
  /**
   * Update the {@link TextureBindGroup#textures | bind group textures}:
   * - Check if they need to copy their source texture.
   * - Upload video texture if needed.
   */
  updateTextures() {
    for (const texture of this.textures) {
      if (texture instanceof MediaTexture) {
        if (texture.options.fromTexture && texture.options.fromTexture instanceof MediaTexture && texture.options.fromTexture.sourcesUploaded && !texture.sourcesUploaded) {
          texture.copy(texture.options.fromTexture);
        }
        const firstSource = texture.sources.length && texture.sources[0];
        if (firstSource && firstSource.shouldUpdate && texture.options.sourcesTypes[0] && texture.options.sourcesTypes[0] === "externalVideo") {
          texture.uploadVideoTexture();
        }
      }
    }
    if (this.texturesMatricesBinding) {
      __privateGet(this, _transformedTextures).forEach((texture, i) => {
        this.texturesMatricesBinding.childrenBindings[i].inputs.matrix.shouldUpdate = !!texture.transformBinding.inputs.matrix.shouldUpdate;
        if (texture.transformBinding.inputs.matrix.shouldUpdate) {
          this.renderer.onAfterCommandEncoderSubmission.add(
            () => {
              texture.transformBinding.inputs.matrix.shouldUpdate = false;
            },
            { once: true }
          );
        }
      });
    }
  }
  /**
   * Update the {@link TextureBindGroup}, which means update its {@link TextureBindGroup#textures | textures}, then update its {@link TextureBindGroup#bufferBindings | buffer bindings} and finally {@link TextureBindGroup#resetBindGroup | reset it} if needed.
   */
  update() {
    this.updateTextures();
    super.update();
  }
  /**
   * Destroy our {@link TextureBindGroup}.
   */
  destroy() {
    super.destroy();
    this.options.textures = [];
    this.options.samplers = [];
  }
}
_transformedTextures = new WeakMap();

export { TextureBindGroup };
