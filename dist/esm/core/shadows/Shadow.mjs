import { Vec3 } from "../../math/Vec3.mjs";
import { Mat4 } from "../../math/Mat4.mjs";
import { isCameraRenderer } from "../renderers/utils.mjs";
import { Vec2 } from "../../math/Vec2.mjs";
import { Sampler } from "../samplers/Sampler.mjs";
import { RenderTarget } from "../renderPasses/RenderTarget.mjs";
import { Mesh } from "../meshes/Mesh.mjs";
import { RenderBundle } from "../renderPasses/RenderBundle.mjs";
//#region src/core/shadows/Shadow.ts
/** @ignore */
const shadowStruct = {
	isActive: {
		type: "i32",
		value: 0
	},
	pcfSamples: {
		type: "i32",
		value: 0
	},
	bias: {
		type: "f32",
		value: 0
	},
	normalBias: {
		type: "f32",
		value: 0
	},
	radius: {
		type: "f32",
		value: 1
	},
	intensity: {
		type: "f32",
		value: 0
	}
};
/**
* Used as a base class to create a shadow map.
*
* A {@link Shadow} creates a {@link depthTexture | depth Texture} (that can vary based on the light type) and a {@link depthComparisonSampler | depth comparison Sampler}.
*
* Each {@link Mesh} added to the {@link Shadow} will be rendered beforehand to the {@link depthTexture} using a {@link depthPassTarget | RenderTarget} and a custom {@link RenderMaterial}.
*/
var Shadow = class {
	/** @ignore */
	#intensity;
	/** @ignore */
	#bias;
	/** @ignore */
	#normalBias;
	/** @ignore */
	#pcfSamples;
	/** @ignore */
	#radius;
	/** @ignore */
	#isActive;
	/** @ignore */
	#autoRender;
	/** Map of all the shadow receiving {@link Mesh}. */
	#receivingMeshes;
	/**
	* Shadow constructor
	* @param renderer - {@link CameraRenderer} or {@link GPUCurtains} used to create this {@link Shadow}.
	* @param parameters - {@link ShadowBaseParams} used to create this {@link Shadow}.
	*/
	constructor(renderer, { light, intensity = 1, bias = 0, normalBias = 0, pcfSamples = 3, radius = 1, depthTextureSize = new Vec2(512), depthTextureFormat = "depth24plus", autoRender = true, useRenderBundle = true } = {}) {
		this.setRenderer(renderer);
		this.light = light;
		this.index = this.light.index;
		this.options = {
			light,
			intensity,
			bias,
			normalBias,
			pcfSamples,
			radius,
			depthTextureSize,
			depthTextureFormat,
			useRenderBundle
		};
		this.sampleCount = 1;
		this.castingMeshes = /* @__PURE__ */ new Map();
		this.#receivingMeshes = /* @__PURE__ */ new Map();
		this.depthMeshes = /* @__PURE__ */ new Map();
		this.renderBundle = null;
		this.#setParameters({
			intensity,
			bias,
			normalBias,
			pcfSamples,
			radius,
			depthTextureSize,
			depthTextureFormat,
			autoRender,
			useRenderBundle
		});
		this.isActive = false;
	}
	/**
	* Set or reset this shadow {@link CameraRenderer}.
	* @param renderer - New {@link CameraRenderer} or {@link GPUCurtains} instance to use.
	*/
	setRenderer(renderer) {
		const oldRenderer = this.renderer;
		renderer = isCameraRenderer(renderer, this.constructor.name);
		this.renderer = renderer;
		this.setRendererBinding();
		if (this.depthPassTarget) this.depthPassTarget.setRenderer(this.renderer);
		if (this.renderBundle) this.renderBundle.setRenderer(this.renderer);
		this.castingMeshes = /* @__PURE__ */ new Map();
		this.renderer.meshes.forEach((mesh) => {
			if ("castShadows" in mesh.options && mesh.options.castShadows) this.castingMeshes.set(mesh.uuid, mesh);
		});
		this.depthMeshes?.forEach((depthMesh) => {
			depthMesh.setRenderer(this.renderer);
		});
		if (oldRenderer) {
			this.reset();
			if (this.#autoRender) this.setDepthPass();
		}
	}
	/** @ignore */
	setRendererBinding() {
		this.rendererBinding = null;
	}
	/**
	* Set the {@link Shadow} parameters.
	* @param parameters - Parameters to use for this {@link Shadow}.
	* @private
	*/
	#setParameters({ intensity = 1, bias = 0, normalBias = 0, pcfSamples = 3, radius = 1, depthTextureSize = new Vec2(512), depthTextureFormat = "depth24plus", autoRender = true, useRenderBundle = true } = {}) {
		this.intensity = intensity;
		this.bias = bias;
		this.normalBias = normalBias;
		this.pcfSamples = pcfSamples;
		this.radius = radius;
		this.depthTextureSize = depthTextureSize;
		this.depthTextureFormat = depthTextureFormat;
		this.#autoRender = autoRender;
		this.options.useRenderBundle = useRenderBundle;
	}
	/**
	* Set the parameters and start casting shadows by setting the {@link isActive} setter to `true`.<br>
	* Called internally by the associated {@link core/lights/Light.Light | Light} if any shadow parameters are specified when creating it. Can also be called directly.
	* @param parameters - Parameters to use for this {@link Shadow}.
	*/
	cast({ intensity, bias, normalBias, pcfSamples, radius, depthTextureSize, depthTextureFormat, autoRender, useRenderBundle } = {}) {
		this.#setParameters({
			intensity,
			bias,
			normalBias,
			pcfSamples,
			radius,
			depthTextureSize,
			depthTextureFormat,
			autoRender,
			useRenderBundle
		});
		this.isActive = true;
	}
	/**
	* Resend all properties to the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}. Called when the maximum number of corresponding {@link core/lights/Light.Light | lights} has been overflowed or when the {@link renderer} has changed.
	*/
	reset() {
		this.onPropertyChanged("isActive", this.isActive ? 1 : 0);
		if (this.isActive) {
			this.onPropertyChanged("intensity", this.intensity);
			this.onPropertyChanged("bias", this.bias);
			this.onPropertyChanged("normalBias", this.normalBias);
			this.onPropertyChanged("pcfSamples", this.pcfSamples);
			this.onPropertyChanged("radius", this.radius);
		}
	}
	/**
	* Update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding} input value and tell the {@link CameraRenderer#cameraLightsBindGroup | renderer camera, lights and shadows} bind group to update.
	* @param propertyKey - name of the property to update.
	* @param value - new value of the property.
	*/
	onPropertyChanged(propertyKey, value) {
		if (this.rendererBinding && this.rendererBinding.childrenBindings.length > this.index) {
			if (value instanceof Mat4) {
				for (let i = 0; i < value.elements.length; i++) this.rendererBinding.childrenBindings[this.index].inputs[propertyKey].value[i] = value.elements[i];
				this.rendererBinding.childrenBindings[this.index].inputs[propertyKey].shouldUpdate = true;
			} else if (value instanceof Vec3) {
				this.rendererBinding.childrenBindings[this.index].inputs[propertyKey].shouldUpdate = true;
				this.rendererBinding.childrenBindings[this.index].inputs[propertyKey].value.copy(value);
			} else this.rendererBinding.childrenBindings[this.index].inputs[propertyKey].value = value;
			this.renderer.shouldUpdateCameraLightsBindGroup();
		}
	}
	/**
	* Get whether this {@link Shadow} is actually casting shadows.
	* @returns - Whether this {@link Shadow} is actually casting shadows.
	*/
	get isActive() {
		return this.#isActive;
	}
	/**
	* Start or stop casting shadows.
	* @param value - New active state.
	*/
	set isActive(value) {
		if (!value && this.isActive) this.destroy();
		else if (value && !this.isActive) if (this.renderer.ready) this.init();
		else {
			const taskId = this.renderer.onBeforeCommandEncoderCreation.add(() => {
				if (this.renderer.ready) {
					this.renderer.onBeforeCommandEncoderCreation.remove(taskId);
					this.init();
				}
			}, { once: false });
		}
		this.#isActive = value;
	}
	/**
	* Get this {@link Shadow} intensity.
	* @returns - The {@link Shadow} intensity.
	*/
	get intensity() {
		return this.#intensity;
	}
	/**
	* Set this {@link Shadow} intensity and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
	* @param value - The new {@link Shadow} intensity.
	*/
	set intensity(value) {
		this.#intensity = value;
		this.onPropertyChanged("intensity", this.intensity);
		if (!value) this.clearDepthTexture();
	}
	/**
	* Get this {@link Shadow} bias.
	* @returns - The {@link Shadow} bias.
	*/
	get bias() {
		return this.#bias;
	}
	/**
	* Set this {@link Shadow} bias and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
	* @param value - The new {@link Shadow} bias.
	*/
	set bias(value) {
		this.#bias = value;
		this.onPropertyChanged("bias", this.bias);
	}
	/**
	* Get this {@link Shadow} normal bias.
	* @returns - The {@link Shadow} normal bias.
	*/
	get normalBias() {
		return this.#normalBias;
	}
	/**
	* Set this {@link Shadow} normal bias and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
	* @param value - The new {@link Shadow} normal bias.
	*/
	set normalBias(value) {
		this.#normalBias = value;
		this.onPropertyChanged("normalBias", this.normalBias);
	}
	/**
	* Get this {@link Shadow} PCF Vogel disk samples count.
	* @returns - The {@link Shadow} PCF Vogel disk samples count.
	*/
	get pcfSamples() {
		return this.#pcfSamples;
	}
	/**
	* Set this {@link Shadow} PCF Vogel disk samples count and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
	* @param value - The new {@link Shadow} PCF Vogel disk samples count.
	*/
	set pcfSamples(value) {
		this.#pcfSamples = Math.max(1, Math.ceil(value));
		this.onPropertyChanged("pcfSamples", this.pcfSamples);
	}
	/**
	* Get this {@link Shadow} radius.
	* @returns - The {@link Shadow} radius.
	*/
	get radius() {
		return this.#radius;
	}
	/**
	* Set this {@link Shadow} radius and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
	* @param value - The new {@link Shadow} radius.
	*/
	set radius(value) {
		this.#radius = Math.max(1, value);
		this.onPropertyChanged("radius", this.radius);
	}
	/**
	* Set the {@link depthComparisonSampler}, {@link depthTexture}, {@link depthPassTarget} and start rendering to the shadow map.
	*/
	init() {
		if (!this.depthComparisonSampler) this.depthComparisonSampler = this.renderer.samplers.find((sampler) => sampler.name === "depthComparisonSampler") || new Sampler(this.renderer, {
			label: "Depth comparison sampler",
			name: "depthComparisonSampler",
			addressModeU: "clamp-to-edge",
			addressModeV: "clamp-to-edge",
			compare: "less",
			minFilter: "linear",
			magFilter: "linear",
			type: "comparison"
		});
		this.setDepthTexture();
		this.depthTextureSize.onChange(() => this.onDepthTextureSizeChanged());
		if (!this.depthPassTarget) this.createDepthPassTarget();
		if (this.options.useRenderBundle && !this.renderBundle) this.renderBundle = new RenderBundle(this.renderer, {
			label: `Depth render bundle for ${this.light.type}Shadow ${this.index}`,
			renderPass: this.depthPassTarget.renderPass,
			transparent: false,
			useBuffer: true,
			size: 1
		});
		if (this.#autoRender) {
			this.setDepthPass();
			this.onPropertyChanged("isActive", 1);
		}
	}
	/**
	* Reset the {@link depthTexture} when the {@link depthTextureSize} changes.
	*/
	onDepthTextureSizeChanged() {
		this.setDepthTexture();
	}
	/**
	* Set or resize the {@link depthTexture} and eventually resize the {@link depthPassTarget} as well.
	*/
	setDepthTexture() {
		if (this.depthTexture && (this.depthTexture.size.width !== this.depthTextureSize.x || this.depthTexture.size.height !== this.depthTextureSize.y)) this.resizeDepthTexture(this.depthTextureSize.x, this.depthTextureSize.y);
		else if (!this.depthTexture) this.createDepthTexture();
	}
	/**
	* Resize the {@link depthTexture} and eventually resize the {@link depthPassTarget} as well.
	* @param width - New width to use for the {@link depthTexture}.
	* @param height - New height to use for the {@link depthTexture}.
	*/
	resizeDepthTexture(width = this.depthTextureSize.x, height = this.depthTextureSize.y) {
		this.depthTexture.options.fixedSize.width = width;
		this.depthTexture.options.fixedSize.height = height;
		this.depthTexture.size.width = width;
		this.depthTexture.size.height = height;
		this.depthTexture.createTexture();
		if (this.depthPassTarget) this.depthPassTarget.resize();
		this.#receivingMeshes.forEach((mesh) => {
			if (mesh.renderBundle) mesh.renderBundle.ready = false;
		});
	}
	/**
	* Create the {@link depthTexture}.
	*/
	createDepthTexture() {}
	/** Destroy the {@link depthTexture}. */
	destroyDepthTexture() {
		this.depthTexture?.destroy();
		this.depthTexture = null;
		this.depthTextureSize.onChange(() => {});
	}
	/**
	* Clear the content of the depth texture. Called whenever the {@link castingMeshes} {@link Map} is empty after having removed a mesh, or if all {@link castingMeshes} `visible` properties are `false`.
	*/
	clearDepthTexture() {
		if (!this.depthTexture || !this.depthTexture.texture) return;
		const commandEncoder = this.renderer.device.createCommandEncoder();
		!this.renderer.production && commandEncoder.pushDebugGroup(`Clear ${this.depthTexture.texture.label} command encoder`);
		const renderPassDescriptor = {
			colorAttachments: [],
			depthStencilAttachment: {
				view: this.depthTexture.texture.createView({ label: "Clear " + this.depthTexture.texture.label + " view" }),
				depthLoadOp: "clear",
				depthClearValue: 1,
				depthStoreOp: "store"
			}
		};
		commandEncoder.beginRenderPass(renderPassDescriptor).end();
		!this.renderer.production && commandEncoder.popDebugGroup();
		this.renderer.device.queue.submit([commandEncoder.finish()]);
	}
	/**
	* Create the {@link depthPassTarget}.
	*/
	createDepthPassTarget() {
		this.depthPassTarget = new RenderTarget(this.renderer, {
			label: `Depth pass render target for ${this.light.type}Shadow ${this.index}`,
			useColorAttachments: false,
			depthTexture: this.depthTexture,
			sampleCount: this.sampleCount,
			autoRender: this.#autoRender
		});
	}
	/**
	* Set our {@link depthPassTarget} corresponding {@link CameraRenderer#scene | scene} render pass entry custom render pass.
	*/
	setDepthPass() {
		const renderPassEntry = this.renderer.scene.getRenderTargetPassEntry(this.depthPassTarget);
		renderPassEntry.useCustomRenderPass = (commandEncoder) => {
			if (this.renderer.ready) this.render(commandEncoder);
		};
	}
	/**
	* Render the depth pass. Called by the {@link CameraRenderer#scene | scene} when rendering the {@link depthPassTarget} render pass entry, or by the {@link renderOnce} method.<br />
	* - Render all the depth meshes.
	* @param commandEncoder - {@link GPUCommandEncoder} to use.
	*/
	render(commandEncoder) {
		if (!this.castingMeshes.size || !this.light.intensity || !this.intensity) return;
		let shouldRender = false;
		for (const [_uuid, mesh] of this.castingMeshes) if (mesh.visible) {
			shouldRender = true;
			break;
		}
		if (!shouldRender) {
			this.clearDepthTexture();
			return;
		}
		this.renderDepthPass(commandEncoder);
		this.renderer.pipelineManager.resetCurrentPipeline();
	}
	/**
	* Render the shadow map only once. Useful with static scenes if autoRender has been set to `false` to only take one snapshot of the shadow map.
	*/
	async renderOnce() {
		if (!this.#autoRender) {
			this.onPropertyChanged("isActive", 1);
			await Promise.all([...this.depthMeshes.values()].map(async (depthMesh) => {
				depthMesh.setGeometry();
				await depthMesh.material.compileMaterial();
			}));
			this.renderer.onBeforeRenderScene.add((commandEncoder) => {
				this.render(commandEncoder);
			}, { once: true });
		}
	}
	/**
	* Render all the {@link castingMeshes} into the {@link depthPassTarget}.
	* @param commandEncoder - {@link GPUCommandEncoder} to use.
	*/
	renderDepthPass(commandEncoder) {
		this.renderer.pipelineManager.resetCurrentPipeline();
		const depthPass = this.depthPassTarget.renderPass.beginRenderPass(commandEncoder);
		if (!this.renderer.production) depthPass.pushDebugGroup(`${this.light.type}Shadow (index: ${this.index}): depth pass`);
		if (this.renderBundle) this.renderBundle.render(depthPass);
		else for (const [uuid, depthMesh] of this.depthMeshes) {
			if (!this.castingMeshes.get(uuid)?.visible) continue;
			depthMesh.render(depthPass);
		}
		if (!this.renderer.production) depthPass.popDebugGroup();
		depthPass.end();
	}
	/**
	* Get the default depth pass vertex shader for this {@link Shadow}.
	* parameters - {@link VertexShaderInputBaseParams} used to compute the output `worldPosition` and `normal` vectors.
	* @returns - Depth pass vertex shader.
	*/
	getDefaultShadowDepthVs({ bindings = [], geometry }) {
		return { code: `@vertex fn main(@location(0) position: vec4f) -> @builtin(position) vec4f { return position; }` };
	}
	/**
	* Get the default depth pass fragment shader for this {@link Shadow}.
	* @returns - A {@link ShaderOptions} if a depth pass fragment shader is needed, `false` otherwise.
	*/
	getDefaultShadowDepthFs() {
		return false;
	}
	/**
	* Patch the given {@link Mesh | mesh} material parameters to create the depth mesh.
	* @param mesh - original {@link Mesh | mesh} to use.
	* @param parameters - Optional additional parameters to use for the depth mesh.
	* @returns - Patched parameters.
	*/
	patchShadowCastingMeshParams(mesh, parameters = {}) {
		parameters = {
			...mesh.material.options.rendering,
			...parameters
		};
		parameters.targets = [];
		const bindings = [];
		mesh.material.inputsBindings.forEach((binding) => {
			if (binding.name.includes("skin") || binding.name.includes("morphTarget")) bindings.push(binding);
		});
		const instancesBinding = mesh.material.getBufferBindingByName("instances");
		if (instancesBinding) bindings.push(instancesBinding);
		if (parameters.bindings) parameters.bindings = [...bindings, ...parameters.bindings];
		else parameters.bindings = [...bindings];
		if (!parameters.shaders) parameters.shaders = {
			vertex: this.getDefaultShadowDepthVs({
				bindings,
				geometry: mesh.geometry
			}),
			fragment: this.getDefaultShadowDepthFs()
		};
		return parameters;
	}
	/**
	* Add a {@link Mesh} to the shadow map. Internally called by the {@link Mesh} if its `castShadows` parameters has been set to `true`, but can also be called externally to selectively cast shadows or to add specific parameters (such as custom depth pass shaders).
	* - {@link patchShadowCastingMeshParams | Patch} the parameters.
	* - Create a new depth {@link Mesh} with the patched parameters.
	* - Add the {@link Mesh} to the {@link castingMeshes} Map.
	* @param mesh - {@link Mesh} to add to the shadow map.
	* @param parameters - Optional {@link RenderMaterialParams | parameters} to use for the depth mesh.
	*/
	addShadowCastingMesh(mesh, parameters = {}) {
		if (this.castingMeshes.get(mesh.uuid)) return;
		mesh.options.castShadows = true;
		parameters = this.patchShadowCastingMeshParams(mesh, parameters);
		if (this.depthMeshes.get(mesh.uuid)) {
			this.depthMeshes.get(mesh.uuid).remove();
			this.depthMeshes.delete(mesh.uuid);
		}
		if (this.renderBundle) this.renderBundle.size = this.depthMeshes.size + 1;
		const depthMesh = new Mesh(this.renderer, {
			label: `${this.light.type}Shadow (index: ${this.index}) ${mesh.options.label} depth mesh`,
			...parameters,
			geometry: mesh.geometry,
			targets: [],
			outputTarget: this.depthPassTarget,
			frustumCulling: false,
			autoRender: this.#autoRender,
			...this.renderBundle && { renderBundle: this.renderBundle }
		});
		if (!this.#autoRender && this.renderBundle) this.renderBundle.meshes.set(depthMesh.uuid, depthMesh);
		depthMesh.parent = mesh;
		this.depthMeshes.set(mesh.uuid, depthMesh);
		this.castingMeshes.set(mesh.uuid, mesh);
	}
	/**
	* Add a shadow receiving {@link Mesh} to the #receivingMeshes {@link Map}.
	* @param mesh - Shadow receiving {@link Mesh} to add.
	*/
	addShadowReceivingMesh(mesh) {
		this.#receivingMeshes.set(mesh.uuid, mesh);
	}
	/**
	* Remove a shadow receiving {@link Mesh} from the #receivingMeshes {@link Map}.
	* @param mesh - Shadow receiving {@link Mesh} to remove.
	*/
	removeShadowReceivingMesh(mesh) {
		this.#receivingMeshes.delete(mesh.uuid);
		if (this.#receivingMeshes.size === 0 && !this.isActive) this.destroyDepthTexture();
	}
	/**
	* Remove a {@link Mesh} from the shadow map and destroy its depth mesh.
	* @param mesh - {@link Mesh} to remove.
	*/
	removeMesh(mesh) {
		const depthMesh = this.depthMeshes.get(mesh.uuid);
		if (depthMesh) {
			depthMesh.remove();
			this.depthMeshes.delete(mesh.uuid);
		}
		this.castingMeshes.delete(mesh.uuid);
		if (this.castingMeshes.size === 0) this.clearDepthTexture();
	}
	/**
	* If one of the {@link castingMeshes} had its geometry change, update the corresponding depth mesh geometry as well.
	* @param mesh - Original {@link Mesh} which geometry just changed.
	* @param geometry - New {@link Mesh} {@link Geometry} to use.
	*/
	updateMeshGeometry(mesh, geometry) {
		const depthMesh = this.depthMeshes.get(mesh.uuid);
		if (depthMesh) depthMesh.useGeometry(geometry);
	}
	/**
	* Destroy the {@link Shadow}.
	*/
	destroy() {
		this.onPropertyChanged("isActive", 0);
		this.#isActive = false;
		if (this.renderBundle) this.renderBundle.destroy();
		this.castingMeshes.forEach((mesh) => this.removeMesh(mesh));
		this.castingMeshes = /* @__PURE__ */ new Map();
		this.depthMeshes = /* @__PURE__ */ new Map();
		this.depthPassTarget?.destroy();
		if (this.#receivingMeshes.size === 0) this.destroyDepthTexture();
	}
};
//#endregion
export { Shadow, shadowStruct };
