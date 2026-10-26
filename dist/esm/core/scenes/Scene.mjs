import { throwWarning } from "../../utils/utils.mjs";
import { Vec3 } from "../../math/Vec3.mjs";
import { Object3D } from "../objects3D/Object3D.mjs";
import { isRenderer } from "../renderers/utils.mjs";
import { Mesh } from "../meshes/Mesh.mjs";
//#region src/core/scenes/Scene.ts
const camPosA = new Vec3();
const camPosB = new Vec3();
const posA = new Vec3();
const posB = new Vec3();
/**
* Used to by the {@link Renderer} to render everything that needs to be rendered (compute passes, meshes and/or render bundles) in the right order with the right pass descriptors and target textures, perform textures copy at the right time, etc.
*
* ## Render order
*
* - Run all the {@link ComputePass} first, sorted by their {@link ComputePass#renderOrder | renderOrder}
* - Then render all {@link renderPassEntries} `pingPong` entries Meshes or {@link RenderBundle}, sorted by their {@link PingPongPlane#renderOrder | renderOrder}.
* - Then all Meshes that need to be rendered into specific {@link renderPassEntries} outputTarget entries:
*   - First, the opaque unprojected Meshes (i.e. opaque {@link core/meshes/FullscreenPlane.FullscreenPlane | FullscreenPlane}  or {@link RenderBundle}, if any), sorted by their {@link core/meshes/FullscreenPlane.FullscreenPlane#renderOrder | renderOrder}.
*   - Then, the transparent unprojected Meshes (i.e. transparent {@link core/meshes/FullscreenPlane.FullscreenPlane | FullscreenPlane} or {@link RenderBundle}, if any), sorted by their {@link core/meshes/FullscreenPlane.FullscreenPlane#renderOrder | renderOrder}.
*   - Then render all {@link renderPassEntries} `prePass` entries {@link ShaderPass}, sorted by their {@link ShaderPass#renderOrder | renderOrder}. This would be mainly used for "blit" passes rendered before the content that needs to be actually rendered on the main screen buffer.
*   - Then, the opaque projected Meshes (i.e. opaque {@link core/meshes/Mesh.Mesh | Mesh}, {@link curtains/meshes/DOMMesh.DOMMesh | DOMMesh}, {@link curtains/meshes/Plane.Plane | Plane}) or {@link RenderBundle}, sorted by their {@link core/meshes/Mesh.Mesh#renderOrder | renderOrder}.
*   - Finally, the transparent projected Meshes (i.e. transparent {@link core/meshes/Mesh.Mesh | Mesh}, {@link curtains/meshes/DOMMesh.DOMMesh | DOMMesh}, {@link curtains/meshes/Plane.Plane | Plane} or {@link RenderBundle}), sorted by their Z position and then their {@link core/meshes/Mesh.Mesh#renderOrder | renderOrder}.
* - Next, all the Meshes that need to be rendered directly to the {@link renderPassEntries} screen main buffer (the {@link Renderer} current texture), in the same order than above. The `screen` {@link renderPassEntries} array can have multiple entries, allowing you to render first a given set of meshes, the perform any operation (like getting the outputted content) before rendering another set of meshes.
* - Finally, all the post processing {@link ShaderPass} in the `postProPass` {@link renderPassEntries} array.
*/
var Scene = class extends Object3D {
	/**
	* Keep track of the current {@link RenderingState}.
	* @private
	*/
	#renderingState;
	/**
	* Scene constructor
	* @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link Scene}.
	*/
	constructor({ renderer }) {
		super();
		renderer = isRenderer(renderer, "Scene");
		this.renderer = renderer;
		this.#resetRenderingState();
		this.computePassEntries = [];
		this.renderPassEntries = {
			/** Array of {@link RenderPassEntry} that will handle {@link PingPongPlane}. Each {@link PingPongPlane} will be added as a distinct {@link RenderPassEntry} here. */
			pingPong: [],
			/** Array of {@link RenderPassEntry} that will render to a specific {@link RenderTarget} before rendering to the screen. Each {@link RenderTarget} not using `isPostTarget` option will be added as a distinct {@link RenderPassEntry} here. */
			renderTarget: [],
			/** Array of {@link RenderPassEntry} containing {@link ShaderPass} that will render directly to the screen before rendering any other pass to the screen. Useful to perform "blit" pass before actually rendering the usual scene content. */
			prePass: [],
			/** Array of {@link RenderPassEntry} that will render directly to the screen. Our first and default entry will contain all the Meshes that do not have any {@link RenderTarget} assigned. You can create following entries for custom scene rendering management process. */
			screen: [],
			/** Array of {@link RenderPassEntry} that will render to a specific {@link RenderTarget} after the screen passes have been rendered. Each {@link RenderTarget} using the `isPostTarget` option will be added as a distinct {@link RenderPassEntry} here. */
			postRenderTarget: [],
			/**Array of {@link RenderPassEntry} containing post processing {@link ShaderPass} that will render directly to the screen after everything has been drawn. */
			postProPass: []
		};
	}
	/**
	* Reset our rendering state.
	* @private
	*/
	#resetRenderingState() {
		this.#renderingState = {
			loadColor: false,
			loadDepth: false,
			storeColor: false,
			storeDepth: false,
			currentRenderPass: null,
			previousTextureId: null,
			nextTextureId: null,
			uniqueTexturesIds: /* @__PURE__ */ new Set(),
			frameTexturesIds: [],
			uniqueDepthTexturesIds: /* @__PURE__ */ new Set(),
			frameDepthTexturesIds: []
		};
	}
	/**
	* Create a new {@link RenderPassEntry} in the {@link renderPassEntries} `screen` array.
	* @param label - Optional label to use for this {@link RenderPassEntry}.
	* @param order - Optional order into which insert this {@link renderPassEntries} `screen` array. A positive number means at the end of the array, a negative number means at the beginning. Default to `1`.
	* @returns - The new {@link RenderPassEntry}.
	*/
	createScreenPassEntry(label = "", order = 1) {
		const screenPassEntry = {
			label,
			renderPass: this.renderer.renderPass,
			renderTexture: null,
			onBeforeRenderPass: null,
			onAfterRenderPass: null,
			useCustomRenderPass: null,
			element: null,
			stack: {
				unProjected: {
					opaque: [],
					transparent: []
				},
				projected: {
					opaque: [],
					transparent: []
				}
			}
		};
		if (order >= 0) this.renderPassEntries.screen.push(screenPassEntry);
		else this.renderPassEntries.screen.unshift(screenPassEntry);
		return screenPassEntry;
	}
	/**
	* Set the main {@link Renderer} render pass entry.
	*/
	setMainRenderPassEntry() {
		this.createScreenPassEntry("Main scene screen render pass");
	}
	/**
	* Get the number of meshes a {@link RenderPassEntry | render pass entry} should draw.
	* @param renderPassEntry - The {@link RenderPassEntry | render pass entry} to test.
	*/
	getRenderPassEntryLength(renderPassEntry) {
		if (!renderPassEntry) return 0;
		else return renderPassEntry.element ? renderPassEntry.element.visible ? 1 : 0 : renderPassEntry.stack.unProjected.opaque.length + renderPassEntry.stack.unProjected.transparent.length + renderPassEntry.stack.projected.opaque.length + renderPassEntry.stack.projected.transparent.length;
	}
	/**
	* Add a {@link ComputePass} to our scene {@link computePassEntries} array.
	* @param computePass - {@link ComputePass} to add.
	*/
	addComputePass(computePass) {
		this.computePassEntries.push(computePass);
		this.computePassEntries.sort((a, b) => {
			if (a.renderOrder !== b.renderOrder) return a.renderOrder - b.renderOrder;
			else return a.index - b.index;
		});
	}
	/**
	* Remove a {@link ComputePass} from our scene {@link computePassEntries} array.
	* @param computePass - {@link ComputePass} to remove.
	*/
	removeComputePass(computePass) {
		this.computePassEntries = this.computePassEntries.filter((cP) => cP.uuid !== computePass.uuid);
	}
	/**
	* Add a {@link RenderTarget} to our scene {@link renderPassEntries} outputTarget array.
	* Every Meshes later added to this {@link RenderTarget} will be rendered to the {@link RenderTarget#renderTexture | RenderTarget Texture} using the {@link RenderTarget#renderPass.descriptor | RenderTarget RenderPass descriptor}.
	* @param renderTarget - {@link RenderTarget} to add.
	*/
	addRenderTarget(renderTarget) {
		const targetPassEntries = renderTarget.options.isPostTarget ? this.renderPassEntries.postRenderTarget : this.renderPassEntries.renderTarget;
		if (!targetPassEntries.find((entry) => entry.renderPass.uuid === renderTarget.renderPass.uuid)) targetPassEntries.push({
			label: renderTarget.options.label ? `${renderTarget.options.label} pass entry` : `RenderTarget ${renderTarget.uuid} pass entry`,
			renderPass: renderTarget.renderPass,
			renderTexture: renderTarget.renderTexture,
			onBeforeRenderPass: null,
			onAfterRenderPass: null,
			useCustomRenderPass: null,
			element: null,
			stack: {
				unProjected: {
					opaque: [],
					transparent: []
				},
				projected: {
					opaque: [],
					transparent: []
				}
			}
		});
	}
	/**
	* Remove a {@link RenderTarget} from our scene {@link renderPassEntries} outputTarget array.
	* @param renderTarget - {@link RenderTarget} to remove.
	*/
	removeRenderTarget(renderTarget) {
		const filteredEntries = (renderTarget.options.isPostTarget ? this.renderPassEntries.postRenderTarget : this.renderPassEntries.renderTarget).filter((entry) => entry.renderPass.uuid !== renderTarget.renderPass.uuid);
		if (renderTarget.options.isPostTarget) this.renderPassEntries.postRenderTarget = filteredEntries;
		else this.renderPassEntries.renderTarget = filteredEntries;
	}
	/**
	* Get the {@link RenderPassEntry} in the {@link renderPassEntries} `renderTarget` array (or `screen` array if no {@link RenderTarget} is passed) corresponding to the given {@link RenderTarget}.
	* @param renderTarget - {@link RenderTarget} to use to retrieve the {@link RenderPassEntry} if any.
	* @returns - {@link RenderPassEntry} found.
	*/
	getRenderTargetPassEntry(renderTarget = null) {
		if (renderTarget) return (renderTarget.options.isPostTarget ? this.renderPassEntries.postRenderTarget : this.renderPassEntries.renderTarget).find((passEntry) => passEntry.renderPass.uuid === renderTarget.renderPass.uuid);
		else return this.renderPassEntries.screen.find((passEntry) => passEntry.renderPass.uuid === this.renderer.renderPass.uuid);
	}
	/**
	* Get the correct {@link renderPassEntries | render pass entry} (either {@link renderPassEntries} outputTarget or {@link renderPassEntries} screen) {@link Stack} onto which this Mesh should be added, depending on whether it's projected or not.
	* @param mesh - Mesh to check.
	* @returns - The corresponding render pass entry {@link Stack}.
	*/
	getMeshProjectionStack(mesh) {
		const isTransparent = mesh.transparent;
		const hasRendererTransmissionPassEntry = "transmissionTarget" in this.renderer && this.renderer.transmissionTarget && this.renderer.transmissionTarget.passEntry;
		const isTransmissive = "transmissive" in mesh.options && mesh.options.transmissive;
		const { stack } = mesh.options.useCustomScenePassEntry ? mesh.options.useCustomScenePassEntry : isTransmissive || hasRendererTransmissionPassEntry && isTransparent ? this.renderer.transmissionTarget.passEntry : this.getRenderTargetPassEntry(mesh.outputTarget);
		return mesh.material.options.rendering.useProjection ? stack.projected : stack.unProjected;
	}
	/**
	* Order a {@link SceneStackedObject} array by using the {@link core/meshes/Mesh.Mesh.renderOrder | renderOrder} or {@link core/meshes/Mesh.Mesh.index | index} properties.
	* @param stack - {@link SceneStackedObject} to sort, filled with {@link RenderedMesh} or {@link RenderBundle}.
	*/
	orderStack(stack) {
		stack.sort((a, b) => {
			return a.renderOrder - b.renderOrder || a.index - b.index;
		});
	}
	/**
	* Test whether a {@link SceneStackedObject} is a {@link RenderBundle} or not.
	* @param object - Object to test.
	* @returns - Whether the object is a {@link RenderBundle} or not.
	*/
	isStackObjectRenderBundle(object) {
		return object.type === "RenderBundle";
	}
	/**
	* Add a {@link SceneStackedMesh} to the given {@link RenderTarget} corresponding {@link RenderPassEntry}.
	* @param mesh - {@link SceneStackedMesh} to add.
	* @param renderTarget - {@link RenderTarget} to get the {@link RenderPassEntry} from. If not set, will add to the first {@link renderPassEntries} `screen` array entry.
	*/
	addMeshToRenderTargetStack(mesh, renderTarget = null) {
		const { stack } = this.getRenderTargetPassEntry(renderTarget);
		const isTransparent = !!mesh.transparent;
		const projectionStack = mesh.material.options.rendering.useProjection ? stack.projected : stack.unProjected;
		const similarMeshes = isTransparent ? projectionStack.transparent : projectionStack.opaque;
		similarMeshes.push(mesh);
		this.orderStack(similarMeshes);
	}
	/**
	* Add a Mesh to the correct {@link renderPassEntries | render pass entry} {@link Stack} array.
	* Meshes are then ordered by their {@link core/meshes/mixins/MeshBaseMixin.MeshBaseClass#index | indexes (order of creation]}, {@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry#index | pipeline entry indexes} and then {@link core/meshes/mixins/MeshBaseMixin.MeshBaseClass#renderOrder | renderOrder}.
	* @param mesh - Mesh to add.
	*/
	addMesh(mesh) {
		if (mesh.renderBundle) mesh.renderBundle.addMesh(mesh, mesh.outputTarget ? mesh.outputTarget.renderPass : this.renderer.renderPass);
		const { useProjection } = mesh.material.options.rendering;
		if (!mesh.renderBundle) {
			const projectionStack = this.getMeshProjectionStack(mesh);
			const similarMeshes = !!mesh.transparent ? projectionStack.transparent : projectionStack.opaque;
			similarMeshes.push(mesh);
			this.orderStack(similarMeshes);
		}
		if ("parent" in mesh && !mesh.parent && useProjection) mesh.parent = this;
	}
	/**
	* Remove a Mesh from our {@link Scene}.
	* @param mesh - Mesh to remove.
	*/
	removeMesh(mesh) {
		if (mesh.renderBundle) mesh.renderBundle.removeMesh(mesh, false);
		else {
			const projectionType = mesh.material.options.rendering.useProjection ? "projected" : "unProjected";
			const transparencyType = !!mesh.transparent ? "transparent" : "opaque";
			for (const renderPassEntries of Object.values(this.renderPassEntries)) renderPassEntries.forEach((renderPassEntry) => {
				if (renderPassEntry.stack) renderPassEntry.stack[projectionType][transparencyType] = renderPassEntry.stack[projectionType][transparencyType].filter((m) => m.uuid !== mesh.uuid);
			});
		}
		if ("transmissive" in mesh.options && mesh.options.transmissive) {
			const transmissivePassEntry = this.renderer.transmissionTarget.passEntry;
			if ((transmissivePassEntry ? this.getRenderPassEntryLength(transmissivePassEntry) : 0) === 0) this.renderer.destroyTransmissionTarget();
		}
		if ("parent" in mesh && mesh.parent && mesh.parent.object3DIndex === this.object3DIndex) mesh.parent = null;
	}
	/**
	* Add a {@link RenderBundle} to the correct {@link renderPassEntries | render pass entry} {@link Stack} array.
	* @param renderBundle - {@link RenderBundle} to add.
	* @param projectionStack - {@link ProjectionStack} onto which to add the {@link RenderBundle}.
	*/
	addRenderBundle(renderBundle, projectionStack) {
		const similarObjects = renderBundle.transparent ? projectionStack.transparent : projectionStack.opaque;
		similarObjects.push(renderBundle);
		this.orderStack(similarObjects);
	}
	/**
	* Remove a {@link RenderBundle} from our {@link Scene}.
	* @param renderBundle - {@link RenderBundle} to remove.
	*/
	removeRenderBundle(renderBundle) {
		const projectionType = !!renderBundle.useProjection ? "projected" : "unProjected";
		const transparencyType = !!renderBundle.transparent ? "transparent" : "opaque";
		const renderPassEntry = [...this.renderPassEntries.renderTarget, ...this.renderPassEntries.postRenderTarget].find((passEntry) => passEntry.renderPass.uuid === renderBundle.options.renderPass?.uuid);
		if (renderPassEntry) {
			const { stack } = renderPassEntry;
			const projectionStack = stack[projectionType];
			projectionStack[transparencyType] = projectionStack[transparencyType].filter((bundle) => bundle.uuid !== renderBundle.uuid);
		} else this.renderPassEntries.screen.forEach((renderPassEntry) => {
			if (renderPassEntry.stack) renderPassEntry.stack[projectionType][transparencyType] = renderPassEntry.stack[projectionType][transparencyType].filter((m) => m.uuid !== renderBundle.uuid);
		});
	}
	/**
	* Add a {@link ShaderPass} to our scene {@link renderPassEntries} `prePass` or `postProPass` array.
	* Before rendering the {@link ShaderPass}, we will copy the correct input texture into its {@link ShaderPass#renderTexture | renderTexture}.
	* This also handles the {@link renderPassEntries} `postProPass` array entries order: We will first draw selective passes and then finally global post processing passes.
	* @see {@link https://codesandbox.io/p/sandbox/webgpu-render-to-2-textures-without-texture-copy-c4sx4s?file=%2Fsrc%2Findex.js%3A10%2C4 | minimal code example}
	* @param shaderPass - {@link ShaderPass} to add.
	*/
	addShaderPass(shaderPass) {
		if (!shaderPass.renderTexture) return;
		const onAfterRenderPass = shaderPass.options.copyOutputToRenderTexture ? (commandEncoder, swapChainTexture) => {
			if (shaderPass.renderTexture && swapChainTexture) this.renderer.copyGPUTextureToTexture(swapChainTexture, shaderPass.renderTexture, commandEncoder);
		} : null;
		const outputPass = shaderPass.outputTarget ? shaderPass.outputTarget.renderPass : !shaderPass.options.isPrePass ? this.renderer.postProcessingPass : this.renderer.renderPass;
		const shaderPassEntry = {
			label: shaderPass.options.isPrePass ? shaderPass.options.label + " scene pre pass" : shaderPass.options.label + " scene post processing pass",
			renderPass: outputPass,
			renderTexture: shaderPass.outputTarget ? shaderPass.outputTarget.renderTexture : null,
			onBeforeRenderPass: null,
			onAfterRenderPass,
			useCustomRenderPass: null,
			element: shaderPass,
			stack: null
		};
		if (shaderPass.renderBundle) {
			const { renderBundle } = shaderPass;
			if (renderBundle.meshes.size >= 1) {
				throwWarning(`${renderBundle.options.label} (${renderBundle.type}): Cannot add more than 1 ShaderPass to a render bundle. This ShaderPass will not be added: ${shaderPass.options.label}`);
				shaderPass.renderBundle = null;
			} else renderBundle.addMesh(shaderPass, outputPass);
		}
		if (!shaderPass.options.isPrePass) {
			this.renderPassEntries.postProPass.push(shaderPassEntry);
			this.renderPassEntries.postProPass.sort((a, b) => {
				const isPostProA = a.element && !a.element.outputTarget;
				const renderOrderA = a.element ? a.element.renderOrder : 0;
				const indexA = a.element ? a.element.index : 0;
				const isPostProB = b.element && !b.element.outputTarget;
				const renderOrderB = b.element ? b.element.renderOrder : 0;
				const indexB = b.element ? b.element.index : 0;
				if (isPostProA && !isPostProB) return 1;
				else if (!isPostProA && isPostProB) return -1;
				else if (renderOrderA !== renderOrderB) return renderOrderA - renderOrderB;
				else return indexA - indexB;
			});
		} else {
			this.renderPassEntries.prePass.push(shaderPassEntry);
			this.renderPassEntries.prePass.sort((a, b) => a.element.renderOrder - b.element.renderOrder || a.element.index - b.element.index);
		}
		this.setShaderPassesTextureChain();
	}
	/**
	* Remove a {@link ShaderPass} from our scene {@link renderPassEntries} `prePass` or `postProPass` array.
	* @param shaderPass - {@link ShaderPass} to remove.
	*/
	removeShaderPass(shaderPass) {
		if (shaderPass.renderBundle) shaderPass.renderBundle.empty();
		if (!shaderPass.options.isPrePass) this.renderPassEntries.postProPass = this.renderPassEntries.postProPass.filter((entry) => !entry.element || entry.element.uuid !== shaderPass.uuid);
		else this.renderPassEntries.prePass = this.renderPassEntries.prePass.filter((entry) => !entry.element || entry.element.uuid !== shaderPass.uuid);
		this.setShaderPassesTextureChain();
	}
	/**
	* Get all pre pocessing pass entries that are actually rendered to the screen.
	* @readonly
	* @returns - All pre pocessing pass entries actually rendered to the screen if any.
	*/
	get activePreScreenShaderPassEntries() {
		return this.renderPassEntries.prePass.filter((entry) => entry.element && !entry.element.outputTarget && entry.element.visible);
	}
	/**
	* Get all post pocessing pass entries that are actually rendered to the screen.
	* @readonly
	* @returns - All post pocessing pass entries actually rendered to the screen if any.
	*/
	get activePostProScreenShaderPassEntries() {
		return this.renderPassEntries.postProPass.filter((entry) => entry.element && !entry.element.outputTarget && entry.element.visible);
	}
	/**
	* Set all pre processing pass entries render textures chaining.
	*/
	setPreScreenShaderPassesTextureChain() {
		this.activePreScreenShaderPassEntries.forEach((prePass, index) => {
			if (index === this.activePreScreenShaderPassEntries.length - 1) if (this.activePostProScreenShaderPassEntries.length) {
				prePass.renderTexture = this.renderer.renderPass.outputTextures?.[0] ?? null;
				prePass.element.setRenderingOptionsForRenderPass(this.renderer.renderPass);
			} else {
				prePass.renderTexture = null;
				prePass.renderPass = this.renderer.linearPass ?? this.renderer.renderPass;
				prePass.element.setRenderingOptionsForRenderPass(this.renderer.linearPass ?? this.renderer.renderPass);
			}
			else {
				prePass.renderTexture = this.renderer.renderPass.outputTextures?.[0] ?? null;
				prePass.element.setRenderingOptionsForRenderPass(this.renderer.renderPass);
			}
		});
	}
	/**
	* Set all post processing pass entries render textures chaining.
	*/
	setPostProScreenShaderPassesTextureChain() {
		this.activePostProScreenShaderPassEntries.forEach((postProPass, index) => {
			if (index < this.activePostProScreenShaderPassEntries.length - 1) {
				const nextEntry = this.activePostProScreenShaderPassEntries[index + 1];
				if (postProPass.element.inputTarget && nextEntry.element.inputTarget) postProPass.renderTexture = this.renderer.renderPass.outputTextures?.[0] ?? null;
				else postProPass.renderTexture = nextEntry.element.renderTexture;
			}
			if (this.renderer.linearPass) if (index === this.activePostProScreenShaderPassEntries.length - 1) {
				postProPass.renderPass = this.renderer.linearPass;
				postProPass.element.setRenderingOptionsForRenderPass(this.renderer.linearPass);
			} else {
				postProPass.renderPass = this.renderer.postProcessingPass;
				postProPass.element.setRenderingOptionsForRenderPass(this.renderer.postProcessingPass);
			}
		});
		if (this.activePostProScreenShaderPassEntries.length) this.renderPassEntries.screen.forEach((passEntry) => {
			const firstPostProWithoutInput = this.activePostProScreenShaderPassEntries.findIndex((postProPass) => !postProPass.element.inputTarget);
			passEntry.renderTexture = firstPostProWithoutInput === -1 ? null : this.activePostProScreenShaderPassEntries[firstPostProWithoutInput]?.element?.renderTexture;
		});
		else this.renderPassEntries.screen.forEach((passEntry) => passEntry.renderTexture = null);
	}
	/**
	* Set all pre and post processing pass entries render textures chaining.
	*/
	setShaderPassesTextureChain() {
		this.setPostProScreenShaderPassesTextureChain();
		this.setPreScreenShaderPassesTextureChain();
	}
	/**
	* Add a {@link PingPongPlane} to our scene {@link renderPassEntries} pingPong array.
	* After rendering the {@link PingPongPlane}, we will copy the context current texture into its {@link PingPongPlane#renderTexture | renderTexture} so we'll be able to use it as an input for the next pass.
	* @see {@link https://codesandbox.io/p/sandbox/webgpu-render-ping-pong-to-texture-use-in-quad-gwjx9p | minimal code example}.
	* @param pingPongPlane - {@link PingPongPlane} to add.
	*/
	addPingPongPlane(pingPongPlane) {
		this.renderPassEntries.pingPong.push({
			label: pingPongPlane.options.label + " scene pass",
			renderPass: pingPongPlane.outputTarget.renderPass,
			renderTexture: pingPongPlane.outputTarget.renderTexture,
			onBeforeRenderPass: null,
			onAfterRenderPass: (commandEncoder, swapChainTexture) => {
				this.renderer.copyGPUTextureToTexture(swapChainTexture, pingPongPlane.renderTexture, commandEncoder);
			},
			useCustomRenderPass: null,
			element: pingPongPlane,
			stack: null
		});
		if (pingPongPlane.renderBundle) {
			const { renderBundle } = pingPongPlane;
			if (renderBundle.meshes.size >= 1) {
				throwWarning(`${renderBundle.options.label} (${renderBundle.type}): Cannot add more than 1 PingPongPlane to a render bundle. This PingPongPlane will not be added: ${pingPongPlane.options.label}`);
				pingPongPlane.renderBundle = null;
			} else renderBundle.addMesh(pingPongPlane, pingPongPlane.outputTarget.renderPass);
		}
		this.renderPassEntries.pingPong.sort((a, b) => a.element.renderOrder - b.element.renderOrder);
	}
	/**
	* Remove a {@link PingPongPlane} from our scene {@link renderPassEntries} pingPong array.
	* @param pingPongPlane - {@link PingPongPlane} to remove.
	*/
	removePingPongPlane(pingPongPlane) {
		if (pingPongPlane.renderBundle) pingPongPlane.renderBundle.empty();
		this.renderPassEntries.pingPong = this.renderPassEntries.pingPong.filter((entry) => entry.element.uuid !== pingPongPlane.uuid);
	}
	/**
	* Get any rendered object or {@link RenderTarget} {@link RenderPassEntry}. Useful to override a {@link RenderPassEntry#onBeforeRenderPass | RenderPassEntry onBeforeRenderPass} or {@link RenderPassEntry#onAfterRenderPass | RenderPassEntry onAfterRenderPass} default behavior.
	* @param object - The object from which we want to get the parentMesh {@link RenderPassEntry}
	* @returns - The {@link RenderPassEntry} if found.
	*/
	getObjectRenderPassEntry(object) {
		if (object.type === "RenderTarget") return (object.options.isPostTarget ? this.renderPassEntries.postRenderTarget : this.renderPassEntries.renderTarget).find((entry) => entry.renderPass.uuid === object.renderPass.uuid);
		else if (object.type === "PingPongPlane") return this.renderPassEntries.pingPong.find((entry) => entry.element.uuid === object.uuid);
		else if (object.type === "ShaderPass") if (object.options.isPrePass) return this.renderPassEntries.prePass.find((entry) => entry.element?.uuid === object.uuid);
		else return this.renderPassEntries.postProPass.find((entry) => entry.element?.uuid === object.uuid);
		else {
			const entryType = object.outputTarget ? "renderTarget" : "screen";
			if (object.renderBundle) return this.renderPassEntries[entryType].find((entry) => {
				return [
					...entry.stack.unProjected.opaque,
					...entry.stack.unProjected.transparent,
					...entry.stack.projected.opaque,
					...entry.stack.projected.transparent
				].filter((object) => object.type === "RenderBundle").some((bundle) => {
					return bundle.meshes.get(object.uuid);
				});
			});
			else return this.renderPassEntries[entryType].find((entry) => {
				return [
					...entry.stack.unProjected.opaque,
					...entry.stack.unProjected.transparent,
					...entry.stack.projected.opaque,
					...entry.stack.projected.transparent
				].some((mesh) => mesh.uuid === object.uuid);
			});
		}
	}
	/**
	* Sort transparent projected meshes by their render order or distance to the camera (farther meshes should be drawn first).
	* @param meshes - Transparent projected meshes array to sort.
	*/
	sortTransparentMeshes(meshes) {
		meshes.sort((meshA, meshB) => {
			if (meshA.renderOrder !== meshB.renderOrder) return meshA.renderOrder - meshB.renderOrder;
			if (this.isStackObjectRenderBundle(meshA) || this.isStackObjectRenderBundle(meshB)) return meshA.renderOrder - meshB.renderOrder;
			const getCenter = (mesh, out) => {
				if (mesh.geometry) out.copy(mesh.geometry.boundingBox.center).applyMat4(mesh.worldMatrix);
				else mesh.worldMatrix.getTranslation(out);
				return out;
			};
			getCenter(meshA, posA);
			getCenter(meshB, posB);
			const radiusA = meshA.geometry ? meshA.geometry.boundingBox.radius * meshA.worldMatrix.getMaxScaleOnAxis() : 0;
			const radiusB = meshB.geometry ? meshB.geometry.boundingBox.radius * meshB.worldMatrix.getMaxScaleOnAxis() : 0;
			return meshB.camera.worldMatrix.getTranslation(camPosB).distance(posB) - radiusB - (meshA.camera.worldMatrix.getTranslation(camPosA).distance(posA) - radiusA);
		});
	}
	/**
	* Sort transparent and transmissive meshes and eventually swap transparent meshes stack so they are drawn before or after transmissive meshes based on their distance to camera.
	*/
	/**
	* Get the {@link RenderPassEntry} {@link Texture.uuid | Rexture unique ID} onto which we'll draw.
	* @param renderPassEntry - Given {@link RenderPassEntry}.
	* @returns - {@link Texture.uuid | Rexture unique ID} onto which we'll draw (or `'context'` when drawing to the canvas).
	*/
	getTextureId(renderPassEntry) {
		if (!renderPassEntry.renderPass.options.useColorAttachments) return null;
		return (renderPassEntry.renderTexture?.options?.fromTexture ?? renderPassEntry.renderTexture ?? null)?.uuid ?? "context";
	}
	/**
	* Get the {@link RenderPassEntry} depth {@link Texture.uuid | Rexture unique ID} onto which we'll draw.
	* @param renderPassEntryType - {@link RenderPassEntriesType | Render pass entry type}.
	* @param renderPassEntry - Given {@link RenderPassEntry}.
	* @returns - Depth {@link Texture.uuid | Rexture unique ID} onto which we'll draw, or null if not set.
	*/
	getDepthTextureId(renderPassEntryType = "screen", renderPassEntry) {
		return renderPassEntryType === "prePass" || renderPassEntryType === "postProPass" ? null : renderPassEntry.renderPass.depthTexture?.uuid ?? null;
	}
	/**
	* Force ending the current {@link GPURenderPassEncoder} if set.
	*/
	endCurrentRenderPass() {
		if (this.#renderingState.currentRenderPass) {
			this.#renderingState.currentRenderPass.end();
			this.#renderingState.currentRenderPass = null;
		}
	}
	/**
	* Here we render a {@link RenderPassEntry}:
	* - Set its {@link RenderPass#descriptor | renderPass descriptor} view or resolveTarget and get it at as swap chain texture.
	* - Execute {@link RenderPassEntry#onBeforeRenderPass | onBeforeRenderPass} callback if specified.
	* - Begin the {@link GPURenderPassEncoder | GPU render pass encoder} using our {@link RenderPass#descriptor | renderPass descriptor} if needed, or use the existing one.
	* - Draw the meshes by calling {@link renderRenderPassEntryMeshes}.
	* - End the {@link GPURenderPassEncoder | GPU render pass encoder} if needed.
	* - Execute {@link RenderPassEntry#onAfterRenderPass | onAfterRenderPass} callback if specified.
	* - Reset {@link core/pipelines/PipelineManager.PipelineManager#currentPipelineIndex | pipeline manager current pipeline}.
	* @param commandEncoder - Current {@link GPUCommandEncoder}.
	* @param renderPassEntry - {@link RenderPassEntry} to render.
	* @param forceEndPass - Whether to force the current {@link GPURenderPassEncoder} to end after this pass. Default to `false`.
	*/
	renderPassesEntry(commandEncoder, renderPassEntry, forceEndPass = false) {
		const isDifferentTexturePresentation = this.getTextureId(renderPassEntry) !== this.#renderingState.previousTextureId;
		const swapChainTexture = renderPassEntry.renderPass.updateView(renderPassEntry.renderTexture?.texture);
		if (renderPassEntry.onBeforeRenderPass) renderPassEntry.onBeforeRenderPass(commandEncoder, swapChainTexture);
		if (renderPassEntry.useCustomRenderPass) renderPassEntry.useCustomRenderPass(commandEncoder);
		else {
			if (!this.#renderingState.currentRenderPass || isDifferentTexturePresentation) {
				this.endCurrentRenderPass();
				this.#renderingState.currentRenderPass = renderPassEntry.renderPass.beginRenderPass(commandEncoder);
			}
			this.renderRenderPassEntryMeshes(this.#renderingState.currentRenderPass, renderPassEntry);
			if (forceEndPass || !this.#renderingState.nextTextureId || this.#renderingState.currentRenderPass && this.#renderingState.previousTextureId !== this.#renderingState.nextTextureId) this.endCurrentRenderPass();
		}
		if (renderPassEntry.onAfterRenderPass) renderPassEntry.onAfterRenderPass(commandEncoder, swapChainTexture);
		this.renderer.pipelineManager.resetCurrentPipeline();
	}
	/**
	* Here we render a {@link RenderPassEntry} meshes:
	* - Render the single element if specified or the render pass entry {@link Stack}: draw unprojected opaque / transparent meshes first, then set the {@link core/renderers/GPUCameraRenderer.GPUCameraRenderer#cameraLightsBindGroup | camera and lights bind group} and draw projected opaque / transparent meshes.
	* @param pass - Current {@link GPURenderPassEncoder}.
	* @param renderPassEntry - {@link RenderPassEntry} to render.
	*/
	renderRenderPassEntryMeshes(pass, renderPassEntry) {
		if (!this.renderer.production) pass.pushDebugGroup(renderPassEntry.element ? `${renderPassEntry.element.options.label} render pass on ${renderPassEntry.label} using ${renderPassEntry.renderPass.options.label} descriptor` : `Render stack pass on ${renderPassEntry.label} using ${renderPassEntry.renderPass.options.label}${renderPassEntry.renderTexture ? " onto " + renderPassEntry.renderTexture.options.label : ""}`);
		if (renderPassEntry.element) if (renderPassEntry.element.renderBundle) renderPassEntry.element.renderBundle.render(pass);
		else renderPassEntry.element.render(pass);
		else if (renderPassEntry.stack) {
			for (const mesh of renderPassEntry.stack.unProjected.opaque) mesh.render(pass);
			for (const mesh of renderPassEntry.stack.unProjected.transparent) mesh.render(pass);
			if (renderPassEntry.stack.projected.opaque.length || renderPassEntry.stack.projected.transparent.length) {
				for (const mesh of renderPassEntry.stack.projected.opaque) mesh.render(pass);
				const sortedMeshes = renderPassEntry.stack.projected.transparent.filter((o) => o instanceof Mesh);
				this.sortTransparentMeshes(sortedMeshes);
				for (const mesh of sortedMeshes) mesh.render(pass);
			}
		}
		if (!this.renderer.production) pass.popDebugGroup();
		return pass;
	}
	/**
	* Before actually rendering the scene, update matrix stack and frustum culling checks. Batching these calls greatly improve performance. Called by the {@link renderer} before rendering.
	*/
	onBeforeRender() {
		if ("lights" in this.renderer) this.renderer.lights.forEach((light) => {
			light.onBeforeRenderScene();
		});
		this.renderer.drawableObjects.forEach((mesh) => {
			mesh.onBeforeRenderScene();
		});
		this.renderer.animations.forEach((targetsAnimation) => targetsAnimation.update());
		this.updateMatrixStack();
		this.renderer.animations.forEach((targetsAnimation) => targetsAnimation.onAfterUpdate());
		for (const mesh of this.renderer.meshes) if ("checkFrustumCulling" in mesh && mesh.visible) mesh.checkFrustumCulling();
	}
	/**
	* Render our {@link Scene}.
	* - Execute {@link onBeforeRender} first.
	* - Then render {@link computePassEntries}.
	* - And finally render our {@link renderPassEntries}.
	* @param commandEncoder - Current {@link GPUCommandEncoder}.
	*/
	render(commandEncoder) {
		for (const computePass of this.computePassEntries) {
			const pass = commandEncoder.beginComputePass();
			if (!this.renderer.production) pass.pushDebugGroup(`${computePass.options.label}: begin compute pass`);
			computePass.render(pass);
			if (!this.renderer.production) pass.popDebugGroup();
			pass.end();
			computePass.copyBufferToResult(commandEncoder);
			this.renderer.pipelineManager.resetCurrentPipeline();
		}
		this.#resetRenderingState();
		const screenPrePassCount = this.activePreScreenShaderPassEntries?.length;
		const screenPostProPassCount = this.activePostProScreenShaderPassEntries?.length;
		const mergedPasses = Object.keys(this.renderPassEntries).reduce((acc, renderPassEntryType) => {
			acc.push({
				renderPassEntryType,
				renderPassEntries: this.renderPassEntries[renderPassEntryType]
			});
			return acc;
		}, []);
		mergedPasses.forEach(({ renderPassEntries, renderPassEntryType }) => {
			renderPassEntries.filter((renderPassEntry) => !!this.getRenderPassEntryLength(renderPassEntry)).forEach((renderPassEntry) => {
				const textureId = this.getTextureId(renderPassEntry);
				this.#renderingState.frameTexturesIds.push(textureId);
				const depthTextureId = this.getDepthTextureId(renderPassEntryType, renderPassEntry);
				this.#renderingState.frameDepthTexturesIds.push(depthTextureId);
			});
		});
		let globalIndex = 0;
		mergedPasses.forEach(({ renderPassEntryType, renderPassEntries }) => {
			if (renderPassEntryType === "postProPass") {
				this.renderer.renderPass.setDepthReadOnly(false);
				this.renderer.renderPass.setDepthLoadOp("clear");
			}
			const renderablePassEntries = renderPassEntries.filter((renderPassEntry) => !!this.getRenderPassEntryLength(renderPassEntry));
			renderablePassEntries.forEach((renderPassEntry, index) => {
				this.#renderingState.previousTextureId = globalIndex === 0 ? null : this.#renderingState.frameTexturesIds[globalIndex - 1];
				const textureId = this.getTextureId(renderPassEntry);
				this.#renderingState.nextTextureId = globalIndex < this.#renderingState.frameTexturesIds.length - 1 ? this.#renderingState.frameTexturesIds[globalIndex + 1] : null;
				const loadPrePassOntoScreen = renderPassEntryType === "screen" && !!screenPrePassCount;
				if (textureId) if (this.#renderingState.uniqueTexturesIds.has(textureId) || loadPrePassOntoScreen) this.#renderingState.loadColor = true;
				else {
					this.#renderingState.loadColor = false;
					this.#renderingState.uniqueTexturesIds.add(textureId);
				}
				else this.#renderingState.loadColor = false;
				const depthTextureId = this.getDepthTextureId(renderPassEntryType, renderPassEntry);
				if (depthTextureId) if (this.#renderingState.uniqueDepthTexturesIds.has(depthTextureId)) this.#renderingState.loadDepth = true;
				else {
					this.#renderingState.uniqueDepthTexturesIds.add(depthTextureId);
					this.#renderingState.loadDepth = false;
				}
				else this.#renderingState.loadDepth = false;
				if (renderPassEntryType === "postRenderTarget") this.#renderingState.loadDepth = false;
				if (renderPassEntryType === "prePass" || renderPassEntryType === "postProPass") renderPassEntry.renderPass.setDepthReadOnly(true);
				else renderPassEntry.renderPass.setDepthReadOnly(false);
				renderPassEntry.renderPass.setLoadOp(this.#renderingState.loadColor ? "load" : "clear");
				renderPassEntry.renderPass.setDepthLoadOp(this.#renderingState.loadDepth ? "load" : "clear");
				const isMSAA = renderPassEntry.renderPass.options.sampleCount > 1;
				this.#renderingState.storeColor = !renderPassEntry.renderTexture && !isMSAA;
				if (renderPassEntryType === "pingPong" || renderPassEntryType === "prePass") this.#renderingState.storeColor = true;
				if (renderPassEntryType === "renderTarget" || renderPassEntryType === "postRenderTarget" || renderPassEntryType === "postProPass") this.#renderingState.storeColor = !isMSAA;
				if (renderPassEntryType === "screen" && screenPostProPassCount) this.#renderingState.storeColor = !isMSAA;
				if (globalIndex === this.#renderingState.frameTexturesIds.length - 1) this.#renderingState.storeColor = !isMSAA;
				else for (let i = globalIndex + 1; i < this.#renderingState.frameTexturesIds.length; i++) if (textureId && textureId === this.#renderingState.frameTexturesIds[i]) {
					this.#renderingState.storeColor = true;
					break;
				}
				this.#renderingState.storeDepth = false;
				if (depthTextureId && globalIndex < this.#renderingState.frameTexturesIds.length - 1) {
					for (let i = globalIndex + 1; i < this.#renderingState.frameDepthTexturesIds.length; i++) if (depthTextureId === this.#renderingState.frameDepthTexturesIds[i]) {
						this.#renderingState.storeDepth = true;
						break;
					}
				}
				if (renderPassEntryType === "screen" && screenPrePassCount && index === 0) this.#renderingState.storeDepth = true;
				renderPassEntry.renderPass.setStoreOp(this.#renderingState.storeColor ? "store" : "discard");
				renderPassEntry.renderPass.setDepthStoreOp(this.#renderingState.storeDepth ? "store" : "discard");
				this.renderPassesEntry(commandEncoder, renderPassEntry, index === renderablePassEntries.length - 1);
				globalIndex++;
			});
		});
	}
};
//#endregion
export { Scene };
