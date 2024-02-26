import { isRenderer } from '../renderers/utils.mjs';
import { BindGroup } from '../bindGroups/BindGroup.mjs';
import { TextureBindGroup } from '../bindGroups/TextureBindGroup.mjs';
import { Sampler } from '../samplers/Sampler.mjs';
import { Texture } from '../textures/Texture.mjs';
import { RenderTexture } from '../textures/RenderTexture.mjs';
import { generateUUID } from '../../utils/utils.mjs';

class Material {
  /**
   * Material constructor
   * @param renderer - our renderer class object
   * @param parameters - {@link types/Materials.MaterialParams | parameters} used to create our Material
   */
  constructor(renderer, parameters) {
    this.type = "Material";
    renderer = renderer && renderer.renderer || renderer;
    isRenderer(renderer, this.type);
    this.renderer = renderer;
    this.uuid = generateUUID();
    const {
      shaders,
      label,
      useAsyncPipeline,
      uniforms,
      storages,
      bindings,
      bindGroups,
      samplers,
      textures,
      renderTextures
    } = parameters;
    this.options = {
      shaders,
      label,
      useAsyncPipeline: useAsyncPipeline === void 0 ? true : useAsyncPipeline,
      ...uniforms !== void 0 && { uniforms },
      ...storages !== void 0 && { storages },
      ...bindings !== void 0 && { bindings },
      ...bindGroups !== void 0 && { bindGroups },
      ...samplers !== void 0 && { samplers },
      ...textures !== void 0 && { textures },
      ...renderTextures !== void 0 && { renderTextures }
    };
    this.bindGroups = [];
    this.texturesBindGroups = [];
    this.clonedBindGroups = [];
    this.setBindGroups();
    this.setTextures();
    this.setSamplers();
  }
  /**
   * Check if all bind groups are ready, and create them if needed
   */
  compileMaterial() {
    const texturesBindGroupLength = this.texturesBindGroup.bindings.length ? 1 : 0;
    const bindGroupsReady = this.bindGroups.length >= this.inputsBindGroups.length + texturesBindGroupLength;
    if (!bindGroupsReady) {
      this.createBindGroups();
    }
  }
  /**
   * Get whether the renderer is ready, our pipeline entry and pipeline have been created and successfully compiled
   * @readonly
   */
  get ready() {
    return !!(this.renderer.ready && this.pipelineEntry && this.pipelineEntry.pipeline && this.pipelineEntry.ready);
  }
  /**
   * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been lost to prepare everything for restoration.
   * Basically set all the {@link GPUBuffer} to null so they will be reset next time we try to render
   */
  loseContext() {
    this.textures.forEach((texture) => {
      texture.texture = null;
      texture.sourceUploaded = false;
    });
    this.renderTextures.forEach((texture) => {
      texture.texture = null;
    });
    [...this.bindGroups, ...this.clonedBindGroups, ...this.inputsBindGroups].forEach(
      (bindGroup) => bindGroup.loseContext()
    );
    this.pipelineEntry.pipeline = null;
  }
  /**
   * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been restored to recreate our bind groups.
   */
  restoreContext() {
    this.samplers.forEach((sampler) => {
      sampler.createSampler();
      sampler.binding.resource = sampler.sampler;
    });
    this.textures.forEach((texture) => {
      texture.createTexture();
      texture.resize();
    });
    this.renderTextures.forEach((texture) => {
      texture.resize(texture.size);
    });
    [...this.bindGroups, ...this.clonedBindGroups, ...this.inputsBindGroups].forEach((bindGroup) => {
      if (bindGroup.shouldCreateBindGroup) {
        bindGroup.createBindGroup();
      }
      bindGroup.bufferBindings.forEach((bufferBinding) => bufferBinding.shouldUpdate = true);
    });
  }
  /**
   * Get the complete code of a given shader including all the WGSL fragment code snippets added by the pipeline
   * @param [shaderType="full"] - shader to get the code from
   * @returns - The corresponding shader code
   */
  getShaderCode(shaderType = "full") {
    if (!this.pipelineEntry)
      return "";
    shaderType = (() => {
      switch (shaderType) {
        case "vertex":
        case "fragment":
        case "compute":
        case "full":
          return shaderType;
        default:
          return "full";
      }
    })();
    return this.pipelineEntry.shaders[shaderType].code;
  }
  /**
   * Get the added code of a given shader, i.e. all the WGSL fragment code snippets added by the pipeline
   * @param [shaderType="vertex"] - shader to get the code from
   * @returns - The corresponding shader code
   */
  getAddedShaderCode(shaderType = "vertex") {
    if (!this.pipelineEntry)
      return "";
    shaderType = (() => {
      switch (shaderType) {
        case "vertex":
        case "fragment":
        case "compute":
          return shaderType;
        default:
          return "vertex";
      }
    })();
    return this.pipelineEntry.shaders[shaderType].head;
  }
  /* BIND GROUPS */
  /**
   * Prepare and set our bind groups based on inputs and bindGroups Material parameters
   */
  setBindGroups() {
    this.uniforms = {};
    this.storages = {};
    this.inputsBindGroups = [];
    this.inputsBindings = [];
    if (this.options.uniforms || this.options.storages || this.options.bindings) {
      const inputsBindGroup = new BindGroup(this.renderer, {
        label: this.options.label + ": Bindings bind group",
        uniforms: this.options.uniforms,
        storages: this.options.storages,
        bindings: this.options.bindings
      });
      this.processBindGroupBindings(inputsBindGroup);
      this.inputsBindGroups.push(inputsBindGroup);
    }
    this.options.bindGroups?.forEach((bindGroup) => {
      this.processBindGroupBindings(bindGroup);
      this.inputsBindGroups.push(bindGroup);
    });
  }
  /**
   * Get the main {@link TextureBindGroup | texture bind group} created by this {@link Material} to manage all textures related struct
   * @readonly
   */
  get texturesBindGroup() {
    return this.texturesBindGroups[0];
  }
  /**
   * Process all {@link BindGroup} struct and add them to the corresponding objects based on their binding types. Also store them in a inputsBindings array to facilitate further access to struct.
   * @param bindGroup - The {@link BindGroup} to process
   */
  processBindGroupBindings(bindGroup) {
    bindGroup.bindings.forEach((inputBinding) => {
      if (inputBinding.bindingType === "uniform")
        this.uniforms = {
          ...this.uniforms,
          [inputBinding.name]: inputBinding.inputs
        };
      if (inputBinding.bindingType === "storage")
        this.storages = {
          ...this.storages,
          [inputBinding.name]: inputBinding.inputs
        };
      this.inputsBindings.push(inputBinding);
    });
  }
  /**
   * Create the bind groups if they need to be created
   */
  createBindGroups() {
    if (this.texturesBindGroup.shouldCreateBindGroup) {
      this.texturesBindGroup.setIndex(this.bindGroups.length);
      this.texturesBindGroup.createBindGroup();
      this.bindGroups.push(this.texturesBindGroup);
    }
    this.inputsBindGroups.forEach((bindGroup) => {
      if (bindGroup.shouldCreateBindGroup) {
        bindGroup.setIndex(this.bindGroups.length);
        bindGroup.createBindGroup();
        this.bindGroups.push(bindGroup);
      }
    });
    this.options.bindGroups?.forEach((bindGroup) => {
      if (!bindGroup.shouldCreateBindGroup && !this.bindGroups.find((bG) => bG.uuid === bindGroup.uuid)) {
        bindGroup.setIndex(this.bindGroups.length);
        this.bindGroups.push(bindGroup);
      }
      if (bindGroup instanceof TextureBindGroup && !this.texturesBindGroups.find((bG) => bG.uuid === bindGroup.uuid)) {
        this.texturesBindGroups.push(bindGroup);
        bindGroup.textures.forEach((texture) => {
          if (texture instanceof Texture && !this.textures.find((t) => t.uuid === texture.uuid)) {
            this.textures.push(texture);
          } else if (texture instanceof RenderTexture && !this.renderTextures.find((t) => t.uuid === texture.uuid)) {
            this.renderTextures.push(texture);
          }
        });
      }
    });
  }
  /**
   * Clones a {@link BindGroup} from a list of buffers
   * Useful to create a new bind group with already created buffers, but swapped
   * @param parameters - parameters used to clone the {@link BindGroup | bind group}
   * @param parameters.bindGroup - the BindGroup to clone
   * @param parameters.bindings - our input binding buffers
   * @param parameters.keepLayout - whether we should keep original bind group layout or not
   * @returns - the cloned BindGroup
   */
  cloneBindGroup({
    bindGroup,
    bindings = [],
    keepLayout = true
  }) {
    if (!bindGroup)
      return null;
    const clone = bindGroup.clone({ bindings, keepLayout });
    this.clonedBindGroups.push(clone);
    return clone;
  }
  /**
   * Get a corresponding {@link BindGroup} or {@link TextureBindGroup} from one of its binding name/key
   * @param bindingName - the binding name/key to look for
   * @returns - bind group found or null if not found
   */
  getBindGroupByBindingName(bindingName = "") {
    return (this.ready ? this.bindGroups : this.inputsBindGroups).find((bindGroup) => {
      return bindGroup.bindings.find((binding) => binding.name === bindingName);
    });
  }
  /**
   * Destroy a bind group, only if it is not used by another object
   * @param bindGroup - bind group to eventually destroy
   */
  destroyBindGroup(bindGroup) {
    const objectsUsingBindGroup = this.renderer.getObjectsByBindGroup(bindGroup);
    const shouldDestroy = !objectsUsingBindGroup || !objectsUsingBindGroup.find((object) => object.material.uuid !== this.uuid);
    if (shouldDestroy) {
      bindGroup.destroy();
    }
  }
  /**
   * Destroy all bind groups
   */
  destroyBindGroups() {
    this.bindGroups.forEach((bindGroup) => this.destroyBindGroup(bindGroup));
    this.clonedBindGroups.forEach((bindGroup) => this.destroyBindGroup(bindGroup));
    this.texturesBindGroups.forEach((bindGroup) => this.destroyBindGroup(bindGroup));
    this.texturesBindGroups = [];
    this.inputsBindGroups = [];
    this.bindGroups = [];
    this.clonedBindGroups = [];
  }
  /**
   * {@link BindGroup#update | Update} all bind groups:
   * - Update all {@link texturesBindGroups | textures bind groups} textures
   * - Update its {@link BindGroup#bufferBindings | buffer bindings}
   * - Check if it eventually needs a {@link BindGroup#resetBindGroup | reset}
   * - Check if we need to flush the pipeline
   */
  updateBindGroups() {
    this.bindGroups.forEach((bindGroup) => {
      bindGroup.update();
      if (bindGroup.needsPipelineFlush && this.pipelineEntry.ready) {
        this.pipelineEntry.flushPipelineEntry(this.bindGroups);
        bindGroup.needsPipelineFlush = false;
      }
    });
  }
  /* INPUTS */
  /**
   * Look for a {@link BindGroupBindingElement | binding} by name in all {@link inputsBindings | input bindings}
   * @param bindingName - the binding name or key
   * @returns - the found binding, or null if not found
   */
  getBindingByName(bindingName = "") {
    return this.inputsBindings.find((binding) => binding.name === bindingName);
  }
  /**
   * Look for a {@link BindGroupBufferBindingElement | buffer binding} by name in all {@link inputsBindings | input bindings}
   * @param bindingName - the binding name or key
   * @returns - the found binding, or null if not found
   */
  getBufferBindingByName(bindingName = "") {
    return this.inputsBindings.find((binding) => binding.name === bindingName && "buffer" in binding);
  }
  /**
   * Force a given buffer binding update flag to update it at next render
   * @param bufferBindingName - the buffer binding name
   * @param bindingName - the binding name
   */
  shouldUpdateInputsBindings(bufferBindingName, bindingName) {
    if (!bufferBindingName)
      return;
    const bufferBinding = this.getBindingByName(bufferBindingName);
    if (bufferBinding) {
      if (!bindingName) {
        Object.keys(bufferBinding.inputs).forEach(
          (bindingKey) => bufferBinding.shouldUpdateBinding(bindingKey)
        );
      } else {
        bufferBinding.shouldUpdateBinding(bindingName);
      }
    }
  }
  /* SAMPLERS & TEXTURES */
  /**
   * Prepare our textures array and set the {@link TextureBindGroup}
   */
  setTextures() {
    this.textures = [];
    this.renderTextures = [];
    this.texturesBindGroups.push(
      new TextureBindGroup(this.renderer, {
        label: this.options.label + ": Textures bind group"
      })
    );
    this.options.textures?.forEach((texture) => {
      this.addTexture(texture);
    });
    this.options.renderTextures?.forEach((texture) => {
      this.addTexture(texture);
    });
  }
  /**
   * Add a texture to our array, and add it to the textures bind group only if used in the shaders (avoid binding useless data)
   * @param texture - texture to add
   */
  addTexture(texture) {
    if (texture instanceof Texture) {
      this.textures.push(texture);
    } else if (texture instanceof RenderTexture) {
      this.renderTextures.push(texture);
    }
    if (this.options.shaders.vertex && this.options.shaders.vertex.code.indexOf(texture.options.name) !== -1 || this.options.shaders.fragment && this.options.shaders.fragment.code.indexOf(texture.options.name) !== -1 || this.options.shaders.compute && this.options.shaders.compute.code.indexOf(texture.options.name) !== -1) {
      this.texturesBindGroup.addTexture(texture);
    }
  }
  /**
   * Destroy a {@link Texture} or {@link RenderTexture}, only if it is not used by another object or cached.
   * @param texture - {@link Texture} or {@link RenderTexture} to eventually destroy
   */
  destroyTexture(texture) {
    if (texture.options.cache)
      return;
    const objectsUsingTexture = this.renderer.getObjectsByTexture(texture);
    const shouldDestroy = !objectsUsingTexture || !objectsUsingTexture.some((object) => object.material.uuid !== this.uuid);
    if (shouldDestroy) {
      texture.destroy();
    }
  }
  /**
   * Destroy all the Material textures
   */
  destroyTextures() {
    this.textures?.forEach((texture) => this.destroyTexture(texture));
    this.renderTextures?.forEach((texture) => this.destroyTexture(texture));
    this.textures = [];
    this.renderTextures = [];
  }
  /**
   * Prepare our samplers array and always add a default sampler if not already passed as parameter
   */
  setSamplers() {
    this.samplers = [];
    this.options.samplers?.forEach((sampler) => {
      this.addSampler(sampler);
    });
    const hasDefaultSampler = this.samplers.find((sampler) => sampler.name === "defaultSampler");
    if (!hasDefaultSampler) {
      const sampler = new Sampler(this.renderer, { name: "defaultSampler" });
      this.addSampler(sampler);
    }
  }
  /**
   * Add a sampler to our array, and add it to the textures bind group only if used in the shaders (avoid binding useless data)
   * @param sampler - sampler to add
   */
  addSampler(sampler) {
    this.samplers.push(sampler);
    if (this.options.shaders.vertex && this.options.shaders.vertex.code.indexOf(sampler.name) !== -1 || this.options.shaders.fragment && this.options.shaders.fragment.code.indexOf(sampler.name) !== -1 || this.options.shaders.compute && this.options.shaders.compute.code.indexOf(sampler.name) !== -1) {
      this.texturesBindGroup.addSampler(sampler);
    }
  }
  /* BUFFER RESULTS */
  /**
   * Map a {@link GPUBuffer} and put a copy of the data into a {@link Float32Array}
   * @param buffer - {@link GPUBuffer} to map
   * @async
   * @returns - {@link Float32Array} holding the {@link GPUBuffer} data
   */
  async getBufferResult(buffer) {
    await buffer.mapAsync(GPUMapMode.READ);
    const result = new Float32Array(buffer.getMappedRange().slice(0));
    buffer.unmap();
    return result;
  }
  /**
   * Map the content of a {@link BufferBinding#buffer | GPU buffer} and put a copy of the data into a {@link Float32Array}
   * @param bindingName - The name of the {@link inputsBindings | input bindings} from which to map the {@link BufferBinding#buffer | GPU buffer}
   * @async
   * @returns - {@link Float32Array} holding the {@link GPUBuffer} data
   */
  async getBufferBindingResultByBindingName(bindingName = "") {
    const binding = this.getBufferBindingByName(bindingName);
    if (binding && "buffer" in binding) {
      const dstBuffer = this.renderer.copyBufferToBuffer({
        srcBuffer: binding.buffer
      });
      return await this.getBufferResult(dstBuffer);
    } else {
      return new Float32Array(0);
    }
  }
  /**
   * Map the content of a specific {@link BufferElement | buffer element} belonging to a {@link BufferBinding#buffer | GPU buffer} and put a copy of the data into a {@link Float32Array}
   * @param parameters - parameters used to get the result
   * @param parameters.bindingName - The name of the {@link inputsBindings | input bindings} from which to map the {@link BufferBinding#buffer | GPU buffer}
   * @param parameters.bufferElementName - The name of the {@link BufferElement | buffer element} from which to extract the data afterwards
   * @returns - {@link Float32Array} holding {@link GPUBuffer} data
   */
  async getBufferElementResultByNames({
    bindingName,
    bufferElementName
  }) {
    const result = await this.getBufferBindingResultByBindingName(bindingName);
    if (!bufferElementName || result.length) {
      return result;
    } else {
      const binding = this.getBufferBindingByName(bindingName);
      if (binding) {
        return binding.extractBufferElementDataFromBufferResult({ result, bufferElementName });
      } else {
        return result;
      }
    }
  }
  /* RENDER */
  /**
   * Called before rendering the Material.
   * First, check if we need to create our bind groups or pipeline
   * Then render the {@link textures}
   * Finally updates all the {@link bindGroups | bind groups}
   */
  onBeforeRender() {
    this.compileMaterial();
    this.textures.forEach((texture) => {
      texture.render();
    });
    this.updateBindGroups();
  }
  /**
   * Set the current pipeline
   * @param pass - current pass encoder
   */
  setPipeline(pass) {
    this.renderer.pipelineManager.setCurrentPipeline(pass, this.pipelineEntry);
  }
  /**
   * Render the material if it is ready:
   * Set the current pipeline and set the bind groups
   * @param pass - current pass encoder
   */
  render(pass) {
    if (!this.ready)
      return;
    this.setPipeline(pass);
    this.bindGroups.forEach((bindGroup) => {
      pass.setBindGroup(bindGroup.index, bindGroup.bindGroup);
    });
  }
  /**
   * Destroy the Material
   */
  destroy() {
    this.destroyBindGroups();
    this.destroyTextures();
  }
}

export { Material };
