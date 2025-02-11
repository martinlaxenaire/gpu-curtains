import { Binding } from './Binding.mjs';
import { getBindGroupLayoutTextureBindingType, getBindGroupLayoutTextureBindingCacheKey, getTextureBindingWGSLVarType } from './utils.mjs';

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
      visibility = ["compute"];
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
    this.cacheKey += `${format},${access},${viewDimension},${multisampled},`;
    this.resource = texture;
    this.setWGSLFragment();
  }
  /**
   * Get bind group layout entry resource, either for {@link GPUDevice.createBindGroupLayout().texture | GPUBindGroupLayout entry texture resource}, {@link GPUDevice.createBindGroupLayout().storageTexture | GPUBindGroupLayout entry storageTexture resource} or {@link GPUDevice.createBindGroupLayout().externalTexture | GPUBindGroupLayout entry externalTexture resource}.
   * @readonly
   */
  get resourceLayout() {
    return getBindGroupLayoutTextureBindingType(this);
  }
  /**
   * Get the resource cache key
   * @readonly
   */
  get resourceLayoutCacheKey() {
    return getBindGroupLayoutTextureBindingCacheKey(this);
  }
  /**
   * Get the {@link GPUDevice.createBindGroup().entries.resource | GPUBindGroup entry resource}.
   */
  get resource() {
    return this.texture instanceof GPUTexture ? this.texture.createView({ label: this.options.label + " view", dimension: this.options.viewDimension }) : this.texture instanceof GPUExternalTexture ? this.texture : null;
  }
  /**
   * Set the {@link GPUDevice.createBindGroup().entries.resource | GPUBindGroup entry resource}.
   * @param value - new bind group resource
   */
  set resource(value) {
    if (value || this.texture) this.shouldResetBindGroup = true;
    this.texture = value;
  }
  /**
   * Set or update our {@link Binding#bindingType | bindingType} and our WGSL code snippet
   * @param bindingType - the new {@link Binding#bindingType | binding type}
   */
  setBindingType(bindingType) {
    if (bindingType !== this.bindingType) {
      if (bindingType) this.shouldResetBindGroupLayout = true;
      this.bindingType = bindingType;
      this.cacheKey = `${this.bindingType},${this.visibility},${this.options.format},${this.options.access},${this.options.viewDimension},${this.options.multisampled},`;
      this.setWGSLFragment();
    }
  }
  /**
   * Set or update our texture {@link TextureBindingParams#format | format}. Note that if the texture is a `storage` {@link bindingType} and the `format` value is different from the previous one, the associated {@link core/bindGroups/BindGroup.BindGroup#bindGroupLayout | GPU bind group layout} will be recreated.
   * @param format - new texture {@link TextureBindingParams#format | format} value to use
   */
  setFormat(format) {
    const isNewFormat = format !== this.options.format;
    this.options.format = format;
    if (isNewFormat && this.bindingType === "storage") {
      this.setWGSLFragment();
      this.shouldResetBindGroupLayout = true;
      this.cacheKey = `${this.bindingType},${this.visibility},${this.options.format},${this.options.access},${this.options.viewDimension},${this.options.multisampled},`;
    }
  }
  /**
   * Set or update our texture {@link TextureBindingParams#multisampled | multisampled}. Note that if the texture is not a `storage` {@link bindingType} and the `multisampled` value is different from the previous one, the associated {@link core/bindGroups/BindGroup.BindGroup#bindGroupLayout | GPU bind group layout} will be recreated.
   * @param multisampled - new texture {@link TextureBindingParams#multisampled | multisampled} value to use
   */
  setMultisampled(multisampled) {
    const isNewMultisampled = multisampled !== this.options.multisampled;
    this.options.multisampled = multisampled;
    if (isNewMultisampled && this.bindingType !== "storage") {
      this.setWGSLFragment();
      this.shouldResetBindGroupLayout = true;
      this.cacheKey = `${this.bindingType},${this.visibility},${this.options.format},${this.options.access},${this.options.viewDimension},${this.options.multisampled},`;
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
