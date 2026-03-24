import { generateUUID } from "../../utils/utils.mjs";
import { isRenderer } from "../renderers/utils.mjs";
import { Texture } from "../textures/Texture.mjs";
import { MediaTexture } from "../textures/MediaTexture.mjs";
import { ComputeMaterial } from "../materials/ComputeMaterial.mjs";
//#region src/core/computePasses/ComputePass.ts
let computePassIndex = 0;
/**
* Used to create a {@link ComputePass}, i.e. run computations on the GPU.<br>
* A {@link ComputePass} is basically a wrapper around a {@link ComputeMaterial} that handles most of the process.
*
* The default render behaviour of a {@link ComputePass} is to set its {@link core/bindGroups/BindGroup.BindGroup | bind groups} and then dispatch the workgroups based on the provided {@link ComputeMaterial#dispatchSize | dispatchSize}.<br>
* However, most of the time you'd want a slightly more complex behaviour. The {@link ComputePass#useCustomRender | `useCustomRender` hook} lets you define a totally custom behaviour, but you'll have to set all the {@link core/bindGroups/BindGroup.BindGroup | bind groups} and dispatch the workgroups by yourself.
*
* @example
* ```javascript
* // set our main GPUCurtains instance
* const gpuCurtains = new GPUCurtains({
*   container: '#canvas' // selector of our WebGPU canvas container
* })
*
* // set the GPU device
* // note this is asynchronous
* await gpuCurtains.setDevice()
*
* // let's assume we are going to compute the positions of 100.000 particles
* const nbParticles = 100_000
*
* const computePass = new ComputePass(gpuCurtains, {
*   label: 'My compute pass',
*   shaders: {
*     compute: {
*       code: computeShaderCode, // assume it is a valid WGSL compute shader
*     },
*   },
*   dispatchSize: Math.ceil(nbParticles / 64),
*   storages: {
*     particles: {
*       access: 'read_write',
*       struct: {
*         position: {
*           type: 'array<vec4f>',
*           value: new Float32Array(nbParticles * 4),
*         },
*       },
*     },
*   },
* })
* ```
*/
var ComputePass = class {
	/**
	* Whether this {@link ComputePass} should be added to our {@link core/scenes/Scene.Scene | Scene} to let it handle the rendering process automatically.
	* @private
	*/
	#autoRender = true;
	/** Flag indicating whether this {@link ComputePass} should run or not, much like the {@link core/meshes/Mesh.Mesh#visible | Mesh visible} flag. */
	#active = true;
	/**
	* ComputePass constructor
	* @param renderer - {@link Renderer} class object or {@link GPUCurtains} class object used to create this {@link ComputePass}.
	* @param parameters - {@link ComputePassParams | parameters} used to create our {@link ComputePass}.
	*/
	constructor(renderer, parameters = {}) {
		this._onReadyCallback = () => {};
		this._onBeforeRenderCallback = () => {};
		this._onRenderCallback = () => {};
		this._onAfterRenderCallback = () => {};
		this._onAfterResizeCallback = () => {};
		const type = "ComputePass";
		renderer = isRenderer(renderer, parameters.label ? `${parameters.label} ${type}` : type);
		parameters.label = parameters.label ?? "ComputePass " + renderer.computePasses?.length;
		this.renderer = renderer;
		this.type = type;
		this.uuid = generateUUID();
		Object.defineProperty(this, "index", { value: computePassIndex++ });
		const { label, shaders, renderOrder, uniforms, storages, bindings, bindGroups, samplers, textures, autoRender, active, useAsyncPipeline, texturesOptions, dispatchSize } = parameters;
		this.options = {
			label,
			shaders,
			...autoRender !== void 0 && { autoRender },
			...active !== void 0 && { active },
			...renderOrder !== void 0 && { renderOrder },
			...dispatchSize !== void 0 && { dispatchSize },
			useAsyncPipeline: useAsyncPipeline === void 0 ? true : useAsyncPipeline,
			texturesOptions
		};
		this.renderOrder = renderOrder ?? 0;
		if (autoRender !== void 0) this.#autoRender = autoRender;
		this.#active = active === void 0 ? true : active;
		this.userData = {};
		this.ready = false;
		this.setMaterial({
			label: this.options.label,
			shaders: this.options.shaders,
			uniforms,
			storages,
			bindings,
			bindGroups,
			samplers,
			textures,
			useAsyncPipeline,
			dispatchSize
		});
		this.addToScene(true);
	}
	/**
	* Get or set whether the compute pass is ready to render (the material has been successfully compiled).
	* @readonly
	*/
	get ready() {
		return this._ready;
	}
	set ready(value) {
		if (value) this._onReadyCallback && this._onReadyCallback();
		this._ready = value;
	}
	/**
	* Add our {@link ComputePass} to the scene and optionally to the renderer.
	* @param addToRenderer - Whether to add this {@link ComputePass} to the {@link Renderer#computePasses | Renderer computePasses array}.
	*/
	addToScene(addToRenderer = false) {
		if (addToRenderer) this.renderer.computePasses.push(this);
		if (this.#autoRender) this.renderer.scene.addComputePass(this);
	}
	/**
	* Remove our {@link ComputePass} from the scene and optionally from the renderer as well.
	* @param removeFromRenderer - whether to remove this {@link ComputePass} from the {@link Renderer#computePasses | Renderer computePasses array}.
	*/
	removeFromScene(removeFromRenderer = false) {
		if (this.#autoRender) this.renderer.scene.removeComputePass(this);
		if (removeFromRenderer) this.renderer.computePasses = this.renderer.computePasses.filter((computePass) => computePass.uuid !== this.uuid);
	}
	/**
	* Set a new {@link Renderer} for this {@link ComputePass}.
	* @param renderer - new {@link Renderer} to set.
	*/
	setRenderer(renderer) {
		renderer = isRenderer(renderer, this.options.label + " ComputePass");
		this.material?.setRenderer(renderer);
		this.removeFromScene(true);
		this.renderer = renderer;
		this.addToScene(true);
	}
	/**
	* Create the compute pass material.
	* @param computeParameters - {@link ComputeMaterial} parameters.
	*/
	setMaterial(computeParameters) {
		this.useMaterial(new ComputeMaterial(this.renderer, computeParameters));
	}
	/**
	* Set or update the {@link ComputePass} {@link ComputeMaterial}.
	* @param material - New {@link ComputeMaterial} to use.
	*/
	useMaterial(material) {
		this.material = material;
	}
	/**
	* Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been lost to prepare everything for restoration.
	* Basically set all the {@link GPUBuffer} to null so they will be reset next time we try to render.
	*/
	loseContext() {
		this.material.loseContext();
	}
	/**
	* Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been restored.
	*/
	restoreContext() {
		this.material.restoreContext();
	}
	/**
	* Get the active property value.
	*/
	get active() {
		return this.#active;
	}
	/**
	* Set the active property value.
	* @param value - New active value.
	*/
	set active(value) {
		this.#active = value;
	}
	/**
	* Get our {@link ComputeMaterial#textures | ComputeMaterial textures array}
	* @readonly
	*/
	get textures() {
		return this.material?.textures || [];
	}
	/**
	* Create a new {@link MediaTexture}.
	* @param options - {@link MediaTextureParams | MediaTexture parameters}.
	* @returns - Newly created {@link MediaTexture}.
	*/
	createMediaTexture(options) {
		if (!options.name) options.name = "texture" + this.textures.length;
		if (!options.label) options.label = this.options.label + " " + options.name;
		const texture = new MediaTexture(this.renderer, {
			...options,
			...this.options.texturesOptions
		});
		this.addTexture(texture);
		return texture;
	}
	/**
	* Create a new {@link Texture}.
	* @param  options - {@link TextureParams | Texture parameters}.
	* @returns - newly created {@link Texture}.
	*/
	createTexture(options) {
		if (!options.name) options.name = "texture" + this.textures.length;
		const texture = new Texture(this.renderer, options);
		this.addTexture(texture);
		return texture;
	}
	/**
	* Add a {@link Texture} or {@link MediaTexture}.
	* @param texture - {@link Texture} to add.
	*/
	addTexture(texture) {
		this.material.addTexture(texture);
	}
	/**
	* Get our {@link ComputeMaterial#uniforms | ComputeMaterial uniforms}.
	* @readonly
	*/
	get uniforms() {
		return this.material?.uniforms;
	}
	/**
	* Get our {@link ComputeMaterial#storages | ComputeMaterial storages}.
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
	* Callback to run when the {@link ComputePass} is ready.
	* @param callback - Callback to run when {@link ComputePass} is ready.
	* @returns - Our {@link ComputePass}.
	*/
	onReady(callback) {
		if (callback) this._onReadyCallback = callback;
		return this;
	}
	/**
	* Callback to run before the {@link ComputePass} is rendered.
	* @param callback - Callback to run just before {@link ComputePass} will be rendered. The callback won't be called if the {@link Renderer} is not ready or the {@link ComputePass} itself is neither {@link ready} nor {@link active}.
	* @returns - Our {@link ComputePass}.
	*/
	onBeforeRender(callback) {
		if (callback) this._onBeforeRenderCallback = callback;
		return this;
	}
	/**
	* Callback to run when the {@link ComputePass} is rendered.
	* @param callback - Callback to run when {@link ComputePass} is rendered. The callback won't be called if the {@link Renderer} is not ready or the {@link ComputePass} itself is neither {@link ready} nor {@link active}.
	* @returns - Our {@link ComputePass}.
	*/
	onRender(callback) {
		if (callback) this._onRenderCallback = callback;
		return this;
	}
	/**
	* Callback to run after the {@link ComputePass} has been rendered.
	* @param callback - Callback to run just after {@link ComputePass} has been rendered. The callback won't be called if the {@link Renderer} is not ready or the {@link ComputePass} itself is neither {@link ready} nor {@link active}.
	* @returns - Our {@link ComputePass}.
	*/
	onAfterRender(callback) {
		if (callback) this._onAfterRenderCallback = callback;
		return this;
	}
	/**
	* Callback used to run a custom render function instead of the default one. This won't be called if the {@link Renderer} is not ready or the {@link ComputePass} itself is neither {@link ready} nor {@link active}.
	* @param callback - Your custom render function where you will have to set all the {@link core/bindGroups/BindGroup.BindGroup | bind groups} and dispatch the workgroups by yourself.
	* @returns - Our {@link ComputePass}.
	*/
	useCustomRender(callback) {
		this.material.useCustomRender(callback);
		return this;
	}
	/**
	* Callback to run after the {@link core/renderers/GPURenderer.GPURenderer | renderer} has been resized.
	* @param callback - Callback to run just after {@link core/renderers/GPURenderer.GPURenderer | renderer} has been resized.
	* @returns - Our {@link ComputePass}.
	*/
	onAfterResize(callback) {
		if (callback) this._onAfterResizeCallback = callback;
		return this;
	}
	/**
	* Called before rendering the {@link ComputePass}.
	* Checks if the material is ready and eventually update its bindings.
	*/
	onBeforeRenderPass() {
		if (!this.renderer.ready) return;
		if (this.active) this._onBeforeRenderCallback && this._onBeforeRenderCallback();
		this.material.onBeforeRender();
		if (this.material && this.material.ready && !this.ready) this.ready = true;
	}
	/**
	* Render our {@link ComputeMaterial}.
	* @param pass - Current compute pass encoder.
	*/
	onRenderPass(pass) {
		if (!this.material.ready) return;
		this._onRenderCallback && this._onRenderCallback();
		this.material.render(pass);
	}
	/**
	* Called after having rendered the {@link ComputePass}.
	*/
	onAfterRenderPass() {
		this._onAfterRenderCallback && this._onAfterRenderCallback();
	}
	/**
	* Render our compute pass.
	* Basically just check if our {@link core/renderers/GPURenderer.GPURenderer | renderer} is ready, and then render our {@link ComputeMaterial}.
	* @param pass - Current compute pass encoder.
	*/
	render(pass) {
		this.onBeforeRenderPass();
		if (!this.renderer.ready || !this.active) return;
		!this.renderer.production && pass.pushDebugGroup(this.options.label);
		this.onRenderPass(pass);
		!this.renderer.production && pass.popDebugGroup();
		this.onAfterRenderPass();
	}
	/**
	* Copy the result of our read/write GPUBuffer into our result binding array.
	* @param commandEncoder - Current GPU command encoder.
	*/
	copyBufferToResult(commandEncoder) {
		this.material?.copyBufferToResult(commandEncoder);
	}
	/**
	* Get the {@link core/bindings/WritableBufferBinding.WritableBufferBinding#resultBuffer | result GPU buffer} content by {@link core/bindings/WritableBufferBinding.WritableBufferBinding | binding} and {@link core/bindings/bufferElements/BufferElement.BufferElement | buffer element} names.
	* @param parameters - Parameters used to get the result
	* @param parameters.bindingName - {@link core/bindings/WritableBufferBinding.WritableBufferBinding#name | binding name} from which to get the result.
	* @param parameters.bufferElementName - Optional {@link core/bindings/bufferElements/BufferElement.BufferElement | buffer element} (i.e. struct member) name if the result needs to be restrained to only one element.
	* @returns - The mapped content of the {@link GPUBuffer} as a {@link Float32Array}.
	*/
	async getComputeResult({ bindingName, bufferElementName }) {
		return await this.material?.getComputeResult({
			bindingName,
			bufferElementName
		});
	}
	/**
	* Remove the {@link ComputePass} from the {@link core/scenes/Scene.Scene | Scene} and destroy it.
	*/
	remove() {
		this.removeFromScene(true);
		this.destroy();
	}
	/**
	* Destroy the {@link ComputePass}.
	*/
	destroy() {
		this.material?.destroy();
	}
};
//#endregion
export { ComputePass };
