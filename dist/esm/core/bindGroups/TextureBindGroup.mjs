import { BindGroup } from './BindGroup.mjs';
import { isRenderer } from '../renderers/utils.mjs';
import { DOMTexture } from '../textures/DOMTexture.mjs';
import { BufferBinding } from '../bindings/BufferBinding.mjs';
import { MediaTexture } from '../textures/MediaTexture.mjs';

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
  member.set(obj, value);
  return value;
};
var _texturesWithMatrices;
class TextureBindGroup extends BindGroup {
  /**
   * TextureBindGroup constructor
   * @param  renderer - a {@link Renderer} class object or a {@link GPUCurtains} class object
   * @param parameters - {@link TextureBindGroupParams | parameters} used to create our {@link TextureBindGroup}
   */
  constructor(renderer, { label, index = 0, bindings = [], uniforms, storages, textures = [], samplers = [] } = {}) {
    const type = "TextureBindGroup";
    renderer = isRenderer(renderer, type);
    super(renderer, { label, index, bindings, uniforms, storages });
    __privateAdd(this, _texturesWithMatrices, void 0);
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
   * Adds a texture to the textures array and the struct
   * @param texture - texture to add
   */
  addTexture(texture) {
    this.textures.push(texture);
    this.addBindings([...texture.bindings]);
  }
  /**
   * Get the current textures array
   * @readonly
   */
  get textures() {
    return this.options.textures;
  }
  /**
   * Adds a sampler to the samplers array and the struct
   * @param sampler
   */
  addSampler(sampler) {
    this.samplers.push(sampler);
    this.addBindings([sampler.binding]);
  }
  /**
   * Get the current samplers array
   * @readonly
   */
  get samplers() {
    return this.options.samplers;
  }
  /**
   * Get whether the GPU bind group is ready to be created
   * It can be created if it has {@link BindGroup#bindings} and has not been created yet and all GPU textures and samplers are created
   * @readonly
   */
  get shouldCreateBindGroup() {
    return !this.bindGroup && !!this.bindings.length && !this.textures.find((texture) => !(texture.texture || texture.externalTexture)) && !this.samplers.find((sampler) => !sampler.sampler);
  }
  setTexturesMatricesBinding() {
    __privateSet(this, _texturesWithMatrices, this.textures.filter(
      (texture) => (texture instanceof MediaTexture || texture instanceof DOMTexture) && !!texture.transformBinding
    ));
    const texturesBindings = __privateGet(this, _texturesWithMatrices).map((texture) => {
      return texture.transformBinding;
    });
    if (texturesBindings.length) {
      const label = "Textures matrices " + Math.floor(Math.random() * 9999);
      const baseName = "texturesMatrices";
      const name = this.index > 1 ? `${baseName}${this.index}` : baseName;
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
        texturesBindings[i].inputs.matrix.shouldUpdate = true;
      });
      this.texturesMatricesBinding.buffer.consumers.add(this.uuid);
      const hasMatricesBinding = this.bindings.find((binding) => binding.name === baseName);
      if (!hasMatricesBinding) {
        this.addBinding(this.texturesMatricesBinding);
      }
    }
  }
  createBindGroup() {
    this.setTexturesMatricesBinding();
    super.createBindGroup();
  }
  /**
   * Update the {@link TextureBindGroup#textures | bind group textures}:
   * - Check if they need to copy their source texture
   * - Upload video texture if needed
   */
  updateTextures() {
    for (const texture of this.textures) {
      if (texture instanceof DOMTexture) {
        if (texture.options.fromTexture && texture.options.fromTexture.sourceUploaded && !texture.sourceUploaded) {
          texture.copy(texture.options.fromTexture);
        }
        if (texture.shouldUpdate && texture.options.sourceType && texture.options.sourceType === "externalVideo") {
          texture.uploadVideoTexture();
        }
      }
      if (texture instanceof MediaTexture) {
        const firstSource = texture.sources.length && texture.sources[0];
        if (firstSource && firstSource.shouldUpdate && texture.options.sourcesTypes[0] && texture.options.sourcesTypes[0] === "externalVideo") {
          texture.uploadVideoTexture();
        }
      }
    }
    if (this.texturesMatricesBinding) {
      __privateGet(this, _texturesWithMatrices).forEach((texture, i) => {
        this.texturesMatricesBinding.childrenBindings[i].inputs.matrix.shouldUpdate = !!texture.transformBinding.inputs.matrix.shouldUpdate;
        texture.transformBinding.inputs.matrix.shouldUpdate = false;
      });
    }
  }
  /**
   * Update the {@link TextureBindGroup}, which means update its {@link TextureBindGroup#textures | textures}, then update its {@link TextureBindGroup#bufferBindings | buffer bindings} and finally {@link TextureBindGroup#resetBindGroup | reset it} if needed
   */
  update() {
    this.updateTextures();
    super.update();
  }
  /**
   * Destroy our {@link TextureBindGroup}
   */
  destroy() {
    super.destroy();
    this.options.textures = [];
    this.options.samplers = [];
  }
}
_texturesWithMatrices = new WeakMap();

export { TextureBindGroup };
