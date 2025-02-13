import { throwError, throwWarning } from '../../utils/utils.mjs';
import { PipelineManager } from '../pipelines/PipelineManager.mjs';

var __typeError = (msg) => {
  throw TypeError(msg);
};
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), member.set(obj, value), value);
var _mipsGeneration;
class GPUDeviceManager {
  /**
   * GPUDeviceManager constructor
   * @param parameters - {@link GPUDeviceManagerParams | parameters} used to create this {@link GPUDeviceManager}.
   */
  constructor({
    label,
    production = false,
    adapterOptions = {},
    autoRender = true,
    onError = () => {
    },
    onDeviceLost = (info) => {
    },
    onDeviceDestroyed = (info) => {
    }
  } = {}) {
    /** function assigned to the {@link onBeforeRender} callback. */
    this._onBeforeRenderCallback = () => {
    };
    /** function assigned to the {@link onAfterRender} callback. */
    this._onAfterRenderCallback = () => {
    };
    /** @ignore */
    // mips generation cache handling
    __privateAdd(this, _mipsGeneration);
    this.index = 0;
    this.label = label ?? "GPUDeviceManager instance";
    this.production = production;
    this.ready = false;
    this.adapterOptions = adapterOptions;
    this.onError = onError;
    this.onDeviceLost = onDeviceLost;
    this.onDeviceDestroyed = onDeviceDestroyed;
    this.gpu = navigator.gpu;
    this.setPipelineManager();
    this.setDeviceObjects();
    __privateSet(this, _mipsGeneration, {
      sampler: null,
      module: null,
      pipelineByFormat: {}
    });
    if (autoRender) {
      this.animate();
    }
  }
  /**
   * Set our {@link adapter} and {@link device} if possible.
   * @param parameters - {@link GPUAdapter} and/or {@link GPUDevice} to use if set.
   */
  async setAdapterAndDevice({ adapter = null, device = null } = {}) {
    await this.setAdapter(adapter);
    await this.setDevice(device);
  }
  /**
   * Set up our {@link adapter} and {@link device} and all the already created {@link renderers} contexts.
   * @param parameters - {@link GPUAdapter} and/or {@link GPUDevice} to use if set.
   */
  async init({ adapter = null, device = null } = {}) {
    await this.setAdapterAndDevice({ adapter, device });
    if (this.device) {
      for (const renderer of this.renderers) {
        if (!renderer.context) {
          renderer.setContext();
        }
      }
    }
  }
  /**
   * Set our {@link GPUDeviceManager.adapter | adapter} if possible.
   * The adapter represents a specific GPU. Some devices have multiple GPUs.
   * @param adapter - {@link GPUAdapter} to use if set.
   */
  async setAdapter(adapter = null) {
    if (!this.gpu) {
      this.onError();
      throwError("GPUDeviceManager: WebGPU is not supported on your browser/OS. No 'gpu' object in 'navigator'.");
    }
    if (adapter) {
      this.adapter = adapter;
    } else {
      try {
        this.adapter = await this.gpu?.requestAdapter(this.adapterOptions);
        if (!this.adapter) {
          this.onError();
          throwError("GPUDeviceManager: WebGPU is not supported on your browser/OS. 'requestAdapter' failed.");
        }
      } catch (e) {
        this.onError();
        throwError("GPUDeviceManager: " + e.message);
      }
    }
  }
  /**
   * Set our {@link GPUDeviceManager.device | device}.
   * @param device - {@link GPUDevice} to use if set.
   */
  async setDevice(device = null) {
    if (device) {
      this.device = device;
      this.ready = true;
      this.index++;
    } else {
      try {
        const requiredFeatures = [];
        if (this.adapter.features.has("float32-filterable")) {
          requiredFeatures.push("float32-filterable");
        }
        this.device = await this.adapter?.requestDevice({
          label: this.label + " " + this.index,
          requiredFeatures
        });
        if (this.device) {
          this.ready = true;
          this.index++;
        }
      } catch (error) {
        this.onError();
        throwError(`${this.label}: WebGPU is not supported on your browser/OS. 'requestDevice' failed: ${error}`);
      }
    }
    this.device?.lost.then((info) => {
      throwWarning(`${this.label}: WebGPU device was lost: ${info.message}`);
      this.loseDevice();
      if (info.reason !== "destroyed") {
        this.onDeviceLost(info);
      } else {
        this.onDeviceDestroyed(info);
      }
    });
  }
  /**
   * Set our {@link pipelineManager | pipeline manager}.
   */
  setPipelineManager() {
    this.pipelineManager = new PipelineManager();
  }
  /**
   * Called when the {@link device} is lost.
   * Reset all our renderers.
   */
  loseDevice() {
    this.ready = false;
    this.pipelineManager.resetCurrentPipeline();
    this.samplers.forEach((sampler) => sampler.sampler = null);
    this.renderers.forEach((renderer) => renderer.loseContext());
    this.bindGroupLayouts.clear();
    this.buffers.clear();
  }
  /**
   * Called when the {@link device} should be restored.
   * Restore all our renderers.
   * @param parameters - {@link GPUAdapter} and/or {@link GPUDevice} to use if set.
   */
  async restoreDevice({ adapter = null, device = null } = {}) {
    await this.setAdapterAndDevice({ adapter, device });
    if (this.device) {
      this.samplers.forEach((sampler) => {
        const { type, ...samplerOptions } = sampler.options;
        sampler.sampler = this.device.createSampler({
          label: sampler.label,
          ...samplerOptions
        });
      });
      this.indirectBuffers.forEach((indirectBuffer) => indirectBuffer.create());
      this.renderers.forEach((renderer) => renderer.restoreContext());
    }
  }
  /**
   * Set all objects arrays that we'll keep track of.
   */
  setDeviceObjects() {
    this.renderers = [];
    this.bindGroups = /* @__PURE__ */ new Map();
    this.buffers = /* @__PURE__ */ new Map();
    this.indirectBuffers = /* @__PURE__ */ new Map();
    this.bindGroupLayouts = /* @__PURE__ */ new Map();
    this.bufferBindings = /* @__PURE__ */ new Map();
    this.samplers = [];
    this.texturesQueue = [];
  }
  /**
   * Add a {@link Renderer} to our {@link renderers} array.
   * @param renderer - {@link Renderer} to add.
   */
  addRenderer(renderer) {
    this.renderers.push(renderer);
  }
  /**
   * Remove a {@link Renderer} from our {@link renderers} array.
   * @param renderer - {@link Renderer} to remove.
   */
  removeRenderer(renderer) {
    this.renderers = this.renderers.filter((r) => r.uuid !== renderer.uuid);
  }
  /**
   * Get all the rendered objects (i.e. compute passes, meshes, ping pong planes and shader passes) created by this {@link GPUDeviceManager}.
   * @readonly
   */
  get deviceRenderedObjects() {
    return this.renderers.map((renderer) => renderer.renderedObjects).flat();
  }
  /**
   * Add a {@link AllowedBindGroups | bind group} to our {@link bindGroups | bind groups array}.
   * @param bindGroup - {@link AllowedBindGroups | bind group} to add.
   */
  addBindGroup(bindGroup) {
    this.bindGroups.set(bindGroup.uuid, bindGroup);
  }
  /**
   * Remove a {@link AllowedBindGroups | bind group} from our {@link bindGroups | bind groups array}.
   * @param bindGroup - {@link AllowedBindGroups | bind group} to remove.
   */
  removeBindGroup(bindGroup) {
    this.bindGroups.delete(bindGroup.uuid);
  }
  /**
   * Add a {@link GPUBuffer} to our our {@link buffers} array.
   * @param buffer - {@link Buffer} to add.
   */
  addBuffer(buffer) {
    this.buffers.set(buffer.uuid, buffer);
  }
  /**
   * Remove a {@link Buffer} from our {@link buffers} Map.
   * @param buffer - {@link Buffer} to remove.
   */
  removeBuffer(buffer) {
    this.buffers.delete(buffer?.uuid);
  }
  /**
   * Add a {@link Sampler} to our {@link samplers} array.
   * @param sampler - {@link Sampler} to add.
   */
  addSampler(sampler) {
    this.samplers.push(sampler);
  }
  /**
   * Remove a {@link Sampler} from our {@link samplers} array.
   * @param sampler - {@link Sampler} to remove.
   */
  removeSampler(sampler) {
    this.samplers = this.samplers.filter((s) => s.uuid !== sampler.uuid);
  }
  /**
   * Copy an external image to the GPU.
   * @param source - {@link https://gpuweb.github.io/types/interfaces/GPUCopyExternalImageSourceInfo.html | GPUCopyExternalImageSourceInfo (WebGPU API reference)} to use.
   * @param destination - {@link https://gpuweb.github.io/types/interfaces/GPUCopyExternalImageDestInfo.html | GPUCopyExternalImageDestInfo (WebGPU API reference)} to use.
   * @param copySize - {@link https://gpuweb.github.io/types/types/GPUExtent3DStrict.html | GPUExtent3DStrict (WebGPU API reference)} to use.
   */
  copyExternalImageToTexture(source, destination, copySize) {
    this.device?.queue.copyExternalImageToTexture(source, destination, copySize);
  }
  /**
   * Upload a {@link MediaTexture#texture | texture} to the GPU.
   * @param texture - {@link MediaTexture} containing the {@link GPUTexture} to upload.
   * @param sourceIndex - Index of the source to upload (for cube maps). Default to `0`.
   */
  uploadTexture(texture, sourceIndex = 0) {
    if ("sources" in texture && texture.sources.length) {
      try {
        this.device?.queue.copyExternalImageToTexture(
          {
            source: texture.sources[sourceIndex].source,
            flipY: texture.options.flipY
          },
          {
            texture: texture.texture,
            premultipliedAlpha: texture.options.premultipliedAlpha,
            aspect: texture.options.aspect,
            colorSpace: texture.options.colorSpace,
            origin: [0, 0, sourceIndex]
          },
          { width: texture.size.width, height: texture.size.height, depthOrArrayLayers: 1 }
        );
        if (texture.texture.mipLevelCount > 1) {
          this.generateMips(texture);
        }
        this.texturesQueue.push({
          sourceIndex,
          texture
        });
      } catch ({ message }) {
        throwError(`GPUDeviceManager: could not upload texture: ${texture.options.name} because: ${message}`);
      }
    } else {
      for (let i = 0; i < texture.size.depth; i++) {
        this.device?.queue.writeTexture(
          { texture: texture.texture, origin: [0, 0, i] },
          new Uint8Array(texture.options.placeholderColor),
          { bytesPerRow: texture.size.width * 4 },
          { width: 1, height: 1, depthOrArrayLayers: 1 }
        );
      }
    }
  }
  /**
   * Mips generation helper on the GPU using our {@link device}. Caches sampler, module and pipeline (by {@link GPUTexture} formats) for faster generation.
   * Ported from https://webgpufundamentals.org/webgpu/lessons/webgpu-importing-textures.html
   * @param texture - {@link Texture} for which to generate the mips.
   * @param commandEncoder - optional {@link GPUCommandEncoder} to use if we're already in the middle of a command encoding process.
   */
  generateMips(texture, commandEncoder = null) {
    if (!this.device) return;
    if (!__privateGet(this, _mipsGeneration).module) {
      __privateGet(this, _mipsGeneration).module = this.device.createShaderModule({
        label: "textured quad shaders for mip level generation",
        code: `
            struct VSOutput {
              @builtin(position) position: vec4f,
              @location(0) texcoord: vec2f,
            };

            @vertex fn vs(
              @builtin(vertex_index) vertexIndex : u32
            ) -> VSOutput {
              let pos = array(

                vec2f( 0.0,  0.0),  // center
                vec2f( 1.0,  0.0),  // right, center
                vec2f( 0.0,  1.0),  // center, top

                // 2st triangle
                vec2f( 0.0,  1.0),  // center, top
                vec2f( 1.0,  0.0),  // right, center
                vec2f( 1.0,  1.0),  // right, top
              );

              var vsOutput: VSOutput;
              let xy = pos[vertexIndex];
              vsOutput.position = vec4f(xy * 2.0 - 1.0, 0.0, 1.0);
              vsOutput.texcoord = vec2f(xy.x, 1.0 - xy.y);
              return vsOutput;
            }

            @group(0) @binding(0) var ourSampler: sampler;
            @group(0) @binding(1) var ourTexture: texture_2d<f32>;

            @fragment fn fs(fsInput: VSOutput) -> @location(0) vec4f {
              return textureSample(ourTexture, ourSampler, fsInput.texcoord);
            }
          `
      });
      __privateGet(this, _mipsGeneration).sampler = this.device.createSampler({
        minFilter: "linear",
        magFilter: "linear"
      });
    }
    if (!__privateGet(this, _mipsGeneration).pipelineByFormat[texture.texture.format]) {
      __privateGet(this, _mipsGeneration).pipelineByFormat[texture.texture.format] = this.device.createRenderPipeline({
        label: "Mip level generator pipeline",
        layout: "auto",
        vertex: {
          module: __privateGet(this, _mipsGeneration).module
        },
        fragment: {
          module: __privateGet(this, _mipsGeneration).module,
          targets: [{ format: texture.texture.format }]
        }
      });
    }
    const pipeline = __privateGet(this, _mipsGeneration).pipelineByFormat[texture.texture.format];
    const encoder = commandEncoder || this.device.createCommandEncoder({
      label: "Mip gen encoder"
    });
    let width = texture.texture.width;
    let height = texture.texture.height;
    let baseMipLevel = 0;
    while (width > 1 || height > 1) {
      width = Math.max(1, width / 2 | 0);
      height = Math.max(1, height / 2 | 0);
      for (let layer = 0; layer < texture.texture.depthOrArrayLayers; ++layer) {
        const bindGroup = this.device.createBindGroup({
          layout: pipeline.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: __privateGet(this, _mipsGeneration).sampler },
            {
              binding: 1,
              resource: texture.texture.createView({
                dimension: "2d",
                baseMipLevel,
                mipLevelCount: 1,
                baseArrayLayer: layer,
                arrayLayerCount: 1
              })
            }
          ]
        });
        const renderPassDescriptor = {
          label: "Mip generation render pass",
          colorAttachments: [
            {
              view: texture.texture.createView({
                dimension: "2d",
                baseMipLevel: baseMipLevel + 1,
                mipLevelCount: 1,
                baseArrayLayer: layer,
                arrayLayerCount: 1
              }),
              loadOp: "clear",
              storeOp: "store"
            }
          ]
        };
        const pass = encoder.beginRenderPass(renderPassDescriptor);
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.draw(6);
        pass.end();
      }
      ++baseMipLevel;
    }
    if (!commandEncoder) {
      const commandBuffer = encoder.finish();
      this.device.queue.submit([commandBuffer]);
    }
  }
  /* RENDER */
  /**
   * Create a requestAnimationFrame loop and run it.
   */
  animate() {
    this.render();
    this.animationFrameID = requestAnimationFrame(this.animate.bind(this));
  }
  /**
   * Called each frame before rendering.
   * @param callback - callback to run at each render.
   * @returns - our {@link GPUDeviceManager}.
   */
  onBeforeRender(callback) {
    if (callback) {
      this._onBeforeRenderCallback = callback;
    }
    return this;
  }
  /**
   * Called each frame after rendering.
   * @param callback - callback to run at each render.
   * @returns - our {@link GPUDeviceManager}.
   */
  onAfterRender(callback) {
    if (callback) {
      this._onAfterRenderCallback = callback;
    }
    return this;
  }
  /**
   * Render everything:
   * - call all our {@link renderers} {@link core/renderers/GPURenderer.GPURenderer#onBeforeCommandEncoder | onBeforeCommandEncoder} callbacks.
   * - create a {@link GPUCommandEncoder}.
   * - render all our {@link renderers}.
   * - submit our {@link GPUCommandBuffer}.
   * - upload {@link MediaTexture#texture | MediaTexture textures} that need it.
   * - empty our {@link texturesQueue} array.
   * - call all our {@link renderers} {@link core/renderers/GPURenderer.GPURenderer#onAfterCommandEncoder | onAfterCommandEncoder} callbacks.
   */
  render() {
    if (!this.ready) return;
    this._onBeforeRenderCallback && this._onBeforeRenderCallback();
    for (const renderer of this.renderers) {
      if (renderer.shouldRender) renderer.onBeforeCommandEncoder();
    }
    const commandEncoder = this.device?.createCommandEncoder({ label: this.label + " command encoder" });
    !this.production && commandEncoder.pushDebugGroup(this.label + " command encoder: main render loop");
    this.renderers.forEach((renderer) => renderer.render(commandEncoder));
    !this.production && commandEncoder.popDebugGroup();
    const commandBuffer = commandEncoder.finish();
    this.device?.queue.submit([commandBuffer]);
    for (const texture of this.texturesQueue) {
      texture.texture.setSourceUploaded(texture.sourceIndex);
    }
    this.texturesQueue = [];
    for (const renderer of this.renderers) {
      if (renderer.shouldRender) renderer.onAfterCommandEncoder();
    }
    this._onAfterRenderCallback && this._onAfterRenderCallback();
  }
  /**
   * Destroy the {@link GPUDeviceManager} and its {@link renderers}.
   */
  destroy() {
    if (this.animationFrameID) {
      cancelAnimationFrame(this.animationFrameID);
    }
    this.animationFrameID = null;
    this.device?.destroy();
    this.device = null;
    this.renderers.forEach((renderer) => renderer.destroy());
    this.bindGroups.forEach((bindGroup) => bindGroup.destroy());
    this.buffers.forEach((buffer) => buffer?.destroy());
    this.indirectBuffers.forEach((indirectBuffer) => indirectBuffer.destroy());
    this.setDeviceObjects();
  }
}
_mipsGeneration = new WeakMap();

export { GPUDeviceManager };
