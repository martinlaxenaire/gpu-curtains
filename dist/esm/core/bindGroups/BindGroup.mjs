import { isRenderer } from '../renderers/utils.mjs';
import { generateUUID, toKebabCase } from '../../utils/utils.mjs';
import { WritableBufferBinding } from '../bindings/WritableBufferBinding.mjs';
import { BufferBinding } from '../bindings/BufferBinding.mjs';

class BindGroup {
  /**
   * BindGroup constructor
   * @param renderer - a {@link Renderer} class object or a {@link GPUCurtains} class object
   * @param parameters - {@link BindGroupParams | parameters} used to create our {@link BindGroup}
   */
  constructor(renderer, { label = "BindGroup", index = 0, bindings = [], uniforms, storages } = {}) {
    this.type = "BindGroup";
    renderer = renderer && renderer.renderer || renderer;
    isRenderer(renderer, this.type);
    this.renderer = renderer;
    this.options = {
      label,
      index,
      bindings,
      ...uniforms && { uniforms },
      ...storages && { storages }
    };
    this.index = index;
    this.uuid = generateUUID();
    this.bindings = [];
    bindings.length && this.addBindings(bindings);
    if (this.options.uniforms || this.options.storages)
      this.setInputBindings();
    this.resetEntries();
    this.bindGroupLayout = null;
    this.bindGroup = null;
    this.needsPipelineFlush = false;
    this.renderer.addBindGroup(this);
  }
  /**
   * Sets our {@link BindGroup#index | bind group index}
   * @param index - {@link BindGroup#index | bind group index} to set
   */
  setIndex(index) {
    this.index = index;
  }
  /**
   * Adds an array of already created {@link bindings} (buffers, texture, etc.) to the {@link bindings} array
   * @param bindings - {@link bindings} to add
   */
  addBindings(bindings = []) {
    this.bindings = [...this.bindings, ...bindings];
  }
  /**
   * Adds an already created {@link bindings} (buffers, texture, etc.) to the {@link bindings} array
   * @param binding - binding to add
   */
  addBinding(binding) {
    this.bindings.push(binding);
  }
  /**
   * Creates Bindings based on a list of inputs
   * @param bindingType - {@link core/bindings/Binding.Binding#bindingType | binding type}
   * @param inputs - {@link ReadOnlyInputBindings | inputs (uniform or storage)} that will be used to create the binding
   * @returns - a {@link bindings} array
   */
  createInputBindings(bindingType = "uniform", inputs = {}) {
    return [
      ...Object.keys(inputs).map((inputKey) => {
        const binding = inputs[inputKey];
        const bindingParams = {
          label: toKebabCase(binding.label || inputKey),
          name: inputKey,
          bindingType,
          useStruct: true,
          // by default
          visibility: binding.access === "read_write" ? "compute" : binding.visibility,
          access: binding.access ?? "read",
          // read by default
          struct: binding.struct,
          ...binding.shouldCopyResult !== void 0 && { shouldCopyResult: binding.shouldCopyResult }
        };
        const BufferBindingConstructor = bindingParams.access === "read_write" ? WritableBufferBinding : BufferBinding;
        return binding.useStruct !== false ? new BufferBindingConstructor(bindingParams) : Object.keys(binding.struct).map((bindingKey) => {
          bindingParams.label = toKebabCase(binding.label ? binding.label + bindingKey : inputKey + bindingKey);
          bindingParams.name = inputKey + bindingKey;
          bindingParams.useStruct = false;
          bindingParams.struct = { [bindingKey]: binding.struct[bindingKey] };
          return new BufferBindingConstructor(bindingParams);
        });
      })
    ].flat();
  }
  /**
   * Create and adds {@link bindings} based on inputs provided upon creation
   */
  setInputBindings() {
    this.addBindings([
      ...this.createInputBindings("uniform", this.options.uniforms),
      ...this.createInputBindings("storage", this.options.storages)
    ]);
  }
  /**
   * Get whether the GPU bind group is ready to be created
   * It can be created if it has {@link bindings} and has not been created yet
   * @readonly
   */
  get shouldCreateBindGroup() {
    return !this.bindGroup && !!this.bindings.length;
  }
  /**
   * Reset our {@link BindGroup} {@link entries}
   */
  resetEntries() {
    this.entries = {
      bindGroupLayout: [],
      bindGroup: []
    };
  }
  /**
   * Create the GPU buffers, {@link bindings}, {@link entries}, {@link bindGroupLayout} and {@link bindGroup}
   */
  createBindGroup() {
    this.fillEntries();
    this.setBindGroupLayout();
    this.setBindGroup();
  }
  /**
   * Reset the {@link BindGroup#entries.bindGroup | bindGroup entries}, recreates them and then recreate the {@link BindGroup#bindGroup | GPU bind group}
   */
  resetBindGroup() {
    this.entries.bindGroup = [];
    this.bindings.forEach((binding) => {
      this.entries.bindGroup.push({
        binding: this.entries.bindGroup.length,
        resource: binding.resource
      });
    });
    this.setBindGroup();
  }
  /**
   * Reset the {@link BindGroup#entries.bindGroupLayout | bindGroupLayout entries}, recreates them and then recreate the {@link BindGroup#bindGroupLayout | GPU bind group layout}
   */
  resetBindGroupLayout() {
    this.entries.bindGroupLayout = [];
    this.bindings.forEach((binding) => {
      this.entries.bindGroupLayout.push({
        binding: this.entries.bindGroupLayout.length,
        ...binding.resourceLayout,
        visibility: binding.visibility
      });
    });
    this.setBindGroupLayout();
  }
  /**
   * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been lost to prepare everything for restoration
   */
  loseContext() {
    this.resetEntries();
    this.bufferBindings.forEach((binding) => {
      binding.buffer = null;
      if ("resultBuffer" in binding) {
        binding.resultBuffer = null;
      }
    });
    this.bindGroup = null;
    this.bindGroupLayout = null;
    this.needsPipelineFlush = true;
  }
  /**
   * Get all {@link BindGroup#bindings | bind group bindings} that handle a {@link GPUBuffer}
   */
  get bufferBindings() {
    return this.bindings.filter(
      (binding) => binding instanceof BufferBinding || binding instanceof WritableBufferBinding
    );
  }
  /**
   * Creates binding GPUBuffer with correct params
   * @param binding - the binding element
   */
  createBindingBuffer(binding) {
    binding.buffer = this.renderer.createBuffer({
      label: this.options.label + ": " + binding.bindingType + " buffer from: " + binding.label,
      size: binding.arrayBuffer.byteLength,
      usage: binding.bindingType === "uniform" ? GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC | GPUBufferUsage.VERTEX : GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC | GPUBufferUsage.VERTEX
    });
    if ("resultBuffer" in binding) {
      binding.resultBuffer = this.renderer.createBuffer({
        label: this.options.label + ": Result buffer from: " + binding.label,
        size: binding.arrayBuffer.byteLength,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
      });
    }
  }
  /**
   * Fill in our entries bindGroupLayout and bindGroup arrays with the correct binding resources.
   * For buffer struct, create a GPUBuffer first if needed
   */
  fillEntries() {
    this.bindings.forEach((binding) => {
      if (!binding.visibility) {
        binding.visibility = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE;
      }
      if ("buffer" in binding && !binding.buffer) {
        this.createBindingBuffer(binding);
      }
      this.entries.bindGroupLayout.push({
        binding: this.entries.bindGroupLayout.length,
        ...binding.resourceLayout,
        visibility: binding.visibility
      });
      this.entries.bindGroup.push({
        binding: this.entries.bindGroup.length,
        resource: binding.resource
      });
    });
  }
  /**
   * Get a bind group binding by name/key
   * @param bindingName - the binding name or key
   * @returns - the found binding, or null if not found
   */
  getBindingByName(bindingName = "") {
    return this.bindings.find((binding) => binding.name === bindingName);
  }
  /**
   * Create a GPUBindGroupLayout and set our {@link bindGroupLayout}
   */
  setBindGroupLayout() {
    this.bindGroupLayout = this.renderer.createBindGroupLayout({
      label: this.options.label + " layout",
      entries: this.entries.bindGroupLayout
    });
  }
  /**
   * Create a GPUBindGroup and set our {@link bindGroup}
   */
  setBindGroup() {
    this.bindGroup = this.renderer.createBindGroup({
      label: this.options.label,
      layout: this.bindGroupLayout,
      entries: this.entries.bindGroup
    });
  }
  /**
   * Check whether we should update (write) our {@link GPUBuffer} or not.
   */
  updateBufferBindings() {
    this.bufferBindings.forEach((binding, index) => {
      binding.update();
      if (binding.shouldUpdate) {
        if (!binding.useStruct && binding.bufferElements.length > 1) {
          this.renderer.queueWriteBuffer(binding.buffer, 0, binding.bufferElements[index].view);
        } else {
          this.renderer.queueWriteBuffer(binding.buffer, 0, binding.arrayBuffer);
        }
      }
      binding.shouldUpdate = false;
    });
  }
  /**
   * Update the {@link BindGroup}, which means update its {@link BindGroup#bufferBindings | buffer bindings} and {@link BindGroup#resetBindGroup | reset it} if needed.
   * Called at each render from the parentMesh {@link core/materials/Material.Material | material}
   */
  update() {
    this.updateBufferBindings();
    const needBindGroupReset = this.bindings.some((binding) => binding.shouldResetBindGroup);
    const needBindGroupLayoutReset = this.bindings.some((binding) => binding.shouldResetBindGroupLayout);
    if (needBindGroupReset || needBindGroupLayoutReset) {
      this.renderer.onAfterCommandEncoderSubmission.add(
        () => {
          this.bindings.forEach((binding) => {
            binding.shouldResetBindGroup = false;
            binding.shouldResetBindGroupLayout = false;
          });
        },
        { once: true }
      );
    }
    if (needBindGroupLayoutReset) {
      this.resetBindGroupLayout();
      this.needsPipelineFlush = true;
    }
    if (needBindGroupReset) {
      this.resetBindGroup();
    }
  }
  /**
   * Clones a {@link BindGroup} from a list of {@link bindings}
   * Useful to create a new bind group with already created buffers, but swapped
   * @param parameters - parameters to use for cloning
   * @param parameters.bindings - our input {@link bindings}
   * @param [parameters.keepLayout=false] - whether we should keep original {@link bindGroupLayout} or not
   * @returns - the cloned {@link BindGroup}
   */
  clone({
    bindings = [],
    keepLayout = false
  } = {}) {
    const params = { ...this.options };
    params.label += " (copy)";
    const bindGroupCopy = new this.constructor(this.renderer, {
      label: params.label
    });
    bindGroupCopy.setIndex(this.index);
    bindGroupCopy.options = params;
    const bindingsRef = bindings.length ? bindings : this.bindings;
    bindingsRef.forEach((binding, index) => {
      bindGroupCopy.addBinding(binding);
      if ("buffer" in binding && !binding.buffer) {
        bindGroupCopy.createBindingBuffer(binding);
      }
      if (!keepLayout) {
        bindGroupCopy.entries.bindGroupLayout.push({
          binding: bindGroupCopy.entries.bindGroupLayout.length,
          ...binding.resourceLayout,
          visibility: binding.visibility
        });
      }
      bindGroupCopy.entries.bindGroup.push({
        binding: bindGroupCopy.entries.bindGroup.length,
        resource: binding.resource
      });
    });
    if (keepLayout) {
      bindGroupCopy.entries.bindGroupLayout = [...this.entries.bindGroupLayout];
    }
    bindGroupCopy.setBindGroupLayout();
    bindGroupCopy.setBindGroup();
    return bindGroupCopy;
  }
  /**
   * Destroy our {@link BindGroup}
   * Most important is to destroy the GPUBuffers to free the memory
   */
  destroy() {
    this.renderer.removeBindGroup(this);
    this.bufferBindings.forEach((binding) => {
      if ("buffer" in binding) {
        this.renderer.removeBuffer(binding.buffer);
        binding.buffer?.destroy();
        binding.buffer = null;
      }
      if ("resultBuffer" in binding) {
        this.renderer.removeBuffer(binding.resultBuffer);
        binding.resultBuffer?.destroy();
        binding.resultBuffer = null;
      }
    });
    this.bindings = [];
    this.bindGroupLayout = null;
    this.bindGroup = null;
    this.resetEntries();
  }
}

export { BindGroup };
//# sourceMappingURL=BindGroup.mjs.map
