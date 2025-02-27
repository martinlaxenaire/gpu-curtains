import { DOMElement } from '../DOM/DOMElement.mjs';
import { Scene } from '../scenes/Scene.mjs';
import { RenderPass } from '../renderPasses/RenderPass.mjs';
import { generateUUID, throwError, throwWarning } from '../../utils/utils.mjs';
import { TasksQueueManager } from '../../utils/TasksQueueManager.mjs';
import { Buffer } from '../buffers/Buffer.mjs';
import { MediaTexture } from '../textures/MediaTexture.mjs';

class GPURenderer {
  /**
   * GPURenderer constructor
   * @param parameters - {@link GPURendererParams | parameters} used to create this {@link GPURenderer}.
   */
  constructor({
    deviceManager,
    label,
    container,
    pixelRatio = 1,
    autoResize = true,
    context = {},
    renderPass
  }) {
    // callbacks / events
    /** function assigned to the {@link onBeforeRender} callback. */
    this._onBeforeRenderCallback = (commandEncoder) => {
    };
    /** function assigned to the {@link onAfterRender} callback. */
    this._onAfterRenderCallback = (commandEncoder) => {
    };
    /** function assigned to the {@link onResize} callback. */
    this._onResizeCallback = () => {
    };
    /** function assigned to the {@link onAfterResize} callback. */
    this._onAfterResizeCallback = () => {
    };
    this.type = "GPURenderer";
    this.uuid = generateUUID();
    if (!deviceManager || deviceManager.constructor.name !== "GPUDeviceManager") {
      throwError(
        label ? `${label} (${this.type}): no device manager or wrong device manager provided: ${deviceManager}` : `${this.type}: no device manager or wrong device manager provided: ${deviceManager}`
      );
    }
    if (!label) {
      label = `${this.constructor.name}${deviceManager.renderers.length}`;
    }
    this.deviceManager = deviceManager;
    this.deviceManager.addRenderer(this);
    this.shouldRender = true;
    this.shouldRenderScene = true;
    const contextOptions = {
      ...{
        alphaMode: "premultiplied",
        format: this.deviceManager.gpu?.getPreferredCanvasFormat() || "bgra8unorm"
      },
      ...context
    };
    renderPass = { ...{ useDepth: true, sampleCount: 4 }, ...renderPass };
    this.options = {
      deviceManager,
      label,
      container,
      pixelRatio,
      autoResize,
      context: contextOptions,
      renderPass
    };
    this.pixelRatio = pixelRatio ?? window.devicePixelRatio ?? 1;
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
    this.viewport = null;
    this.scissorRect = null;
    this.setScene();
    this.setTasksQueues();
    this.setRendererObjects();
    this.setMainRenderPasses();
    if (!isOffscreenCanvas) {
      this.domElement = new DOMElement({
        element: container,
        priority: 5,
        // renderer callback need to be called first
        onSizeChanged: () => {
          if (this.options.autoResize) this.resize();
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
   * Set the renderer {@link RectBBox} and canvas sizes.
   * @param rectBBox - The optional new {@link canvas} {@link RectBBox} to set.
   */
  setSize(rectBBox = null) {
    rectBBox = {
      ...{
        width: Math.max(1, this.boundingRect.width),
        height: Math.max(1, this.boundingRect.height),
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
   * Set the renderer, {@link renderPass} and {@link postProcessingPass} {@link viewport} values. Beware that if you use a {@link viewport}, you should resize it yourself so it does not overflow the `canvas` in the `onResize` callback to avoid issues.
   * @param viewport - {@link RenderPassViewport} settings to use. Can be set to `null` to cancel the {@link viewport}.
   */
  setViewport(viewport = null) {
    if (!viewport) {
      this.viewport = null;
      this.renderPass?.setViewport(null);
      this.postProcessingPass?.setViewport(null);
    } else {
      viewport = {
        ...{
          width: this.canvas.width,
          height: this.canvas.height,
          top: 0,
          left: 0,
          minDepth: 0,
          maxDepth: 1
        },
        ...viewport
      };
      let { width, height, top, left, minDepth, maxDepth } = viewport;
      width = Math.min(width, this.canvas.width);
      height = Math.min(height, this.canvas.height);
      top = Math.max(0, top);
      left = Math.max(0, left);
      this.viewport = {
        width,
        height,
        top,
        left,
        minDepth,
        maxDepth
      };
      this.renderPass?.setViewport(this.viewport);
      this.postProcessingPass?.setViewport(this.viewport);
    }
  }
  /**
   * Set the renderer, {@link renderPass} and {@link postProcessingPass} {@link GPURenderer#scissorRect | scissorRect} values. Beware that if you use a {@link GPURenderer#scissorRect | scissorRect}, you should resize it yourself so it does not overflow the `canvas` in the `onResize` callback to avoid issues.
   * @param scissorRect - {@link RectBBox} settings to use. Can be set to `null` to cancel the {@link GPURenderer#scissorRect | scissorRect}.
   */
  setScissorRect(scissorRect = null) {
    if (!scissorRect) {
      this.scissorRect = null;
      this.renderPass?.setScissorRect(null);
      this.postProcessingPass?.setScissorRect(null);
    } else {
      scissorRect = {
        ...{
          width: this.canvas.width,
          height: this.canvas.height,
          top: 0,
          left: 0
        },
        ...scissorRect
      };
      let { width, height, top, left } = scissorRect;
      width = Math.min(width, this.canvas.width);
      height = Math.min(height, this.canvas.height);
      top = Math.max(0, top);
      left = Math.max(0, left);
      this.scissorRect = {
        width,
        height,
        top,
        left
      };
      this.renderPass?.setScissorRect(this.scissorRect);
      this.postProcessingPass?.setScissorRect(this.scissorRect);
    }
  }
  /**
   * Set the renderer {@link GPURenderer.pixelRatio | pixel ratio} and {@link resize} it.
   * @param pixelRatio - New pixel ratio to use.
   */
  setPixelRatio(pixelRatio = 1) {
    this.pixelRatio = pixelRatio;
    this.resize(this.rectBBox);
  }
  /**
   * Resize our {@link GPURenderer}.
   * @param rectBBox - The optional new {@link canvas} {@link RectBBox} to set.
   */
  resize(rectBBox = null) {
    this.setSize(rectBBox);
    this._onResizeCallback && this._onResizeCallback();
    this.resizeObjects();
    this._onAfterResizeCallback && this._onAfterResizeCallback();
  }
  /**
   * Resize all tracked objects ({@link Texture | textures}, {@link RenderPass | render passes}, {@link RenderTarget | render targets}, {@link ComputePass | compute passes} and meshes).
   */
  resizeObjects() {
    this.renderBundles.forEach((renderBundle) => renderBundle.resize());
    this.textures.forEach((texture) => {
      texture.resize();
    });
    this.renderPass?.resize();
    this.postProcessingPass?.resize();
    this.renderTargets.forEach((renderTarget) => renderTarget.resize());
    this.computePasses.forEach((computePass) => computePass.resize());
    this.pingPongPlanes.forEach((pingPongPlane) => pingPongPlane.resize(this.boundingRect));
    this.shaderPasses.forEach((shaderPass) => shaderPass.resize(this.boundingRect));
    this.resizeMeshes();
  }
  /**
   * Resize the {@link meshes}.
   */
  resizeMeshes() {
    this.meshes.forEach((mesh) => {
      mesh.resize(this.boundingRect);
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
   * Clamp to max WebGPU texture dimensions.
   * @param dimension - Width and height dimensions to clamp.
   */
  clampToMaxDimension(dimension) {
    if (this.device) {
      dimension.width = Math.min(this.device.limits.maxTextureDimension2D, dimension.width);
      dimension.height = Math.min(this.device.limits.maxTextureDimension2D, dimension.height);
    }
  }
  /* USEFUL DEVICE MANAGER OBJECTS */
  /**
   * Get our {@link GPUDeviceManager#device | device}.
   * @readonly
   */
  get device() {
    return this.deviceManager.device;
  }
  /**
   * Get whether our {@link GPUDeviceManager} is ready (i.e. its {@link GPUDeviceManager#adapter | adapter} and {@link GPUDeviceManager#device | device} are set) its {@link context} is set and its size is set.
   * @readonly
   */
  get ready() {
    return this.deviceManager.ready && !!this.context && !!this.canvas.width && !!this.canvas.height;
  }
  /**
   * Get our {@link core/renderers/GPUDeviceManager.GPUDeviceManagerBaseParams#production | GPUDeviceManager production flag}.
   * @readonly
   */
  get production() {
    return this.deviceManager.options.production;
  }
  /**
   * Get all the created {@link GPUDeviceManager#samplers | samplers}.
   * @readonly
   */
  get samplers() {
    return this.deviceManager.samplers;
  }
  /**
   * Get all the created {@link GPUDeviceManager#buffers | GPU buffers}.
   * @readonly
   */
  get buffers() {
    return this.deviceManager.buffers;
  }
  /**
   * Get all the created {@link GPUDeviceManager#indirectBuffers | indirect buffers}.
   * @readonly
   */
  get indirectBuffers() {
    return this.deviceManager.indirectBuffers;
  }
  /**
   * Get the {@link GPUDeviceManager#pipelineManager | pipeline manager}.
   * @readonly
   */
  get pipelineManager() {
    return this.deviceManager.pipelineManager;
  }
  /**
   * Get all the rendered objects (i.e. compute passes, meshes, ping pong planes and shader passes) created by the {@link GPUDeviceManager}.
   * @readonly
   */
  get deviceRenderedObjects() {
    return this.deviceManager.deviceRenderedObjects;
  }
  /**
   * Configure our {@link context} with the given options.
   */
  configureContext() {
    this.context.configure({
      device: this.device,
      ...this.options.context,
      // needed so we can copy textures for post processing usage
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST
      //viewFormats: []
    });
  }
  /**
   * Set our {@link context} if possible and initialize the {@link renderPass} and {@link postProcessingPass}.
   */
  setContext() {
    this.context = this.canvas.getContext("webgpu");
    if (this.device) {
      this.configureContext();
      this.textures.forEach((texture) => {
        if (!texture.texture) {
          texture.createTexture();
        }
      });
      this.renderPasses.forEach((renderPass) => renderPass.init());
    }
  }
  /**
   * Called when the {@link GPUDeviceManager#device | device} is lost.
   * Force all our scene objects to lose context.
   */
  loseContext() {
    this.renderBundles.forEach((bundle) => bundle.loseContext());
    this.renderedObjects.forEach((sceneObject) => sceneObject.loseContext());
  }
  /**
   * Called when the {@link GPUDeviceManager#device | device} should be restored.
   * Configure the context again, resize the {@link RenderTarget | render targets} and {@link Texture | textures}, restore our {@link renderedObjects | rendered objects} context.
   */
  restoreContext() {
    this.configureContext();
    this.textures.forEach((texture) => {
      texture.createTexture();
    });
    this.renderPass?.resize();
    this.postProcessingPass?.resize();
    this.renderTargets.forEach((renderTarget) => renderTarget.resize());
    this.renderedObjects.forEach((sceneObject) => sceneObject.restoreContext());
    this.environmentMaps.forEach((environmentMap) => {
      environmentMap.computeBRDFLUTTexture();
      environmentMap.computeFromHDR();
    });
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
    this.scene.setMainRenderPassEntry();
    this.postProcessingPass = new RenderPass(this, {
      label: this.options.label + " post processing render pass",
      // no need to handle depth or perform MSAA on a fullscreen quad
      useDepth: false,
      sampleCount: 1
    });
  }
  /**
   * Set our {@link scene}.
   */
  setScene() {
    this.scene = new Scene({ renderer: this });
  }
  /* BUFFERS & BINDINGS */
  /**
   * Create a {@link !GPUBuffer}.
   * @param buffer - {@link Buffer} to use for buffer creation.
   * @returns - newly created {@link !GPUBuffer}.
   */
  createBuffer(buffer) {
    const GPUBuffer = this.deviceManager.device?.createBuffer(buffer.options);
    this.deviceManager.addBuffer(buffer);
    return GPUBuffer;
  }
  /**
   * Remove a {@link Buffer} from our {@link GPUDeviceManager#buffers | buffers Map}.
   * @param buffer - {@link Buffer} to remove.
   */
  removeBuffer(buffer) {
    this.deviceManager.removeBuffer(buffer);
  }
  /**
   * Write to a {@link GPUBuffer}.
   * @param buffer - {@link GPUBuffer} to write to.
   * @param bufferOffset - {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUQueue/writeBuffer#bufferoffset | Buffer offset}.
   * @param data - {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUQueue/writeBuffer#data | Data} to write.
   */
  queueWriteBuffer(buffer, bufferOffset, data) {
    this.deviceManager.device?.queue.writeBuffer(buffer, bufferOffset, data);
  }
  /**
   * Copy a source {@link Buffer#GPUBuffer | Buffer GPUBuffer} into a destination {@link Buffer#GPUBuffer | Buffer GPUBuffer}.
   * @param parameters - Parameters used to realize the copy.
   * @param parameters.srcBuffer - Source {@link Buffer}.
   * @param [parameters.dstBuffer] - Destination {@link Buffer}. Will create a new one if none provided.
   * @param [parameters.commandEncoder] - {@link GPUCommandEncoder} to use for the copy. Will create a new one and submit the command buffer if none provided.
   * @returns - Destination {@link Buffer} after copy.
   */
  copyBufferToBuffer({
    srcBuffer,
    dstBuffer,
    commandEncoder
  }) {
    if (!srcBuffer || !srcBuffer.GPUBuffer) {
      throwWarning(
        `${this.options.label} (${this.type}): cannot copy to buffer because the source buffer has not been provided`
      );
      return null;
    }
    if (!dstBuffer) {
      dstBuffer = new Buffer();
    }
    if (!dstBuffer.GPUBuffer) {
      dstBuffer.createBuffer(this, {
        label: `GPURenderer (${this.options.label}): destination copy buffer from: ${srcBuffer.options.label}`,
        size: srcBuffer.GPUBuffer.size,
        //usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
        usage: ["copyDst", "mapRead"]
      });
    }
    if (srcBuffer.GPUBuffer.mapState !== "unmapped") {
      throwWarning(
        `${this.options.label} (${this.type}): Cannot copy from ${srcBuffer.GPUBuffer} because it is currently mapped`
      );
      return;
    }
    if (dstBuffer.GPUBuffer.mapState !== "unmapped") {
      throwWarning(
        `${this.options.label} (${this.type}): Cannot copy from ${dstBuffer.GPUBuffer} because it is currently mapped`
      );
      return;
    }
    const hasCommandEncoder = !!commandEncoder;
    if (!hasCommandEncoder) {
      commandEncoder = this.deviceManager.device?.createCommandEncoder({
        label: `${this.type} (${this.options.label}): Copy buffer command encoder`
      });
      !this.production && commandEncoder.pushDebugGroup(`${this.type} (${this.options.label}): Copy buffer command encoder`);
    }
    commandEncoder.copyBufferToBuffer(srcBuffer.GPUBuffer, 0, dstBuffer.GPUBuffer, 0, dstBuffer.GPUBuffer.size);
    if (!hasCommandEncoder) {
      !this.production && commandEncoder.popDebugGroup();
      const commandBuffer = commandEncoder.finish();
      this.deviceManager.device?.queue.submit([commandBuffer]);
    }
    return dstBuffer;
  }
  /* BIND GROUPS & LAYOUTS */
  /**
   * Get all created {@link AllowedBindGroups | bind group} tracked by our {@link GPUDeviceManager}.
   * @readonly
   */
  get bindGroups() {
    return this.deviceManager.bindGroups;
  }
  /**
   * Add a {@link AllowedBindGroups | bind group} to our {@link GPUDeviceManager#bindGroups | bind groups array}.
   * @param bindGroup - {@link AllowedBindGroups | Bind group} to add.
   */
  addBindGroup(bindGroup) {
    this.deviceManager.addBindGroup(bindGroup);
  }
  /**
   * Remove a {@link AllowedBindGroups | bind group} from our {@link GPUDeviceManager#bindGroups | bind groups array}.
   * @param bindGroup - {@link AllowedBindGroups | Bind group} to remove.
   */
  removeBindGroup(bindGroup) {
    this.deviceManager.removeBindGroup(bindGroup);
  }
  /**
   * Create a {@link GPUBindGroupLayout}.
   * @param bindGroupLayoutDescriptor - {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createBindGroupLayout#descriptor | GPUBindGroupLayoutDescriptor}.
   * @returns - Newly created {@link GPUBindGroupLayout}.
   */
  createBindGroupLayout(bindGroupLayoutDescriptor) {
    return this.deviceManager.device?.createBindGroupLayout(bindGroupLayoutDescriptor);
  }
  /**
   * Create a {@link GPUBindGroup}.
   * @param bindGroupDescriptor - {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createBindGroup#descriptor | GPUBindGroupDescriptor}.
   * @returns - Newly created {@link GPUBindGroup}.
   */
  createBindGroup(bindGroupDescriptor) {
    return this.deviceManager.device?.createBindGroup(bindGroupDescriptor);
  }
  /* SHADERS & PIPELINES */
  /**
   * Create a {@link GPUShaderModule}.
   * @param shaderModuleDescriptor - {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createShaderModule#descriptor | GPUShaderModuleDescriptor}
   * @returns - Newly created {@link GPUShaderModule}.
   */
  createShaderModule(shaderModuleDescriptor) {
    return this.device?.createShaderModule(shaderModuleDescriptor);
  }
  /**
   * Create a {@link GPUPipelineLayout}.
   * @param pipelineLayoutDescriptor - {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createPipelineLayout#descriptor | GPUPipelineLayoutDescriptor}.
   * @returns - Newly created {@link GPUPipelineLayout}.
   */
  createPipelineLayout(pipelineLayoutDescriptor) {
    return this.device?.createPipelineLayout(pipelineLayoutDescriptor);
  }
  /**
   * Create a {@link GPURenderPipeline}.
   * @param pipelineDescriptor - {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createRenderPipeline#descriptor | GPURenderPipelineDescriptor}.
   * @returns - Newly created {@link GPURenderPipeline}.
   */
  createRenderPipeline(pipelineDescriptor) {
    return this.device?.createRenderPipeline(pipelineDescriptor);
  }
  /**
   * Asynchronously create a {@link GPURenderPipeline}.
   * @param pipelineDescriptor - {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createRenderPipeline#descriptor | GPURenderPipelineDescriptor}.
   * @returns - Newly created {@link GPURenderPipeline}.
   */
  async createRenderPipelineAsync(pipelineDescriptor) {
    return await this.device?.createRenderPipelineAsync(pipelineDescriptor);
  }
  /**
   * Create a {@link GPUComputePipeline}.
   * @param pipelineDescriptor - {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createComputePipeline#descriptor | GPUComputePipelineDescriptor}.
   * @returns - Newly created {@link GPUComputePipeline}.
   */
  createComputePipeline(pipelineDescriptor) {
    return this.device?.createComputePipeline(pipelineDescriptor);
  }
  /**
   * Asynchronously create a {@link GPUComputePipeline}.
   * @param pipelineDescriptor - {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createComputePipeline#descriptor | GPUComputePipelineDescriptor}.
   * @returns - Newly created {@link GPUComputePipeline}.
   */
  async createComputePipelineAsync(pipelineDescriptor) {
    return await this.device?.createComputePipelineAsync(pipelineDescriptor);
  }
  /* TEXTURES */
  /**
   * Add a {@link Texture} to our {@link textures} array.
   * @param texture - {@link Texture} to add.
   */
  addTexture(texture) {
    this.textures.push(texture);
  }
  /**
   * Remove a {@link Texture} from our {@link textures} array.
   * @param texture - {@link Texture} to remove.
   */
  removeTexture(texture) {
    this.textures = this.textures.filter((t) => t.uuid !== texture.uuid);
  }
  /**
   * Create a {@link GPUTexture}.
   * @param textureDescriptor - {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createTexture#descriptor | GPUTextureDescriptor}.
   * @returns - Newly created {@link GPUTexture}.
   */
  createTexture(textureDescriptor) {
    return this.deviceManager.device?.createTexture(textureDescriptor);
  }
  /**
   * Upload a {@link MediaTexture#texture | texture} or {@link DOMTexture#texture | texture} to the GPU.
   * @param texture - {@link MediaTexture} or {@link DOMTexture} containing the {@link GPUTexture} to upload.
   * @param sourceIndex - Index of the source to upload (for cube maps). Default to `0`.
   */
  uploadTexture(texture, sourceIndex = 0) {
    this.deviceManager.uploadTexture(texture, sourceIndex);
  }
  /**
   * Generate mips on the GPU using our {@link GPUDeviceManager}.
   * @param texture - {@link Texture}, {@link MediaTexture} or {@link DOMTexture} for which to generate the mips.
   * @param commandEncoder - optional {@link GPUCommandEncoder} to use if we're already in the middle of a command encoding process.
   */
  generateMips(texture, commandEncoder = null) {
    this.deviceManager.generateMips(texture, commandEncoder);
  }
  /**
   * Import a {@link GPUExternalTexture}.
   * @param video - {@link HTMLVideoElement} source.
   * @param label - Optional label of the texture.
   * @returns - {@link GPUExternalTexture}.
   */
  importExternalTexture(video, label = "") {
    return this.deviceManager.device?.importExternalTexture({ label, source: video });
  }
  /**
   * Copy a {@link GPUTexture} to a {@link Texture} using a {@link GPUCommandEncoder}. Automatically generate mips after copy if the {@link Texture} needs it.
   * @param gpuTexture - {@link GPUTexture} source to copy from.
   * @param texture - {@link Texture} destination to copy onto.
   * @param commandEncoder - {@link GPUCommandEncoder} to use for copy operation.
   */
  copyGPUTextureToTexture(gpuTexture, texture, commandEncoder) {
    commandEncoder.copyTextureToTexture(
      {
        texture: gpuTexture
      },
      {
        texture: texture.texture
      },
      [gpuTexture.width, gpuTexture.height, gpuTexture.depthOrArrayLayers]
    );
    if (texture.options.generateMips) {
      this.generateMips(texture, commandEncoder);
    }
  }
  /**
   * Copy a {@link Texture} to a {@link GPUTexture} using a {@link GPUCommandEncoder}.
   * @param texture - {@link Texture} source to copy from.
   * @param gpuTexture - {@link GPUTexture} destination to copy onto.
   * @param commandEncoder - {@link GPUCommandEncoder} to use for copy operation.
   */
  copyTextureToGPUTexture(texture, gpuTexture, commandEncoder) {
    commandEncoder.copyTextureToTexture(
      {
        texture: texture.texture
      },
      {
        texture: gpuTexture
      },
      [gpuTexture.width, gpuTexture.height, gpuTexture.depthOrArrayLayers]
    );
  }
  /* SAMPLERS */
  /**
   * Check if a {@link Sampler} has already been created with the same {@link Sampler#options | parameters}.
   * Use it if found, else create a new one and add it to the {@link GPUDeviceManager#samplers | samplers array}.
   * @param sampler - {@link Sampler} to create.
   * @returns - {@link GPUSampler} from cache or newly created {@link GPUSampler}.
   */
  createSampler(sampler) {
    const existingSampler = this.samplers.find((existingSampler2) => {
      return JSON.stringify(existingSampler2.options) === JSON.stringify(sampler.options) && existingSampler2.sampler;
    });
    if (existingSampler) {
      return existingSampler.sampler;
    } else {
      const { type, ...samplerOptions } = sampler.options;
      const gpuSampler = this.deviceManager.device?.createSampler({
        label: sampler.label,
        ...samplerOptions
      });
      this.deviceManager.addSampler(sampler);
      return gpuSampler;
    }
  }
  /**
   * Remove a {@link Sampler} from our {@link GPUDeviceManager#samplers | samplers array}.
   * @param sampler - {@link Sampler} to remove.
   */
  removeSampler(sampler) {
    this.deviceManager.removeSampler(sampler);
  }
  /* OBJECTS & TASKS */
  /**
   * Set different tasks queue managers to execute callbacks at different phases of our render call:
   * - {@link onBeforeCommandEncoderCreation}: callbacks executed before the creation of the command encoder.
   * - {@link onBeforeRenderScene}: callbacks executed after the creation of the command encoder and before rendering the {@link Scene}.
   * - {@link onAfterRenderScene}: callbacks executed after the creation of the command encoder and after rendering the {@link Scene}.
   * - {@link onAfterCommandEncoderSubmission}: callbacks executed after the submission of the command encoder.
   */
  setTasksQueues() {
    this.onBeforeCommandEncoderCreation = new TasksQueueManager();
    this.onBeforeRenderScene = new TasksQueueManager();
    this.onAfterRenderScene = new TasksQueueManager();
    this.onAfterCommandEncoderSubmission = new TasksQueueManager();
  }
  /**
   * Set all objects arrays and {@link Map} that we'll keep track of.
   */
  setRendererObjects() {
    this.computePasses = [];
    this.pingPongPlanes = [];
    this.shaderPasses = [];
    this.renderPasses = /* @__PURE__ */ new Map();
    this.renderTargets = [];
    this.meshes = [];
    this.textures = [];
    this.environmentMaps = /* @__PURE__ */ new Map();
    this.renderBundles = /* @__PURE__ */ new Map();
    this.animations = /* @__PURE__ */ new Map();
  }
  /**
   * Get all this {@link GPURenderer} rendered objects (i.e. compute passes, meshes, ping pong planes and shader passes).
   * @readonly
   */
  get renderedObjects() {
    return [...this.computePasses, ...this.meshes, ...this.shaderPasses, ...this.pingPongPlanes];
  }
  /**
   * Get all objects ({@link RenderedMesh | rendered meshes} or {@link ComputePass | compute passes}) using a given {@link AllowedBindGroups | bind group}.
   * Useful (but slow) to know if a resource is used by multiple objects and if it is safe to destroy it or not.
   * @param bindGroup - {@link AllowedBindGroups | Bind group} to check.
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
   * Get all objects ({@link RenderedMesh | rendered meshes} or {@link ComputePass | compute passes}) using a given {@link DOMTexture}, {@link MediaTexture} or {@link Texture}.
   * Useful to know if a resource is used by multiple objects and if it is safe to destroy it or not.
   * @param texture - {@link DOMTexture}, {@link MediaTexture} or {@link Texture} to check.
   */
  getObjectsByTexture(texture) {
    return this.deviceRenderedObjects.filter((object) => {
      return object.material.textures.some((t) => t.uuid === texture.uuid);
    });
  }
  /* EVENTS */
  /**
   * Assign a callback function to _onBeforeRenderCallback.
   * @param callback - callback to run just before the {@link render} method will be executed.
   * @returns - Our renderer.
   */
  onBeforeRender(callback) {
    if (callback) {
      this._onBeforeRenderCallback = callback;
    }
    return this;
  }
  /**
   * Assign a callback function to _onAfterRenderCallback.
   * @param callback - callback to run just after the {@link render} method has been executed.
   * @returns - Our renderer.
   */
  onAfterRender(callback) {
    if (callback) {
      this._onAfterRenderCallback = callback;
    }
    return this;
  }
  /**
   * Callback to run after the {@link GPURenderer} has been resized but before the {@link resizeObjects} method has been executed (before the {@link Texture | textures}, {@link RenderPass | render passes}, {@link RenderTarget | render targets}, {@link ComputePass | compute passes} and meshes are resized).
   * @param callback - callback to execute.
   * @returns - Our renderer.
   */
  onResize(callback) {
    if (callback) {
      this._onResizeCallback = callback;
    }
    return this;
  }
  /**
   * Callback to run after the {@link GPURenderer} has been resized and after the {@link resizeObjects} method has been executed (after the {@link Texture | textures}, {@link RenderPass | render passes}, {@link RenderTarget | render targets}, {@link ComputePass | compute passes} and meshes have been resized).
   * @param callback - callback to execute.
   * @returns - Our renderer.
   */
  onAfterResize(callback) {
    if (callback) {
      this._onAfterResizeCallback = callback;
    }
    return this;
  }
  /* RENDER */
  /**
   * Render a single {@link ComputePass}.
   * @param commandEncoder - current {@link GPUCommandEncoder} to use.
   * @param computePass - {@link ComputePass} to run.
   * @param copyBuffer - Whether to copy all writable binding buffers that need it.
   */
  renderSingleComputePass(commandEncoder, computePass, copyBuffer = true) {
    const pass = commandEncoder.beginComputePass();
    computePass.render(pass);
    pass.end();
    if (copyBuffer) {
      computePass.copyBufferToResult(commandEncoder);
    }
  }
  /**
   * Render a single {@link RenderedMesh | Mesh}.
   * @param commandEncoder - current {@link GPUCommandEncoder}.
   * @param mesh - {@link RenderedMesh | Mesh} to render.
   */
  renderSingleMesh(commandEncoder, mesh) {
    const pass = commandEncoder.beginRenderPass(this.renderPass.descriptor);
    mesh.render(pass);
    pass.end();
  }
  /**
   * Render an array of objects (either {@link RenderedMesh | Meshes} or {@link ComputePass}) once. This method won't call any of the renderer render hooks like {@link onBeforeRender}, {@link onAfterRender}.
   * @param objects - Array of {@link RenderedMesh | Meshes} or {@link ComputePass} to render.
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
   * @param commandEncoder - {@link GPUCommandEncoder} to use if any.
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
    this.renderPass.setLoadOp("clear");
    this.renderPass.setDepthLoadOp("clear");
    const pass = commandEncoder.beginRenderPass(this.renderPass.descriptor);
    pass.end();
    if (!hasCommandEncoder) {
      !this.production && commandEncoder.popDebugGroup();
      const commandBuffer = commandEncoder.finish();
      this.device?.queue.submit([commandBuffer]);
    }
  }
  /**
   * Called by the {@link GPUDeviceManager#render | GPUDeviceManager render method} before the {@link GPUCommandEncoder} has been created. Used to update the {@link Scene} matrix stack.
   */
  onBeforeCommandEncoder() {
    if (!this.ready) return;
    if (this.shouldRenderScene) this.scene?.onBeforeRender();
    this.onBeforeCommandEncoderCreation.execute();
  }
  /**
   * Called by the {@link GPUDeviceManager#render | GPUDeviceManager render method} after the {@link GPUCommandEncoder} has been created.
   */
  onAfterCommandEncoder() {
    if (!this.ready) return;
    this.onAfterCommandEncoderSubmission.execute();
  }
  /**
   * Called at each draw call to render our scene and its content.
   * @param commandEncoder - current {@link GPUCommandEncoder}.
   */
  render(commandEncoder) {
    if (!this.ready || !this.shouldRender) return;
    this._onBeforeRenderCallback && this._onBeforeRenderCallback(commandEncoder);
    this.onBeforeRenderScene.execute(commandEncoder);
    if (this.shouldRenderScene) {
      this.textures.forEach((texture) => {
        if (texture instanceof MediaTexture) {
          texture.update();
        }
      });
      this.scene?.render(commandEncoder);
    }
    this._onAfterRenderCallback && this._onAfterRenderCallback(commandEncoder);
    this.onAfterRenderScene.execute(commandEncoder);
  }
  /**
   * Destroy our {@link GPURenderer} and everything that needs to be destroyed as well.
   */
  destroy() {
    this.deviceManager.renderers = this.deviceManager.renderers.filter((renderer) => renderer.uuid !== this.uuid);
    this.domElement?.destroy();
    this.renderBundles.forEach((bundle) => bundle.destroy());
    this.animations = /* @__PURE__ */ new Map();
    this.renderPass?.destroy();
    this.postProcessingPass?.destroy();
    this.renderTargets.forEach((renderTarget) => renderTarget.destroy());
    this.renderedObjects.forEach((sceneObject) => sceneObject.remove());
    this.textures.forEach((texture) => texture.destroy());
    this.context?.unconfigure();
  }
}

export { GPURenderer };
