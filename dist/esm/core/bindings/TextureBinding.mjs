import { Binding } from './Binding.mjs';
import { getBindGroupLayoutTextureBindingType, getTextureBindingWGSLVarType } from './utils.mjs';

class TextureBinding extends Binding {
  /**
   * TextureBinding constructor
   * @param parameters - {@link TextureBindingParams | parameters} used to create our {@link TextureBinding}
   */
  constructor({
    label = "Texture",
    name = "texture",
    bindingType,
    visibility,
    texture,
    format = "rgba8unorm",
    access = "write",
    viewDimension = "2d",
    multisampled = false
  }) {
    bindingType = bindingType ?? "texture";
    if (bindingType === "storage") {
      visibility = "compute";
    }
    super({ label, name, bindingType, visibility });
    this.options = {
      ...this.options,
      texture,
      format,
      access,
      viewDimension,
      multisampled
    };
    this.resource = texture;
    this.setWGSLFragment();
  }
  /**
   * Get bind group layout entry resource, either for {@link GPUBindGroupLayoutEntry#texture | texture} or {@link GPUBindGroupLayoutEntry#externalTexture | external texture}
   * @readonly
   */
  get resourceLayout() {
    return getBindGroupLayoutTextureBindingType(this);
  }
  /**
   * Get the {@link GPUBindGroupEntry#resource | bind group resource}
   */
  get resource() {
    return this.texture instanceof GPUTexture ? this.texture.createView({ label: this.options.label + " view" }) : this.texture instanceof GPUExternalTexture ? this.texture : null;
  }
  /**
   * Set the {@link GPUBindGroupEntry#resource | bind group resource}
   * @param value - new bind group resource
   */
  set resource(value) {
    if (value || this.texture)
      this.shouldResetBindGroup = true;
    this.texture = value;
  }
  /**
   * Set or update our {@link Binding#bindingType | bindingType} and our WGSL code snippet
   * @param bindingType - the new {@link Binding#bindingType | binding type}
   */
  setBindingType(bindingType) {
    if (bindingType !== this.bindingType) {
      if (bindingType)
        this.shouldResetBindGroupLayout = true;
      this.bindingType = bindingType;
      this.setWGSLFragment();
    }
  }
  /**
   * Set the correct WGSL code snippet.
   */
  setWGSLFragment() {
    this.wgslGroupFragment = [`${getTextureBindingWGSLVarType(this)}`];
  }
}

export { TextureBinding };
//# sourceMappingURL=TextureBinding.mjs.map
