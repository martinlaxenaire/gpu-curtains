import { throwError, throwWarning } from '../../utils/utils.mjs';
import { generateMips } from './utils.mjs';
import { PipelineManager } from '../pipelines/PipelineManager.mjs';

class GPUDeviceManager {
  /**
   * GPUDeviceManager constructor
   * @param parameters - {@link GPUDeviceManagerParams | parameters} used to create this {@link GPUDeviceManager}
   */
  constructor({
    label,
    production = false,
    adapterOptions = {},
    onError = () => {
    },
    onDeviceLost = (info) => {
    }
  } = {}) {
    this.index = 0;
    this.label = label ?? "GPUDeviceManager instance";
    this.production = production;
    this.ready = false;
    this.adapterOptions = adapterOptions;
    this.onError = onError;
    this.onDeviceLost = onDeviceLost;
    this.gpu = navigator.gpu;
    this.setPipelineManager();
    this.setDeviceObjects();
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
   * Set up our {@link adapter} and {@link device} and all the already created {@link renderers} contexts
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
   * Set our {@link adapter} if possible.
   * The adapter represents a specific GPU. Some devices have multiple GPUs.
   * @async
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
      this.adapter = await this.gpu?.requestAdapter(this.adapterOptions);
      if (!this.adapter) {
        this.onError();
        throwError("GPUDeviceManager: WebGPU is not supported on your browser/OS. 'requestAdapter' failed.");
      }
    }
    this.adapter?.requestAdapterInfo().then((infos) => {
      this.adapterInfos = infos;
    });
  }
  /**
   * Set our {@link device}.
   * @async
   * @param device - {@link GPUDevice} to use if set.
   */
  async setDevice(device = null) {
    if (device) {
      this.device = device;
      this.ready = true;
      this.index++;
    } else {
      try {
        this.device = await this.adapter?.requestDevice({
          label: this.label + " " + this.index
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
      }
    });
  }
  /**
   * Set our {@link pipelineManager | pipeline manager}
   */
  setPipelineManager() {
    this.pipelineManager = new PipelineManager();
  }
  /**
   * Called when the {@link device} is lost.
   * Reset all our renderers
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
   * @async
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
      this.renderers.forEach((renderer) => renderer.restoreContext());
    }
  }
  /**
   * Set all objects arrays that we'll keep track of
   */
  setDeviceObjects() {
    this.renderers = [];
    this.bindGroups = /* @__PURE__ */ new Map();
    this.buffers = /* @__PURE__ */ new Map();
    this.bindGroupLayouts = /* @__PURE__ */ new Map();
    this.bufferBindings = /* @__PURE__ */ new Map();
    this.samplers = [];
    this.domTextures = [];
    this.texturesQueue = [];
  }
  /**
   * Add a {@link Renderer} to our {@link renderers} array
   * @param renderer - {@link Renderer} to add
   */
  addRenderer(renderer) {
    this.renderers.push(renderer);
  }
  /**
   * Remove a {@link Renderer} from our {@link renderers} array
   * @param renderer - {@link Renderer} to remove
   */
  removeRenderer(renderer) {
    this.renderers = this.renderers.filter((r) => r.uuid !== renderer.uuid);
  }
  /**
   * Get all the rendered objects (i.e. compute passes, meshes, ping pong planes and shader passes) created by this {@link GPUDeviceManager}
   * @readonly
   */
  get deviceRenderedObjects() {
    return this.renderers.map((renderer) => renderer.renderedObjects).flat();
  }
  /**
   * Add a {@link AllowedBindGroups | bind group} to our {@link bindGroups | bind groups array}
   * @param bindGroup - {@link AllowedBindGroups | bind group} to add
   */
  addBindGroup(bindGroup) {
    this.bindGroups.set(bindGroup.uuid, bindGroup);
  }
  /**
   * Remove a {@link AllowedBindGroups | bind group} from our {@link bindGroups | bind groups array}
   * @param bindGroup - {@link AllowedBindGroups | bind group} to remove
   */
  removeBindGroup(bindGroup) {
    this.bindGroups.delete(bindGroup.uuid);
  }
  /**
   * Add a {@link GPUBuffer} to our our {@link buffers} array
   * @param buffer - {@link Buffer} to add
   */
  addBuffer(buffer) {
    this.buffers.set(buffer.uuid, buffer);
  }
  /**
   * Remove a {@link Buffer} from our {@link buffers} Map
   * @param buffer - {@link Buffer} to remove
   */
  removeBuffer(buffer) {
    this.buffers.delete(buffer?.uuid);
  }
  /**
   * Add a {@link Sampler} to our {@link samplers} array
   * @param sampler - {@link Sampler} to add
   */
  addSampler(sampler) {
    this.samplers.push(sampler);
  }
  /**
   * Remove a {@link Sampler} from our {@link samplers} array
   * @param sampler - {@link Sampler} to remove
   */
  removeSampler(sampler) {
    this.samplers = this.samplers.filter((s) => s.uuid !== sampler.uuid);
  }
  /**
   * Add a {@link DOMTexture} to our {@link domTextures} array
   * @param texture - {@link DOMTexture} to add
   */
  addDOMTexture(texture) {
    this.domTextures.push(texture);
  }
  /**
   * Upload a {@link DOMTexture#texture | texture} to the GPU
   * @param texture - {@link DOMTexture} class object with the {@link DOMTexture#texture | texture} to upload
   */
  uploadTexture(texture) {
    if (texture.source) {
      try {
        this.device?.queue.copyExternalImageToTexture(
          {
            source: texture.source,
            flipY: texture.options.flipY
          },
          { texture: texture.texture, premultipliedAlpha: texture.options.premultipliedAlpha },
          { width: texture.size.width, height: texture.size.height }
        );
        if (texture.texture.mipLevelCount > 1) {
          generateMips(this.device, texture.texture);
        }
        this.texturesQueue.push(texture);
      } catch ({ message }) {
        throwError(`GPUDeviceManager: could not upload texture: ${texture.options.name} because: ${message}`);
      }
    } else {
      this.device?.queue.writeTexture(
        { texture: texture.texture },
        new Uint8Array(texture.options.placeholderColor),
        { bytesPerRow: texture.size.width * 4 },
        { width: texture.size.width, height: texture.size.height }
      );
    }
  }
  /**
   * Remove a {@link DOMTexture} from our {@link domTextures} array
   * @param texture - {@link DOMTexture} to remove
   */
  removeDOMTexture(texture) {
    this.domTextures = this.domTextures.filter((t) => t.uuid !== texture.uuid);
  }
  /**
   * Render everything:
   * - call all our {@link renderers} {@link core/renderers/GPURenderer.GPURenderer#onBeforeCommandEncoder | onBeforeCommandEncoder} callbacks
   * - create a {@link GPUCommandEncoder}
   * - render all our {@link renderers}
   * - submit our {@link GPUCommandBuffer}
   * - upload {@link DOMTexture#texture | DOMTexture textures} that do not have a parentMesh
   * - empty our {@link texturesQueue} array
   * - call all our {@link renderers} {@link core/renderers/GPURenderer.GPURenderer#onAfterCommandEncoder | onAfterCommandEncoder} callbacks
   */
  render() {
    if (!this.ready)
      return;
    for (const renderer of this.renderers) {
      renderer.onBeforeCommandEncoder();
    }
    const commandEncoder = this.device?.createCommandEncoder({ label: this.label + " command encoder" });
    !this.production && commandEncoder.pushDebugGroup(this.label + " command encoder: main render loop");
    this.renderers.forEach((renderer) => renderer.render(commandEncoder));
    !this.production && commandEncoder.popDebugGroup();
    const commandBuffer = commandEncoder.finish();
    this.device?.queue.submit([commandBuffer]);
    this.domTextures.filter((texture) => !texture.parentMesh && texture.sourceLoaded && !texture.sourceUploaded).forEach((texture) => this.uploadTexture(texture));
    for (const texture of this.texturesQueue) {
      texture.sourceUploaded = true;
    }
    this.texturesQueue = [];
    for (const renderer of this.renderers) {
      renderer.onAfterCommandEncoder();
    }
  }
  /**
   * Destroy the {@link GPUDeviceManager} and its {@link renderers}
   */
  destroy() {
    this.device?.destroy();
    this.device = null;
    this.renderers.forEach((renderer) => renderer.destroy());
    this.bindGroups.forEach((bindGroup) => bindGroup.destroy());
    this.buffers.forEach((buffer) => buffer?.destroy());
    this.domTextures.forEach((texture) => texture.destroy());
    this.setDeviceObjects();
  }
}

export { GPUDeviceManager };
