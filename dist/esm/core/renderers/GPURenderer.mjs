import { DOMElement } from '../DOM/DOMElement.mjs';
import { Scene } from '../scenes/Scene.mjs';
import { RenderPass } from '../renderPasses/RenderPass.mjs';
import { generateUUID, throwError, throwWarning } from '../../utils/utils.mjs';
import { TasksQueueManager } from '../../utils/TasksQueueManager.mjs';

class GPURenderer {
  /**
   * GPURenderer constructor
   * @param parameters - {@link GPURendererParams | parameters} used to create this {@link GPURenderer}
   */
  constructor({
    deviceManager,
    label = "Main renderer",
    container,
    pixelRatio = 1,
    autoResize = true,
    preferredFormat,
    alphaMode = "premultiplied",
    renderPass
  }) {
    // callbacks / events
    /** function assigned to the {@link onBeforeRender} callback */
    this._onBeforeRenderCallback = (commandEncoder) => {
    };
    /** function assigned to the {@link onAfterRender} callback */
    this._onAfterRenderCallback = (commandEncoder) => {
    };
    /** function assigned to the {@link onAfterResize} callback */
    this._onAfterResizeCallback = () => {
    };
    this.type = "GPURenderer";
    this.uuid = generateUUID();
    if (!deviceManager) {
      throwError(`GPURenderer (${label}): no device manager provided: ${deviceManager}`);
    }
    this.deviceManager = deviceManager;
    this.deviceManager.addRenderer(this);
    renderPass = { ...{ useDepth: true, sampleCount: 4, clearValue: [0, 0, 0, 0] }, ...renderPass };
    preferredFormat = preferredFormat ?? this.deviceManager.gpu?.getPreferredCanvasFormat();
    this.options = {
      deviceManager,
      label,
      container,
      pixelRatio,
      autoResize,
      preferredFormat,
      alphaMode,
      renderPass
    };
    this.pixelRatio = pixelRatio ?? window.devicePixelRatio ?? 1;
    this.alphaMode = alphaMode;
    const isOffscreenCanvas = container instanceof OffscreenCanvas;
    const isContainerCanvas = isOffscreenCanvas || container instanceof HTMLCanvasElement;
    this.canvas = isContainerCanvas ? container : document.createElement("canvas");
    const { width, height } = this.canvas;
    this.rectBBox = {
      width,
      height,
      top: 0,
      left: 0
    };
    this.setTasksQueues();
    this.setRendererObjects();
    if (!isOffscreenCanvas) {
      this.domElement = new DOMElement({
        element: container,
        priority: 5,
        // renderer callback need to be called first
        onSizeChanged: () => {
          if (this.options.autoResize)
            this.resize();
        }
      });
      this.resize();
      if (!isContainerCanvas) {
        this.domElement.element.appendChild(this.canvas);
      }
    }
    if (this.deviceManager.device) {
      this.setContext();
    }
  }
  /**
   * Set the renderer {@link RectBBox} and canvas sizes
   * @param rectBBox - the optional new {@link canvas} {@link RectBBox} to set
   */
  setSize(rectBBox = null) {
    rectBBox = {
      ...{
        width: this.boundingRect.width,
        height: this.boundingRect.height,
        top: this.boundingRect.top,
        left: this.boundingRect.left
      },
      ...rectBBox
    };
    this.rectBBox = rectBBox;
    const renderingSize = {
      width: this.rectBBox.width,
      height: this.rectBBox.height
    };
    renderingSize.width *= this.pixelRatio;
    renderingSize.height *= this.pixelRatio;
    this.clampToMaxDimension(renderingSize);
    this.canvas.width = Math.floor(renderingSize.width);
    this.canvas.height = Math.floor(renderingSize.height);
    if (this.canvas.style) {
      this.canvas.style.width = this.rectBBox.width + "px";
      this.canvas.style.height = this.rectBBox.height + "px";
    }
  }
  /**
   * Set the renderer {@link pixelRatio | pixel ratio} and {@link resize} it
   * @param pixelRatio - new pixel ratio to use
   */
  setPixelRatio(pixelRatio = 1) {
    this.pixelRatio = pixelRatio;
    this.resize(this.rectBBox);
  }
  /**
   * Resize our {@link GPURenderer}
   * @param rectBBox - the optional new {@link canvas} {@link RectBBox} to set
   */
  resize(rectBBox = null) {
    this.setSize(rectBBox);
    this.onResize();
    this._onAfterResizeCallback && this._onAfterResizeCallback();
  }
  /**
   * Resize all tracked objects
   */
  onResize() {
    this.renderTextures.forEach((renderTexture) => {
      renderTexture.resize();
    });
    this.renderPass?.resize();
    this.postProcessingPass?.resize();
    this.renderTargets.forEach((renderTarget) => renderTarget.resize());
    this.computePasses.forEach((computePass) => computePass.resize());
    this.pingPongPlanes.forEach((pingPongPlane) => pingPongPlane.resize(this.boundingRect));
    this.shaderPasses.forEach((shaderPass) => shaderPass.resize(this.boundingRect));
    this.meshes.forEach((mesh) => {
      if (!("domElement" in mesh)) {
        mesh.resize(this.boundingRect);
      } else {
        this.onBeforeCommandEncoderCreation.add(
          () => {
            if (!mesh.domElement.isResizing) {
              mesh.domElement.setSize();
            }
          },
          { once: true }
        );
      }
    });
  }
  /**
   * Get our {@link domElement | DOM Element} {@link DOMElement#boundingRect | bounding rectangle}. If there's no {@link domElement | DOM Element} (like when using an offscreen canvas for example), the {@link rectBBox} values are used.
   */
  get boundingRect() {
    if (!!this.domElement && !!this.domElement.boundingRect) {
      return this.domElement.boundingRect;
    } else if (!!this.domElement) {
      const boundingRect = this.domElement.element?.getBoundingClientRect();
      return {
        top: boundingRect.top,
        right: boundingRect.right,
        bottom: boundingRect.bottom,
        left: boundingRect.left,
        width: boundingRect.width,
        height: boundingRect.height,
        x: boundingRect.x,
        y: boundingRect.y
      };
    } else {
      return {
        top: this.rectBBox.top,
        right: this.rectBBox.left + this.rectBBox.width,
        bottom: this.rectBBox.top + this.rectBBox.height,
        left: this.rectBBox.left,
        width: this.rectBBox.width,
        height: this.rectBBox.height,
        x: this.rectBBox.left,
        y: this.rectBBox.top
      };
    }
  }
  /**
   * Clamp to max WebGPU texture dimensions
   * @param dimension - width and height dimensions to clamp
   */
  clampToMaxDimension(dimension) {
    if (this.device) {
      dimension.width = Math.min(this.device.limits.maxTextureDimension2D, dimension.width);
      dimension.height = Math.min(this.device.limits.maxTextureDimension2D, dimension.height);
    }
  }
  /* USEFUL DEVICE MANAGER OBJECTS */
  /**
   * Get our {@link GPUDeviceManager#device | device}
   * @readonly
   */
  get device() {
    return this.deviceManager.device;
  }
  /**
   * Get whether our {@link GPUDeviceManager} is ready (i.e. its {@link GPUDeviceManager#adapter | adapter} and {@link GPUDeviceManager#device | device} are set) its {@link context} is set and its size is set
   * @readonly
   */
  get ready() {
    return this.deviceManager.ready && !!this.context && !!this.canvas.width && !!this.canvas.height;
  }
  /**
   * Get our {@link GPUDeviceManager#production | GPUDeviceManager production flag}
   * @readonly
   */
  get production() {
    return this.deviceManager.production;
  }
  /**
   * Get all the created {@link GPUDeviceManager#samplers | samplers}
   * @readonly
   */
  get samplers() {
    return this.deviceManager.samplers;
  }
  /**
   * Get all the created {@link GPUDeviceManager#buffers | GPU buffers}
   * @readonly
   */
  get buffers() {
    return this.deviceManager.buffers;
  }
  /**
   * Get the {@link GPUDeviceManager#pipelineManager | pipeline manager}
   * @readonly
   */
  get pipelineManager() {
    return this.deviceManager.pipelineManager;
  }
  /**
   * Get all the rendered objects (i.e. compute passes, meshes, ping pong planes and shader passes) created by the {@link GPUDeviceManager}
   * @readonly
   */
  get deviceRenderedObjects() {
    return this.deviceManager.deviceRenderedObjects;
  }
  /**
   * Configure our {@link context} with the given options
   */
  configureContext() {
    this.context.configure({
      device: this.device,
      format: this.options.preferredFormat,
      alphaMode: this.alphaMode,
      // needed so we can copy textures for post processing usage
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST
      //viewFormats: []
    });
  }
  /**
   * Set our {@link context} if possible and set {@link renderPass | main render pass} and {@link scene}
   */
  setContext() {
    this.context = this.canvas.getContext("webgpu");
    if (this.device) {
      this.configureContext();
      this.setMainRenderPasses();
      this.setScene();
    }
  }
  /**
   * Called when the {@link GPUDeviceManager#device | device} is lost.
   * Force all our scene objects to lose context.
   */
  loseContext() {
    this.renderedObjects.forEach((sceneObject) => sceneObject.loseContext());
  }
  /**
   * Called when the {@link GPUDeviceManager#device | device} should be restored.
   * Configure the context again, resize the {@link RenderTarget | render targets} and {@link RenderTexture | render textures}, restore our {@link renderedObjects | rendered objects} context.
   * @async
   */
  restoreContext() {
    this.configureContext();
    this.renderTextures.forEach((renderTexture) => {
      renderTexture.createTexture();
    });
    this.renderPass?.resize();
    this.postProcessingPass?.resize();
    this.renderTargets.forEach((renderTarget) => renderTarget.resize());
    this.renderedObjects.forEach((sceneObject) => sceneObject.restoreContext());
  }
  /* PIPELINES, SCENE & MAIN RENDER PASS */
  /**
   * Set our {@link renderPass | main render pass} that will be used to render the result of our draw commands back to the screen and our {@link postProcessingPass | postprocessing pass} that will be used for any additional postprocessing render passes.
   */
  setMainRenderPasses() {
    this.renderPass = new RenderPass(this, {
      label: this.options.label + " render pass",
      ...this.options.renderPass
    });
    this.postProcessingPass = new RenderPass(this, {
      label: this.options.label + " post processing render pass",
      // no need to handle depth or perform MSAA on a fullscreen quad
      useDepth: false,
      sampleCount: 1
    });
  }
  /**
   * Set our {@link scene}
   */
  setScene() {
    this.scene = new Scene({ renderer: this });
  }
  /* BUFFERS & BINDINGS */
  /**
   * Create a {@link GPUBuffer}
   * @param bufferDescriptor - {@link GPUBufferDescriptor | GPU buffer descriptor}
   * @returns - newly created {@link GPUBuffer}
   */
  createBuffer(bufferDescriptor) {
    const buffer = this.device?.createBuffer(bufferDescriptor);
    this.deviceManager.addBuffer(buffer);
    return buffer;
  }
  /**
   * Remove a {@link GPUBuffer} from our {@link GPUDeviceManager#buffers | GPU buffers array}
   * @param buffer - {@link GPUBuffer} to remove
   * @param [originalLabel] - original {@link GPUBuffer} label in case the buffer has been swapped and its label has changed
   */
  removeBuffer(buffer, originalLabel) {
    this.deviceManager.removeBuffer(buffer, originalLabel);
  }
  /**
   * Write to a {@link GPUBuffer}
   * @param buffer - {@link GPUBuffer} to write to
   * @param bufferOffset - {@link GPUSize64 | buffer offset}
   * @param data - {@link BufferSource | data} to write
   */
  queueWriteBuffer(buffer, bufferOffset, data) {
    this.device?.queue.writeBuffer(buffer, bufferOffset, data);
  }
  /**
   * Copy a source {@link GPUBuffer} into a destination {@link GPUBuffer}
   * @param parameters - parameters used to realize the copy
   * @param parameters.srcBuffer - source {@link GPUBuffer}
   * @param [parameters.dstBuffer] - destination {@link GPUBuffer}. Will create a new one if none provided.
   * @param [parameters.commandEncoder] - {@link GPUCommandEncoder} to use for the copy. Will create a new one and submit the command buffer if none provided.
   * @returns - destination {@link GPUBuffer} after copy
   */
  copyBufferToBuffer({
    srcBuffer,
    dstBuffer,
    commandEncoder
  }) {
    if (!srcBuffer) {
      throwWarning(
        `${this.type} (${this.options.label}): cannot copy to buffer because the source buffer has not been provided`
      );
      return null;
    }
    if (!dstBuffer) {
      dstBuffer = this.createBuffer({
        label: `GPURenderer (${this.options.label}): destination copy buffer from: ${srcBuffer.label}`,
        size: srcBuffer.size,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
      });
    }
    if (srcBuffer.mapState !== "unmapped") {
      throwWarning(`${this.type} (${this.options.label}): Cannot copy from ${srcBuffer} because it is currently mapped`);
      return;
    }
    if (dstBuffer.mapState !== "unmapped") {
      throwWarning(`${this.type} (${this.options.label}): Cannot copy from ${dstBuffer} because it is currently mapped`);
      return;
    }
    const hasCommandEncoder = !!commandEncoder;
    if (!hasCommandEncoder) {
      commandEncoder = this.device?.createCommandEncoder({
        label: `${this.type} (${this.options.label}): Copy buffer command encoder`
      });
      !this.production && commandEncoder.pushDebugGroup(`${this.type} (${this.options.label}): Copy buffer command encoder`);
    }
    commandEncoder.copyBufferToBuffer(srcBuffer, 0, dstBuffer, 0, dstBuffer.size);
    if (!hasCommandEncoder) {
      !this.production && commandEncoder.popDebugGroup();
      const commandBuffer = commandEncoder.finish();
      this.device?.queue.submit([commandBuffer]);
    }
    return dstBuffer;
  }
  /* BIND GROUPS & LAYOUTS */
  /**
   * Get all created {@link AllowedBindGroups | bind group} tracked by our {@link GPUDeviceManager}
   * @readonly
   */
  get bindGroups() {
    return this.deviceManager.bindGroups;
  }
  /**
   * Add a {@link AllowedBindGroups | bind group} to our {@link GPUDeviceManager#bindGroups | bind groups array}
   * @param bindGroup - {@link AllowedBindGroups | bind group} to add
   */
  addBindGroup(bindGroup) {
    this.deviceManager.addBindGroup(bindGroup);
  }
  /**
   * Remove a {@link AllowedBindGroups | bind group} from our {@link GPUDeviceManager#bindGroups | bind groups array}
   * @param bindGroup - {@link AllowedBindGroups | bind group} to remove
   */
  removeBindGroup(bindGroup) {
    this.deviceManager.removeBindGroup(bindGroup);
  }
  /**
   * Create a {@link GPUBindGroupLayout}
   * @param bindGroupLayoutDescriptor - {@link GPUBindGroupLayoutDescriptor | GPU bind group layout descriptor}
   * @returns - newly created {@link GPUBindGroupLayout}
   */
  createBindGroupLayout(bindGroupLayoutDescriptor) {
    return this.device?.createBindGroupLayout(bindGroupLayoutDescriptor);
  }
  /**
   * Create a {@link GPUBindGroup}
   * @param bindGroupDescriptor - {@link GPUBindGroupDescriptor | GPU bind group descriptor}
   * @returns - newly created {@link GPUBindGroup}
   */
  createBindGroup(bindGroupDescriptor) {
    return this.device?.createBindGroup(bindGroupDescriptor);
  }
  /* SHADERS & PIPELINES */
  /**
   * Create a {@link GPUShaderModule}
   * @param shaderModuleDescriptor - {@link shaderModuleDescriptor | shader module descriptor}
   * @returns - newly created {@link GPUShaderModule}
   */
  createShaderModule(shaderModuleDescriptor) {
    return this.device?.createShaderModule(shaderModuleDescriptor);
  }
  /**
   * Create a {@link GPUPipelineLayout}
   * @param pipelineLayoutDescriptor - {@link GPUPipelineLayoutDescriptor | GPU pipeline layout descriptor}
   * @returns - newly created {@link GPUPipelineLayout}
   */
  createPipelineLayout(pipelineLayoutDescriptor) {
    return this.device?.createPipelineLayout(pipelineLayoutDescriptor);
  }
  /**
   * Create a {@link GPURenderPipeline}
   * @param pipelineDescriptor - {@link GPURenderPipelineDescriptor | GPU render pipeline descriptor}
   * @returns - newly created {@link GPURenderPipeline}
   */
  createRenderPipeline(pipelineDescriptor) {
    return this.device?.createRenderPipeline(pipelineDescriptor);
  }
  /**
   * Asynchronously create a {@link GPURenderPipeline}
   * @async
   * @param pipelineDescriptor - {@link GPURenderPipelineDescriptor | GPU render pipeline descriptor}
   * @returns - newly created {@link GPURenderPipeline}
   */
  async createRenderPipelineAsync(pipelineDescriptor) {
    return await this.device?.createRenderPipelineAsync(pipelineDescriptor);
  }
  /**
   * Create a {@link GPUComputePipeline}
   * @param pipelineDescriptor - {@link GPUComputePipelineDescriptor | GPU compute pipeline descriptor}
   * @returns - newly created {@link GPUComputePipeline}
   */
  createComputePipeline(pipelineDescriptor) {
    return this.device?.createComputePipeline(pipelineDescriptor);
  }
  /**
   * Asynchronously create a {@link GPUComputePipeline}
   * @async
   * @param pipelineDescriptor - {@link GPUComputePipelineDescriptor | GPU compute pipeline descriptor}
   * @returns - newly created {@link GPUComputePipeline}
   */
  async createComputePipelineAsync(pipelineDescriptor) {
    return await this.device?.createComputePipelineAsync(pipelineDescriptor);
  }
  /* TEXTURES */
  /**
   * Get all created {@link Texture} tracked by our {@link GPUDeviceManager}
   * @readonly
   */
  get textures() {
    return this.deviceManager.textures;
  }
  /**
   * Add a {@link Texture} to our {@link GPUDeviceManager#textures | textures array}
   * @param texture - {@link Texture} to add
   */
  addTexture(texture) {
    this.deviceManager.addTexture(texture);
  }
  /**
   * Remove a {@link Texture} from our {@link GPUDeviceManager#textures | textures array}
   * @param texture - {@link Texture} to remove
   */
  removeTexture(texture) {
    this.deviceManager.removeTexture(texture);
  }
  /**
   * Add a {@link RenderTexture} to our {@link renderTextures} array
   * @param texture - {@link RenderTexture} to add
   */
  addRenderTexture(texture) {
    this.renderTextures.push(texture);
  }
  /**
   * Remove a {@link RenderTexture} from our {@link renderTextures} array
   * @param texture - {@link RenderTexture} to remove
   */
  removeRenderTexture(texture) {
    this.renderTextures = this.renderTextures.filter((t) => t.uuid !== texture.uuid);
  }
  /**
   * Create a {@link GPUTexture}
   * @param textureDescriptor - {@link GPUTextureDescriptor | GPU texture descriptor}
   * @returns - newly created {@link GPUTexture}
   */
  createTexture(textureDescriptor) {
    return this.device?.createTexture(textureDescriptor);
  }
  /**
   * Upload a {@link Texture#texture | texture} to the GPU
   * @param texture - {@link Texture} class object with the {@link Texture#texture | texture} to upload
   */
  uploadTexture(texture) {
    this.deviceManager.uploadTexture(texture);
  }
  /**
   * Import a {@link GPUExternalTexture}
   * @param video - {@link HTMLVideoElement} source
   * @returns - {@link GPUExternalTexture}
   */
  importExternalTexture(video) {
    return this.device?.importExternalTexture({ source: video });
  }
  /**
   * Check if a {@link Sampler} has already been created with the same {@link Sampler#options | parameters}.
   * Use it if found, else create a new one and add it to the {@link GPUDeviceManager#samplers | samplers array}.
   * @param sampler - {@link Sampler} to create
   * @returns - the {@link GPUSampler}
   */
  createSampler(sampler) {
    const existingSampler = this.samplers.find((existingSampler2) => {
      return JSON.stringify(existingSampler2.options) === JSON.stringify(sampler.options) && existingSampler2.sampler;
    });
    if (existingSampler) {
      return existingSampler.sampler;
    } else {
      const { type, ...samplerOptions } = sampler.options;
      const gpuSampler = this.device?.createSampler({
        label: sampler.label,
        ...samplerOptions
      });
      this.deviceManager.addSampler(sampler);
      return gpuSampler;
    }
  }
  /**
   * Remove a {@link Sampler} from our {@link GPUDeviceManager#samplers | samplers array}
   * @param sampler - {@link Sampler} to remove
   */
  removeSampler(sampler) {
    this.deviceManager.removeSampler(sampler);
  }
  /* OBJECTS & TASKS */
  /**
   * Set different tasks queue managers to execute callbacks at different phases of our render call:
   * - {@link onBeforeCommandEncoderCreation}: callbacks executed before the creation of the command encoder
   * - {@link onBeforeRenderScene}: callbacks executed after the creation of the command encoder and before rendering the {@link Scene}
   * - {@link onAfterRenderScene}: callbacks executed after the creation of the command encoder and after rendering the {@link Scene}
   * - {@link onAfterCommandEncoderSubmission}: callbacks executed after the submission of the command encoder
   */
  setTasksQueues() {
    this.onBeforeCommandEncoderCreation = new TasksQueueManager();
    this.onBeforeRenderScene = new TasksQueueManager();
    this.onAfterRenderScene = new TasksQueueManager();
    this.onAfterCommandEncoderSubmission = new TasksQueueManager();
  }
  /**
   * Set all objects arrays that we'll keep track of
   */
  setRendererObjects() {
    this.computePasses = [];
    this.pingPongPlanes = [];
    this.shaderPasses = [];
    this.renderTargets = [];
    this.meshes = [];
    this.renderTextures = [];
  }
  /**
   * Get all this {@link GPURenderer} rendered objects (i.e. compute passes, meshes, ping pong planes and shader passes)
   * @readonly
   */
  get renderedObjects() {
    return [...this.computePasses, ...this.meshes, ...this.shaderPasses, ...this.pingPongPlanes];
  }
  /**
   * Get all objects ({@link RenderedMesh | rendered meshes} or {@link ComputePass | compute passes}) using a given {@link AllowedBindGroups | bind group}.
   * Useful to know if a resource is used by multiple objects and if it is safe to destroy it or not.
   * @param bindGroup - {@link AllowedBindGroups | bind group} to check
   */
  getObjectsByBindGroup(bindGroup) {
    return this.deviceRenderedObjects.filter((object) => {
      return [
        ...object.material.bindGroups,
        ...object.material.inputsBindGroups,
        ...object.material.clonedBindGroups
      ].some((bG) => bG.uuid === bindGroup.uuid);
    });
  }
  /**
   * Get all objects ({@link RenderedMesh | rendered meshes} or {@link ComputePass | compute passes}) using a given {@link Texture} or {@link RenderTexture}.
   * Useful to know if a resource is used by multiple objects and if it is safe to destroy it or not.
   * @param texture - {@link Texture} or {@link RenderTexture} to check
   */
  getObjectsByTexture(texture) {
    return this.deviceRenderedObjects.filter((object) => {
      return [...object.material.textures, ...object.material.renderTextures].some((t) => t.uuid === texture.uuid);
    });
  }
  /* EVENTS */
  /**
   * Assign a callback function to _onBeforeRenderCallback
   * @param callback - callback to run just before the {@link render} method will be executed
   * @returns - our {@link GPURenderer}
   */
  onBeforeRender(callback) {
    if (callback) {
      this._onBeforeRenderCallback = callback;
    }
    return this;
  }
  /**
   * Assign a callback function to _onAfterRenderCallback
   * @param callback - callback to run just after the {@link render} method has been executed
   * @returns - our {@link GPURenderer}
   */
  onAfterRender(callback) {
    if (callback) {
      this._onAfterRenderCallback = callback;
    }
    return this;
  }
  /**
   * Assign a callback function to _onAfterResizeCallback
   * @param callback - callback to run just after the {@link GPURenderer} has been resized
   * @returns - our {@link GPURenderer}
   */
  onAfterResize(callback) {
    if (callback) {
      this._onAfterResizeCallback = callback;
    }
    return this;
  }
  /* RENDER */
  /**
   * Render a single {@link ComputePass}
   * @param commandEncoder - current {@link GPUCommandEncoder}
   * @param computePass - {@link ComputePass}
   */
  renderSingleComputePass(commandEncoder, computePass) {
    const pass = commandEncoder.beginComputePass();
    computePass.render(pass);
    pass.end();
    computePass.copyBufferToResult(commandEncoder);
  }
  /**
   * Render a single {@link RenderedMesh | Mesh}
   * @param commandEncoder - current {@link GPUCommandEncoder}
   * @param mesh - {@link RenderedMesh | Mesh} to render
   */
  renderSingleMesh(commandEncoder, mesh) {
    const pass = commandEncoder.beginRenderPass(this.renderPass.descriptor);
    mesh.render(pass);
    pass.end();
  }
  /**
   * Render an array of objects (either {@link RenderedMesh | Meshes} or {@link ComputePass}) once. This method won't call any of the renderer render hooks like {@link onBeforeRender}, {@link onAfterRender}
   * @param objects - Array of {@link RenderedMesh | Meshes} or {@link ComputePass} to render
   */
  renderOnce(objects) {
    const commandEncoder = this.device?.createCommandEncoder({
      label: "Render once command encoder"
    });
    !this.production && commandEncoder.pushDebugGroup("Render once command encoder");
    this.pipelineManager.resetCurrentPipeline();
    objects.forEach((object) => {
      if (object.type === "ComputePass") {
        this.renderSingleComputePass(commandEncoder, object);
      } else {
        this.renderSingleMesh(commandEncoder, object);
      }
    });
    !this.production && commandEncoder.popDebugGroup();
    const commandBuffer = commandEncoder.finish();
    this.device?.queue.submit([commandBuffer]);
    this.pipelineManager.resetCurrentPipeline();
  }
  /**
   * Force to clear a {@link GPURenderer} content to its {@link RenderPass#options.clearValue | clear value} by rendering and empty pass.
   * @param commandEncoder
   */
  forceClear(commandEncoder) {
    const hasCommandEncoder = !!commandEncoder;
    if (!hasCommandEncoder) {
      commandEncoder = this.device?.createCommandEncoder({
        label: `${this.type} (${this.options.label}): Force clear command encoder`
      });
      !this.production && commandEncoder.pushDebugGroup(`${this.type} (${this.options.label}): Force clear command encoder`);
    }
    this.renderPass.updateView();
    const pass = commandEncoder.beginRenderPass(this.renderPass.descriptor);
    pass.end();
    if (!hasCommandEncoder) {
      !this.production && commandEncoder.popDebugGroup();
      const commandBuffer = commandEncoder.finish();
      this.device?.queue.submit([commandBuffer]);
    }
  }
  /**
   * Called by the {@link GPUDeviceManager#render | GPUDeviceManager render method} before the {@link GPUCommandEncoder} has been created
   */
  onBeforeCommandEncoder() {
    if (!this.ready)
      return;
    this.onBeforeCommandEncoderCreation.execute();
  }
  /**
   * Called by the {@link GPUDeviceManager#render | GPUDeviceManager render method} after the {@link GPUCommandEncoder} has been created.
   */
  onAfterCommandEncoder() {
    if (!this.ready)
      return;
    this.onAfterCommandEncoderSubmission.execute();
  }
  /**
   * Called at each draw call to render our scene and its content
   * @param commandEncoder - current {@link GPUCommandEncoder}
   */
  render(commandEncoder) {
    if (!this.ready)
      return;
    this._onBeforeRenderCallback && this._onBeforeRenderCallback(commandEncoder);
    this.onBeforeRenderScene.execute(commandEncoder);
    this.scene?.render(commandEncoder);
    this._onAfterRenderCallback && this._onAfterRenderCallback(commandEncoder);
    this.onAfterRenderScene.execute(commandEncoder);
  }
  /**
   * Destroy our {@link GPURenderer} and everything that needs to be destroyed as well
   */
  destroy() {
    this.domElement?.destroy();
    this.renderPass?.destroy();
    this.postProcessingPass?.destroy();
    this.renderTargets.forEach((renderTarget) => renderTarget.destroy());
    this.renderedObjects.forEach((sceneObject) => sceneObject.remove());
    this.renderTextures.forEach((texture) => texture.destroy());
    this.context?.unconfigure();
  }
}

export { GPURenderer };
