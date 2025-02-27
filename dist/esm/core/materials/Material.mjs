import { isRenderer } from '../renderers/utils.mjs';
import { BindGroup } from '../bindGroups/BindGroup.mjs';
import { TextureBindGroup } from '../bindGroups/TextureBindGroup.mjs';
import { Sampler } from '../samplers/Sampler.mjs';
import { MediaTexture } from '../textures/MediaTexture.mjs';
import { generateUUID } from '../../utils/utils.mjs';

class Material {
  /**
   * Material constructor
   * @param renderer - {@link Renderer} class object or {@link GPUCurtains} class object used to create this {@link Material}.
   * @param parameters - {@link types/Materials.MaterialParams | parameters} used to create our Material.
   */
  constructor(renderer, parameters) {
    this.type = "Material";
    renderer = isRenderer(renderer, this.type);
    this.renderer = renderer;
    this.uuid = generateUUID();
    const { shaders, label, useAsyncPipeline, uniforms, storages, bindings, bindGroups, samplers, textures } = parameters;
    this.options = {
      shaders,
      label: label || this.constructor.name,
      useAsyncPipeline: useAsyncPipeline === void 0 ? true : useAsyncPipeline,
      ...uniforms !== void 0 && { uniforms },
      ...storages !== void 0 && { storages },
      ...bindings !== void 0 && { bindings },
      ...bindGroups !== void 0 && { bindGroups },
      ...samplers !== void 0 && { samplers },
      ...textures !== void 0 && { textures }
    };
    this.bindGroups = [];
    this.texturesBindGroups = [];
    this.clonedBindGroups = [];
    this.setBindGroups();
    this.setTextures();
    this.setSamplers();
  }
  /**
   * Set or reset this {@link Material} {@link Material.renderer | renderer}. Also reset the {@link bindGroups} renderer.
   * @param renderer - New {@link Renderer} or {@link GPUCurtains} instance to use.
   */
  setRenderer(renderer) {
    renderer = isRenderer(renderer, this.type);
    this.renderer = renderer;
    this.bindGroups.forEach((bindGroup) => {
      bindGroup.setRenderer(this.renderer);
    });
    if (this.pipelineEntry) {
      this.pipelineEntry.setRenderer(this.renderer);
    }
  }
  /**
   * Check if all bind groups are ready, and create them if needed.
   */
  async compileMaterial() {
    const createBindGroups = () => {
      const texturesBindGroupLength = this.texturesBindGroup.bindings.length ? 1 : 0;
      const bindGroupsReady = this.bindGroups.length >= this.inputsBindGroups.length + texturesBindGroupLength;
      if (!bindGroupsReady) {
        this.createBindGroups();
      }
    };
    if (this.renderer.ready) {
      createBindGroups();
    } else {
      await new Promise((resolve) => {
        const taskId = this.renderer.onBeforeCommandEncoderCreation.add(
          () => {
            if (this.renderer.device) {
              this.renderer.onBeforeCommandEncoderCreation.remove(taskId);
              createBindGroups();
              resolve();
            }
          },
          { once: false }
        );
      });
    }
  }
  /**
   * Get whether the renderer is ready, our pipeline entry and pipeline have been created and successfully compiled.
   * @readonly
   */
  get ready() {
    return !!(this.renderer.ready && this.pipelineEntry && this.pipelineEntry.pipeline && this.pipelineEntry.ready);
  }
  /**
   * Get the {@link Material} pipeline buffers cache key based on its {@link BindGroup} cache keys.
   * @returns - Current cache key.
   * @readonly
   */
  get cacheKey() {
    let cacheKey = "";
    this.bindGroups.forEach((bindGroup) => {
      bindGroup.bindings.forEach((binding) => {
        cacheKey += binding.name + ",";
      });
      cacheKey += bindGroup.pipelineCacheKey;
    });
    return cacheKey;
  }
  /**
   * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been lost to prepare everything for restoration.
   * Basically set all the {@link GPUBuffer} to `null`, so they will be reset next time we try to render.
   */
  loseContext() {
    for (const texture of this.textures) {
      texture.texture = null;
      if (texture instanceof MediaTexture) {
        texture.sources.forEach((source) => source.sourceUploaded = false);
        texture.sourcesUploaded = false;
      }
    }
    [...this.bindGroups, ...this.clonedBindGroups, ...this.inputsBindGroups].forEach(
      (bindGroup) => bindGroup.loseContext()
    );
    this.pipelineEntry.pipeline = null;
  }
  /**
   * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been restored to recreate our samplers, textures and bind groups.
   */
  restoreContext() {
    for (const sampler of this.samplers) {
      sampler.createSampler();
      sampler.binding.resource = sampler.sampler;
    }
    for (const texture of this.textures) {
      if (texture instanceof MediaTexture) {
        texture.sources.forEach((source) => {
          if (source.sourceLoaded) {
            source.shouldUpdate = true;
          }
        });
      }
      texture.resize(texture.size);
    }
    [...this.bindGroups, ...this.clonedBindGroups, ...this.inputsBindGroups].forEach((bindGroup) => {
      bindGroup.restoreContext();
    });
  }
  /**
   * Get the complete code of a given shader including all the WGSL fragment code snippets added by the pipeline. Can wait for the {@link pipelineEntry} to be compiled if that's not already the case.
   * @param [shaderType="full"] - Shader to get the code from.
   * @returns - The corresponding shader code.
   */
  async getShaderCode(shaderType = "full") {
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
    if (this.pipelineEntry) {
      return this.pipelineEntry.shaders[shaderType].code;
    } else {
      return new Promise((resolve) => {
        const taskId = this.renderer.onBeforeRenderScene.add(
          () => {
            if (this.pipelineEntry) {
              this.renderer.onBeforeRenderScene.remove(taskId);
              resolve(this.pipelineEntry.shaders[shaderType].code);
            }
          },
          { once: false }
        );
      });
    }
  }
  /**
   * Get the added code of a given shader, i.e. all the WGSL fragment code snippets added by the pipeline. Can wait for the {@link pipelineEntry} to be compiled if that's not already the case.
   * @param [shaderType="vertex"] - Shader to get the code from.
   * @returns - The corresponding shader code.
   */
  async getAddedShaderCode(shaderType = "vertex") {
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
    if (this.pipelineEntry) {
      return this.pipelineEntry.shaders[shaderType].head;
    } else {
      return new Promise((resolve) => {
        const taskId = this.renderer.onBeforeRenderScene.add(
          () => {
            if (this.pipelineEntry) {
              this.renderer.onBeforeRenderScene.remove(taskId);
              resolve(this.pipelineEntry.shaders[shaderType].head);
            }
          },
          { once: false }
        );
      });
    }
  }
  /* BIND GROUPS */
  /**
   * Prepare and set our bind groups based on inputs and bindGroups Material parameters.
   */
  setBindGroups() {
    this.uniforms = {};
    this.storages = {};
    this.inputsBindGroups = [];
    this.inputsBindings = /* @__PURE__ */ new Map();
    if (this.options.uniforms || this.options.storages || this.options.bindings) {
      const inputsBindGroup = new BindGroup(this.renderer, {
        label: this.options.label + ": Bindings bind group",
        uniforms: this.options.uniforms,
        storages: this.options.storages,
        bindings: this.options.bindings
      });
      this.processBindGroupBindings(inputsBindGroup);
      this.inputsBindGroups.push(inputsBindGroup);
      inputsBindGroup.consumers.add(this.uuid);
    }
    this.options.bindGroups?.forEach((bindGroup) => {
      this.processBindGroupBindings(bindGroup);
      this.inputsBindGroups.push(bindGroup);
      bindGroup.consumers.add(this.uuid);
    });
  }
  /**
   * Get the main {@link TextureBindGroup | texture bind group} created by this {@link Material} to manage all textures related struct.
   * @readonly
   */
  get texturesBindGroup() {
    return this.texturesBindGroups[0];
  }
  /**
   * Process all {@link BindGroup} struct and add them to the corresponding objects based on their binding types. Also store them in a inputsBindings array to facilitate further access to struct.
   * @param bindGroup - The {@link BindGroup} to process.
   */
  processBindGroupBindings(bindGroup) {
    for (const inputBinding of bindGroup.bindings) {
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
      this.inputsBindings.set(inputBinding.name, inputBinding);
    }
  }
  /**
   * Create the bind groups if they need to be created.
   */
  createBindGroups() {
    if (this.texturesBindGroup.shouldCreateBindGroup) {
      this.texturesBindGroup.setIndex(this.bindGroups.length);
      this.texturesBindGroup.createBindGroup();
      this.bindGroups.push(this.texturesBindGroup);
    }
    for (const bindGroup of this.inputsBindGroups) {
      if (bindGroup.shouldCreateBindGroup) {
        bindGroup.setIndex(this.bindGroups.length);
        bindGroup.createBindGroup();
        this.bindGroups.push(bindGroup);
      }
    }
    this.options.bindGroups?.forEach((bindGroup) => {
      if (!bindGroup.shouldCreateBindGroup && !this.bindGroups.find((bG) => bG.uuid === bindGroup.uuid)) {
        bindGroup.setIndex(this.bindGroups.length);
        this.bindGroups.push(bindGroup);
      }
      if (bindGroup instanceof TextureBindGroup && !this.texturesBindGroups.find((bG) => bG.uuid === bindGroup.uuid)) {
        this.texturesBindGroups.push(bindGroup);
        for (const texture of bindGroup.textures) {
          if (!this.textures.find((t) => t.uuid !== texture.uuid)) {
            this.textures.push(texture);
          }
        }
      }
    });
  }
  /**
   * Clones a {@link BindGroup} from a list of buffers.
   * Useful to create a new{@link BindGroup} with already created buffers, but swapped.
   * @param parameters - parameters used to clone the {@link BindGroup}.
   * @param parameters.bindGroup - the {@link BindGroup} to clone.
   * @param parameters.bindings - our input binding buffers.
   * @param parameters.keepLayout - whether we should keep original bind group layout or not.
   * @returns - the cloned {@link BindGroup}.
   */
  cloneBindGroup({
    bindGroup,
    bindings = [],
    keepLayout = true
  }) {
    if (!bindGroup) return null;
    const clone = bindGroup.clone({ bindings, keepLayout });
    this.clonedBindGroups.push(clone);
    return clone;
  }
  /**
   * Get a corresponding {@link BindGroup} or {@link TextureBindGroup} from one of its binding name/key
   * @param bindingName - the binding name/key to look for.
   * @returns - {@link BindGroup} found or null if not found.
   */
  getBindGroupByBindingName(bindingName = "") {
    return (this.ready ? this.bindGroups : this.inputsBindGroups).find((bindGroup) => {
      return bindGroup.bindings.find((binding) => binding.name === bindingName);
    });
  }
  /**
   * Destroy a {@link BindGroup}, only if it is not used by another object.
   * @param bindGroup - {@link BindGroup} to eventually destroy.
   */
  destroyBindGroup(bindGroup) {
    bindGroup.consumers.delete(this.uuid);
    if (!bindGroup.consumers.size) {
      bindGroup.destroy();
    }
  }
  /**
   * Destroy all {@link BindGroup}.
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
   * Update all {@link BindGroup}.
   */
  updateBindGroups() {
    for (const bindGroup of this.bindGroups) {
      this.updateBindGroup(bindGroup);
    }
  }
  /**
   * {@link BindGroup#update | Update a BindGroup}:
   * - Update the textures if it's a {@link texturesBindGroups | textures bind group}.
   * - Update its {@link BindGroup#bufferBindings | buffer bindings}.
   * - Check if it eventually needs a {@link BindGroup#resetBindGroup | reset}.
   * - Check if we need to flush the pipeline.
   * @param bindGroup - {@link BindGroup} to update.
   */
  updateBindGroup(bindGroup) {
    bindGroup.update();
    if (bindGroup.needsPipelineFlush && this.pipelineEntry.ready) {
      this.pipelineEntry.flushPipelineEntry(this.bindGroups);
      bindGroup.needsPipelineFlush = false;
    }
  }
  /* INPUTS */
  /**
   * Look for a {@link BindGroupBindingElement | binding} by name in all {@link inputsBindings | input bindings}
   * @param bindingName - the binding name or key.
   * @returns - The found binding, or null if not found.
   */
  getBindingByName(bindingName = "") {
    return this.inputsBindings.get(bindingName);
  }
  /**
   * Look for a {@link BindGroupBufferBindingElement | buffer binding} by name in all {@link inputsBindings | input bindings}.
   * @param bindingName - The binding name or key.
   * @returns - The found binding, or null if not found.
   */
  getBufferBindingByName(bindingName = "") {
    const bufferBinding = this.getBindingByName(bindingName);
    return bufferBinding && "buffer" in bufferBinding ? bufferBinding : void 0;
  }
  /**
   * Force setting a given {@link BufferBindingInput | buffer binding} shouldUpdate flag to `true` to update it at next render.
   * @param bufferBindingName - The buffer binding name.
   * @param bindingName - The binding name.
   */
  shouldUpdateInputsBindings(bufferBindingName, bindingName) {
    if (!bufferBindingName) return;
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
   * Prepare our {@link Material.textures | textures} array and set the {@link TextureBindGroup}.
   */
  setTextures() {
    this.textures = [];
    this.texturesBindGroups.push(
      new TextureBindGroup(this.renderer, {
        label: this.options.label + ": Textures bind group"
      })
    );
    this.texturesBindGroup.consumers.add(this.uuid);
    this.options.textures?.forEach((texture) => {
      this.addTexture(texture);
    });
  }
  /**
   * Add a {@link MediaTexture} or {@link Texture} to our {@link textures} array, and add it to the textures bind group only if used in the shaders (avoid binding useless data).
   * @param texture - {@link MediaTexture} or {@link Texture} to add.
   */
  addTexture(texture) {
    this.textures.push(texture);
    if (this.options.shaders.vertex && this.options.shaders.vertex.code.indexOf(texture.options.name) !== -1 || this.options.shaders.fragment && this.options.shaders.fragment.code.indexOf(texture.options.name) !== -1 || this.options.shaders.compute && this.options.shaders.compute.code.indexOf(texture.options.name) !== -1) {
      this.texturesBindGroup.addTexture(texture);
    }
  }
  /**
   * Destroy a {@link MediaTexture} or {@link Texture}, only if it is not used by another object or cached.
   * @param texture - {@link MediaTexture} or {@link Texture} to eventually destroy.
   */
  destroyTexture(texture) {
    if (texture.options.cache) return;
    if (!texture.options.autoDestroy) return;
    const objectsUsingTexture = this.renderer.getObjectsByTexture(texture);
    const shouldDestroy = !objectsUsingTexture || !objectsUsingTexture.some((object) => object.material.uuid !== this.uuid);
    if (shouldDestroy) {
      texture.destroy();
    }
  }
  /**
   * Destroy all the Material {@link textures}.
   */
  destroyTextures() {
    this.textures?.forEach((texture) => this.destroyTexture(texture));
    this.textures = [];
  }
  /**
   * Prepare our {@link Material.samplers | samplers} array and always add a default {@link Sampler} if not already passed as parameter.
   */
  setSamplers() {
    this.samplers = [];
    this.options.samplers?.forEach((sampler) => {
      this.addSampler(sampler);
    });
    const hasDefaultSampler = this.samplers.find((sampler) => sampler.name === "defaultSampler");
    if (!hasDefaultSampler) {
      const sampler = new Sampler(this.renderer, { label: "Default sampler", name: "defaultSampler" });
      this.addSampler(sampler);
    }
  }
  /**
   * Add a {@link Sampler} to our {@link samplers} array, and add it to the textures bind group only if used in the shaders (avoid binding useless data).
   * @param sampler - {@link Sampler} to add.
   */
  addSampler(sampler) {
    this.samplers.push(sampler);
    if (this.options.shaders.vertex && this.options.shaders.vertex.code.indexOf(sampler.name) !== -1 || this.options.shaders.fragment && this.options.shaders.fragment.code.indexOf(sampler.name) !== -1 || this.options.shaders.compute && this.options.shaders.compute.code.indexOf(sampler.name) !== -1) {
      this.texturesBindGroup.addSampler(sampler);
    }
  }
  /* BUFFER RESULTS */
  /**
   * Map a {@link Buffer#GPUBuffer | Buffer's GPU buffer} and put a copy of the data into a {@link Float32Array}
   * @param buffer - {@link Buffer} to use for mapping.
   * @returns - {@link Float32Array} holding the {@link GPUBuffer} data.
   */
  async getBufferResult(buffer) {
    return await buffer.mapBufferAsync();
  }
  /**
   * Map the content of a {@link BufferBinding} {@link Buffer#GPUBuffer | GPU buffer} and put a copy of the data into a {@link Float32Array}.
   * @param bindingName - The name of the {@link inputsBindings | input bindings} from which to map the {@link Buffer#GPUBuffer | GPU buffer}.
   * @returns - {@link Float32Array} holding the {@link GPUBuffer} data.
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
   * Map the content of a specific {@link BufferElement | buffer element} belonging to a {@link BufferBinding} {@link Buffer#GPUBuffer | GPU buffer} and put a copy of the data into a {@link Float32Array}.
   * @param parameters - Parameters used to get the result.
   * @param parameters.bindingName - The name of the {@link inputsBindings | input bindings} from which to map the {@link Buffer#GPUBuffer | GPU buffer}.
   * @param parameters.bufferElementName - The name of the {@link BufferElement | buffer element} from which to extract the data afterwards.
   * @returns - {@link Float32Array} holding {@link GPUBuffer} data.
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
   * First, check if we need to create our bind groups or pipeline.
   * Finally, updates all the {@link bindGroups | bind groups}.
   */
  onBeforeRender() {
    this.compileMaterial();
    this.updateBindGroups();
  }
  /**
   * Set the current pipeline.
   * @param pass - Current pass encoder.
   */
  setPipeline(pass) {
    this.renderer.pipelineManager.setCurrentPipeline(pass, this.pipelineEntry);
  }
  /**
   * Use the {@link Renderer#pipelineManager | renderer pipelineManager} to only set the bind groups that are not already set.
   * @param pass - Current pass encoder.
   */
  setActiveBindGroups(pass) {
    this.renderer.pipelineManager.setActiveBindGroups(pass, this.bindGroups);
  }
  /**
   * Render the material if it is ready:
   * Set the current pipeline and set the bind groups.
   * @param pass - Current pass encoder.
   */
  render(pass) {
    if (!this.ready) return;
    this.setPipeline(pass);
    this.setActiveBindGroups(pass);
  }
  /**
   * Destroy the Material.
   */
  destroy() {
    this.destroyBindGroups();
    this.destroyTextures();
  }
}

export { Material };
