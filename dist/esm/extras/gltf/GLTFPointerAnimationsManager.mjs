import { KeyframesAnimation } from "../animations/KeyframesAnimation.mjs";
//#region src/extras/gltf/GLTFPointerAnimationsManager.ts
/**
* Additional class to help manage glTF pointer animations defined by the [KHR_animation_pointer](https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Khronos/KHR_animation_pointer) extension.
*
* @example
* ```javascript
* const gltfLoader = new GLTFLoader()
* const pointerAnimationsManager = new GLTFPointerAnimationsManager()
* const gltf = await gltfLoader.loadFromUrl('path/to/model.gltf')
*
* // create a gltfScenesManager from the resulting 'gltf' object
* // assuming 'renderer' is a valid camera renderer or curtains instance
* const gltfScenesManager = new GLTFScenesManager({ renderer, gltf })
*
* // create the pointer animations
* pointerAnimationsManager.createPointerAnimations(gltfScenesManager)
*
* // add the meshes
* gltfScenesManager.addMeshes()
* ```
*/
var GLTFPointerAnimationsManager = class {
	/**
	* {@link GLTFPointerAnimationsManager} constructor.
	*/
	constructor() {
		this.gltfScenesManager = null;
		this.resetAnimationsMaps();
	}
	/** Reset the {@link materialAnimations} map. */
	resetAnimationsMaps() {
		this.materialAnimations = /* @__PURE__ */ new Map();
	}
	/**
	* Add an {@link Object3D} as a {@link TargetsAnimationsManager} target.
	* @param object - {@link Object3D} to add.
	* @param targetsAnimation - {@link TargetsAnimationsManager} to add to.
	*/
	addObjectToTargetAnimation(object, targetsAnimation) {
		if (!targetsAnimation.targets.find((t) => t.object.object3DIndex === object.object3DIndex)) targetsAnimation.addTarget(object);
	}
	/**
	* Get the {@link PointerAnimationType | animation type} and animated property from a given pointer animation channel.
	* @param propertyPaths - Array of strings parsed from the pointer channel extension path.
	* @returns - The correct animation type and property.
	*/
	getAnimationTypeAndProperty(propertyPaths) {
		let animatedProperty = propertyPaths[propertyPaths.length - 1];
		let animationType = "materials";
		if (propertyPaths.includes("nodes")) animationType = "nodes";
		else if (propertyPaths.includes("cameras")) animationType = "cameras";
		else if (propertyPaths.includes("lights")) animationType = "lights";
		else if (propertyPaths.includes("normalTexture") && animatedProperty === "scale" && !propertyPaths.includes("KHR_texture_transform")) {
			animationType = "materials";
			animatedProperty = "normalScale";
		} else if (propertyPaths.includes("clearcoatNormalTexture") && animatedProperty === "scale" && !propertyPaths.includes("KHR_texture_transform")) {
			animationType = "materials";
			animatedProperty = "clearcoatNormalScale";
		} else if (propertyPaths.includes("occlusionTexture") && animatedProperty === "strength") {
			animationType = "materials";
			animatedProperty = "occlusionIntensity";
		} else if (propertyPaths.find((p) => p.indexOf("texture") !== -1) || propertyPaths.find((p) => p.indexOf("Texture") !== -1)) animationType = "textures";
		return {
			animationType,
			animatedProperty
		};
	}
	/**
	* Get any camera animations {@link KeyframesAnimationValueType | value type} and key (property) to use for the {@link KeyframesAnimation}.
	* @param animatedProperty - Animated property from the pointer channel extension path.
	* @returns - The camera animations {@link KeyframesAnimationValueType | value type} and key (property) to animate.
	*/
	getCleanCameraProperties(animatedProperty) {
		switch (animatedProperty) {
			case "znear": return {
				type: "scalar",
				key: "near"
			};
			case "zfar": return {
				type: "scalar",
				key: "far"
			};
			case "yfov": return {
				type: "scalar",
				key: "fov"
			};
			case "aspectRatio": return {
				type: "scalar",
				key: "forceAspect"
			};
			case "xmag": return {
				type: "scalar",
				key: "left"
			};
			case "ymag": return {
				type: "scalar",
				key: "top"
			};
			default: return {
				type: null,
				key: null
			};
		}
	}
	/**
	* Get any light animations {@link KeyframesAnimationValueType | value type} and key (property) to use for the {@link KeyframesAnimation}.
	* @param animatedProperty - Animated property from the pointer channel extension path.
	* @returns - The light animations {@link KeyframesAnimationValueType | value type} and key (property) to animate.
	*/
	getCleanLightProperties(animatedProperty) {
		switch (animatedProperty) {
			case "color": return {
				type: "vec3",
				key: animatedProperty
			};
			case "intensity":
			case "range":
			case "innerConeAngle":
			case "outerConeAngle": return {
				type: "scalar",
				key: animatedProperty
			};
			default: return {
				type: null,
				key: null
			};
		}
	}
	/**
	* Get any material animations {@link KeyframesAnimationValueType | value type} and key (property) to use for the {@link KeyframesAnimation}.
	* @param animatedProperty - Animated property from the pointer channel extension path.
	* @returns - The material animations {@link KeyframesAnimationValueType | value type} and {@link PointerAnimatedMaterialProperty | material key (property)} to animate.
	*/
	getCleanMaterialProperties(animatedProperty) {
		return (() => {
			switch (animatedProperty) {
				case "alphaCutoff":
				case "occlusionIntensity":
				case "clearcoatRoughness":
				case "dispersion":
				case "ior":
				case "attenuationDistance":
				case "normalScale":
				case "clearcoatNormalScale":
				case "iridescenceThicknessMinimum":
				case "iridescenceThicknessMaximum": return {
					type: "scalar",
					key: animatedProperty
				};
				case "attenuationColor": return {
					type: "vec3",
					key: animatedProperty
				};
				case "emissiveFactor": return {
					type: "vec3",
					key: "emissiveColor"
				};
				case "emissiveStrength": return {
					type: "scalar",
					key: "emissiveIntensity"
				};
				case "metallicFactor": return {
					type: "scalar",
					key: "metallic"
				};
				case "roughnessFactor": return {
					type: "scalar",
					key: "roughness"
				};
				case "anisotropyStrength": return {
					type: "scalar",
					key: "anisotropy"
				};
				case "clearcoatFactor": return {
					type: "scalar",
					key: "clearcoat"
				};
				case "iridescenceFactor": return {
					type: "scalar",
					key: "iridescence"
				};
				case "iridescenceIor": return {
					type: "scalar",
					key: "iridescenceIOR"
				};
				case "sheenColorFactor": return {
					type: "vec3",
					key: "sheenColor"
				};
				case "sheenRoughnessFactor": return {
					type: "scalar",
					key: "sheenRoughness"
				};
				case "specularFactor": return {
					type: "scalar",
					key: "specular"
				};
				case "specularColorFactor": return {
					type: "vec3",
					key: "specularColor"
				};
				case "transmissionFactor": return {
					type: "scalar",
					key: "transmission"
				};
				case "thicknessFactor": return {
					type: "scalar",
					key: "thickness"
				};
				case "anisotropyRotation": return {
					type: "scalar",
					key: "anisotropyVector"
				};
				default: return {
					type: null,
					key: null
				};
			}
		})();
	}
	/**
	* Get an array of {@link MediaTexture} from a given array of available {@link ShaderTextureDescriptor} corresponding to the given glTF texture name input.
	* @param textureName - glTF texture name to use to retrieve the textures.
	* @param texturesDescriptors - Array of available {@link ShaderTextureDescriptor}.
	* @returns - Array of matching {@link MediaTexture}.
	*/
	getCleanTextures(textureName, texturesDescriptors) {
		const getMixedTextures = (textureName, texturesDescriptors) => {
			const descriptor = texturesDescriptors.find((t) => t.texture.options.name === textureName);
			const textures = [];
			if (descriptor) textures.push(descriptor.texture);
			else {
				if (textureName === "specularTexture" || textureName === "specularColorTexture") {
					const specDesc = texturesDescriptors.find((t) => t.texture.options.name === "specularTexture");
					if (specDesc) textures.push(specDesc);
					else {
						if (textureName === "specularTexture") {
							const specFactorDesc = texturesDescriptors.find((t) => t.texture.options.name === "specularFactorTexture");
							if (specFactorDesc) textures.push(specFactorDesc.texture);
						}
						if (textureName === "specularColorTexture") {
							const specColorDesc = texturesDescriptors.find((t) => t.texture.options.name === "specularColorTexture");
							if (specColorDesc) textures.push(specColorDesc.texture);
						}
					}
				}
				if (textureName === "transmissionTexture" || textureName === "thicknessTexture") {
					const trthDesc = texturesDescriptors.find((t) => t.texture.options.name === "transmissionThicknessTexture");
					if (trthDesc) textures.push(trthDesc.texture);
					else {
						if (textureName === "transmissionTexture") {
							const trDesc = texturesDescriptors.find((t) => t.texture.options.name === "transmissionTexture");
							if (trDesc) textures.push(trDesc.texture);
						}
						if (textureName === "thicknessTexture") {
							const thDesc = texturesDescriptors.find((t) => t.texture.options.name === "thicknessTexture");
							if (thDesc) textures.push(thDesc.texture);
						}
					}
				}
				if (textureName === "sheenColorTexture" || textureName === "sheenRoughnessTexture") {
					const sheenDesc = texturesDescriptors.find((t) => t.texture.options.name === "sheenTexture");
					if (sheenDesc) textures.push(sheenDesc.texture);
					else {
						if (textureName === "sheenColorTexture") {
							const sheenColorDesc = texturesDescriptors.find((t) => t.texture.options.name === "sheenColorTexture");
							if (sheenColorDesc) textures.push(sheenColorDesc.texture);
						}
						if (textureName === "sheenRoughnessTexture") {
							const sheenRoughDesc = texturesDescriptors.find((t) => t.texture.options.name === "sheenRoughnessTexture");
							if (sheenRoughDesc) textures.push(sheenRoughDesc.texture);
						}
					}
				}
				if (textureName === "clearcoatTexture" || textureName === "clearcoatRoughnessTexture") {
					const ccDesc = texturesDescriptors.find((t) => t.texture.options.name === "clearcoatTexture");
					if (ccDesc) textures.push(ccDesc.texture);
					else {
						if (textureName === "clearcoatTexture") {
							const ccFactorDesc = texturesDescriptors.find((t) => t.texture.options.name === "clearcoatFactorTexture");
							if (ccFactorDesc) textures.push(ccFactorDesc.texture);
						}
						if (textureName === "clearcoatRoughnessTexture") {
							const ccRoughDesc = texturesDescriptors.find((t) => t.texture.options.name === "clearcoatRoughnessTexture");
							if (ccRoughDesc) textures.push(ccRoughDesc.texture);
						}
					}
				}
				if (textureName === "iridescenceTexture" || textureName === "iridescenceThicknessTexture") {
					const irDesc = texturesDescriptors.find((t) => t.texture.options.name === "iridescenceTexture");
					if (irDesc) textures.push(irDesc.texture);
					else {
						if (textureName === "iridescenceTexture") {
							const irFactorDesc = texturesDescriptors.find((t) => t.texture.options.name === "iridescenceFactorTexture");
							if (irFactorDesc) textures.push(irFactorDesc.texture);
						}
						if (textureName === "iridescenceThicknessTexture") {
							const irThickDesc = texturesDescriptors.find((t) => t.texture.options.name === "iridescenceThicknessTexture");
							if (irThickDesc) textures.push(irThickDesc.texture);
						}
					}
				}
				if (textureName === "diffuseTransmissionTexture" || textureName === "diffuseTransmissionColorTexture") {
					const difDesc = texturesDescriptors.find((t) => t.texture.options.name === "diffuseTransmissionTexture");
					if (difDesc) textures.push(difDesc.texture);
					else {
						if (textureName === "diffuseTransmissionTexture") {
							const difFactorDesc = texturesDescriptors.find((t) => t.texture.options.name === "diffuseTransmissionFactorTexture");
							if (difFactorDesc) textures.push(difFactorDesc.texture);
						}
						if (textureName === "diffuseTransmissionColorTexture") {
							const difColorDesc = texturesDescriptors.find((t) => t.texture.options.name === "diffuseTransmissionColorTexture");
							if (difColorDesc) textures.push(difColorDesc.texture);
						}
					}
				}
			}
			return textures;
		};
		return (() => {
			switch (textureName) {
				case "baseColorTexture":
				case "metallicRoughnessTexture":
				case "normalTexture":
				case "occlusionTexture":
				case "emissiveTexture":
				case "anisotropyTexture":
				case "clearcoatNormalTexture":
					const descriptor = texturesDescriptors.find((t) => t.texture.options.name === textureName);
					return descriptor ? [descriptor.texture] : [];
				case "specularTexture":
				case "specularColorTexture":
				case "transmissionTexture":
				case "thicknessTexture":
				case "sheenColorTexture":
				case "sheenRoughnessTexture":
				case "clearcoatTexture":
				case "clearcoatRoughnessTexture":
				case "iridescenceTexture":
				case "iridescenceThicknessTexture":
				case "diffuseTransmissionTexture":
				case "diffuseTransmissionColorTexture": return getMixedTextures(textureName, texturesDescriptors);
				default: return [];
			}
		})();
	}
	/**
	* Create all the necessary pointer {@link KeyframesAnimation} for a given {@link GLTFScenesManager} instance.
	*
	* Parse the animations channels, and for each one:
	* - Get the animation path and use it to extract the {@link PointerAnimationType | animation type} and animated property.
	* - Based on the {@link PointerAnimationType | animation type}, create the corresponding {@link KeyframesAnimation} and handle the actual value update (except for materials, where it's done inside {@link registerMeshAnimations} method).
	*
	* @param gltfScenesManager - {@link GLTFScenesManager} instance to parse for pointer animations.
	*/
	createPointerAnimations(gltfScenesManager = null) {
		if (!gltfScenesManager) return;
		if (this.gltfScenesManager) this.gltfScenesManager.pointerAnimationsManager = null;
		this.gltfScenesManager = gltfScenesManager;
		this.gltfScenesManager.pointerAnimationsManager = this;
		this.resetAnimationsMaps();
		if (this.gltfScenesManager.gltf.animations) this.gltfScenesManager.scenesManager.animations.forEach((targetsAnimation, i) => {
			const animation = this.gltfScenesManager.gltf.animations[i];
			const channels = animation.channels.filter((channel) => channel.target.path === "pointer");
			if (channels && channels.length) channels.forEach((channel) => {
				let propertyPath = channel.target.extensions.KHR_animation_pointer.pointer;
				if (propertyPath.startsWith("/extensions/KHR_lights_punctual/")) propertyPath = "/" + propertyPath.substring(32);
				const splitedPropertyPaths = propertyPath.split("/");
				splitedPropertyPaths.shift();
				const { animatedProperty, animationType } = this.getAnimationTypeAndProperty(splitedPropertyPaths);
				const propertyIndex = parseInt(splitedPropertyPaths[1]);
				if (animationType === "nodes") {
					if (animatedProperty === "rotation" || animatedProperty === "scale" || animatedProperty === "translation" || animatedProperty === "visible") {
						const node = this.gltfScenesManager.gltf.nodes[propertyIndex];
						const sceneNode = this.gltfScenesManager.scenesManager.nodes.get(propertyIndex);
						this.addObjectToTargetAnimation(sceneNode, targetsAnimation);
						const animName = node.name ? `${node.name} pointer animation` : `${animatedProperty} pointer animation ${propertyIndex}`;
						const label = animation.name ? `${animation.name} ${animName}` : `Animation ${i} ${animName}`;
						const sampler = animation.samplers[channel.sampler];
						const { keyframes, values } = this.gltfScenesManager.getAnimationKeyframesValues(sampler);
						const nodeProperties = (() => {
							switch (animatedProperty) {
								case "translation": return {
									inputValue: sceneNode.position,
									type: "vec3",
									path: animatedProperty
								};
								case "rotation": return {
									inputValue: sceneNode.quaternion,
									type: "quaternion",
									path: animatedProperty
								};
								case "scale": return {
									inputValue: sceneNode.scale,
									type: "vec3",
									path: animatedProperty
								};
								case "visible": return {
									inputValue: 0,
									type: "scalar",
									path: "pointer"
								};
								default: return {
									inputValue: null,
									type: null,
									path: null
								};
							}
						})();
						const keyframesAnimation = new KeyframesAnimation({
							label,
							inputIndex: sampler.input,
							keyframes,
							values,
							path: nodeProperties.path,
							type: nodeProperties.type,
							interpolation: sampler.interpolation,
							inputValue: nodeProperties.inputValue
						});
						targetsAnimation.addTargetAnimation(sceneNode, keyframesAnimation);
						if (animatedProperty === "visible") keyframesAnimation.onAfterUpdate = () => {
							sceneNode.visible = !!keyframesAnimation.inputValue;
						};
					}
				} else if (animationType === "cameras") {
					const isOrthographic = splitedPropertyPaths.includes("orthographic");
					const gltfCamera = this.gltfScenesManager.gltf.cameras[propertyIndex];
					const sampler = animation.samplers[channel.sampler];
					const path = channel.target.path;
					const { keyframes, values } = this.gltfScenesManager.getAnimationKeyframesValues(sampler);
					const cameraProperties = this.getCleanCameraProperties(animatedProperty);
					if (cameraProperties.key) if (isOrthographic) {
						const camera = this.gltfScenesManager.scenesManager.cameras[propertyIndex];
						this.addObjectToTargetAnimation(camera, targetsAnimation);
						const animName = gltfCamera.name ? `${gltfCamera.name} animation` : `Orthographic camera ${propertyIndex} animation`;
						const keyframesAnimation = new KeyframesAnimation({
							label: animation.name ? `${animation.name} ${animName}` : `Animation ${i} ${animName}`,
							inputIndex: sampler.input,
							keyframes,
							values,
							path,
							type: cameraProperties.type,
							interpolation: sampler.interpolation,
							...cameraProperties.type === "scalar" && { inputValue: 0 }
						});
						if (keyframesAnimation.type === "scalar") keyframesAnimation.onAfterUpdate = () => {
							const value = keyframesAnimation.inputValue;
							if (cameraProperties.key === "left") {
								camera.left = -value;
								camera.right = value;
								this.gltfScenesManager.renderer.updateCameraViewport();
							} else if (cameraProperties.key === "top") {
								camera.top = value;
								camera.bottom = -value;
								this.gltfScenesManager.renderer.updateCameraViewport();
							} else camera[cameraProperties.key] = value;
						};
						else keyframesAnimation.inputValue = camera[cameraProperties.key];
						targetsAnimation.addTargetAnimation(camera, keyframesAnimation);
					} else {
						const camera = this.gltfScenesManager.scenesManager.cameras[propertyIndex];
						this.addObjectToTargetAnimation(camera, targetsAnimation);
						const animName = gltfCamera.name ? `${gltfCamera.name} animation` : `Perspective camera ${propertyIndex} animation`;
						const keyframesAnimation = new KeyframesAnimation({
							label: animation.name ? `${animation.name} ${animName}` : `Animation ${i} ${animName}`,
							inputIndex: sampler.input,
							keyframes,
							values,
							path,
							type: cameraProperties.type,
							interpolation: sampler.interpolation,
							...cameraProperties.type === "scalar" && { inputValue: 0 }
						});
						if (keyframesAnimation.type === "scalar") keyframesAnimation.onAfterUpdate = () => {
							const value = keyframesAnimation.inputValue;
							if (cameraProperties.key === "fov") camera.fov = value * 180 / Math.PI;
							else if (cameraProperties.key === "forceAspect") {
								camera[cameraProperties.key] = value;
								this.gltfScenesManager.renderer.updateCameraViewport();
							} else camera[cameraProperties.key] = value;
						};
						else keyframesAnimation.inputValue = camera[cameraProperties.key];
						targetsAnimation.addTargetAnimation(camera, keyframesAnimation);
					}
				} else if (animationType === "lights") {
					const light = this.gltfScenesManager.scenesManager.lights[propertyIndex];
					const gltfLight = this.gltfScenesManager.gltf.extensions["KHR_lights_punctual"].lights[propertyIndex];
					this.addObjectToTargetAnimation(light, targetsAnimation);
					const lightProperties = this.getCleanLightProperties(animatedProperty);
					const animName = `${light.options.label} ${lightProperties.key} animation`;
					const label = animation.name ? `${animation.name} ${animName}` : `Animation ${i} ${animName}`;
					const sampler = animation.samplers[channel.sampler];
					const path = channel.target.path;
					const { keyframes, values } = this.gltfScenesManager.getAnimationKeyframesValues(sampler);
					if (lightProperties.key) {
						const keyframesAnimation = new KeyframesAnimation({
							label,
							inputIndex: sampler.input,
							keyframes,
							values,
							path,
							type: lightProperties.type,
							interpolation: sampler.interpolation,
							...lightProperties.type === "scalar" && { inputValue: 0 }
						});
						const innerConeAngle = gltfLight.type === "spot" ? gltfLight.spot.innerConeAngle !== void 0 ? gltfLight.spot.innerConeAngle : 0 : 0;
						const outerConeAngle = gltfLight.type === "spot" ? gltfLight.spot.outerConeAngle !== void 0 ? gltfLight.spot.outerConeAngle : Math.PI / 4 : Math.PI / 4;
						const getPenumbra = (innerConeAngle, outerConeAngle) => {
							return 1 - innerConeAngle / outerConeAngle;
						};
						light.userData.innerConeAngle = innerConeAngle;
						light.userData.outerConeAngle = outerConeAngle;
						if (keyframesAnimation.type === "scalar") keyframesAnimation.onAfterUpdate = () => {
							const value = keyframesAnimation.inputValue;
							if (lightProperties.key === "innerConeAngle") {
								light.userData.innerConeAngle = value;
								light.penumbra = getPenumbra(light.userData.innerConeAngle, light.userData.outerConeAngle);
							} else if (lightProperties.key === "outerConeAngle") {
								light.userData.outerConeAngle = value;
								light.penumbra = getPenumbra(light.userData.innerConeAngle, light.userData.outerConeAngle);
								light.angle = value;
							} else light[lightProperties.key] = value;
						};
						else keyframesAnimation.inputValue = light[lightProperties.key];
						targetsAnimation.addTargetAnimation(light, keyframesAnimation);
					}
				} else if (animationType === "materials" || animationType === "textures") {
					const primitiveInstance = this.gltfScenesManager.getPrimitiveInstanceFromGLTFMaterial(propertyIndex);
					if (primitiveInstance) {
						const { meshDescriptor } = primitiveInstance;
						const targetObject = meshDescriptor.nodes[0];
						this.addObjectToTargetAnimation(targetObject, targetsAnimation);
						const sampler = animation.samplers[channel.sampler];
						const path = channel.target.path;
						const { keyframes, values } = this.gltfScenesManager.getAnimationKeyframesValues(sampler);
						if (animationType === "materials") {
							let animationMap = this.materialAnimations.get(meshDescriptor);
							if (!animationMap) {
								animationMap = /* @__PURE__ */ new Map();
								this.materialAnimations.set(meshDescriptor, animationMap);
							}
							if (animatedProperty === "baseColorFactor") {
								const colorValues = new values.constructor(keyframes.length * 3);
								const alphaValues = new values.constructor(keyframes.length);
								for (let i = 0, c = 0, a = 0; i < values.length; i += 4, c += 3, a++) {
									colorValues[c] = values[i];
									colorValues[c + 1] = values[i + 1];
									colorValues[c + 2] = values[i + 2];
									alphaValues[a] = values[i + 3];
								}
								const colorAnimName = `${meshDescriptor.parameters.label} color animation`;
								const colorKeyframesAnimation = new KeyframesAnimation({
									label: animation.name ? `${animation.name} ${colorAnimName}` : `Animation ${i} ${colorAnimName}`,
									inputIndex: sampler.input,
									keyframes,
									values: colorValues,
									path,
									type: "vec3",
									interpolation: sampler.interpolation
								});
								targetsAnimation.addTargetAnimation(targetObject, colorKeyframesAnimation);
								animationMap.set("color", colorKeyframesAnimation);
								const alphaAnimName = `${meshDescriptor.parameters.label} opacity animation`;
								const alphaKeyframesAnimation = new KeyframesAnimation({
									label: animation.name ? `${animation.name} ${alphaAnimName}` : `Animation ${i} ${alphaAnimName}`,
									inputIndex: sampler.input,
									keyframes,
									values: alphaValues,
									path,
									type: "scalar",
									interpolation: sampler.interpolation,
									inputValue: 0
								});
								targetsAnimation.addTargetAnimation(targetObject, alphaKeyframesAnimation);
								animationMap.set("opacity", alphaKeyframesAnimation);
							} else {
								const materialProperties = this.getCleanMaterialProperties(animatedProperty);
								const animName = `${meshDescriptor.parameters.label} ${materialProperties.key} animation`;
								const label = animation.name ? `${animation.name} ${animName}` : `Animation ${i} ${animName}`;
								if (materialProperties.key) {
									const keyframesAnimation = new KeyframesAnimation({
										label,
										inputIndex: sampler.input,
										keyframes,
										values,
										path,
										type: materialProperties.type,
										interpolation: sampler.interpolation,
										...materialProperties.type === "scalar" && { inputValue: 0 }
									});
									targetsAnimation.addTargetAnimation(meshDescriptor.nodes[0], keyframesAnimation);
									animationMap.set(materialProperties.key, keyframesAnimation);
								}
							}
						} else {
							const textureName = splitedPropertyPaths.find((s) => s.indexOf("Texture") !== -1);
							const animatedTextures = this.getCleanTextures(textureName, meshDescriptor.texturesDescriptors);
							const normalTextureDesc = meshDescriptor.texturesDescriptors.find((desc) => desc.texture.options.name === "normalTexture");
							const clearcoatNormalTextureDesc = meshDescriptor.texturesDescriptors.find((desc) => desc.texture.options.name === "clearcoatNormalTexture");
							if (textureName === "normalTexture" && clearcoatNormalTextureDesc) animatedTextures.push(clearcoatNormalTextureDesc.texture);
							else if (textureName === "clearcoatNormalTexture" && normalTextureDesc) animatedTextures.push(normalTextureDesc.texture);
							if (animatedTextures.length) animatedTextures.forEach((texture) => {
								if (texture.options.useTransform) {
									const animName = `${texture.options.label} ${animatedProperty} animation`;
									const keyframesAnimation = new KeyframesAnimation({
										label: animation.name ? `${animation.name} ${animName}` : `Animation ${i} ${animName}`,
										inputIndex: sampler.input,
										keyframes,
										values,
										path,
										type: animatedProperty === "rotation" ? "scalar" : "vec2",
										interpolation: sampler.interpolation,
										...animatedProperty === "rotation" && { inputValue: 0 }
									});
									if (keyframesAnimation.type === "scalar") keyframesAnimation.onAfterUpdate = () => {
										texture[animatedProperty] = keyframesAnimation.inputValue;
									};
									else keyframesAnimation.inputValue = texture[animatedProperty];
									targetsAnimation.addTargetAnimation(targetObject, keyframesAnimation);
								}
							});
						}
					}
				}
			});
		});
	}
	/**
	* Handle the {@link PointerMaterialAnimations | pointer material animations} from the {@link materialAnimations} map after the {@link GLTFScenesManager} meshes have been created.
	*
	* Since material animations need an actual {@link LitMesh} to apply the animation, they actually need to be registered once the mesh has been created.
	*
	* This method is called internally by {@link GLTFScenesManager}.
	*
	* @param meshDescriptor - Reference {@link MeshDescriptor} to use as {@link materialAnimations} Map key.
	* @param mesh - {@link LitMesh} that will have its material uniform animated.
	*/
	registerMeshAnimations(meshDescriptor, mesh) {
		const meshDescriptorAnimationMap = this.materialAnimations.get(meshDescriptor);
		if (meshDescriptorAnimationMap && meshDescriptorAnimationMap.size) {
			const geometry = meshDescriptor.parameters.geometry;
			const normalYMultiplier = geometry && !!geometry.getAttributeByName("tangent") ? 1 : -1;
			meshDescriptorAnimationMap.forEach((animation, property) => {
				if (animation.type === "scalar") animation.onAfterUpdate = () => {
					const value = animation.inputValue;
					if (mesh.uniforms.material[property]) if (property === "normalScale") mesh.uniforms.material.normalScale.value.set(value, value * normalYMultiplier);
					else if (property === "clearcoatNormalScale") mesh.uniforms.material.clearcoatNormalScale.value.set(value, value * normalYMultiplier);
					else if (property === "anisotropyVector") mesh.uniforms.material.anisotropyVector.value.set(Math.cos(value), Math.sin(value));
					else mesh.uniforms.material[property].value = value;
					else if (mesh.uniforms.material.iridescenceThicknessRange) {
						if (property === "iridescenceThicknessMinimum") mesh.uniforms.material.iridescenceThicknessRange.value.x = value;
						else if (property === "iridescenceThicknessMaximum") mesh.uniforms.material.iridescenceThicknessRange.value.y = value;
					}
				};
				else if (mesh.uniforms.material[property]) animation.inputValue = mesh.uniforms.material[property].value;
			});
		}
	}
};
//#endregion
export { GLTFPointerAnimationsManager };
