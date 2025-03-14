import { isRenderer } from '../renderers/utils.mjs';
import { generateUUID, toKebabCase } from '../../utils/utils.mjs';
import { WritableBufferBinding } from '../bindings/WritableBufferBinding.mjs';
import { BufferBinding } from '../bindings/BufferBinding.mjs';

class BindGroup {
  /**
   * BindGroup constructor
   * @param renderer - a {@link Renderer} class object or a {@link GPUCurtains} class object.
   * @param parameters - {@link BindGroupParams | parameters} used to create our {@link BindGroup}.
   */
  constructor(renderer, { label = "BindGroup", index = 0, bindings = [], uniforms, storages } = {}) {
    this.type = "BindGroup";
    this.setRenderer(renderer);
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
    this.bufferBindings = [];
    this.uniforms = {};
    this.storages = {};
    bindings.length && this.addBindings(bindings);
    if (this.options.uniforms || this.options.storages) this.setInputBindings();
    this.layoutCacheKey = "";
    this.pipelineCacheKey = "";
    this.resetEntries();
    this.bindGroupLayout = null;
    this.bindGroup = null;
    this.needsPipelineFlush = false;
    this.consumers = /* @__PURE__ */ new Set();
    this.renderer.addBindGroup(this);
  }
  /**
   * Set or reset this {@link BindGroup} {@link BindGroup.renderer | renderer}.
   * @param renderer - New {@link Renderer} or {@link GPUCurtains} instance to use.
   */
  setRenderer(renderer) {
    renderer = isRenderer(renderer, this.type);
    this.renderer = renderer;
  }
  /**
   * Sets our {@link BindGroup#index | bind group index}.
   * @param index - {@link BindGroup#index | bind group index} to set.
   */
  setIndex(index) {
    this.index = index;
  }
  /**
   * Adds an array of already created {@link bindings} (buffers, texture, etc.) to the {@link bindings} array.
   * @param bindings - {@link bindings} to add.
   */
  addBindings(bindings = []) {
    bindings.forEach((binding) => {
      this.addBinding(binding);
    });
  }
  /**
   * Adds an already created {@link bindings} (buffers, texture, etc.) to the {@link bindings} array.
   * @param binding - binding to add.
   */
  addBinding(binding) {
    if ("buffer" in binding) {
      if (binding.parent) {
        this.renderer.deviceManager.bufferBindings.set(binding.parent.cacheKey, binding.parent);
        binding.parent.buffer.consumers.add(this.uuid);
      } else {
        this.renderer.deviceManager.bufferBindings.set(binding.cacheKey, binding);
        binding.buffer.consumers.add(this.uuid);
      }
      if ("resultBuffer" in binding) {
        binding.resultBuffer.consumers.add(this.uuid);
      }
      this.bufferBindings.push(binding);
      if (binding.bindingType === "uniform") {
        this.uniforms[binding.name] = binding.inputs;
      } else {
        this.storages[binding.name] = binding.inputs;
      }
    }
    this.bindings.push(binding);
  }
  /**
   * Destroy a {@link BufferBinding} buffers.
   * @param binding - {@link BufferBinding} from which to destroy the buffers.
   */
  destroyBufferBinding(binding) {
    if ("buffer" in binding) {
      this.renderer.removeBuffer(binding.buffer);
      binding.buffer.consumers.delete(this.uuid);
      if (!binding.buffer.consumers.size) {
        binding.buffer.destroy();
      }
      if (binding.parent) {
        binding.parent.buffer.consumers.delete(this.uuid);
        if (!binding.parent.buffer.consumers.size) {
          this.renderer.removeBuffer(binding.parent.buffer);
          binding.parent.buffer.destroy();
        }
      }
    }
    if ("resultBuffer" in binding) {
      this.renderer.removeBuffer(binding.resultBuffer);
      binding.resultBuffer.consumers.delete(this.uuid);
      if (!binding.resultBuffer.consumers.size) {
        binding.resultBuffer.destroy();
      }
    }
  }
  /**
   * Creates Bindings based on a list of inputs.
   * @param bindingType - {@link core/bindings/Binding.Binding#bindingType | binding type}.
   * @param inputs - {@link ReadOnlyInputBindings | inputs (uniform or storage)} that will be used to create the binding.
   * @returns - A {@link bindings} array.
   */
  createInputBindings(bindingType = "uniform", inputs = {}) {
    let bindings = [
      ...Object.keys(inputs).map((inputKey) => {
        const binding = inputs[inputKey];
        if (!binding.struct) return;
        const bindingParams = {
          label: toKebabCase(binding.label || inputKey),
          name: inputKey,
          bindingType,
          visibility: binding.access === "read_write" ? ["compute"] : binding.visibility,
          useStruct: true,
          // by default
          access: binding.access ?? "read",
          // read by default
          ...binding.usage && { usage: binding.usage },
          struct: binding.struct,
          ...binding.shouldCopyResult !== void 0 && { shouldCopyResult: binding.shouldCopyResult }
        };
        if (binding.useStruct !== false) {
          let key = `${bindingType},${binding.visibility === void 0 ? "all" : binding.access === "read_write" ? "compute" : binding.visibility},true,${binding.access ?? "read"},`;
          Object.keys(binding.struct).forEach((bindingKey) => {
            key += `${bindingKey},${binding.struct[bindingKey].type},`;
          });
          if (binding.shouldCopyResult !== void 0) {
            key += `${binding.shouldCopyResult},`;
          }
          const cachedBinding = this.renderer.deviceManager.bufferBindings.get(key);
          if (cachedBinding) {
            return cachedBinding.clone(bindingParams);
          }
        }
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
    bindings = bindings.filter(Boolean);
    bindings.forEach((binding) => {
      this.renderer.deviceManager.bufferBindings.set(binding.cacheKey, binding);
    });
    return bindings;
  }
  /**
   * Create and adds {@link bindings} based on inputs provided upon creation.
   */
  setInputBindings() {
    this.addBindings([
      ...this.createInputBindings("uniform", this.options.uniforms),
      ...this.createInputBindings("storage", this.options.storages)
    ]);
  }
  /**
   * Get whether the GPU bind group is ready to be created.
   * It can be created if it has {@link bindings} and has not been created yet.
   * @readonly
   */
  get shouldCreateBindGroup() {
    return !this.bindGroup && !!this.bindings.length;
  }
  /**
   * Reset our {@link BindGroup} {@link entries}.
   */
  resetEntries() {
    this.entries = {
      bindGroupLayout: [],
      bindGroup: []
    };
  }
  /**
   * Create the GPU buffers, {@link bindings}, {@link entries}, {@link bindGroupLayout} and {@link bindGroup}.
   */
  createBindGroup() {
    this.fillEntries();
    this.setBindGroupLayout();
    this.setBindGroup();
  }
  /**
   * Reset the {@link BindGroup#entries.bindGroup | bindGroup entries}, recreates them and then recreate the {@link BindGroup#bindGroup | GPU bind group}.
   */
  resetBindGroup() {
    this.entries.bindGroup = [];
    this.pipelineCacheKey = "";
    for (const binding of this.bindings) {
      this.addBindGroupEntry(binding);
    }
    this.setBindGroup();
  }
  /**
   * Add a {@link BindGroup#entries.bindGroup | bindGroup entry}
   * @param binding - {@link BindGroupBindingElement | binding} to add
   */
  addBindGroupEntry(binding) {
    this.entries.bindGroup.push({
      binding: this.entries.bindGroup.length,
      resource: binding.resource
    });
    this.pipelineCacheKey += binding.cacheKey;
  }
  /**
   * Reset the {@link BindGroup#entries.bindGroupLayout | bindGroupLayout entries}, recreates them and then recreate the {@link BindGroup#bindGroupLayout | GPU bind group layout}
   */
  resetBindGroupLayout() {
    this.entries.bindGroupLayout = [];
    this.layoutCacheKey = "";
    for (const binding of this.bindings) {
      this.addBindGroupLayoutEntry(binding);
    }
    this.setBindGroupLayout();
  }
  /**
   * Add a {@link BindGroup#entries.bindGroupLayout | bindGroupLayout entry}
   * @param binding - {@link BindGroupBindingElement | binding} to add
   */
  addBindGroupLayoutEntry(binding) {
    this.entries.bindGroupLayout.push({
      binding: this.entries.bindGroupLayout.length,
      ...binding.resourceLayout,
      visibility: binding.visibility
    });
    this.layoutCacheKey += binding.resourceLayoutCacheKey;
  }
  /**
   * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been lost to prepare everything for restoration
   */
  loseContext() {
    this.resetEntries();
    for (const binding of this.bufferBindings) {
      binding.buffer.reset();
      if (binding.parent) {
        binding.parent.buffer.reset();
      }
      if ("resultBuffer" in binding) {
        binding.resultBuffer.reset();
      }
    }
    this.bindGroup = null;
    this.bindGroupLayout = null;
    this.needsPipelineFlush = true;
  }
  /**
   * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been restored to update our bindings.
   */
  restoreContext() {
    if (this.shouldCreateBindGroup) {
      this.createBindGroup();
    }
    for (const bufferBinding of this.bufferBindings) {
      bufferBinding.shouldUpdate = true;
    }
  }
  /**
   * Creates binding GPUBuffer with correct params.
   * @param binding - The binding element.
   * @param optionalLabel - Optional label to use for the {@link GPUBuffer}.
   */
  createBindingBuffer(binding, optionalLabel = null) {
    binding.buffer.createBuffer(this.renderer, {
      label: optionalLabel || this.options.label + ": " + binding.bindingType + " buffer from: " + binding.label,
      usage: [...["copySrc", "copyDst", binding.bindingType], ...binding.options.usage]
    });
    if ("resultBuffer" in binding) {
      binding.resultBuffer.createBuffer(this.renderer, {
        label: this.options.label + ": Result buffer from: " + binding.label,
        size: binding.arrayBuffer.byteLength,
        usage: ["copyDst", "mapRead"]
      });
    }
    this.renderer.deviceManager.bufferBindings.set(binding.cacheKey, binding);
  }
  /**
   * Fill in our entries bindGroupLayout and bindGroup arrays with the correct binding resources.
   * For buffer struct, create a GPUBuffer first if needed
   */
  fillEntries() {
    for (const binding of this.bindings) {
      if (!binding.visibility) {
        binding.visibility = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE;
      }
      if ("buffer" in binding) {
        if (binding.parent && !binding.parent.buffer.GPUBuffer) {
          this.createBindingBuffer(binding.parent, binding.parent.options.label);
        } else if (!binding.buffer.GPUBuffer && !binding.parent) {
          this.createBindingBuffer(binding);
        }
      }
      this.addBindGroupLayoutEntry(binding);
      this.addBindGroupEntry(binding);
    }
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
    const bindGroupLayout = this.renderer.deviceManager.bindGroupLayouts.get(this.layoutCacheKey);
    if (bindGroupLayout) {
      this.bindGroupLayout = bindGroupLayout;
    } else {
      this.bindGroupLayout = this.renderer.createBindGroupLayout({
        label: this.options.label + " layout",
        entries: this.entries.bindGroupLayout
      });
      this.renderer.deviceManager.bindGroupLayouts.set(this.layoutCacheKey, this.bindGroupLayout);
    }
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
    this.bindings.forEach((binding, index) => {
      if ("buffer" in binding) {
        binding.update();
        if (binding.shouldUpdate && binding.buffer.GPUBuffer) {
          if (!binding.useStruct && binding.bufferElements.length > 1) {
            this.renderer.queueWriteBuffer(binding.buffer.GPUBuffer, 0, binding.bufferElements[index].view);
          } else {
            this.renderer.queueWriteBuffer(binding.buffer.GPUBuffer, 0, binding.arrayBuffer);
          }
          binding.shouldUpdate = false;
        }
      }
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
          for (const binding of this.bindings) {
            binding.shouldResetBindGroup = false;
            binding.shouldResetBindGroupLayout = false;
          }
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
   * Clones a {@link BindGroup} from a list of {@link BindGroup.bindings | bindings}.
   * Useful to create a new bind group with already created buffers, but swapped.
   * @param parameters - parameters to use for cloning.
   * @param parameters.bindings - our input {@link BindGroup.bindings | bindings}.
   * @param [parameters.keepLayout=false] - whether we should keep original {@link bindGroupLayout} or not.
   * @returns - the cloned {@link BindGroup}.
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
    for (const binding of bindingsRef) {
      bindGroupCopy.addBinding(binding);
      if ("buffer" in binding) {
        if (binding.parent && !binding.parent.buffer.GPUBuffer) {
          this.createBindingBuffer(binding.parent, binding.parent.options.label);
          binding.parent.buffer.consumers.add(bindGroupCopy.uuid);
        } else if (!binding.buffer.GPUBuffer && !binding.parent) {
          this.createBindingBuffer(binding);
        }
        if ("resultBuffer" in binding) {
          binding.resultBuffer.consumers.add(bindGroupCopy.uuid);
        }
      }
      if (!keepLayout) {
        bindGroupCopy.addBindGroupLayoutEntry(binding);
      }
      bindGroupCopy.addBindGroupEntry(binding);
    }
    if (keepLayout) {
      bindGroupCopy.entries.bindGroupLayout = [...this.entries.bindGroupLayout];
      bindGroupCopy.layoutCacheKey = this.layoutCacheKey;
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
    for (const binding of this.bufferBindings) {
      this.destroyBufferBinding(binding);
    }
    this.bindings = [];
    this.bindGroupLayout = null;
    this.bindGroup = null;
    this.resetEntries();
  }
}

export { BindGroup };
