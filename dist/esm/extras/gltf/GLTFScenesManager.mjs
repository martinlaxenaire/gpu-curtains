import { throwWarning } from "../../utils/utils.mjs";
import { Vec3 } from "../../math/Vec3.mjs";
import { Mat4 } from "../../math/Mat4.mjs";
import { Object3D } from "../../core/objects3D/Object3D.mjs";
import { isCameraRenderer } from "../../core/renderers/utils.mjs";
import { Vec2 } from "../../math/Vec2.mjs";
import { BufferBinding } from "../../core/bindings/BufferBinding.mjs";
import { Mat3 } from "../../math/Mat3.mjs";
import { MediaTexture } from "../../core/textures/MediaTexture.mjs";
import { OrthographicCamera } from "../../core/cameras/OrthographicCamera.mjs";
import { PerspectiveCamera } from "../../core/cameras/PerspectiveCamera.mjs";
import { Sampler } from "../../core/samplers/Sampler.mjs";
import { Box3 } from "../../math/Box3.mjs";
import { vertexBufferAttributeLayouts } from "../../core/geometries/utils.mjs";
import { Geometry } from "../../core/geometries/Geometry.mjs";
import { IndexedGeometry } from "../../core/geometries/IndexedGeometry.mjs";
import { RenderMaterial } from "../../core/materials/RenderMaterial.mjs";
import { DirectionalLight } from "../../core/lights/DirectionalLight.mjs";
import { PointLight } from "../../core/lights/PointLight.mjs";
import { SpotLight } from "../../core/lights/SpotLight.mjs";
import { LitMesh } from "../meshes/LitMesh.mjs";
import { KeyframesAnimation } from "../animations/KeyframesAnimation.mjs";
import { TargetsAnimationsManager } from "../animations/TargetsAnimationsManager.mjs";
//#region src/extras/gltf/GLTFScenesManager.ts
const GL = typeof window !== "undefined" && WebGLRenderingContext || {
	BYTE: 5120,
	UNSIGNED_BYTE: 5121,
	SHORT: 5122,
	UNSIGNED_SHORT: 5123,
	UNSIGNED_INT: 5125,
	FLOAT: 5126,
	TRIANGLES: 4,
	TRIANGLE_STRIP: 5,
	TRIANGLE_FAN: 6,
	LINES: 1,
	LINE_LOOP: 2,
	LINE_STRIP: 3,
	POINTS: 0,
	CLAMP_TO_EDGE: 33071,
	MIRRORED_REPEAT: 33648,
	NEAREST: 9728,
	LINEAR: 9729,
	LINEAR_MIPMAP_NEAREST: 9985,
	NEAREST_MIPMAP_LINEAR: 9986,
	LINEAR_MIPMAP_LINEAR: 9987
};
/**
* Used to create a {@link GLTFScenesManager} from a given {@link GLTFLoader.gltf | gltf} object.
*
* Parse the {@link GLTFLoader.gltf | gltf} object, create all the {@link Sampler} and {@link Texture}, create all the {@link Object3D} nodes to compute the correct transformations and parent -> child relationships, create all the needed {@link MeshDescriptor} containing the {@link Geometry}, {@link LitMesh} parameters and so on.
*
* ## Loading Features
*
* - [x] Accessors
*   - [x] Sparse accessors
* - [x] Buffers
* - [x] BufferViews
* - [x] Images
* - [x] Meshes
* - [x] Nodes
* - [x] Primitives
*   - [x] Compute flat normals if normal attributes is missing
*   - [x] Compute tangent space in fragment shader if tangent attributes is missing and a normal map is used (would be better/faster with [MikkTSpace](http://www.mikktspace.com/))
* - [x] Samplers
* - [x] Textures
* - [x] Animations
*   - Paths
*     - [x] Translation
*     - [x] Rotation
*     - [x] Scale
*     - [x] Weights
*   - Interpolation
*     - [x] Step
*     - [x] Linear
*     - [x] CubicSpline
* - [x] Cameras
*   - [x] OrthographicCamera
*   - [x] PerspectiveCamera
* - [x] Materials
* - [x] Skins
* - [x] Morph targets
*
* ## Extensions
* - [x] KHR_animation_pointer (using GLTFPointerAnimationsManager extra class)
* - [ ] KHR_draco_mesh_compression
* - [x] KHR_lights_punctual
* - [x] KHR_materials_anisotropy
* - [x] KHR_materials_clearcoat
* - [x] KHR_materials_diffuse_transmission
* - [x] KHR_materials_dispersion
* - [x] KHR_materials_emissive_strength
* - [x] KHR_materials_ior
* - [x] KHR_materials_iridescence
* - [x] KHR_materials_sheen
* - [x] KHR_materials_specular
* - [x] KHR_materials_transmission
* - [x] KHR_materials_unlit
* - [x] KHR_materials_variants
* - [x] KHR_materials_volume
* - [x] KHR_mesh_quantization
* - [x] KHR_node_visibility
* - [ ] KHR_texture_basisu
* - [x] KHR_texture_transform
* - [ ] KHR_xmp_json_ld
* - [x] EXT_mesh_gpu_instancing
* - [ ] EXT_meshopt_compression
* - [x] EXT_texture_webp
*
* @example
* ```javascript
* const gltfLoader = new GLTFLoader()
* const gltf = await gltfLoader.loadFromUrl('path/to/model.gltf')
*
* // create a gltfScenesManager from the resulting 'gltf' object
* // assuming 'renderer' is a valid camera renderer or curtains instance
* const gltfScenesManager = new GLTFScenesManager({ renderer, gltf })
* gltfScenesManager.addMeshes()
* ```
*/
var GLTFScenesManager = class GLTFScenesManager {
	/** The {@link PrimitiveInstances} Map, to group similar {@link LitMesh} by instances. */
	#primitiveInstances;
	/**
	* {@link GLTFScenesManager} constructor.
	* @param parameters - parameters used to create our {@link GLTFScenesManager}.
	* @param parameters.renderer - our {@link CameraRenderer} class object.
	* @param parameters.gltf - The {@link GLTFLoader.gltf | gltf} object used.
	*/
	constructor({ renderer, gltf }) {
		renderer = isCameraRenderer(renderer, "GLTFScenesManager");
		this.renderer = renderer;
		this.gltf = gltf;
		this.#primitiveInstances = /* @__PURE__ */ new Map();
		this.pointerAnimationsManager = null;
		this.scenesManager = {
			node: new Object3D(),
			nodes: /* @__PURE__ */ new Map(),
			boundingBox: new Box3(),
			samplers: [],
			materialsTextures: [],
			materialsParams: [],
			scenes: [],
			meshes: [],
			meshesDescriptors: [],
			animations: [],
			cameras: [],
			skins: [],
			lights: []
		};
		this.createSamplers();
		this.createMaterialTextures();
		this.createMaterialsParams();
		this.createLights();
		this.createAnimations();
		this.createScenes();
	}
	/**
	* Get an attribute type, bufferFormat and size from its {@link GLTF.AccessorType | accessor type}.
	* @param type - {@link GLTF.AccessorType | accessor type} to use.
	* @returns - Corresponding type, bufferFormat and size.
	*/
	static getVertexAttributeParamsFromType(type) {
		switch (type) {
			case "VEC2": return {
				type: "vec2f",
				bufferFormat: "float32x2",
				size: 2
			};
			case "VEC3": return {
				type: "vec3f",
				bufferFormat: "float32x3",
				size: 3
			};
			case "VEC4": return {
				type: "vec4f",
				bufferFormat: "float32x4",
				size: 4
			};
			case "MAT2": return {
				type: "mat2x2f",
				bufferFormat: "float32x2",
				size: 6
			};
			case "MAT3": return {
				type: "mat3x3f",
				bufferFormat: "float32x3",
				size: 9
			};
			case "MAT4": return {
				type: "mat4x4f",
				bufferFormat: "float32x4",
				size: 16
			};
			default: return {
				type: "f32",
				bufferFormat: "float32",
				size: 1
			};
		}
	}
	/**
	* Get the corresponding typed array constructor based on the {@link GLTF.AccessorComponentType | accessor component type}.
	* @param componentType - {@link GLTF.AccessorComponentType | accessor component type} to use.
	* @returns - corresponding typed array constructor.
	*/
	static getTypedArrayConstructorFromComponentType(componentType) {
		switch (componentType) {
			case GL.BYTE: return Int8Array;
			case GL.UNSIGNED_BYTE: return Uint8Array;
			case GL.SHORT: return Int16Array;
			case GL.UNSIGNED_SHORT: return Uint16Array;
			case GL.UNSIGNED_INT: return Uint32Array;
			case GL.FLOAT:
			default: return Float32Array;
		}
	}
	/**
	* Get the {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createRenderPipeline#topology | GPUPrimitiveTopology} based on the {@link GLTF.MeshPrimitiveMode | WebGL primitive mode}.
	* @param mode - {@link GLTF.MeshPrimitiveMode | WebGL primitive mode} to use.
	* @returns - corresponding {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createRenderPipeline#topology | GPUPrimitiveTopology}.
	*/
	static gpuPrimitiveTopologyForMode(mode) {
		switch (mode) {
			case GL.TRIANGLE_STRIP:
			case GL.TRIANGLE_FAN: return "triangle-strip";
			case GL.LINES: return "line-list";
			case GL.LINE_STRIP:
			case GL.LINE_LOOP: return "line-strip";
			case GL.POINTS: return "point-list";
			case GL.TRIANGLES:
			default: return "triangle-list";
		}
	}
	/**
	* Get the {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createSampler#addressmodeu | GPUAddressMode} based on the {@link GLTF.TextureWrapMode | WebGL texture wrap mode}.
	* @param wrap - {@link GLTF.TextureWrapMode | WebGL texture wrap mode} to use.
	* @returns - corresponding {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createSampler#addressmodeu | GPUAddressMode}.
	*/
	static gpuAddressModeForWrap(wrap) {
		switch (wrap) {
			case GL.CLAMP_TO_EDGE: return "clamp-to-edge";
			case GL.MIRRORED_REPEAT: return "mirror-repeat";
			default: return "repeat";
		}
	}
	/**
	* Create the {@link scenesManager} {@link TargetsAnimationsManager} if any animation is present in the {@link gltf}.
	*/
	createAnimations() {
		this.gltf.animations?.forEach((animation, index) => {
			this.scenesManager.animations.push(new TargetsAnimationsManager(this.renderer, { label: animation.name ?? "Animation " + index }));
		});
	}
	/**
	* Get a glTF animation keyframes and values {@link TypedArray} from the given {@link GLTF.IAnimationSampler | glTF animation sampler}.
	* @param sampler - {@link GLTF.IAnimationSampler | glTF animation sampler} to retrieve from.
	* @returns - Corresponding keyframes and values {@link TypedArray}.
	*/
	getAnimationKeyframesValues(sampler) {
		const inputAccessor = this.gltf.accessors[sampler.input];
		const keyframes = this.#getAccessorArray(inputAccessor);
		const outputAccessor = this.gltf.accessors[sampler.output];
		return {
			keyframes,
			values: this.#getAccessorArray(outputAccessor)
		};
	}
	/**
	* Create the {@link ScenesManager.lights | lights} defined by the `KHR_lights_punctual` extension if any.
	*/
	createLights() {
		if (this.gltf.extensions && this.gltf.extensions["KHR_lights_punctual"]) {
			let lightIndex = 0;
			for (const light of this.gltf.extensions["KHR_lights_punctual"].lights) {
				lightIndex++;
				const label = light.name ?? `glTF ${light.type} light ${lightIndex}`;
				if (light.type === "spot") {
					const innerConeAngle = light.spot.innerConeAngle !== void 0 ? light.spot.innerConeAngle : 0;
					const outerConeAngle = light.spot.outerConeAngle !== void 0 ? light.spot.outerConeAngle : Math.PI / 4;
					this.scenesManager.lights.push(new SpotLight(this.renderer, {
						label,
						color: light.color !== void 0 ? new Vec3(light.color[0], light.color[1], light.color[2]) : new Vec3(1),
						intensity: light.intensity !== void 0 ? light.intensity : 1,
						range: light.range !== void 0 ? light.range : 0,
						angle: outerConeAngle,
						penumbra: 1 - innerConeAngle / outerConeAngle
					}));
				} else if (light.type === "directional") this.scenesManager.lights.push(new DirectionalLight(this.renderer, {
					label,
					color: light.color !== void 0 ? new Vec3(light.color[0], light.color[1], light.color[2]) : new Vec3(1),
					intensity: light.intensity !== void 0 ? light.intensity : 1
				}));
				else if (light.type === "point") this.scenesManager.lights.push(new PointLight(this.renderer, {
					label,
					color: light.color !== void 0 ? new Vec3(light.color[0], light.color[1], light.color[2]) : new Vec3(1),
					intensity: light.intensity !== void 0 ? light.intensity : 1,
					range: light.range !== void 0 ? light.range : 0
				}));
			}
		}
	}
	/**
	* Create the {@link Sampler} and add them to the {@link ScenesManager.samplers | scenesManager samplers array}.
	*/
	createSamplers() {
		if (this.gltf.samplers) for (const [index, sampler] of Object.entries(this.gltf.samplers)) {
			const descriptor = {
				label: sampler.name ?? "glTF sampler " + index,
				name: "gltfSampler" + index,
				addressModeU: GLTFScenesManager.gpuAddressModeForWrap(sampler.wrapS),
				addressModeV: GLTFScenesManager.gpuAddressModeForWrap(sampler.wrapT)
			};
			if (!sampler.magFilter || sampler.magFilter === GL.LINEAR) descriptor.magFilter = "linear";
			switch (sampler.minFilter) {
				case GL.NEAREST: break;
				case GL.LINEAR:
				case GL.LINEAR_MIPMAP_NEAREST:
					descriptor.minFilter = "linear";
					break;
				case GL.NEAREST_MIPMAP_LINEAR:
					descriptor.mipmapFilter = "linear";
					break;
				case GL.LINEAR_MIPMAP_LINEAR:
				default:
					descriptor.minFilter = "linear";
					descriptor.mipmapFilter = "linear";
					break;
			}
			this.scenesManager.samplers.push(new Sampler(this.renderer, descriptor));
		}
		else this.scenesManager.samplers.push(new Sampler(this.renderer, {
			label: "Default sampler",
			name: "defaultSampler",
			magFilter: "linear",
			minFilter: "linear",
			mipmapFilter: "linear"
		}));
	}
	/**
	* Create a {@link MediaTexture} based on the options.
	* @param material - material using that texture.
	* @param image - image source of the texture.
	* @param name - name of the texture.
	* @param useTransform - Whether the {@link MediaTexture} should handle transformations.
	* @returns - newly created {@link MediaTexture}.
	*/
	createTexture(material, image, name, useTransform = false) {
		const format = (() => {
			switch (name) {
				case "baseColorTexture":
				case "emissiveTexture":
				case "specularTexture":
				case "specularColorTexture":
				case "sheenTexture":
				case "sheenColorTexture":
				case "sheenRoughnessTexture":
				case "diffuseTransmissionTexture":
				case "diffuseTransmissionFactorTexture":
				case "diffuseTransmissionColorTexture": return "rgba8unorm-srgb";
				case "occlusionTexture":
				case "transmissionTexture":
				case "clearcoatFactorTexture":
				case "iridescenceFactorTexture": return "r8unorm";
				case "thicknessTexture":
				case "transmissionThicknessTexture":
				case "clearcoatTexture":
				case "clearcoatRoughnessTexture":
				case "iridescenceTexture":
				case "iridescenceThicknessTexture": return "rg8unorm";
				default: return "rgba8unorm";
			}
		})();
		const texture = new MediaTexture(this.renderer, {
			label: material.name ? material.name + ": " + name : name,
			name,
			format,
			visibility: ["fragment"],
			generateMips: true,
			fixedSize: {
				width: image.width,
				height: image.height
			},
			useTransform
		});
		texture.useImageBitmap(image);
		return texture;
	}
	/**
	* Create the {ScenesManager.materialsTextures | scenesManager materialsTextures array} and each associated {@link types/gltf/GLTFScenesManager.MaterialTextureDescriptor | MaterialTextureDescriptor} and their respective {@link Texture}.
	*/
	createMaterialTextures() {
		this.scenesManager.materialsTextures = [];
		const createdTextures = [];
		if (this.gltf.materials) for (const [materialIndex, material] of Object.entries(this.gltf.materials)) {
			const materialTextures = {
				material: materialIndex,
				texturesDescriptors: []
			};
			const getUVAttributeName = (texture) => {
				if (!texture.texCoord) return "uv";
				return texture.texCoord !== 0 ? "uv" + texture.texCoord : "uv";
			};
			const createTexture = (gltfTextureInfo, name) => {
				const index = gltfTextureInfo.index;
				const gltfTexture = this.gltf.textures[index];
				const source = gltfTexture.extensions && gltfTexture.extensions["EXT_texture_webp"] ? gltfTexture.extensions["EXT_texture_webp"].source : gltfTexture.source;
				const basisTexture = gltfTexture.extensions && gltfTexture.extensions.KHR_texture_basisu;
				if (source === void 0) {
					if (!this.renderer.production) if (basisTexture) throwWarning(`GLTFScenesManager: Basis/compressed textures not supported. This texture could not be created: ${name}`);
					else throwWarning(`GLTFScenesManager: No texture source provided. This texture could not be created: ${name}`);
					return;
				}
				const image = this.gltf.imagesBitmaps[source];
				if (!this.renderer.production && basisTexture) throwWarning(`GLTFScenesManager: Basis/compressed textures not supported. This texture will use a fallback image: '${name}'`);
				const samplerIndex = (gltfTextureInfo.index !== void 0 && this.gltf.textures[gltfTextureInfo.index].sampler) ?? this.gltf.textures.find((t) => {
					return (t.extensions && t.extensions["EXT_texture_webp"] ? t.extensions["EXT_texture_webp"].source : t.source) === index;
				})?.sampler;
				const sampler = this.scenesManager.samplers[samplerIndex ?? 0];
				let textureTransform = gltfTextureInfo.extensions && gltfTextureInfo.extensions["KHR_texture_transform"];
				if (!textureTransform && this.gltf.extensionsUsed && this.gltf.extensionsUsed.includes("KHR_animation_pointer")) textureTransform = {};
				const texCoordAttributeName = getUVAttributeName(textureTransform && textureTransform.texCoord !== void 0 ? textureTransform : gltfTextureInfo);
				const hasTexture = createdTextures.find((createdTexture) => createdTexture.index === index);
				if (hasTexture) {
					const reusedTexture = new MediaTexture(this.renderer, {
						label: material.name ? material.name + ": " + name : name,
						name,
						visibility: ["fragment"],
						generateMips: true,
						fromTexture: hasTexture.texture,
						...textureTransform && { useTransform: true }
					});
					if (textureTransform) {
						const { offset, rotation, scale } = textureTransform;
						if (offset !== void 0) reusedTexture.offset.set(offset[0], offset[1]);
						if (rotation !== void 0) reusedTexture.rotation = rotation;
						if (scale !== void 0) reusedTexture.scale.set(scale[0], scale[1]);
					}
					materialTextures.texturesDescriptors.push({
						texture: reusedTexture,
						sampler,
						texCoordAttributeName
					});
					return;
				}
				const texture = this.createTexture(material, image, name, !!textureTransform);
				if (textureTransform) {
					const { offset, rotation, scale } = textureTransform;
					if (offset !== void 0) texture.offset.set(offset[0], offset[1]);
					if (rotation !== void 0) texture.rotation = rotation;
					if (scale !== void 0) texture.scale.set(scale[0], scale[1]);
				}
				materialTextures.texturesDescriptors.push({
					texture,
					sampler,
					texCoordAttributeName
				});
				createdTextures.push({
					index,
					texture
				});
			};
			this.scenesManager.materialsTextures[materialIndex] = materialTextures;
			if (material.pbrMetallicRoughness) {
				if (material.pbrMetallicRoughness.baseColorTexture && material.pbrMetallicRoughness.baseColorTexture.index !== void 0) createTexture(material.pbrMetallicRoughness.baseColorTexture, "baseColorTexture");
				if (material.pbrMetallicRoughness.metallicRoughnessTexture && material.pbrMetallicRoughness.metallicRoughnessTexture.index !== void 0) createTexture(material.pbrMetallicRoughness.metallicRoughnessTexture, "metallicRoughnessTexture");
			}
			if (material.normalTexture && material.normalTexture.index !== void 0) createTexture(material.normalTexture, "normalTexture");
			if (material.occlusionTexture && material.occlusionTexture.index !== void 0) createTexture(material.occlusionTexture, "occlusionTexture");
			if (material.emissiveTexture && material.emissiveTexture.index !== void 0) createTexture(material.emissiveTexture, "emissiveTexture");
			const { extensions } = material;
			const transmission = extensions && extensions.KHR_materials_transmission || null;
			const specular = extensions && extensions.KHR_materials_specular || null;
			const volume = extensions && extensions.KHR_materials_volume || null;
			const sheen = extensions && extensions.KHR_materials_sheen || null;
			const anisotropy = extensions && extensions.KHR_materials_anisotropy || null;
			const clearcoat = extensions && extensions.KHR_materials_clearcoat || null;
			const iridescence = extensions && extensions.KHR_materials_iridescence || null;
			const diffuseTransmission = extensions && extensions.KHR_materials_diffuse_transmission || null;
			if (specular && (specular.specularTexture || specular.specularColorTexture)) {
				const { specularTexture, specularColorTexture } = specular;
				if (specularTexture && specularColorTexture && specularTexture.index !== void 0 && specularTexture.index === specularColorTexture.index) createTexture(specularTexture, "specularTexture");
				else {
					if (specularTexture && specularTexture.index !== void 0) createTexture(specularTexture, "specularFactorTexture");
					if (specularColorTexture && specularColorTexture.index !== void 0) createTexture(specularColorTexture, "specularColorTexture");
				}
			}
			if (transmission && volume && transmission.transmissionTexture && volume.thicknessTexture && transmission.transmissionTexture.index !== void 0 && transmission.transmissionTexture.index === volume.thicknessTexture.index) createTexture(transmission.transmissionTexture, "transmissionThicknessTexture");
			else {
				if (transmission && transmission.transmissionTexture && transmission.transmissionTexture.index !== void 0) createTexture(transmission.transmissionTexture, "transmissionTexture");
				if (volume && volume.thicknessTexture && volume.thicknessTexture.index !== void 0) createTexture(volume.thicknessTexture, "thicknessTexture");
			}
			if (sheen && (sheen.sheenColorTexture || sheen.sheenRoughnessTexture)) {
				const { sheenColorTexture, sheenRoughnessTexture } = sheen;
				if (sheenColorTexture && sheenRoughnessTexture && sheenColorTexture.index !== void 0 && sheenColorTexture.index === sheenRoughnessTexture.index) createTexture(sheenColorTexture, "sheenTexture");
				else {
					if (sheenColorTexture && sheenColorTexture.index !== void 0) createTexture(sheenColorTexture, "sheenColorTexture");
					if (sheenRoughnessTexture && sheenRoughnessTexture.index !== void 0) createTexture(sheenRoughnessTexture, "sheenRoughnessTexture");
				}
			}
			if (anisotropy && anisotropy.anisotropyTexture && anisotropy.anisotropyTexture.index !== void 0) createTexture(anisotropy.anisotropyTexture, "anisotropyTexture");
			if (clearcoat && (clearcoat.clearcoatTexture || clearcoat.clearcoatRoughnessTexture || clearcoat.clearcoatNormalTexture)) {
				const { clearcoatTexture, clearcoatRoughnessTexture, clearcoatNormalTexture } = clearcoat;
				if (clearcoatTexture && clearcoatRoughnessTexture && clearcoatTexture.index !== void 0 && clearcoatTexture.index === clearcoatRoughnessTexture.index) createTexture(clearcoatTexture, "clearcoatTexture");
				else {
					if (clearcoatTexture && clearcoatTexture.index !== void 0) createTexture(clearcoatTexture, "clearcoatFactorTexture");
					if (clearcoatRoughnessTexture && clearcoatRoughnessTexture.index !== void 0) createTexture(clearcoatRoughnessTexture, "clearcoatRoughnessTexture");
				}
				if (clearcoatNormalTexture && clearcoatNormalTexture.index !== void 0) createTexture(clearcoatNormalTexture, "clearcoatNormalTexture");
			}
			if (iridescence && (iridescence.iridescenceTexture || iridescence.iridescenceThicknessTexture)) {
				const { iridescenceTexture, iridescenceThicknessTexture } = iridescence;
				if (iridescenceTexture && iridescenceThicknessTexture && iridescenceTexture.index !== void 0 && iridescenceTexture.index === iridescenceThicknessTexture.index) createTexture(iridescenceTexture, "iridescenceTexture");
				else {
					if (iridescenceTexture && iridescenceTexture.index !== void 0) createTexture(iridescenceTexture, "iridescenceFactorTexture");
					if (iridescenceThicknessTexture && iridescenceThicknessTexture.index !== void 0) createTexture(iridescenceThicknessTexture, "iridescenceThicknessTexture");
				}
			}
			if (diffuseTransmission && (diffuseTransmission.diffuseTransmissionTexture || diffuseTransmission.diffuseTransmissionColorTexture)) {
				const { diffuseTransmissionTexture, diffuseTransmissionColorTexture } = diffuseTransmission;
				if (diffuseTransmissionTexture && diffuseTransmissionColorTexture && diffuseTransmissionTexture.index !== void 0 && diffuseTransmissionTexture.index === diffuseTransmissionColorTexture.index) createTexture(diffuseTransmissionTexture, "diffuseTransmissionTexture");
				else {
					if (diffuseTransmissionTexture && diffuseTransmissionTexture.index !== void 0) createTexture(diffuseTransmissionTexture, "diffuseTransmissionFactorTexture");
					if (diffuseTransmissionColorTexture && diffuseTransmissionColorTexture.index !== void 0) createTexture(diffuseTransmissionColorTexture, "diffuseTransmissionColorTexture");
				}
			}
		}
	}
	/**
	* Get the {@link MeshDescriptorMaterialParams} for a given {@link GLTF.IMeshPrimitive.material | glTF primitive material index}.
	* @param materialIndex - {@link GLTF.IMeshPrimitive.material | glTF primitive material index}.
	* @param label - Optional label to use for the {@link RenderMaterial} created.
	* @returns - Created {@link MeshDescriptorMaterialParams}.
	*/
	getMaterialBaseParameters(materialIndex, label = null) {
		const materialParams = {};
		const material = this.gltf.materials && this.gltf.materials[materialIndex] || {};
		if (label) materialParams.label = label + (material.name ? " " + material.name : "");
		else if (material.name) materialParams.label = material.name;
		const { extensions } = material;
		const dispersion = extensions && extensions.KHR_materials_dispersion || null;
		const emissiveStrength = extensions && extensions.KHR_materials_emissive_strength || null;
		const ior = extensions && extensions.KHR_materials_ior || null;
		const transmission = extensions && extensions.KHR_materials_transmission || null;
		const specular = extensions && extensions.KHR_materials_specular || null;
		const volume = extensions && extensions.KHR_materials_volume || null;
		const volumeScatter = extensions && extensions.KHR_materials_volume_scatter || null;
		const sheen = extensions && extensions.KHR_materials_sheen || null;
		const anisotropy = extensions && extensions.KHR_materials_anisotropy || null;
		const clearcoat = extensions && extensions.KHR_materials_clearcoat || null;
		const iridescence = extensions && extensions.KHR_materials_iridescence || null;
		const diffuseTransmission = extensions && extensions.KHR_materials_diffuse_transmission || null;
		if ((extensions && extensions.KHR_materials_pbrSpecularGlossiness || null) && !this.renderer.production) throwWarning("GLTFScenesManager: KHR_materials_pbrSpecularGlossiness is deprecated and therefore not supported.");
		const litMeshMaterialParams = {
			colorSpace: "linear",
			color: material.pbrMetallicRoughness && material.pbrMetallicRoughness.baseColorFactor !== void 0 ? new Vec3(material.pbrMetallicRoughness.baseColorFactor[0], material.pbrMetallicRoughness.baseColorFactor[1], material.pbrMetallicRoughness.baseColorFactor[2]) : new Vec3(1),
			opacity: material.pbrMetallicRoughness && material.pbrMetallicRoughness.baseColorFactor !== void 0 ? material.pbrMetallicRoughness.baseColorFactor[3] : 1,
			alphaCutoff: material.alphaCutoff !== void 0 ? material.alphaCutoff : material.alphaMode === "MASK" ? .5 : 0,
			metallic: material.pbrMetallicRoughness?.metallicFactor !== void 0 ? material.pbrMetallicRoughness.metallicFactor : 1,
			roughness: material.pbrMetallicRoughness?.roughnessFactor !== void 0 ? material.pbrMetallicRoughness.roughnessFactor : 1,
			normalScale: material.normalTexture?.scale === void 0 ? new Vec2(1) : new Vec2(material.normalTexture.scale),
			occlusionIntensity: material.occlusionTexture?.strength === void 0 ? 1 : material.occlusionTexture.strength,
			emissiveIntensity: emissiveStrength && emissiveStrength.emissiveStrength !== void 0 ? emissiveStrength.emissiveStrength : 1,
			emissiveColor: material.emissiveFactor !== void 0 ? new Vec3(material.emissiveFactor[0], material.emissiveFactor[1], material.emissiveFactor[2]) : new Vec3(0),
			specularIntensity: specular && specular.specularFactor !== void 0 ? specular.specularFactor : 1,
			specularColor: specular && specular.specularColorFactor !== void 0 ? new Vec3(specular.specularColorFactor[0], specular.specularColorFactor[1], specular.specularColorFactor[2]) : new Vec3(1),
			transmission: transmission && transmission.transmissionFactor !== void 0 ? transmission.transmissionFactor : 0,
			ior: ior && ior.ior !== void 0 ? ior.ior : 1.5,
			dispersion: dispersion && dispersion.dispersion !== void 0 ? dispersion.dispersion : 0,
			thickness: volume && volume.thicknessFactor !== void 0 ? volume.thicknessFactor : 0,
			attenuationDistance: volume && volume.attenuationDistance !== void 0 ? volume.attenuationDistance : Infinity,
			attenuationColor: volume && volume.attenuationColor !== void 0 ? new Vec3(volume.attenuationColor[0], volume.attenuationColor[1], volume.attenuationColor[2]) : new Vec3(1),
			...volumeScatter && {
				...volumeScatter.multiscatterColor !== void 0 && { multiscatterColor: new Vec3(volumeScatter.multiscatterColor[0], volumeScatter.multiscatterColor[1], volumeScatter.multiscatterColor[2]) },
				...volumeScatter.scatterAnisotropy !== void 0 !== void 0 && { scatterAnisotropy: volumeScatter.scatterAnisotropy }
			},
			...sheen && {
				...sheen.sheenColorFactor !== void 0 && { sheenColor: new Vec3(sheen.sheenColorFactor[0], sheen.sheenColorFactor[1], sheen.sheenColorFactor[2]) },
				...sheen.sheenRoughnessFactor !== void 0 !== void 0 && { sheenRoughness: sheen.sheenRoughnessFactor }
			},
			...anisotropy && {
				...anisotropy.anisotropyStrength !== void 0 && { anisotropy: anisotropy.anisotropyStrength },
				...anisotropy.anisotropyRotation !== void 0 && { anisotropyVector: new Vec2(Math.cos(anisotropy.anisotropyRotation), Math.sin(anisotropy.anisotropyRotation)) }
			},
			...clearcoat && {
				...clearcoat.clearcoatFactor !== void 0 && { clearcoat: clearcoat.clearcoatFactor },
				...clearcoat.clearcoatRoughnessFactor !== void 0 && { clearcoatRoughness: clearcoat.clearcoatRoughnessFactor }
			},
			...iridescence && {
				...iridescence.iridescenceFactor !== void 0 && { iridescence: iridescence.iridescenceFactor },
				iridescenceIOR: iridescence.iridescenceIor !== void 0 ? iridescence.iridescenceIor : 1.3,
				iridescenceThicknessRange: new Vec2(iridescence.iridescenceThicknessMinimum !== void 0 ? iridescence.iridescenceThicknessMinimum : 100, iridescence.iridescenceThicknessMaximum !== void 0 ? iridescence.iridescenceThicknessMaximum : 400)
			},
			...diffuseTransmission && {
				diffuseTransmission: diffuseTransmission.diffuseTransmissionFactor !== void 0 ? diffuseTransmission.diffuseTransmissionFactor : 0,
				diffuseTransmissionColor: diffuseTransmission.diffuseTransmissionColorFactor !== void 0 ? new Vec3(diffuseTransmission.diffuseTransmissionColorFactor[0], diffuseTransmission.diffuseTransmissionColorFactor[1], diffuseTransmission.diffuseTransmissionColorFactor[2]) : new Vec3(1)
			}
		};
		if (clearcoat && clearcoat.clearcoatNormalTexture && clearcoat.clearcoatNormalTexture.scale) litMeshMaterialParams.clearcoatNormalScale = new Vec2(clearcoat.clearcoatNormalTexture.scale);
		materialParams.material = litMeshMaterialParams;
		materialParams.cullMode = material.doubleSided ? "none" : "back";
		if (material.alphaMode === "BLEND") {
			materialParams.transparent = true;
			materialParams.targets = [{ blend: {
				color: {
					srcFactor: "src-alpha",
					dstFactor: "one-minus-src-alpha"
				},
				alpha: {
					srcFactor: "one",
					dstFactor: "one-minus-src-alpha"
				}
			} }];
		}
		return materialParams;
	}
	/**
	* Create all the {@link MeshDescriptorMaterialParams} from the {@link GLTF.IMaterial | glTF materials}.
	*/
	createMaterialsParams() {
		this.gltf.materials?.forEach((material, index) => {
			this.scenesManager.materialsParams.push(this.getMaterialBaseParameters(index));
		});
	}
	/**
	* Create a {@link ChildDescriptor} from a parent {@link ChildDescriptor} and a {@link GLTF.INode | glTF Node}
	* @param parent - parent {@link ChildDescriptor} to use.
	* @param node - {@link GLTF.INode | glTF Node} to use.
	* @param index - Index of the {@link GLTF.INode | glTF Node} to use.
	*/
	createNode(parent, node, index) {
		const child = {
			index,
			name: node.name,
			node: new Object3D(),
			children: []
		};
		this.scenesManager.nodes.set(index, child.node);
		parent.children.push(child);
		child.node.parent = parent.node;
		if (node.matrix) {
			child.node.modelMatrix.setFromArray(new Float32Array(node.matrix));
			child.node.matrices.model.shouldUpdate = false;
		} else {
			if (node.translation) child.node.position.set(node.translation[0], node.translation[1], node.translation[2]);
			if (node.scale) child.node.scale.set(node.scale[0], node.scale[1], node.scale[2]);
			if (node.rotation) child.node.quaternion.setFromArray(new Float32Array(node.rotation));
		}
		if (node.children) node.children.forEach((childNodeIndex) => {
			const childNode = this.gltf.nodes[childNodeIndex];
			this.createNode(child, childNode, childNodeIndex);
		});
		let instancesDescriptor = null;
		if (node.mesh !== void 0) {
			let instanceAttributes = null;
			if (node.extensions && node.extensions.EXT_mesh_gpu_instancing) {
				const { attributes } = node.extensions.EXT_mesh_gpu_instancing;
				instanceAttributes = {
					count: 0,
					nodesTransformations: {}
				};
				for (const attribute of Object.entries(attributes)) {
					const accessor = this.gltf.accessors[attribute[1]];
					const attributeValues = this.#getAccessorArray(accessor);
					instanceAttributes.count = accessor.count;
					instanceAttributes.nodesTransformations[attribute[0].toLowerCase()] = attributeValues;
				}
			}
			const mesh = this.gltf.meshes[node.mesh];
			mesh.primitives.forEach((primitive, primitiveIndex) => {
				const scenes = [];
				if (this.gltf.scenes) this.gltf.scenes.forEach((scene, i) => {
					if (scene.nodes.includes(index)) scenes.push({
						name: scene.name ?? `scene${i}`,
						index: i
					});
				});
				const meshDescriptor = {
					parent: child.node,
					texturesDescriptors: [],
					variantName: "Default",
					parameters: { label: mesh.name ? mesh.name + " " + primitiveIndex : "glTF mesh " + primitiveIndex },
					nodes: [],
					scenes,
					extensionsUsed: [],
					alternateDescriptors: /* @__PURE__ */ new Map(),
					alternateMaterials: /* @__PURE__ */ new Map()
				};
				instancesDescriptor = this.#primitiveInstances.get(primitive);
				if (!instancesDescriptor) {
					instancesDescriptor = {
						instances: [],
						nodes: [],
						meshDescriptor
					};
					this.#primitiveInstances.set(primitive, instancesDescriptor);
				}
				instancesDescriptor.instances.push(node);
				instancesDescriptor.nodes.push(child.node);
				if (instanceAttributes && instanceAttributes.count) for (let i = 0; i < instanceAttributes.count; i++) {
					const instanceNode = new Object3D();
					if (instanceAttributes.nodesTransformations) {
						const { translation, scale, rotation } = instanceAttributes.nodesTransformations;
						if (translation) instanceNode.position.set(translation[i * 3], translation[i * 3 + 1], translation[i * 3 + 2]);
						if (scale) instanceNode.scale.set(scale[i * 3], scale[i * 3 + 1], scale[i * 3 + 2]);
						if (rotation) instanceNode.quaternion.setFromArray(Float32Array.from([
							rotation[i * 4],
							rotation[i * 4 + 1],
							rotation[i * 4 + 2],
							rotation[i * 4 + 3]
						]));
					}
					instanceNode.parent = child.node;
					instancesDescriptor.instances.push(node);
					instancesDescriptor.nodes.push(instanceNode);
				}
			});
		}
		if (node.extensions && node.extensions.KHR_lights_punctual) {
			const light = this.scenesManager.lights[node.extensions.KHR_lights_punctual.light];
			light.position.set(0, 0, 0);
			child.node.scale.set(1);
			if (light instanceof DirectionalLight || light instanceof SpotLight) {
				light.target.set(0, 0, -1);
				const _updateWorldMatrix = child.node.updateWorldMatrix.bind(child.node);
				child.node.updateWorldMatrix = (updateParents, updateChildren) => {
					_updateWorldMatrix(updateParents, updateChildren);
					light.updateTargetFromWorldMatrix();
				};
			}
			light.parent = child.node;
		}
		if (node.camera !== void 0) {
			child.node.scale.set(1);
			const gltfCamera = this.gltf.cameras[node.camera];
			if (gltfCamera.type === "perspective") {
				let width = 0, height = 0;
				if (gltfCamera.perspective.aspectRatio !== void 0) {
					const minSize = Math.min(this.renderer.boundingRect.width, this.renderer.boundingRect.height);
					width = minSize / gltfCamera.perspective.aspectRatio;
					height = minSize * gltfCamera.perspective.aspectRatio;
				} else {
					width = this.renderer.boundingRect.width;
					height = this.renderer.boundingRect.height;
				}
				const fov = gltfCamera.perspective.yfov * 180 / Math.PI;
				const camera = new PerspectiveCamera({
					label: gltfCamera.name ?? `glTF Perspective camera ${node.camera}`,
					fov,
					near: gltfCamera.perspective.znear ?? .01,
					far: gltfCamera.perspective.zfar ?? 1e3,
					width,
					height,
					pixelRatio: this.renderer.pixelRatio,
					...gltfCamera.perspective.aspectRatio !== void 0 && { forceAspect: gltfCamera.perspective.aspectRatio }
				});
				camera.position.set(0);
				camera.parent = child.node;
				this.scenesManager.cameras.push(camera);
			} else if (gltfCamera.type === "orthographic") {
				const camera = new OrthographicCamera({
					label: gltfCamera.name ?? `glTF Orthographic camera ${node.camera}`,
					near: gltfCamera.orthographic.znear ?? .01,
					far: gltfCamera.orthographic.zfar ?? 1e3,
					left: -gltfCamera.orthographic.xmag,
					right: gltfCamera.orthographic.xmag,
					top: gltfCamera.orthographic.ymag,
					bottom: -gltfCamera.orthographic.ymag
				});
				camera.position.set(0);
				camera.parent = child.node;
				this.scenesManager.cameras.push(camera);
			}
		}
		if (this.gltf.animations) this.scenesManager.animations.forEach((targetsAnimation, i) => {
			const animation = this.gltf.animations[i];
			const channels = animation.channels.filter((channel) => channel.target.node === index);
			animation.channels.filter((channel) => channel.target.path === "pointer" && channel.target.extensions && channel.target.extensions.KHR_animation_pointer && channel.target.extensions.KHR_animation_pointer.pointer && channel.target.extensions.KHR_animation_pointer.pointer.includes("weights")).forEach((pointerChannel) => {
				const pointerWeightChannel = {
					sampler: pointerChannel.sampler,
					target: {
						node: null,
						path: "weights"
					}
				};
				const splitedPointerPaths = pointerChannel.target.extensions.KHR_animation_pointer.pointer.split("/");
				splitedPointerPaths.shift();
				pointerWeightChannel.target.node = parseInt(splitedPointerPaths[1]);
				channels.push(pointerWeightChannel);
			});
			if (channels && channels.length) {
				targetsAnimation.addTarget(child.node);
				channels.forEach((channel) => {
					const animName = node.name ? `${node.name} animation` : `${channel.target.path} animation ${index}`;
					const label = animation.name ? `${animation.name} ${animName}` : `Animation ${i} ${animName}`;
					const input = (() => {
						switch (channel.target.path) {
							case "rotation": return {
								type: "quaternion",
								value: child.node.quaternion
							};
							case "translation": return {
								type: "vec3",
								value: child.node.position
							};
							case "scale": return {
								type: "vec3",
								value: child.node.scale
							};
							case "weights": return {
								type: "array",
								value: null
							};
							default: return {
								type: null,
								value: null
							};
						}
					})();
					const sampler = animation.samplers[channel.sampler];
					const path = channel.target.path;
					const { keyframes, values } = this.getAnimationKeyframesValues(sampler);
					const keyframesAnimation = new KeyframesAnimation({
						label,
						inputIndex: sampler.input,
						keyframes,
						values,
						path,
						type: input.type,
						inputValue: input.value,
						interpolation: sampler.interpolation
					});
					targetsAnimation.addTargetAnimation(child.node, keyframesAnimation);
				});
			}
		});
		if (node.extensions && node.extensions.KHR_node_visibility) {
			const visible = node.extensions.KHR_node_visibility.visible !== void 0 ? node.extensions.KHR_node_visibility.visible : true;
			child.node.visible = visible;
		}
	}
	/**
	* Get a {@link TypedArray} from an accessor patched with sparse values if needed.
	* @param accessor - {@link GLTF.IAccessor | Accessor} to get the array from.
	* @returns - {@link TypedArray} holding the referent accessor values, patched with sparse values if needed.
	* @private
	*/
	#getAccessorArray(accessor) {
		const constructor = accessor.componentType ? GLTFScenesManager.getTypedArrayConstructorFromComponentType(accessor.componentType) : Float32Array;
		const attrSize = GLTFScenesManager.getVertexAttributeParamsFromType(accessor.type).size;
		const bufferView = this.gltf.bufferViews[accessor.bufferView];
		const array = new constructor(this.gltf.arrayBuffers[bufferView.buffer], accessor.byteOffset + bufferView.byteOffset, accessor.count * attrSize);
		if (accessor.sparse) {
			const { indices, values } = this.#getSparseAccessorIndicesAndValues(accessor);
			for (let i = 0; i < indices.length; i++) for (let j = 0; j < attrSize; j++) array[indices[i] * attrSize + j] = values[i * attrSize + j];
		}
		return array;
	}
	/**
	* Get an accessor sparse indices values to use for replacement if any.
	* @param accessor - {@link GLTF.IAccessor | Accessor} to check for sparse indices.
	* @returns parameters - indices and values found as {@link TypedArray} if any.
	* @private
	*/
	#getSparseAccessorIndicesAndValues(accessor) {
		if (!accessor.sparse) return {
			indices: null,
			values: null
		};
		const accessorConstructor = GLTFScenesManager.getTypedArrayConstructorFromComponentType(accessor.componentType);
		const attrSize = GLTFScenesManager.getVertexAttributeParamsFromType(accessor.type).size;
		const sparseValuesBufferView = this.gltf.bufferViews[accessor.sparse.values.bufferView];
		const sparseValues = new accessorConstructor(this.gltf.arrayBuffers[sparseValuesBufferView.buffer], accessor.byteOffset + sparseValuesBufferView.byteOffset, accessor.sparse.count * attrSize);
		const sparseIndicesConstructor = GLTFScenesManager.getTypedArrayConstructorFromComponentType(accessor.sparse.indices.componentType);
		const sparseIndicesBufferView = this.gltf.bufferViews[accessor.sparse.indices.bufferView];
		return {
			indices: new sparseIndicesConstructor(this.gltf.arrayBuffers[sparseIndicesBufferView.buffer], accessor.byteOffset + sparseIndicesBufferView.byteOffset, accessor.sparse.count),
			values: sparseValues
		};
	}
	/**
	* Get a clean attribute name based on a glTF attribute name.
	* @param gltfAttributeName - glTF attribute name.
	* @returns - Attribute name conform to our expectations.
	*/
	static getCleanAttributeName(gltfAttributeName) {
		return gltfAttributeName === "TEXCOORD_0" ? "uv" : gltfAttributeName.replace("_", "").replace("TEXCOORD", "uv").toLowerCase();
	}
	/**
	* Sort an array of {@link VertexBufferAttributeParams} by an array of attribute names.
	* @param attributesNames - array of attribute names to use for sorting.
	* @param attributes - {@link VertexBufferAttributeParams} array to sort.
	*/
	sortAttributesByNames(attributesNames, attributes) {
		attributes.sort((a, b) => {
			let aIndex = attributesNames.findIndex((attrName) => attrName === a.name);
			aIndex = aIndex === -1 ? Infinity : aIndex;
			let bIndex = attributesNames.findIndex((attrName) => attrName === b.name);
			bIndex = bIndex === -1 ? Infinity : bIndex;
			return aIndex - bIndex;
		});
	}
	/**
	* Parse a {@link GLTF.IMeshPrimitive | glTF primitive} and create typed arrays from the given {@link gltf} accessors, bufferViews and buffers.
	* @param primitiveProperty- Primitive property to parse, can either be `attributes` or `targets`.
	* @param attributes - An empty {@link VertexBufferAttributeParams} array to fill with parsed values.
	* @returns - Interleaved attributes {@link TypedArray} if any.
	* @private
	*/
	#parsePrimitiveProperty(primitiveProperty, attributes) {
		let interleavedArray = null;
		let interleavedBufferView = null;
		let maxByteOffset = 0;
		const primitiveAttributes = Object.entries(primitiveProperty);
		primitiveAttributes.sort((a, b) => a[1] - b[1]);
		const primitiveAttributesValues = Object.values(primitiveProperty);
		primitiveAttributesValues.sort((a, b) => a - b);
		for (const [attribName, accessorIndex] of primitiveAttributes) {
			const name = GLTFScenesManager.getCleanAttributeName(attribName);
			const accessor = this.gltf.accessors[accessorIndex];
			const constructor = accessor.componentType ? GLTFScenesManager.getTypedArrayConstructorFromComponentType(accessor.componentType) : Float32Array;
			let bufferViewIndex = accessor.bufferView;
			if (bufferViewIndex === void 0) continue;
			const bufferView = this.gltf.bufferViews[bufferViewIndex];
			const byteStride = bufferView.byteStride;
			const accessorByteOffset = accessor.byteOffset;
			if (byteStride !== void 0 && accessorByteOffset !== void 0 && accessorByteOffset < byteStride) maxByteOffset = Math.max(accessorByteOffset, maxByteOffset);
			else maxByteOffset = 0;
			if (name === "position") interleavedBufferView = bufferView;
			const { size } = GLTFScenesManager.getVertexAttributeParamsFromType(accessor.type);
			let array = null;
			if (maxByteOffset > 0) {
				const parentArray = new constructor(this.gltf.arrayBuffers[bufferView.buffer], 0, bufferView.byteLength / constructor.BYTES_PER_ELEMENT);
				array = new constructor(accessor.count * size);
				const arrayStride = accessorByteOffset / constructor.BYTES_PER_ELEMENT;
				for (let i = 0; i < accessor.count; i++) for (let j = 0; j < size; j++) array[i * size + j] = parentArray[arrayStride + size * i + size * i + j];
			} else if (bufferView.byteStride && bufferView.byteStride > constructor.BYTES_PER_ELEMENT * size) {
				const dataView = new DataView(this.gltf.arrayBuffers[bufferView.buffer], bufferView.byteOffset + accessor.byteOffset);
				array = new constructor(accessor.count * size);
				for (let i = 0; i < accessor.count; i++) {
					const baseOffset = i * bufferView.byteStride;
					for (let j = 0; j < size; j++) array[i * size + j] = dataView.getUint16(baseOffset + j * constructor.BYTES_PER_ELEMENT, true);
				}
			} else array = new constructor(this.gltf.arrayBuffers[bufferView.buffer], accessor.byteOffset + bufferView.byteOffset, accessor.count * size);
			if (accessor.sparse) {
				const { indices, values } = this.#getSparseAccessorIndicesAndValues(accessor);
				for (let i = 0; i < indices.length; i++) for (let j = 0; j < size; j++) array[indices[i] * size + j] = values[i * size + j];
			}
			if (name.includes("weights")) for (let i = 0; i < accessor.count * size; i += size) {
				const x = array[i];
				const y = array[i + 1];
				const z = array[i + 2];
				const w = array[i + 3];
				let len = Math.abs(x) + Math.abs(y) + Math.abs(z) + Math.abs(w);
				if (len > 0) len = 1 / Math.sqrt(len);
				else len = 1;
				array[i] *= len;
				array[i + 1] *= len;
				array[i + 2] *= len;
				array[i + 3] *= len;
			}
			let normalized = !!accessor.normalized;
			const patchedAttributeParams = vertexBufferAttributeLayouts.find((vb) => size <= vb.size && vb.typedArrayConstructor === array.constructor && vb.normalized === normalized);
			if (this.gltf.extensionsRequired?.includes("KHR_mesh_quantization") && array.constructor !== Float32Array && (name === "position" || name === "normal" || name === "tangent" || name.indexOf("uv") !== -1)) {
				const stride = patchedAttributeParams.size;
				if (stride !== size) {
					const newArray = new array.constructor(accessor.count * stride);
					for (let i = 0; i < newArray.length; i++) {
						const si = i * size;
						const di = i * stride;
						for (let c = 0; c < size; c++) newArray[di + c] = array[si + c];
					}
					array = newArray;
				}
			}
			const attribute = {
				name,
				...patchedAttributeParams,
				array,
				normalized
			};
			attributes.push(attribute);
		}
		if (maxByteOffset > 0) {
			const accessorsBufferViews = primitiveAttributesValues.map((accessorIndex) => this.gltf.accessors[accessorIndex].bufferView);
			if (!accessorsBufferViews.every((val) => val === accessorsBufferViews[0])) {
				let totalStride = 0;
				const arrayLength = Object.values(primitiveProperty).reduce((acc, accessorIndex) => {
					const accessor = this.gltf.accessors[accessorIndex];
					const attrSize = GLTFScenesManager.getVertexAttributeParamsFromType(accessor.type).size;
					totalStride += attrSize * Float32Array.BYTES_PER_ELEMENT;
					return acc + accessor.count * attrSize;
				}, 0);
				interleavedArray = new Float32Array(Math.ceil(arrayLength / 4) * 4);
				let startWriteOffset = 0;
				const cleanAttributeNames = Object.entries(primitiveProperty).map((prop) => GLTFScenesManager.getCleanAttributeName(prop[0]));
				Object.values(primitiveProperty).forEach((accessorIndex, index) => {
					const accessor = this.gltf.accessors[accessorIndex];
					const bufferView = this.gltf.bufferViews[accessor.bufferView];
					const attribute = attributes.find((attr) => attr.name === cleanAttributeNames[index]);
					const attrSize = GLTFScenesManager.getVertexAttributeParamsFromType(accessor.type).size;
					const { indices, values } = this.#getSparseAccessorIndicesAndValues(accessor);
					for (let i = 0; i < accessor.count; i++) {
						const bufferOffset = bufferView.byteOffset + accessor.byteOffset + i * bufferView.byteStride;
						const subarray = new Float32Array(this.gltf.arrayBuffers[bufferView.buffer], bufferOffset, attrSize);
						if (indices && values && indices.includes(i)) for (let j = 0; i < attrSize; j++) subarray[j] = values[i * attrSize + j];
						const startOffset = startWriteOffset + i * totalStride / Float32Array.BYTES_PER_ELEMENT;
						interleavedArray.subarray(startOffset, startOffset + attrSize).set(subarray);
						attribute.array.subarray(i * attrSize, i * attrSize + attrSize).set(subarray);
					}
					startWriteOffset += attrSize;
				});
				this.sortAttributesByNames(cleanAttributeNames, attributes);
			} else {
				interleavedArray = new Float32Array(this.gltf.arrayBuffers[interleavedBufferView.buffer], interleavedBufferView.byteOffset, Math.ceil(interleavedBufferView.byteLength / 4) * 4 / Float32Array.BYTES_PER_ELEMENT);
				let stride = 0;
				primitiveAttributesValues.forEach((accessorIndex) => {
					const accessor = this.gltf.accessors[accessorIndex];
					const attrSize = GLTFScenesManager.getVertexAttributeParamsFromType(accessor.type).size;
					const { indices, values } = this.#getSparseAccessorIndicesAndValues(accessor);
					if (indices && values) for (let i = 0; i < indices.length; i++) for (let j = 0; j < attrSize; j++) {
						const arrayStride = stride + attrSize * i;
						interleavedArray[arrayStride + indices[i] * attrSize + j] = values[i * attrSize + j];
					}
					stride += attrSize;
				});
				const accessorNameOrder = Object.entries(primitiveProperty).sort((a, b) => {
					return this.gltf.accessors[a[1]].byteOffset - this.gltf.accessors[b[1]].byteOffset;
				}).map((property) => GLTFScenesManager.getCleanAttributeName(property[0]));
				this.sortAttributesByNames(accessorNameOrder, attributes);
			}
		}
		return interleavedArray;
	}
	/**
	* Create the mesh {@link Geometry} based on the given {@link gltf} primitive and {@link PrimitiveInstanceDescriptor}.
	* @param primitive - {@link gltf} primitive to use to create the {@link Geometry}.
	* @param primitiveInstance - {@link PrimitiveInstanceDescriptor} to use to create the {@link Geometry}.
	*/
	createGeometry(primitive, primitiveInstance) {
		const { instances, meshDescriptor } = primitiveInstance;
		let defaultAttributes = [];
		const isIndexedGeometry = "indices" in primitive;
		const topology = GLTFScenesManager.gpuPrimitiveTopologyForMode(primitive.mode);
		if (primitive.extensions && primitive.extensions.KHR_draco_mesh_compression) {
			meshDescriptor.extensionsUsed.push("KHR_draco_mesh_compression");
			if (!this.renderer.production) {
				throwWarning("GLTFScenesManager: Draco compression is not supported.");
				console.warn("This primitive instance geometry could not be created", primitiveInstance);
			}
			return;
		}
		let interleavedArray = this.#parsePrimitiveProperty(primitive.attributes, defaultAttributes);
		const geometryBBox = new Box3();
		for (const [attribName, accessorIndex] of Object.entries(primitive.attributes)) if (attribName === "POSITION") {
			const accessor = this.gltf.accessors[accessorIndex];
			const positionAttr = defaultAttributes.find((attr) => attr.name === "position");
			const dequantizePositions = Geometry.dequantize(positionAttr && positionAttr.normalized && positionAttr.array && positionAttr.array.constructor || Float32Array);
			if (geometryBBox) {
				geometryBBox.min.min(new Vec3(dequantizePositions(accessor.min[0]), dequantizePositions(accessor.min[1]), dequantizePositions(accessor.min[2])));
				geometryBBox.max.max(new Vec3(dequantizePositions(accessor.max[0]), dequantizePositions(accessor.max[1]), dequantizePositions(accessor.max[2])));
			}
		}
		let indicesArray = null;
		let indicesConstructor = null;
		if (isIndexedGeometry) {
			const accessor = this.gltf.accessors[primitive.indices];
			const bufferView = this.gltf.bufferViews[accessor.bufferView];
			indicesConstructor = GLTFScenesManager.getTypedArrayConstructorFromComponentType(accessor.componentType);
			const bytesPerElement = indicesConstructor.name === "Uint8Array" ? Uint16Array.BYTES_PER_ELEMENT : indicesConstructor.BYTES_PER_ELEMENT;
			const arrayOffset = accessor.byteOffset + bufferView.byteOffset;
			const arrayBuffer = this.gltf.arrayBuffers[bufferView.buffer];
			const arrayLength = Math.min(Math.ceil(accessor.count / bytesPerElement) * bytesPerElement, Math.ceil((arrayBuffer.byteLength - arrayOffset) / bytesPerElement));
			indicesArray = indicesConstructor.name === "Uint8Array" ? Uint16Array.from(new indicesConstructor(arrayBuffer, arrayOffset, arrayLength)) : new indicesConstructor(arrayBuffer, arrayOffset, arrayLength);
			if (accessor.sparse) {
				const { indices, values } = this.#getSparseAccessorIndicesAndValues(accessor);
				for (let i = 0; i < indices.length; i++) indicesArray[indices[i]] = values[i];
			}
		}
		const hasNormal = defaultAttributes.find((attribute) => attribute.name === "normal");
		if (!hasNormal) {
			defaultAttributes = defaultAttributes.filter((attr) => attr.name !== "tangent");
			interleavedArray = null;
		}
		if (!interleavedArray) this.sortAttributesByNames([
			"position",
			"uv",
			"normal"
		], defaultAttributes);
		if (!hasNormal && (topology.includes("line") || topology.includes("point"))) meshDescriptor.extensionsUsed.push("KHR_materials_unlit");
		const geometryAttributes = {
			instancesCount: instances.length,
			topology,
			vertexBuffers: [{
				name: "attributes",
				stepMode: "vertex",
				attributes: defaultAttributes,
				...interleavedArray && { array: interleavedArray }
			}]
		};
		const GeometryConstructor = isIndexedGeometry ? IndexedGeometry : Geometry;
		meshDescriptor.parameters.geometry = new GeometryConstructor(geometryAttributes);
		if (isIndexedGeometry && indicesConstructor && indicesArray) meshDescriptor.parameters.geometry.setIndexBuffer({
			bufferFormat: indicesConstructor.name === "Uint32Array" ? "uint32" : "uint16",
			array: indicesArray
		});
		if (!hasNormal) meshDescriptor.parameters.geometry.computeGeometry();
		meshDescriptor.parameters.geometry.boundingBox = geometryBBox;
	}
	/**
	* Create the {@link SkinDefinition | skins definitions} for each {@link gltf} skins.
	*/
	createSkins() {
		if (this.gltf.skins) this.gltf.skins.forEach((skin, skinIndex) => {
			const meshIndex = this.gltf.nodes.find((node) => node.skin !== void 0 && node.mesh !== void 0 && node.skin === skinIndex).mesh;
			let matrices;
			if (skin.inverseBindMatrices) {
				const matricesAccessor = this.gltf.accessors[skin.inverseBindMatrices];
				matrices = this.#getAccessorArray(matricesAccessor);
			} else {
				matrices = new Float32Array(16 * skin.joints.length);
				for (let i = 0; i < skin.joints.length * 16; i += 16) {
					matrices[i] = 1;
					matrices[i + 5] = 1;
					matrices[i + 10] = 1;
					matrices[i + 15] = 1;
				}
			}
			const binding = new BufferBinding({
				label: "Skin " + skinIndex,
				name: "skin" + skinIndex,
				bindingType: "storage",
				visibility: ["vertex"],
				childrenBindings: [{
					binding: new BufferBinding({
						label: "Joints " + skinIndex,
						name: "joints",
						bindingType: "storage",
						visibility: ["vertex"],
						struct: {
							jointMatrix: {
								type: "mat4x4f",
								value: new Float32Array(16)
							},
							normalMatrix: {
								type: "mat4x4f",
								value: new Float32Array(16)
							}
						}
					}),
					count: skin.joints.length,
					forceArray: true
				}]
			});
			for (let i = 0; i < skin.joints.length; i++) {
				for (let j = 0; j < 16; j++) {
					binding.childrenBindings[i].inputs.jointMatrix.value[j] = matrices[i * 16 + j];
					binding.childrenBindings[i].inputs.normalMatrix.value[j] = matrices[i * 16 + j];
				}
				binding.childrenBindings[i].inputs.jointMatrix.shouldUpdate = true;
				binding.childrenBindings[i].inputs.normalMatrix.shouldUpdate = true;
			}
			const joints = skin.joints.map((joint) => this.scenesManager.nodes.get(joint));
			const jointMatrix = new Mat4();
			const normalMatrix = new Mat4();
			const parentNodeIndex = this.gltf.nodes.findIndex((node) => node.mesh !== void 0 && node.skin !== void 0 && node.mesh === meshIndex);
			if (parentNodeIndex !== -1) {
				const parentNode = this.scenesManager.nodes.get(parentNodeIndex);
				const parentInverseWorldMatrix = new Mat4();
				const _updateWorldMatrix = parentNode.updateWorldMatrix.bind(parentNode);
				parentNode.updateWorldMatrix = (updateParents, updateChildren) => {
					_updateWorldMatrix(updateParents, updateChildren);
					parentInverseWorldMatrix.copy(parentNode.worldMatrix).invert();
				};
				if (this.scenesManager.animations.length) for (const animation of this.scenesManager.animations) joints.forEach((object, jointIndex) => {
					const updateJointMatrix = () => {
						if (animation.isPlaying) jointMatrix.setFromArray(matrices, jointIndex * 16).premultiply(object.worldMatrix).premultiply(parentInverseWorldMatrix);
						else jointMatrix.identity();
						normalMatrix.copy(jointMatrix).invert().transpose();
						for (let i = 0; i < 16; i++) {
							binding.childrenBindings[jointIndex].inputs.jointMatrix.value[i] = jointMatrix.elements[i];
							binding.childrenBindings[jointIndex].inputs.normalMatrix.value[i] = normalMatrix.elements[i];
						}
						binding.childrenBindings[jointIndex].inputs.jointMatrix.shouldUpdate = true;
						binding.childrenBindings[jointIndex].inputs.normalMatrix.shouldUpdate = true;
					};
					const node = this.gltf.nodes[jointIndex];
					const animName = node.name ? `${node.name} skin animation` : `skin animation ${jointIndex}`;
					const emptyAnimation = new KeyframesAnimation({ label: animation.label ? `${animation.label} ${animName}` : `Animation ${animName}` });
					emptyAnimation.onAfterUpdate = updateJointMatrix;
					animation.addTargetAnimation(object, emptyAnimation);
				});
				else joints.forEach((object, jointIndex) => {
					jointMatrix.setFromArray(matrices, jointIndex * 16).premultiply(object.worldMatrix).premultiply(parentInverseWorldMatrix);
					normalMatrix.copy(jointMatrix).invert().transpose();
					for (let i = 0; i < 16; i++) {
						binding.childrenBindings[jointIndex].inputs.jointMatrix.value[i] = jointMatrix.elements[i];
						binding.childrenBindings[jointIndex].inputs.normalMatrix.value[i] = normalMatrix.elements[i];
					}
					binding.childrenBindings[jointIndex].inputs.jointMatrix.shouldUpdate = true;
					binding.childrenBindings[jointIndex].inputs.normalMatrix.shouldUpdate = true;
				});
				this.scenesManager.skins.push({
					parentNode,
					joints,
					inverseBindMatrices: matrices,
					jointMatrix,
					normalMatrix,
					parentInverseWorldMatrix,
					binding
				});
			}
		});
	}
	/**
	* Create the mesh material parameters based on the given {@link gltf} primitive and {@link PrimitiveInstanceDescriptor}.
	* @param primitive - {@link gltf} primitive to use to create the material parameters.
	* @param primitiveInstance - {@link PrimitiveInstanceDescriptor} to use to create the material parameters.
	*/
	createMaterial(primitive, primitiveInstance) {
		const { instances, nodes, meshDescriptor } = primitiveInstance;
		const { geometry } = meshDescriptor.parameters;
		const instancesCount = instances.length;
		const meshIndex = instances[0].mesh;
		if (primitive.targets) {
			const bindings = [];
			const weights = this.gltf.meshes[meshIndex].weights;
			let weightAnimation = null;
			for (const animation of this.scenesManager.animations) {
				weightAnimation = animation.getAnimationByObject3DAndPath(meshDescriptor.parent, "weights");
				if (weightAnimation) break;
			}
			primitive.targets.forEach((target, index) => {
				const targetAttributes = [];
				this.#parsePrimitiveProperty(target, targetAttributes);
				const struct = targetAttributes.reduce((acc, attribute) => {
					return acc = {
						...acc,
						[attribute.name]: {
							type: `array<${attribute.type}>`,
							value: attribute.array
						}
					};
				}, { weight: {
					type: "f32",
					value: weights && weights.length ? weights[index] : 0
				} });
				const targetBinding = new BufferBinding({
					label: "Morph target " + index,
					name: "morphTarget" + index,
					bindingType: "storage",
					visibility: ["vertex"],
					struct
				});
				if (weightAnimation) weightAnimation.addBindingInput(targetBinding.inputs.weight);
				bindings.push(targetBinding);
			});
			if (!meshDescriptor.parameters.bindings) meshDescriptor.parameters.bindings = [];
			meshDescriptor.parameters.bindings = [...meshDescriptor.parameters.bindings, ...bindings];
		}
		if (this.gltf.skins) this.gltf.skins.forEach((skin, skinIndex) => {
			if (!meshDescriptor.parameters.bindings) meshDescriptor.parameters.bindings = [];
			instances.forEach((node, instanceIndex) => {
				if (node.skin !== void 0 && node.skin === skinIndex) {
					const skinDef = this.scenesManager.skins[skinIndex];
					meshDescriptor.parameters.bindings = [...meshDescriptor.parameters.bindings, skinDef.binding];
					if (instanceIndex > 0) {
						const tempBbox = geometry.boundingBox.clone();
						const tempMat4 = new Mat4();
						skinDef.joints.forEach((object, jointIndex) => {
							tempMat4.setFromArray(skinDef.inverseBindMatrices, jointIndex * 16);
							const transformedBbox = tempBbox.applyMat4(tempMat4).applyMat4(object.worldMatrix);
							this.scenesManager.boundingBox.min.min(transformedBbox.min);
							this.scenesManager.boundingBox.max.max(transformedBbox.max);
						});
					}
				}
			});
		});
		const defaultMaterialParams = this.scenesManager.materialsParams[primitive.material];
		meshDescriptor.texturesDescriptors = this.scenesManager.materialsTextures[primitive.material]?.texturesDescriptors || [];
		meshDescriptor.parameters = {
			...meshDescriptor.parameters,
			...defaultMaterialParams
		};
		const { extensions } = this.gltf.materials && this.gltf.materials[primitive.material] || {};
		if (extensions) for (const extension of Object.keys(extensions)) if (extension === "KHR_materials_unlit" && this.gltf.extensionsRequired && this.gltf.extensionsRequired.includes(extension)) meshDescriptor.extensionsUsed.push(extension);
		else meshDescriptor.extensionsUsed.push(extension);
		const dispersion = extensions && extensions.KHR_materials_dispersion || null;
		const transmission = extensions && extensions.KHR_materials_transmission || null;
		const volume = extensions && extensions.KHR_materials_volume || null;
		const hasTransmission = transmission || volume || dispersion;
		const useTransmission = this.gltf.extensionsUsed && (this.gltf.extensionsUsed.includes("KHR_materials_transmission") || this.gltf.extensionsUsed.includes("KHR_materials_volume") || this.gltf.extensionsUsed.includes("KHR_materials_dispersion"));
		if (useTransmission && hasTransmission) meshDescriptor.parameters.transmissive = true;
		if (useTransmission && hasTransmission) {
			this.renderer.createTransmissionTarget();
			meshDescriptor.texturesDescriptors.push({
				texture: this.renderer.transmissionTarget.texture,
				sampler: this.renderer.transmissionTarget.sampler
			});
		}
		meshDescriptor.parameters.material = {
			...meshDescriptor.parameters.material,
			...meshDescriptor.texturesDescriptors.reduce((acc, descriptor) => {
				return {
					...acc,
					[descriptor.texture.options.name]: descriptor
				};
			}, {})
		};
		if (instancesCount > 1) {
			const instancesBinding = new BufferBinding({
				label: "Instances",
				name: "instances",
				visibility: ["vertex", "fragment"],
				bindingType: "storage",
				childrenBindings: [{
					binding: new BufferBinding({
						label: "Instance matrices",
						name: "matrices",
						visibility: ["vertex", "fragment"],
						bindingType: "storage",
						struct: {
							model: {
								type: "mat4x4f",
								value: new Mat4()
							},
							normal: {
								type: "mat3x3f",
								value: new Mat3()
							},
							handedness: {
								type: "f32",
								value: 1
							}
						}
					}),
					count: instancesCount,
					forceArray: true
				}]
			});
			instancesBinding.childrenBindings.forEach((binding, index) => {
				const instanceNode = nodes[index];
				const determinant = instanceNode.worldMatrix.determinant();
				binding.inputs.handedness.value = determinant > 0 ? 1 : -1;
				const updateInstanceMatrices = () => {
					binding.inputs.model.value.copy(instanceNode.worldMatrix);
					binding.inputs.normal.value.getNormalMatrix(instanceNode.worldMatrix);
					binding.inputs.model.shouldUpdate = true;
					binding.inputs.normal.shouldUpdate = true;
				};
				const _updateWorldMatrix = instanceNode.updateWorldMatrix.bind(instanceNode);
				instanceNode.updateWorldMatrix = () => {
					_updateWorldMatrix();
					updateInstanceMatrices();
				};
				updateInstanceMatrices();
			});
			if (!meshDescriptor.parameters.bindings) meshDescriptor.parameters.bindings = [];
			meshDescriptor.parameters.bindings.push(instancesBinding);
		} else if (primitiveInstance.nodes[0].worldMatrix.determinant() < 0) meshDescriptor.parameters.geometry.verticesOrder = "cw";
		for (let i = 0; i < nodes.length; i++) {
			const transformedBbox = (geometry ? geometry.boundingBox.clone() : new Box3()).applyMat4(meshDescriptor.nodes[i].worldMatrix);
			this.scenesManager.boundingBox.min.min(transformedBbox.min);
			this.scenesManager.boundingBox.max.max(transformedBbox.max);
		}
		this.scenesManager.boundingBox.max.max(new Vec3(.001));
		const hasTangent = geometry && !!geometry.getAttributeByName("tangent");
		if (!hasTangent && meshDescriptor.parameters.material.normalScale) {
			meshDescriptor.parameters.material.normalScale.y *= -1;
			if (meshDescriptor.parameters.material.clearcoatNormalScale) meshDescriptor.parameters.material.clearcoatNormalScale.y *= -1;
		}
		const hasNormal = primitive.attributes["NORMAL"] !== void 0;
		meshDescriptor.parameters.material.flatShading = !hasNormal;
		if (primitive.extensions) {
			if (primitive.extensions["KHR_materials_variants"] && this.gltf.extensionsUsed && this.gltf.extensionsUsed.includes("KHR_materials_variants")) {
				meshDescriptor.extensionsUsed.push("KHR_materials_variants");
				this.gltf.extensions["KHR_materials_variants"].variants.forEach((variant, index) => {
					const variantMaterial = primitive.extensions["KHR_materials_variants"].mappings.find((mapping) => mapping.variants && mapping.variants.includes(index));
					if (variantMaterial) {
						const gltfVariantMaterial = this.gltf.materials[variantMaterial.material];
						const variantMaterialParams = this.scenesManager.materialsParams[variantMaterial.material];
						const texturesDescriptors = this.scenesManager.materialsTextures[variantMaterial.material]?.texturesDescriptors || [];
						if (useTransmission && hasTransmission) texturesDescriptors.push({
							texture: this.renderer.transmissionTarget.texture,
							sampler: this.renderer.transmissionTarget.sampler
						});
						const { extensions } = gltfVariantMaterial;
						const extensionsUsed = [];
						if (extensions) for (const extension of Object.keys(extensions)) if (extension === "KHR_materials_unlit" && this.gltf.extensionsRequired && this.gltf.extensionsRequired.includes(extension)) extensionsUsed.push(extension);
						else extensionsUsed.push(extension);
						const variantDescriptor = {
							variantName: variant.name,
							parent: meshDescriptor.parent,
							nodes: meshDescriptor.nodes,
							scenes: meshDescriptor.scenes,
							extensionsUsed: [...meshDescriptor.extensionsUsed, ...extensionsUsed],
							texturesDescriptors,
							parameters: {
								geometry: meshDescriptor.parameters.geometry,
								label: variant.name + " " + variantMaterialParams.label,
								transmissive: !!meshDescriptor.parameters.transmissive,
								bindings: meshDescriptor.parameters.bindings ?? [],
								transparent: !!variantMaterialParams.transparent,
								cullMode: variantMaterialParams.cullMode,
								material: {
									...variantMaterialParams.material,
									flatShading: meshDescriptor.parameters.material.flatShading,
									...texturesDescriptors.reduce((acc, descriptor) => {
										return {
											...acc,
											[descriptor.texture.options.name]: descriptor
										};
									}, {})
								},
								...variantMaterialParams.targets && { targets: variantMaterialParams.targets }
							}
						};
						if (!hasTangent && variantDescriptor.parameters.material.normalScale) {
							variantDescriptor.parameters.material.normalScale.y *= -1;
							if (variantDescriptor.parameters.material.clearcoatNormalScale) variantDescriptor.parameters.material.clearcoatNormalScale.y *= -1;
						}
						meshDescriptor.alternateDescriptors.set(variant.name, variantDescriptor);
					}
				});
			}
		}
	}
	/**
	* Create the {@link ScenesManager#scenes | ScenesManager scenes} based on the {@link gltf} object.
	*/
	createScenes() {
		this.scenesManager.node.parent = this.renderer.scene;
		this.gltf.scenes.forEach((childScene) => {
			const sceneDescriptor = {
				name: childScene.name,
				children: [],
				node: new Object3D()
			};
			sceneDescriptor.node.parent = this.scenesManager.node;
			this.scenesManager.scenes.push(sceneDescriptor);
			childScene.nodes.forEach((nodeIndex) => {
				const node = this.gltf.nodes[nodeIndex];
				this.createNode(sceneDescriptor, node, nodeIndex);
			});
		});
		this.scenesManager.node.updateMatrixStack();
		this.createSkins();
		for (const [primitive, primitiveInstance] of this.#primitiveInstances) {
			const { nodes, meshDescriptor } = primitiveInstance;
			meshDescriptor.nodes = nodes;
			this.scenesManager.meshesDescriptors.push(meshDescriptor);
			this.createGeometry(primitive, primitiveInstance);
			this.createMaterial(primitive, primitiveInstance);
		}
	}
	/**
	* Return the {@link PrimitiveInstanceDescriptor} corresponding the given glTF material index, if any.
	* @param materialIndex - glTF material index.
	* @returns - {@link PrimitiveInstanceDescriptor} found if any.
	*/
	getPrimitiveInstanceFromGLTFMaterial(materialIndex) {
		const primitive = Array.from(this.#primitiveInstances.keys()).find((k) => k.material === materialIndex);
		return this.#primitiveInstances.get(primitive) ?? null;
	}
	/**
	* Add all the needed {@link LitMesh} based on the {@link ScenesManager#meshesDescriptors | ScenesManager meshesDescriptors} array.
	* @param patchMeshesParameters - allow to optionally patch the {@link LitMesh} parameters before creating it (can be used to add custom shaders chunks, uniforms or storages, change rendering options, etc.)
	* @returns - Array of created {@link LitMesh}.
	*/
	addMeshes(patchMeshesParameters = (meshDescriptor) => {}) {
		this.scenesManager.node.updateMatrixStack();
		return this.scenesManager.meshesDescriptors.map((meshDescriptor) => {
			const { geometry } = meshDescriptor.parameters;
			if (geometry) {
				patchMeshesParameters(meshDescriptor);
				if (meshDescriptor.extensionsUsed.includes("KHR_materials_unlit")) meshDescriptor.parameters.material.shading = "Unlit";
				const mesh = new LitMesh(this.renderer, { ...meshDescriptor.parameters });
				meshDescriptor.alternateMaterials.set("Default", mesh.material);
				if (this.pointerAnimationsManager) this.pointerAnimationsManager.registerMeshAnimations(meshDescriptor, mesh);
				if (this.gltf.scenes && this.gltf.scenes.length) {
					const activeScene = this.gltf.scene || 0;
					if (meshDescriptor.scenes.length ? meshDescriptor.scenes.find((scene) => scene.index === activeScene) : true) mesh.visible = true;
					else mesh.visible = false;
				}
				meshDescriptor.alternateDescriptors.forEach((descriptor) => {
					const { material: originalMaterial } = meshDescriptor.parameters;
					const { environmentMap, shading, vertexChunks, additionalVaryings, fragmentChunks, toneMapping } = originalMaterial;
					const { label, targets, transparent, material } = descriptor.parameters;
					material.shading = shading;
					if (descriptor.extensionsUsed.includes("KHR_materials_unlit")) material.shading = "Unlit";
					let { uniforms, samplers, textures, bindings } = descriptor.parameters;
					if (!textures) textures = [];
					if (!samplers) samplers = [];
					const variantTexturesDescriptors = LitMesh.getMaterialTexturesDescriptors(material);
					variantTexturesDescriptors.forEach((textureDescriptor) => {
						if (textureDescriptor.sampler) {
							if (!samplers.find((s) => s.uuid === textureDescriptor.sampler.uuid)) samplers.push(textureDescriptor.sampler);
						}
						textures.push(textureDescriptor.texture);
					});
					if (environmentMap && (material.shading === "PBR" || !material.shading)) {
						material.environmentMap = environmentMap;
						textures = [
							...textures,
							environmentMap.lutTexture,
							environmentMap.diffuseTexture,
							environmentMap.specularTexture
						];
						samplers = [...samplers, environmentMap.sampler];
					}
					if (!uniforms) uniforms = {};
					const variantMaterialUniform = LitMesh.getMaterialUniform(material);
					uniforms = {
						...uniforms,
						material: variantMaterialUniform
					};
					if (meshDescriptor.parameters.uniforms) uniforms = {
						...meshDescriptor.parameters.uniforms,
						...uniforms
					};
					if (!bindings) bindings = [];
					bindings = [mesh.material.getBufferBindingByName("matrices"), ...bindings];
					if (meshDescriptor.parameters.bindings) meshDescriptor.parameters.bindings.forEach((binding) => {
						if (!bindings.find((b) => b.name === binding.name)) bindings.push(binding);
					});
					let transmissionBackgroundTexture = null;
					if (meshDescriptor.parameters.transmissive) {
						this.renderer.createTransmissionTarget();
						transmissionBackgroundTexture = {
							texture: this.renderer.transmissionTarget.texture,
							sampler: this.renderer.transmissionTarget.sampler
						};
						textures = [...textures, this.renderer.transmissionTarget.texture];
						samplers = [...samplers, this.renderer.transmissionTarget.sampler];
					}
					if (meshDescriptor.parameters.storages) descriptor.parameters.storages = meshDescriptor.parameters.storages;
					if (meshDescriptor.parameters.bindGroups) descriptor.parameters.bindGroups = meshDescriptor.parameters.bindGroups;
					const vs = LitMesh.getVertexShaderCode({
						bindings,
						geometry,
						chunks: vertexChunks,
						additionalVaryings
					});
					const fs = LitMesh.getFragmentShaderCode({
						shadingModel: shading,
						chunks: fragmentChunks,
						extensionsUsed: descriptor.extensionsUsed,
						receiveShadows: meshDescriptor.parameters.receiveShadows,
						toneMapping,
						geometry,
						additionalVaryings,
						materialUniform: variantMaterialUniform,
						...variantTexturesDescriptors.reduce((acc, descriptor) => {
							return {
								...acc,
								[descriptor.texture.options.name]: descriptor
							};
						}, {}),
						transmissionBackgroundTexture,
						...environmentMap && { environmentMap }
					});
					const shaders = {
						vertex: {
							code: vs,
							entryPoint: "main"
						},
						fragment: {
							code: fs,
							entryPoint: "main"
						}
					};
					const alternateMaterial = new RenderMaterial(this.renderer, {
						...JSON.parse(JSON.stringify(mesh.material.options.rendering)),
						label,
						shaders,
						uniforms,
						bindings,
						...samplers && { samplers },
						...textures && { textures },
						...targets && { targets },
						transparent: !!transparent,
						verticesOrder: geometry.verticesOrder,
						topology: geometry.topology
					});
					meshDescriptor.alternateMaterials.set(descriptor.variantName, alternateMaterial);
				});
				mesh.parent = meshDescriptor.parent;
				this.scenesManager.meshes.push(mesh);
				return mesh;
			}
		});
	}
	/**
	* Destroy the current {@link ScenesManager} by removing all created {@link ScenesManager#meshes | meshes} and destroying all the {@link Object3D} nodes.
	*/
	destroy() {
		this.scenesManager.lights.filter(Boolean).forEach((light) => light.remove());
		this.scenesManager.meshes.forEach((mesh) => mesh.remove());
		this.scenesManager.meshes = [];
		this.scenesManager.meshesDescriptors.forEach((descriptor) => {
			descriptor.alternateMaterials.forEach((material) => material.destroy());
		});
		this.scenesManager.nodes.forEach((node) => {
			node.destroy();
		});
		this.scenesManager.nodes = /* @__PURE__ */ new Map();
		this.scenesManager.scenes.forEach((scene) => {
			scene.node.destroy();
		});
		this.scenesManager.animations.forEach((animation) => animation.setRenderer(null));
		this.scenesManager.node.destroy();
		this.#primitiveInstances = /* @__PURE__ */ new Map();
	}
};
//#endregion
export { GLTFScenesManager };
