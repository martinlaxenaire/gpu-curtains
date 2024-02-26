import { isRenderer } from '../renderers/utils.mjs';
import { generateUUID } from '../../utils/utils.mjs';
import { ComputeMaterial } from '../materials/ComputeMaterial.mjs';
import { RenderTexture } from '../textures/RenderTexture.mjs';
import { Texture } from '../textures/Texture.mjs';

var __accessCheck = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateGet = (obj, member, getter) => {
  __accessCheck(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateSet = (obj, member, value, setter) => {
  __accessCheck(obj, member, "write to private field");
  setter ? setter.call(obj, value) : member.set(obj, value);
  return value;
};
var _autoRender;
let computePassIndex = 0;
class ComputePass {
  /**
   * ComputePass constructor
   * @param renderer - a {@link Renderer} class object or a {@link GPUCurtains} class object
   * @param parameters - {@link ComputePassParams | parameters} used to create our {@link ComputePass}
   */
  constructor(renderer, parameters = {}) {
    /**
     * Whether this {@link ComputePass} should be added to our {@link core/scenes/Scene.Scene | Scene} to let it handle the rendering process automatically
     * @private
     */
    __privateAdd(this, _autoRender, true);
    // callbacks / events
    /** function assigned to the {@link onReady} callback */
    this._onReadyCallback = () => {
    };
    /** function assigned to the {@link onBeforeRender} callback */
    this._onBeforeRenderCallback = () => {
    };
    /** function assigned to the {@link onRender} callback */
    this._onRenderCallback = () => {
    };
    /** function assigned to the {@link onAfterRender} callback */
    this._onAfterRenderCallback = () => {
    };
    /** function assigned to the {@link onAfterResize} callback */
    this._onAfterResizeCallback = () => {
    };
    const type = "ComputePass";
    renderer = renderer && renderer.renderer || renderer;
    isRenderer(renderer, parameters.label ? `${parameters.label} ${type}` : type);
    parameters.label = parameters.label ?? "ComputePass " + renderer.computePasses?.length;
    this.renderer = renderer;
    this.type = type;
    this.uuid = generateUUID();
    Object.defineProperty(this, "index", { value: computePassIndex++ });
    const {
      label,
      shaders,
      renderOrder,
      uniforms,
      storages,
      bindGroups,
      samplers,
      textures,
      renderTextures,
      autoRender,
      useAsyncPipeline,
      texturesOptions,
      dispatchSize
    } = parameters;
    this.options = {
      label,
      shaders,
      ...autoRender !== void 0 && { autoRender },
      ...renderOrder !== void 0 && { renderOrder },
      ...dispatchSize !== void 0 && { dispatchSize },
      useAsyncPipeline: useAsyncPipeline === void 0 ? true : useAsyncPipeline,
      texturesOptions
      // TODO default
    };
    this.renderOrder = renderOrder ?? 0;
    if (autoRender !== void 0) {
      __privateSet(this, _autoRender, autoRender);
    }
    this.userData = {};
    this.ready = false;
    this.setComputeMaterial({
      label: this.options.label,
      shaders: this.options.shaders,
      uniforms,
      storages,
      bindGroups,
      samplers,
      textures,
      renderTextures,
      useAsyncPipeline,
      dispatchSize
    });
    this.addToScene();
  }
  /**
   * Get or set whether the compute pass is ready to render (the material has been successfully compiled)
   * @readonly
   */
  get ready() {
    return this._ready;
  }
  set ready(value) {
    if (value) {
      this._onReadyCallback && this._onReadyCallback();
    }
    this._ready = value;
  }
  /**
   * Add our compute pass to the scene and the renderer
   */
  addToScene() {
    this.renderer.computePasses.push(this);
    if (__privateGet(this, _autoRender)) {
      this.renderer.scene.addComputePass(this);
    }
  }
  /**
   * Remove our compute pass from the scene and the renderer
   */
  removeFromScene() {
    if (__privateGet(this, _autoRender)) {
      this.renderer.scene.removeComputePass(this);
    }
    this.renderer.computePasses = this.renderer.computePasses.filter((computePass) => computePass.uuid !== this.uuid);
  }
  /**
   * Create the compute pass material
   * @param computeParameters - {@link ComputeMaterial} parameters
   */
  setComputeMaterial(computeParameters) {
    this.material = new ComputeMaterial(this.renderer, computeParameters);
  }
  /**
   * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been lost to prepare everything for restoration.
   * Basically set all the {@link GPUBuffer} to null so they will be reset next time we try to render
   */
  loseContext() {
    this.material.loseContext();
  }
  /**
   * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been restored
   */
  restoreContext() {
    this.material.restoreContext();
  }
  /* TEXTURES */
  /**
   * Get our {@link ComputeMaterial#textures | ComputeMaterial textures array}
   * @readonly
   */
  get textures() {
    return this.material?.textures || [];
  }
  /**
   * Get our {@link ComputeMaterial#renderTextures | ComputeMaterial render textures array}
   * @readonly
   */
  get renderTextures() {
    return this.material?.renderTextures || [];
  }
  /**
   * Create a new {@link Texture}
   * @param options - {@link TextureParams | Texture parameters}
   * @returns - newly created {@link Texture}
   */
  createTexture(options) {
    if (!options.name) {
      options.name = "texture" + this.textures.length;
    }
    if (!options.label) {
      options.label = this.options.label + " " + options.name;
    }
    const texture = new Texture(this.renderer, { ...options, ...this.options.texturesOptions });
    this.addTexture(texture);
    return texture;
  }
  /**
   * Add a {@link Texture}
   * @param texture - {@link Texture} to add
   */
  addTexture(texture) {
    this.material.addTexture(texture);
  }
  /**
   * Create a new {@link RenderTexture}
   * @param  options - {@link RenderTextureParams | RenderTexture parameters}
   * @returns - newly created {@link RenderTexture}
   */
  createRenderTexture(options) {
    if (!options.name) {
      options.name = "renderTexture" + this.renderTextures.length;
    }
    const renderTexture = new RenderTexture(this.renderer, options);
    this.addRenderTexture(renderTexture);
    return renderTexture;
  }
  /**
   * Add a {@link RenderTexture}
   * @param renderTexture - {@link RenderTexture} to add
   */
  addRenderTexture(renderTexture) {
    this.material.addTexture(renderTexture);
  }
  /**
   * Get our {@link ComputeMaterial#uniforms | ComputeMaterial uniforms}
   * @readonly
   */
  get uniforms() {
    return this.material?.uniforms;
  }
  /**
   * Get our {@link ComputeMaterial#storages | ComputeMaterial storages}
   * @readonly
   */
  get storages() {
    return this.material?.storages;
  }
  /**
   * Called from the renderer, useful to trigger an after resize callback.
   */
  resize() {
    this._onAfterResizeCallback && this._onAfterResizeCallback();
  }
  /** EVENTS **/
  /**
   * Callback to run when the {@link ComputePass} is ready
   * @param callback - callback to run when {@link ComputePass} is ready
   */
  onReady(callback) {
    if (callback) {
      this._onReadyCallback = callback;
    }
    return this;
  }
  /**
   * Callback to run before the {@link ComputePass} is rendered
   * @param callback - callback to run just before {@link ComputePass} will be rendered
   */
  onBeforeRender(callback) {
    if (callback) {
      this._onBeforeRenderCallback = callback;
    }
    return this;
  }
  /**
   * Callback to run when the {@link ComputePass} is rendered
   * @param callback - callback to run when {@link ComputePass} is rendered
   */
  onRender(callback) {
    if (callback) {
      this._onRenderCallback = callback;
    }
    return this;
  }
  /**
   * Callback to run after the {@link ComputePass} has been rendered
   * @param callback - callback to run just after {@link ComputePass} has been rendered
   */
  onAfterRender(callback) {
    if (callback) {
      this._onAfterRenderCallback = callback;
    }
    return this;
  }
  /**
   * Callback used to run a custom render function instead of the default one.
   * @param callback - Your custom render function where you will have to set all the {@link core/bindGroups/BindGroup.BindGroup | bind groups} and dispatch the workgroups by yourself.
   */
  useCustomRender(callback) {
    this.material.useCustomRender(callback);
    return this;
  }
  /**
   * Callback to run after the {@link core/renderers/GPURenderer.GPURenderer | renderer} has been resized
   * @param callback - callback to run just after {@link core/renderers/GPURenderer.GPURenderer | renderer} has been resized
   */
  onAfterResize(callback) {
    if (callback) {
      this._onAfterResizeCallback = callback;
    }
    return this;
  }
  /**
   * Called before rendering the ComputePass
   * Checks if the material is ready and eventually update its struct
   */
  onBeforeRenderPass() {
    if (!this.renderer.ready)
      return;
    if (this.material && this.material.ready && !this.ready) {
      this.ready = true;
    }
    this._onBeforeRenderCallback && this._onBeforeRenderCallback();
    this.material.onBeforeRender();
  }
  /**
   * Render our {@link ComputeMaterial}
   * @param pass - current compute pass encoder
   */
  onRenderPass(pass) {
    if (!this.material.ready)
      return;
    this._onRenderCallback && this._onRenderCallback();
    this.material.render(pass);
  }
  /**
   * Called after having rendered the ComputePass
   */
  onAfterRenderPass() {
    this._onAfterRenderCallback && this._onAfterRenderCallback();
  }
  /**
   * Render our compute pass
   * Basically just check if our {@link core/renderers/GPURenderer.GPURenderer | renderer} is ready, and then render our {@link ComputeMaterial}
   * @param pass
   */
  render(pass) {
    this.onBeforeRenderPass();
    if (!this.renderer.ready)
      return;
    !this.renderer.production && pass.pushDebugGroup(this.options.label);
    this.onRenderPass(pass);
    !this.renderer.production && pass.popDebugGroup();
    this.onAfterRenderPass();
  }
  /**
   * Copy the result of our read/write GPUBuffer into our result binding array
   * @param commandEncoder - current GPU command encoder
   */
  copyBufferToResult(commandEncoder) {
    this.material?.copyBufferToResult(commandEncoder);
  }
  /**
   * Get the {@link core/bindings/WritableBufferBinding.WritableBufferBinding#resultBuffer | result GPU buffer} content by {@link core/bindings/WritableBufferBinding.WritableBufferBinding | binding} and {@link core/bindings/bufferElements/BufferElement.BufferElement | buffer element} names
   * @param parameters - parameters used to get the result
   * @param parameters.bindingName - {@link core/bindings/WritableBufferBinding.WritableBufferBinding#name | binding name} from which to get the result
   * @param parameters.bufferElementName - optional {@link core/bindings/bufferElements/BufferElement.BufferElement | buffer element} (i.e. struct member) name if the result needs to be restrained to only one element
   * @async
   * @returns - the mapped content of the {@link GPUBuffer} as a {@link Float32Array}
   */
  async getComputeResult({
    bindingName,
    bufferElementName
  }) {
    return await this.material?.getComputeResult({ bindingName, bufferElementName });
  }
  /**
   * Remove the ComputePass from the scene and destroy it
   */
  remove() {
    this.removeFromScene();
    this.destroy();
  }
  /**
   * Destroy the ComputePass
   */
  destroy() {
    this.material?.destroy();
  }
}
_autoRender = new WeakMap();

export { ComputePass };
