import { BindGroup } from './BindGroup.mjs';
import { isRenderer } from '../renderers/utils.mjs';
import { Texture } from '../textures/Texture.mjs';

class TextureBindGroup extends BindGroup {
  /**
   * TextureBindGroup constructor
   * @param  renderer - a {@link Renderer} class object or a {@link GPUCurtains} class object
   * @param parameters - {@link TextureBindGroupParams | parameters} used to create our {@link TextureBindGroup}
   */
  constructor(renderer, { label, index = 0, bindings = [], uniforms, storages, textures = [], samplers = [] } = {}) {
    const type = "TextureBindGroup";
    renderer = renderer && renderer.renderer || renderer;
    isRenderer(renderer, type);
    super(renderer, { label, index, bindings, uniforms, storages });
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
  /**
   * Update the {@link TextureBindGroup#textures | bind group textures}:
   * - Check if they need to copy their source texture
   * - Upload video texture if needed
   */
  updateTextures() {
    for (const texture of this.textures) {
      if (texture instanceof Texture) {
        if (texture.options.fromTexture && texture.options.fromTexture.sourceUploaded && !texture.sourceUploaded) {
          texture.copy(texture.options.fromTexture);
        }
        if (texture.shouldUpdate && texture.options.sourceType && texture.options.sourceType === "externalVideo") {
          texture.uploadVideoTexture();
        }
      }
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

export { TextureBindGroup };
