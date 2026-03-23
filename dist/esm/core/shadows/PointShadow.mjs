import { Vec3 } from "../../math/Vec3.mjs";
import { Mat4 } from "../../math/Mat4.mjs";
import { Texture } from "../textures/Texture.mjs";
import { PerspectiveCamera } from "../cameras/PerspectiveCamera.mjs";
import { Shadow, shadowStruct } from "./Shadow.mjs";
import { getDefaultPointShadowDepthVs } from "../shaders/full/vertex/get-default-point-shadow-depth-vertex-shader-code.mjs";
import { getDefaultPointShadowDepthFs } from "../shaders/full/fragment/get-default-point-shadow-depth-fragment-code.mjs";
//#region src/core/shadows/PointShadow.ts
/** @ignore */
const pointShadowStruct = {
	...shadowStruct,
	cameraNear: {
		type: "f32",
		value: 0
	},
	cameraFar: {
		type: "f32",
		value: 0
	},
	position: {
		type: "vec3f",
		value: new Vec3()
	},
	projectionMatrix: {
		type: "mat4x4f",
		value: new Float32Array(16)
	},
	viewMatrices: {
		type: "array<mat4x4f>",
		value: new Float32Array(96)
	}
};
/**
* Create a shadow map from a {@link PointLight} by rendering to a depth cube texture using an array of view {@link Mat4} based on the {@link PointLight} position and a {@link PerspectiveCamera#projectionMatrix | Camera projectionMatrix}.
*
* This type of shadow is more expensive than {@link core/shadows/DirectionalShadow.DirectionalShadow | DirectionalShadow} since its scene needs to be rendered 6 times to each face of a depth cube texture instead of once.
*/
var PointShadow = class extends Shadow {
	/**
	* {@link Vec3} used to calculate the actual current direction based on the {@link PointLight} position.
	* @private
	*/
	#tempCubeDirection;
	/**
	* Array of {@link Mat4} view matrices to use for cube map faces rendering.
	* @private
	*/
	#viewMatrices;
	/**
	* PointShadow constructor
	* @param renderer - {@link CameraRenderer} or {@link GPUCurtains} used to create this {@link PointShadow}.
	* @param parameters - {@link PointShadowParams} used to create this {@link PointShadow}.
	*/
	constructor(renderer, { light, intensity, bias, normalBias, pcfSamples, radius, depthTextureSize, depthTextureFormat, autoRender, camera = {
		near: .1,
		far: 150
	} } = {}) {
		super(renderer, {
			light,
			intensity,
			bias,
			normalBias,
			pcfSamples,
			radius,
			depthTextureSize,
			depthTextureFormat,
			autoRender,
			useRenderBundle: false
		});
		camera.far = this.light.range !== 0 ? this.light.range : camera.far;
		this.options = {
			...this.options,
			camera
		};
		this.cubeDirections = [
			new Vec3(-1, 0, 0),
			new Vec3(1, 0, 0),
			new Vec3(0, -1, 0),
			new Vec3(0, 1, 0),
			new Vec3(0, 0, -1),
			new Vec3(0, 0, 1)
		];
		this.#tempCubeDirection = new Vec3();
		this.cubeUps = [
			new Vec3(0, -1, 0),
			new Vec3(0, -1, 0),
			new Vec3(0, 0, 1),
			new Vec3(0, 0, -1),
			new Vec3(0, -1, 0),
			new Vec3(0, -1, 0)
		];
		this.#viewMatrices = [];
		for (let i = 0; i < 6; i++) this.#viewMatrices.push(new Mat4());
		this.camera = new PerspectiveCamera({
			fov: 90,
			near: this.options.camera.near,
			far: this.options.camera.far,
			width: this.depthTextureSize.x,
			height: this.depthTextureSize.y,
			onMatricesChanged: () => {
				this.onProjectionMatrixChanged();
			}
		});
		this.camera.matrices.view.onUpdate = () => {
			this.updateViewMatrices();
		};
		this.camera.position.set(0);
		this.camera.parent = this.light;
	}
	/**
	* Set or reset this {@link PointShadow} {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
	*/
	setRendererBinding() {
		this.rendererBinding = this.renderer.bindings.pointShadows;
	}
	/**
	* Set the parameters and start casting shadows. Force not using a {@link core/renderPasses/RenderBundle.RenderBundle | RenderBundle} since we'll need to swap faces bind groups during render.
	* @param parameters - Parameters to use for this {@link PointShadow}.
	*/
	cast(parameters = {}) {
		super.cast({
			...parameters,
			useRenderBundle: false
		});
		if (parameters.camera) {
			if (parameters.camera.near) {
				this.options.camera.near = parameters.camera.near;
				this.camera.near = this.options.camera.near;
			}
			if (parameters.camera.far) {
				this.options.camera.far = this.light.range !== 0 ? this.light.range : parameters.camera.far;
				this.camera.far = this.options.camera.far;
			}
		}
	}
	/**
	* Set the {@link depthComparisonSampler}, {@link depthTexture}, {@link depthPassTarget}, compute the {@link PointShadow#camera.projectionMatrix | camera projection matrix} and start rendering to the shadow map.
	*/
	init() {
		super.init();
		this.onProjectionMatrixChanged();
	}
	/**
	* Resend all properties to the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}. Called when the maximum number of corresponding {@link PointLight} has been overflowed or when the {@link renderer} has changed.
	*/
	reset() {
		this.setRendererBinding();
		super.reset();
		this.onProjectionMatrixChanged();
		this.updateViewMatrices();
		this.setPosition();
	}
	/**
	* Copy the {@link PointLight} actual position and update binding.
	*/
	setPosition() {
		this.onPropertyChanged("position", this.light.actualPosition);
	}
	/**
	* Called whenever the {@link PerspectiveCamera#projectionMatrix | camera projectionMatrix} changed (or on reset) to update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
	*/
	onProjectionMatrixChanged() {
		this.onPropertyChanged("projectionMatrix", this.camera.projectionMatrix);
		this.onPropertyChanged("cameraNear", this.camera.near);
		this.onPropertyChanged("cameraFar", this.camera.far);
	}
	/**
	* Update the #viewMatrices and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
	*/
	updateViewMatrices() {
		for (let i = 0; i < 6; i++) {
			this.#tempCubeDirection.copy(this.cubeDirections[i]).add(this.camera.actualPosition);
			this.#viewMatrices[i].makeView(this.camera.actualPosition, this.#tempCubeDirection, this.cubeUps[i]);
			for (let j = 0; j < 16; j++) this.rendererBinding.childrenBindings[this.index].inputs.viewMatrices.value[i * 16 + j] = this.#viewMatrices[i].elements[j];
		}
		this.onViewMatricesChanged();
	}
	/**
	* Called whenever the #viewMatrices changed (or on reset) to update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
	*/
	onViewMatricesChanged() {
		this.rendererBinding.childrenBindings[this.index].inputs.viewMatrices.shouldUpdate = true;
	}
	/**
	* Set or resize the {@link depthTexture} and eventually resize the {@link depthPassTarget} as well.
	*/
	setDepthTexture() {
		if (this.depthTexture && (this.depthTexture.size.width !== this.depthTextureSize.x || this.depthTexture.size.height !== this.depthTextureSize.y)) {
			const maxSize = Math.max(this.depthTextureSize.x, this.depthTextureSize.y);
			this.resizeDepthTexture(maxSize, maxSize);
		} else if (!this.depthTexture) this.createDepthTexture();
	}
	/**
	* Create the cube {@link depthTexture}.
	*/
	createDepthTexture() {
		const maxSize = Math.max(this.depthTextureSize.x, this.depthTextureSize.y);
		this.depthTexture = new Texture(this.renderer, {
			label: `${this.light.options.label} (index: ${this.index}) shadow depth texture`,
			name: "pointShadowCubeDepthTexture" + this.index,
			type: "depth",
			format: this.depthTextureFormat,
			viewDimension: "cube",
			sampleCount: this.sampleCount,
			fixedSize: {
				width: maxSize,
				height: maxSize
			},
			autoDestroy: false
		});
	}
	/**
	* Clear the content of the depth texture. Called whenever the {@link castingMeshes} {@link Map} is empty after having removed a mesh, or if all {@link castingMeshes} `visible` properties are `false`.
	*/
	clearDepthTexture() {
		if (!this.depthTexture || !this.depthTexture.texture) return;
		const commandEncoder = this.renderer.device.createCommandEncoder();
		!this.renderer.production && commandEncoder.pushDebugGroup(`Clear ${this.depthTexture.texture.label} command encoder`);
		for (let i = 0; i < 6; i++) {
			const renderPassDescriptor = {
				colorAttachments: [],
				depthStencilAttachment: {
					view: this.depthTexture.texture.createView({
						label: "Clear " + this.depthTexture.texture.label + " cube face view",
						dimension: "2d",
						arrayLayerCount: 1,
						baseArrayLayer: i
					}),
					depthLoadOp: "clear",
					depthClearValue: 1,
					depthStoreOp: "store"
				}
			};
			this.depthPassTarget.renderPass.beginRenderPass(commandEncoder, renderPassDescriptor).end();
		}
		!this.renderer.production && commandEncoder.popDebugGroup();
		this.renderer.device.queue.submit([commandEncoder.finish()]);
	}
	/**
	* Render the depth pass. Called by the {@link CameraRenderer#scene | scene} when rendering the {@link depthPassTarget} render pass entry, or by the {@link renderOnce} method.<br />
	* - For each face of the depth cube texture:
	*   - Set the {@link depthPassTarget} descriptor depth texture view to our depth cube texture current face.
	*   - Render all the depth meshes.
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
		for (let face = 0; face < 6; face++) {
			this.depthPassTarget.renderPass.setRenderPassDescriptor(this.depthTexture.texture.createView({
				label: this.depthTexture.texture.label + " cube face view " + face,
				dimension: "2d",
				arrayLayerCount: 1,
				baseArrayLayer: face
			}));
			this.renderDepthPass(commandEncoder, face);
		}
		this.renderer.pipelineManager.resetCurrentPipeline();
	}
	/**
	* Render all the {@link castingMeshes} into the {@link depthPassTarget}. Before rendering them, we swap the cube face bind group with the {@link CameraRenderer.pointShadowsCubeFaceBindGroups | renderer pointShadowsCubeFaceBindGroups} at the index containing the current face onto which we'll draw.
	* @param commandEncoder - {@link GPUCommandEncoder} to use.
	* @param face - Current cube map face onto which we're drawing.
	*/
	renderDepthPass(commandEncoder, face = 0) {
		this.renderer.pipelineManager.resetCurrentPipeline();
		const depthPass = commandEncoder.beginRenderPass(this.depthPassTarget.renderPass.descriptor);
		if (!this.renderer.production) depthPass.pushDebugGroup(`${this.light.type}Shadow (index: ${this.index}): depth pass for face ${face}`);
		for (const [uuid, depthMesh] of this.depthMeshes) {
			if (!this.castingMeshes.get(uuid)?.visible) continue;
			const cubeFaceBindGroupIndex = depthMesh.material.bindGroups.length - 1;
			this.renderer.pointShadowsCubeFaceBindGroups[face].setIndex(cubeFaceBindGroupIndex);
			depthMesh.material.bindGroups[cubeFaceBindGroupIndex] = this.renderer.pointShadowsCubeFaceBindGroups[face];
			if (face === 0) depthMesh.render(depthPass);
			else {
				depthMesh.material.onBeforeRender();
				depthMesh.onRenderPass(depthPass);
			}
		}
		if (!this.renderer.production) depthPass.popDebugGroup();
		depthPass.end();
	}
	/**
	* Get the default depth pass vertex shader for this {@link PointShadow}.
	* parameters - {@link VertexShaderInputBaseParams} used to compute the output `worldPosition` and `normal` vectors.
	* @returns - Depth pass vertex shader.
	*/
	getDefaultShadowDepthVs({ bindings = [], geometry }) {
		return { code: getDefaultPointShadowDepthVs(this.index, {
			bindings,
			geometry
		}) };
	}
	/**
	* Get the default depth pass {@link types/Materials.ShaderOptions | fragment shader options} for this {@link PointShadow}.
	* @returns - A {@link types/Materials.ShaderOptions | ShaderOptions} with the depth pass fragment shader.
	*/
	getDefaultShadowDepthFs() {
		return { code: getDefaultPointShadowDepthFs(this.index) };
	}
	/**
	* Patch the given {@link Mesh} material parameters to create the depth mesh. Here we'll be adding the first {@link CameraRenderer.pointShadowsCubeFaceBindGroups | renderer pointShadowsCubeFaceBindGroups} bind group containing the face index onto which we'll be drawing. This bind group will be swapped when rendering using {@link renderDepthPass}.
	* @param mesh - original {@link Mesh} to use.
	* @param parameters - Optional additional parameters to use for the depth mesh.
	* @returns - Patched parameters.
	*/
	patchShadowCastingMeshParams(mesh, parameters = {}) {
		if (!parameters.bindGroups) parameters.bindGroups = [];
		parameters.bindGroups = [...parameters.bindGroups, this.renderer.pointShadowsCubeFaceBindGroups[0]];
		return super.patchShadowCastingMeshParams(mesh, parameters);
	}
};
//#endregion
export { PointShadow, pointShadowStruct };
