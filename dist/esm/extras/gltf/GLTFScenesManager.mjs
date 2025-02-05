import { isCameraRenderer } from '../../core/renderers/utils.mjs';
import { Sampler } from '../../core/samplers/Sampler.mjs';
import { Texture } from '../../core/textures/Texture.mjs';
import { Object3D } from '../../core/objects3D/Object3D.mjs';
import { Box3 } from '../../math/Box3.mjs';
import { Vec3 } from '../../math/Vec3.mjs';
import { Mat3 } from '../../math/Mat3.mjs';
import { Mat4 } from '../../math/Mat4.mjs';
import { Geometry } from '../../core/geometries/Geometry.mjs';
import { IndexedGeometry } from '../../core/geometries/IndexedGeometry.mjs';
import { Mesh } from '../../core/meshes/Mesh.mjs';
import { Camera } from '../../core/camera/Camera.mjs';
import { throwWarning } from '../../utils/utils.mjs';
import { BufferBinding } from '../../core/bindings/BufferBinding.mjs';
import { KeyframesAnimation } from '../animations/KeyframesAnimation.mjs';
import { TargetsAnimationsManager } from '../animations/TargetsAnimationsManager.mjs';
import { Vec2 } from '../../math/Vec2.mjs';
import { RenderMaterial } from '../../core/materials/RenderMaterial.mjs';
import { DirectionalLight } from '../../core/lights/DirectionalLight.mjs';
import { PointLight } from '../../core/lights/PointLight.mjs';

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
  member.set(obj, value);
  return value;
};
var __privateMethod = (obj, member, method) => {
  __accessCheck(obj, member, "access private method");
  return method;
};
var _primitiveInstances, _getSparseAccessorIndicesAndValues, getSparseAccessorIndicesAndValues_fn, _parsePrimitiveProperty, parsePrimitiveProperty_fn;
const GL = WebGLRenderingContext;
const _GLTFScenesManager = class _GLTFScenesManager {
  /**
   * {@link GLTFScenesManager} constructor.
   * @param parameters - parameters used to create our {@link GLTFScenesManager}.
   * @param parameters.renderer - our {@link CameraRenderer} class object.
   * @param parameters.gltf - The {@link GLTFLoader.gltf | gltf} object used.
   */
  constructor({ renderer, gltf }) {
    /**
     * Get an accessor sparse indices values to use for replacement if any.
     * @param accessor - {@link GLTF.IAccessor | Accessor} to check for sparse indices.
     * @returns parameters - indices and values found as {@link TypedArray} if any.
     * @private
     */
    __privateAdd(this, _getSparseAccessorIndicesAndValues);
    /**
     * Parse a {@link GLTF.IMeshPrimitive | glTF primitive} and create typed arrays from the given {@link gltf} accessors, bufferViews and buffers.
     * @param primitiveProperty- Primitive property to parse, can either be `attributes` or `targets`.
     * @param attributes - An empty {@link VertexBufferAttributeParams} array to fill with parsed values.
     * @returns - Interleaved attributes {@link TypedArray} if any.
     * @private
     */
    __privateAdd(this, _parsePrimitiveProperty);
    /** The {@link PrimitiveInstances} Map, to group similar {@link Mesh} by instances. */
    __privateAdd(this, _primitiveInstances, void 0);
    renderer = isCameraRenderer(renderer, "GLTFScenesManager");
    this.renderer = renderer;
    this.gltf = gltf;
    __privateSet(this, _primitiveInstances, /* @__PURE__ */ new Map());
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
   * @returns - corresponding type, bufferFormat and size.
   */
  static getVertexAttributeParamsFromType(type) {
    switch (type) {
      case "VEC2":
        return {
          type: "vec2f",
          bufferFormat: "float32x2",
          size: 2
        };
      case "VEC3":
        return {
          type: "vec3f",
          bufferFormat: "float32x3",
          size: 3
        };
      case "VEC4":
        return {
          type: "vec4f",
          bufferFormat: "float32x4",
          size: 4
        };
      case "MAT2":
        return {
          type: "mat2x2f",
          bufferFormat: "float32x2",
          // not used
          size: 6
        };
      case "MAT3":
        return {
          type: "mat3x3f",
          bufferFormat: "float32x3",
          // not used
          size: 9
        };
      case "MAT4":
        return {
          type: "mat4x4f",
          bufferFormat: "float32x4",
          // not used
          size: 16
        };
      case "SCALAR":
      default:
        return {
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
      case GL.BYTE:
        return Int8Array;
      case GL.UNSIGNED_BYTE:
        return Uint8Array;
      case GL.SHORT:
        return Int16Array;
      case GL.UNSIGNED_SHORT:
        return Uint16Array;
      case GL.UNSIGNED_INT:
        return Uint32Array;
      case GL.FLOAT:
      default:
        return Float32Array;
    }
  }
  /**
   * Get the {@link GPUDevice.createRenderPipeline().topology | GPUPrimitiveTopology} based on the {@link GLTF.MeshPrimitiveMode | WebGL primitive mode}.
   * @param mode - {@link GLTF.MeshPrimitiveMode | WebGL primitive mode} to use.
   * @returns - corresponding {@link GPUDevice.createRenderPipeline().topology | GPUPrimitiveTopology}.
   */
  static gpuPrimitiveTopologyForMode(mode) {
    switch (mode) {
      case GL.TRIANGLES:
        return "triangle-list";
      case GL.TRIANGLE_STRIP:
        return "triangle-strip";
      case GL.LINES:
        return "line-list";
      case GL.LINE_STRIP:
        return "line-strip";
      case GL.POINTS:
        return "point-list";
    }
  }
  /**
   * Get the {@link GPUDevice.createSampler().descriptor.addressModeU | GPUAddressMode} based on the {@link GLTF.TextureWrapMode | WebGL texture wrap mode}.
   * @param wrap - {@link GLTF.TextureWrapMode | WebGL texture wrap mode} to use.
   * @returns - corresponding {@link GPUDevice.createSampler().descriptor.addressModeU | GPUAddressMode}.
   */
  static gpuAddressModeForWrap(wrap) {
    switch (wrap) {
      case GL.CLAMP_TO_EDGE:
        return "clamp-to-edge";
      case GL.MIRRORED_REPEAT:
        return "mirror-repeat";
      default:
        return "repeat";
    }
  }
  /**
   * Create the {@link scenesManager} {@link TargetsAnimationsManager} if any animation is present in the {@link gltf}.
   */
  createAnimations() {
    this.gltf.animations?.forEach((animation, index) => {
      this.scenesManager.animations.push(
        new TargetsAnimationsManager(this.renderer, {
          label: animation.name ?? "Animation " + index
        })
      );
    });
  }
  /**
   * Create the {@link ScenesManager.lights | lights} defined by the `KHR_lights_punctual` extension if any.
   */
  createLights() {
    if (this.gltf.extensions && this.gltf.extensions["KHR_lights_punctual"]) {
      let lightIndex = 0;
      for (const light of this.gltf.extensions["KHR_lights_punctual"].lights) {
        lightIndex++;
        if (light.type === "spot") {
          throwWarning("GLTFScenesManager: Spot lights are not supported yet.");
          continue;
        } else if (light.type === "directional") {
          this.scenesManager.lights[lightIndex - 1] = new DirectionalLight(this.renderer, {
            color: light.color !== void 0 ? new Vec3(light.color[0], light.color[1], light.color[2]) : new Vec3(1),
            intensity: light.intensity !== void 0 ? light.intensity : 1
          });
        } else if (light.type === "point") {
          this.scenesManager.lights[lightIndex - 1] = new PointLight(this.renderer, {
            color: light.color !== void 0 ? new Vec3(light.color[0], light.color[1], light.color[2]) : new Vec3(1),
            intensity: light.intensity !== void 0 ? light.intensity : 1,
            range: light.range !== void 0 ? light.range : 0
          });
        }
      }
    }
  }
  /**
   * Create the {@link Sampler} and add them to the {@link ScenesManager.samplers | scenesManager samplers array}.
   */
  createSamplers() {
    if (this.gltf.samplers) {
      for (const [index, sampler] of Object.entries(this.gltf.samplers)) {
        const descriptor = {
          label: "glTF sampler " + index,
          name: "gltfSampler" + index,
          // TODO better name?
          addressModeU: _GLTFScenesManager.gpuAddressModeForWrap(sampler.wrapS),
          addressModeV: _GLTFScenesManager.gpuAddressModeForWrap(sampler.wrapT)
        };
        if (!sampler.magFilter || sampler.magFilter === GL.LINEAR) {
          descriptor.magFilter = "linear";
        }
        switch (sampler.minFilter) {
          case GL.NEAREST:
            break;
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
    } else {
      this.scenesManager.samplers.push(
        new Sampler(this.renderer, {
          label: "Default sampler",
          name: "defaultSampler",
          magFilter: "linear",
          minFilter: "linear",
          mipmapFilter: "linear"
        })
      );
    }
  }
  /**
   * Create a {@link Texture} based on the options.
   * @param material - material using that texture.
   * @param image - image source of the texture.
   * @param name - name of the texture.
   * @param useTransform - Whether the {@link Texture} should handle transformations.
   * @returns - newly created {@link Texture}.
   */
  createTexture(material, image, name, useTransform = false) {
    const format = (() => {
      switch (name) {
        case "baseColorTexture":
        case "emissiveTexture":
        case "specularTexture":
        case "specularColorTexture":
          return "rgba8unorm-srgb";
        case "occlusionTexture":
        case "transmissionTexture":
          return "r8unorm";
        case "thicknessTexture":
          return "rg8unorm";
        default:
          return "rgba8unorm";
      }
    })();
    const texture = new Texture(this.renderer, {
      label: material.name ? material.name + ": " + name : name,
      name,
      format,
      visibility: ["fragment"],
      generateMips: true,
      // generate mips by default
      fixedSize: {
        width: image.width,
        height: image.height
      },
      useTransform
    });
    texture.uploadSource({
      source: image
    });
    return texture;
  }
  /**
   * Create the {ScenesManager.materialsTextures | scenesManager materialsTextures array} and each associated {@link types/gltf/GLTFScenesManager.MaterialTexture | MaterialTexture} and their respective {@link Texture}.
   */
  createMaterialTextures() {
    this.scenesManager.materialsTextures = [];
    const createdTextures = [];
    if (this.gltf.materials) {
      for (const [materialIndex, material] of Object.entries(this.gltf.materials)) {
        const materialTextures = {
          material: materialIndex,
          texturesDescriptors: []
        };
        const getUVAttributeName = (texture) => {
          if (!texture.texCoord)
            return "uv";
          return texture.texCoord !== 0 ? "uv" + texture.texCoord : "uv";
        };
        const createTexture = (gltfTextureInfo, name) => {
          const index = gltfTextureInfo.index;
          const gltfTexture = this.gltf.textures[index];
          const source = gltfTexture.extensions && gltfTexture.extensions["EXT_texture_webp"] ? gltfTexture.extensions["EXT_texture_webp"].source : gltfTexture.source;
          const samplerIndex = this.gltf.textures.find((t) => {
            const src = t.extensions && t.extensions["EXT_texture_webp"] ? t.extensions["EXT_texture_webp"].source : t.source;
            return src === index;
          })?.sampler;
          const sampler = this.scenesManager.samplers[samplerIndex ?? 0];
          const textureTransform = gltfTextureInfo.extensions && gltfTextureInfo.extensions["KHR_texture_transform"];
          const texCoordAttributeName = getUVAttributeName(
            textureTransform && textureTransform.texCoord !== void 0 ? textureTransform : gltfTextureInfo
          );
          const hasTexture = createdTextures.find((createdTexture) => createdTexture.index === index);
          if (hasTexture) {
            const reusedTexture = new Texture(this.renderer, {
              label: material.name ? material.name + ": " + name : name,
              name,
              visibility: ["fragment"],
              generateMips: true,
              // generate mips by default
              fromTexture: hasTexture.texture,
              ...textureTransform && { useTransform: true }
            });
            if (textureTransform) {
              const { offset, rotation, scale, texCoord } = textureTransform;
              if (offset !== void 0)
                reusedTexture.offset.set(offset[0], offset[1]);
              if (rotation !== void 0)
                reusedTexture.rotation = rotation;
              if (scale !== void 0)
                reusedTexture.scale.set(scale[0], scale[1]);
            }
            materialTextures.texturesDescriptors.push({
              texture: reusedTexture,
              sampler,
              texCoordAttributeName
            });
            return;
          }
          const image = this.gltf.imagesBitmaps[source];
          const texture = this.createTexture(material, image, name, !!textureTransform);
          if (textureTransform) {
            console.log(textureTransform, texture);
            const { offset, rotation, scale, texCoord } = textureTransform;
            if (offset !== void 0)
              texture.offset.set(offset[0], offset[1]);
            if (rotation !== void 0)
              texture.rotation = rotation;
            if (scale !== void 0)
              texture.scale.set(scale[0], scale[1]);
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
          if (material.pbrMetallicRoughness.baseColorTexture && material.pbrMetallicRoughness.baseColorTexture.index !== void 0) {
            createTexture(material.pbrMetallicRoughness.baseColorTexture, "baseColorTexture");
          }
          if (material.pbrMetallicRoughness.metallicRoughnessTexture && material.pbrMetallicRoughness.metallicRoughnessTexture.index !== void 0) {
            createTexture(material.pbrMetallicRoughness.metallicRoughnessTexture, "metallicRoughnessTexture");
          }
        }
        if (material.normalTexture && material.normalTexture.index !== void 0) {
          createTexture(material.normalTexture, "normalTexture");
        }
        if (material.occlusionTexture && material.occlusionTexture.index !== void 0) {
          createTexture(material.occlusionTexture, "occlusionTexture");
        }
        if (material.emissiveTexture && material.emissiveTexture.index !== void 0) {
          createTexture(material.emissiveTexture, "emissiveTexture");
        }
        const { extensions } = material;
        const transmission = extensions && extensions.KHR_materials_transmission || null;
        const specular = extensions && extensions.KHR_materials_specular || null;
        const volume = extensions && extensions.KHR_materials_volume || null;
        if (transmission && transmission.transmissionTexture && transmission.transmissionTexture.index !== void 0) {
          createTexture(transmission.transmissionTexture, "transmissionTexture");
        }
        if (specular && (specular.specularTexture || specular.specularColorTexture)) {
          const { specularTexture, specularColorTexture } = specular;
          if (specularTexture && specularColorTexture) {
            if (specularTexture.index !== void 0 && specularColorTexture.index !== void 0 && specularTexture.index === specularColorTexture.index) {
              createTexture(specular.specularTexture, "specularTexture");
            } else {
              if (specularTexture && specularTexture.index !== void 0) {
                createTexture(specular.specularTexture, "specularFactorTexture");
              }
              if (specularColorTexture && specularColorTexture.index !== void 0) {
                createTexture(specular.specularColorTexture, "specularColorTexture");
              }
            }
          }
        }
        if (volume && volume.thicknessTexture && volume.thicknessTexture.index !== void 0) {
          createTexture(volume.thicknessTexture, "thicknessTexture");
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
    const materialParams = {
      uniforms: {}
    };
    const material = this.gltf.materials && this.gltf.materials[materialIndex] || {};
    if (label) {
      materialParams.label = label + (material.name ? " " + material.name : "");
    } else if (material.name) {
      materialParams.label = material.name;
    }
    const { extensions } = material;
    const dispersion = extensions && extensions.KHR_materials_dispersion || null;
    const emissiveStrength = extensions && extensions.KHR_materials_emissive_strength || null;
    const ior = extensions && extensions.KHR_materials_ior || null;
    const transmission = extensions && extensions.KHR_materials_transmission || null;
    const specular = extensions && extensions.KHR_materials_specular || null;
    const volume = extensions && extensions.KHR_materials_volume || null;
    const materialUniformStruct = {
      color: {
        type: "vec3f",
        value: material.pbrMetallicRoughness && material.pbrMetallicRoughness.baseColorFactor !== void 0 ? new Vec3(
          material.pbrMetallicRoughness.baseColorFactor[0],
          material.pbrMetallicRoughness.baseColorFactor[1],
          material.pbrMetallicRoughness.baseColorFactor[2]
        ) : new Vec3(1)
      },
      opacity: {
        type: "f32",
        value: material.pbrMetallicRoughness && material.pbrMetallicRoughness.baseColorFactor !== void 0 ? material.pbrMetallicRoughness.baseColorFactor[3] : 1
      },
      alphaCutoff: {
        type: "f32",
        value: material.alphaCutoff !== void 0 ? material.alphaCutoff : material.alphaMode === "MASK" ? 0.5 : 0
      },
      metallic: {
        type: "f32",
        value: material.pbrMetallicRoughness?.metallicFactor === void 0 ? 1 : material.pbrMetallicRoughness.metallicFactor
      },
      roughness: {
        type: "f32",
        value: material.pbrMetallicRoughness?.roughnessFactor === void 0 ? 1 : material.pbrMetallicRoughness.roughnessFactor
      },
      normalScale: {
        type: "vec2f",
        value: material.normalTexture?.scale === void 0 ? new Vec2(1) : new Vec2(material.normalTexture.scale)
      },
      occlusionIntensity: {
        type: "f32",
        value: material.occlusionTexture?.strength === void 0 ? 1 : material.occlusionTexture.strength
      },
      emissiveIntensity: {
        type: "f32",
        value: emissiveStrength && emissiveStrength.emissiveStrength !== void 0 ? emissiveStrength.emissiveStrength : 1
      },
      emissiveColor: {
        type: "vec3f",
        value: material.emissiveFactor !== void 0 ? new Vec3(material.emissiveFactor[0], material.emissiveFactor[1], material.emissiveFactor[2]) : new Vec3(0)
      },
      specularIntensity: {
        type: "f32",
        value: specular && specular.specularFactor !== void 0 ? specular.specularFactor : 1
      },
      specularColor: {
        type: "vec3f",
        value: specular && specular.specularColorFactor !== void 0 ? new Vec3(
          specular.specularColorFactor[0],
          specular.specularColorFactor[1],
          specular.specularColorFactor[2]
        ) : new Vec3(1)
      },
      transmission: {
        type: "f32",
        value: transmission && transmission.transmissionFactor !== void 0 ? transmission.transmissionFactor : 0
      },
      ior: {
        type: "f32",
        value: ior && ior.ior !== void 0 ? ior.ior : 1.5
      },
      dispersion: {
        type: "f32",
        value: dispersion && dispersion.dispersion !== void 0 ? dispersion.dispersion : 0
      },
      thickness: {
        type: "f32",
        value: volume && volume.thicknessFactor !== void 0 ? volume.thicknessFactor : 0
      },
      attenuationDistance: {
        type: "f32",
        value: volume && volume.attenuationDistance !== void 0 ? volume.attenuationDistance : Infinity
      },
      attenuationColor: {
        type: "vec3f",
        value: volume && volume.attenuationColor !== void 0 ? new Vec3(volume.attenuationColor[0], volume.attenuationColor[1], volume.attenuationColor[2]) : new Vec3(1)
      }
    };
    materialParams.uniforms.material = {
      visibility: ["fragment"],
      struct: materialUniformStruct
    };
    materialParams.cullMode = material.doubleSided ? "none" : "back";
    if (material.alphaMode === "BLEND") {
      materialParams.transparent = true;
      materialParams.targets = [
        {
          blend: {
            color: {
              srcFactor: "src-alpha",
              dstFactor: "one-minus-src-alpha"
            },
            alpha: {
              // This just prevents the canvas from having alpha "holes" in it.
              srcFactor: "one",
              dstFactor: "one"
            }
          }
        }
      ];
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
      if (node.translation)
        child.node.position.set(node.translation[0], node.translation[1], node.translation[2]);
      if (node.scale)
        child.node.scale.set(node.scale[0], node.scale[1], node.scale[2]);
      if (node.rotation)
        child.node.quaternion.setFromArray(new Float32Array(node.rotation));
    }
    if (node.children) {
      node.children.forEach((childNodeIndex) => {
        const childNode = this.gltf.nodes[childNodeIndex];
        this.createNode(child, childNode, childNodeIndex);
      });
    }
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
          const bufferView = this.gltf.bufferViews[accessor.bufferView];
          const accessorConstructor = _GLTFScenesManager.getTypedArrayConstructorFromComponentType(
            accessor.componentType
          );
          const attributeSize = _GLTFScenesManager.getVertexAttributeParamsFromType(accessor.type).size;
          const attributeValues = new accessorConstructor(
            this.gltf.arrayBuffers[bufferView.buffer],
            accessor.byteOffset + bufferView.byteOffset,
            accessor.count * attributeSize
          );
          instanceAttributes.count = accessor.count;
          instanceAttributes.nodesTransformations[attribute[0].toLowerCase()] = attributeValues;
        }
      }
      const mesh = this.gltf.meshes[node.mesh];
      mesh.primitives.forEach((primitive, primitiveIndex) => {
        const meshDescriptor = {
          parent: child.node,
          texturesDescriptors: [],
          variantName: "Default",
          parameters: {
            //uniforms: {},
            label: mesh.name ? mesh.name + " " + primitiveIndex : "glTF mesh " + primitiveIndex
          },
          nodes: [],
          extensionsUsed: [],
          alternateDescriptors: /* @__PURE__ */ new Map(),
          alternateMaterials: /* @__PURE__ */ new Map()
        };
        instancesDescriptor = __privateGet(this, _primitiveInstances).get(primitive);
        if (!instancesDescriptor) {
          instancesDescriptor = {
            instances: [],
            // instances
            nodes: [],
            // node transform
            meshDescriptor
          };
          __privateGet(this, _primitiveInstances).set(primitive, instancesDescriptor);
        }
        instancesDescriptor.instances.push(node);
        instancesDescriptor.nodes.push(child.node);
        if (instanceAttributes && instanceAttributes.count) {
          for (let i = 0; i < instanceAttributes.count; i++) {
            const instanceNode = new Object3D();
            if (instanceAttributes.nodesTransformations) {
              const { translation, scale, rotation } = instanceAttributes.nodesTransformations;
              if (translation) {
                instanceNode.position.set(translation[i * 3], translation[i * 3 + 1], translation[i * 3 + 2]);
              }
              if (scale) {
                instanceNode.scale.set(scale[i * 3], scale[i * 3 + 1], scale[i * 3 + 2]);
              }
              if (rotation) {
                instanceNode.quaternion.setFromArray(
                  Float32Array.from([rotation[i * 4], rotation[i * 4 + 1], rotation[i * 4 + 2], rotation[i * 4 + 3]])
                );
              }
            }
            instanceNode.parent = child.node;
            instancesDescriptor.instances.push(node);
            instancesDescriptor.nodes.push(instanceNode);
          }
        }
      });
    }
    if (node.extensions && node.extensions.KHR_lights_punctual) {
      const light = this.scenesManager.lights[node.extensions.KHR_lights_punctual.light];
      light.position.set(0, 0, 0);
      if (light instanceof DirectionalLight) {
        light.target.set(0, 0, -1);
      }
      light.parent = child.node;
    }
    if (node.camera !== void 0) {
      const gltfCamera = this.gltf.cameras[node.camera];
      if (gltfCamera.type === "perspective") {
        const minSize = Math.min(this.renderer.boundingRect.width, this.renderer.boundingRect.height);
        const width = minSize / gltfCamera.perspective.aspectRatio;
        const height = minSize * gltfCamera.perspective.aspectRatio;
        const fov = gltfCamera.perspective.yfov * 180 / Math.PI;
        const camera = new Camera({
          fov,
          near: gltfCamera.perspective.znear,
          far: gltfCamera.perspective.zfar,
          width,
          height,
          pixelRatio: this.renderer.pixelRatio
        });
        camera.parent = child.node;
        this.scenesManager.cameras.push(camera);
      } else if (gltfCamera.type === "orthographic") {
        throwWarning("GLTFScenesManager: Orthographic cameras are not supported yet.");
      }
    }
    if (this.gltf.animations) {
      this.scenesManager.animations.forEach((targetsAnimation, i) => {
        const animation = this.gltf.animations[i];
        const channels = animation.channels.filter((channel) => channel.target.node === index);
        if (channels && channels.length) {
          targetsAnimation.addTarget(child.node);
          channels.forEach((channel) => {
            const sampler = animation.samplers[channel.sampler];
            const path = channel.target.path;
            const inputAccessor = this.gltf.accessors[sampler.input];
            const inputBufferView = this.gltf.bufferViews[inputAccessor.bufferView];
            const inputTypedArrayConstructor = _GLTFScenesManager.getTypedArrayConstructorFromComponentType(
              inputAccessor.componentType
            );
            const outputAccessor = this.gltf.accessors[sampler.output];
            const outputBufferView = this.gltf.bufferViews[outputAccessor.bufferView];
            const outputTypedArrayConstructor = _GLTFScenesManager.getTypedArrayConstructorFromComponentType(
              outputAccessor.componentType
            );
            const keyframes = new inputTypedArrayConstructor(
              this.gltf.arrayBuffers[inputBufferView.buffer],
              inputAccessor.byteOffset + inputBufferView.byteOffset,
              inputAccessor.count * _GLTFScenesManager.getVertexAttributeParamsFromType(inputAccessor.type).size
            );
            const values = new outputTypedArrayConstructor(
              this.gltf.arrayBuffers[outputBufferView.buffer],
              outputAccessor.byteOffset + outputBufferView.byteOffset,
              outputAccessor.count * _GLTFScenesManager.getVertexAttributeParamsFromType(outputAccessor.type).size
            );
            const animName = node.name ? `${node.name} animation` : `${channel.target.path} animation ${index}`;
            const keyframesAnimation = new KeyframesAnimation({
              label: animation.name ? `${animation.name} ${animName}` : `Animation ${i} ${animName}`,
              inputIndex: sampler.input,
              keyframes,
              values,
              path,
              interpolation: sampler.interpolation
            });
            targetsAnimation.addTargetAnimation(child.node, keyframesAnimation);
          });
        }
      });
    }
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
   * Create the mesh {@link Geometry} based on the given {@link gltf} primitive and {@link PrimitiveInstanceDescriptor}.
   * @param primitive - {@link gltf} primitive to use to create the {@link Geometry}.
   * @param primitiveInstance - {@link PrimitiveInstanceDescriptor} to use to create the {@link Geometry}.
   */
  createGeometry(primitive, primitiveInstance) {
    const { instances, meshDescriptor } = primitiveInstance;
    const geometryBBox = new Box3();
    for (const [attribName, accessorIndex] of Object.entries(primitive.attributes)) {
      if (attribName === "POSITION") {
        const accessor = this.gltf.accessors[accessorIndex];
        if (geometryBBox) {
          geometryBBox.min.min(new Vec3(accessor.min[0], accessor.min[1], accessor.min[2]));
          geometryBBox.max.max(new Vec3(accessor.max[0], accessor.max[1], accessor.max[2]));
        }
      }
    }
    let defaultAttributes = [];
    let interleavedArray = __privateMethod(this, _parsePrimitiveProperty, parsePrimitiveProperty_fn).call(this, primitive.attributes, defaultAttributes);
    const isIndexedGeometry = "indices" in primitive;
    let indicesArray = null;
    let indicesConstructor = null;
    if (isIndexedGeometry) {
      const accessor = this.gltf.accessors[primitive.indices];
      const bufferView = this.gltf.bufferViews[accessor.bufferView];
      indicesConstructor = _GLTFScenesManager.getTypedArrayConstructorFromComponentType(accessor.componentType);
      const bytesPerElement = indicesConstructor.name === "Uint8Array" ? Uint16Array.BYTES_PER_ELEMENT : indicesConstructor.BYTES_PER_ELEMENT;
      const arrayOffset = accessor.byteOffset + bufferView.byteOffset;
      const arrayBuffer = this.gltf.arrayBuffers[bufferView.buffer];
      const arrayLength = Math.ceil(accessor.count / bytesPerElement) * bytesPerElement;
      indicesArray = indicesConstructor.name === "Uint8Array" ? Uint16Array.from(new indicesConstructor(arrayBuffer, arrayOffset, arrayLength)) : new indicesConstructor(arrayBuffer, arrayOffset, arrayLength);
    }
    const hasNormal = defaultAttributes.find((attribute) => attribute.name === "normal");
    if (!hasNormal) {
      defaultAttributes = defaultAttributes.filter((attr) => attr.name !== "tangent");
      interleavedArray = null;
    }
    if (!interleavedArray) {
      this.sortAttributesByNames(["position", "uv", "normal"], defaultAttributes);
    }
    const geometryAttributes = {
      instancesCount: instances.length,
      topology: _GLTFScenesManager.gpuPrimitiveTopologyForMode(primitive.mode),
      vertexBuffers: [
        {
          name: "attributes",
          stepMode: "vertex",
          // explicitly set the stepMode even if not mandatory
          attributes: defaultAttributes,
          ...interleavedArray && { array: interleavedArray }
          // interleaved array!
        }
      ]
    };
    const GeometryConstructor = isIndexedGeometry ? IndexedGeometry : Geometry;
    meshDescriptor.parameters.geometry = new GeometryConstructor(geometryAttributes);
    if (isIndexedGeometry && indicesConstructor && indicesArray) {
      meshDescriptor.parameters.geometry.setIndexBuffer({
        bufferFormat: indicesConstructor.name === "Uint32Array" ? "uint32" : "uint16",
        array: indicesArray
      });
    }
    if (!hasNormal) {
      meshDescriptor.parameters.geometry.computeGeometry();
    }
    meshDescriptor.parameters.geometry.boundingBox = geometryBBox;
  }
  /**
   * Create the {@link SkinDefinition | skins definitions} for each {@link gltf} skins.
   */
  createSkins() {
    if (this.gltf.skins) {
      this.gltf.skins.forEach((skin, skinIndex) => {
        const skinnedMeshNode = this.gltf.nodes.find(
          (node) => node.skin !== void 0 && node.mesh !== void 0 && node.skin === skinIndex
        );
        const meshIndex = skinnedMeshNode.mesh;
        let matrices;
        if (skin.inverseBindMatrices) {
          const matricesAccessor = this.gltf.accessors[skin.inverseBindMatrices];
          const matricesBufferView = this.gltf.bufferViews[matricesAccessor.bufferView];
          const matricesTypedArrayConstructor = _GLTFScenesManager.getTypedArrayConstructorFromComponentType(
            matricesAccessor.componentType
          );
          matrices = new matricesTypedArrayConstructor(
            this.gltf.arrayBuffers[matricesBufferView.buffer],
            matricesAccessor.byteOffset + matricesBufferView.byteOffset,
            matricesAccessor.count * _GLTFScenesManager.getVertexAttributeParamsFromType(matricesAccessor.type).size
          );
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
          childrenBindings: [
            {
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
              // needs to be always iterable
            }
          ]
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
        const parentNodeIndex = this.gltf.nodes.findIndex(
          (node) => node.mesh !== void 0 && node.skin !== void 0 && node.mesh === meshIndex
        );
        if (parentNodeIndex !== -1) {
          const parentNode = this.scenesManager.nodes.get(parentNodeIndex);
          const parentInverseWorldMatrix = new Mat4();
          const _updateWorldMatrix = parentNode.updateWorldMatrix.bind(parentNode);
          parentNode.updateWorldMatrix = () => {
            _updateWorldMatrix();
            parentInverseWorldMatrix.copy(parentNode.worldMatrix).invert();
          };
          if (this.scenesManager.animations.length) {
            for (const animation of this.scenesManager.animations) {
              joints.forEach((object, jointIndex) => {
                const updateJointMatrix = () => {
                  if (animation.isPlaying) {
                    jointMatrix.setFromArray(matrices, jointIndex * 16).premultiply(object.worldMatrix).premultiply(parentInverseWorldMatrix);
                  } else {
                    jointMatrix.identity();
                  }
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
                const emptyAnimation = new KeyframesAnimation({
                  label: animation.label ? `${animation.label} ${animName}` : `Animation ${animName}`
                });
                emptyAnimation.onAfterUpdate = updateJointMatrix;
                animation.addTargetAnimation(object, emptyAnimation);
              });
            }
          } else {
            joints.forEach((object, jointIndex) => {
              jointMatrix.setFromArray(matrices, jointIndex * 16).premultiply(object.worldMatrix).premultiply(parentInverseWorldMatrix);
              normalMatrix.copy(jointMatrix).invert().transpose();
              for (let i = 0; i < 16; i++) {
                binding.childrenBindings[jointIndex].inputs.jointMatrix.value[i] = jointMatrix.elements[i];
                binding.childrenBindings[jointIndex].inputs.normalMatrix.value[i] = normalMatrix.elements[i];
              }
              binding.childrenBindings[jointIndex].inputs.jointMatrix.shouldUpdate = true;
              binding.childrenBindings[jointIndex].inputs.normalMatrix.shouldUpdate = true;
            });
          }
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
  }
  /**
   * Create the mesh material parameters based on the given {@link gltf} primitive and {@link PrimitiveInstanceDescriptor}.
   * @param primitive - {@link gltf} primitive to use to create the material parameters.
   * @param primitiveInstance - {@link PrimitiveInstanceDescriptor} to use to create the material parameters.
   */
  createMaterial(primitive, primitiveInstance) {
    const { instances, nodes, meshDescriptor } = primitiveInstance;
    const instancesCount = instances.length;
    const meshIndex = instances[0].mesh;
    if (primitive.targets) {
      const bindings = [];
      const weights = this.gltf.meshes[meshIndex].weights;
      let weightAnimation;
      for (const animation of this.scenesManager.animations) {
        weightAnimation = animation.getAnimationByObject3DAndPath(meshDescriptor.parent, "weights");
        if (weightAnimation)
          break;
      }
      primitive.targets.forEach((target, index) => {
        const targetAttributes = [];
        __privateMethod(this, _parsePrimitiveProperty, parsePrimitiveProperty_fn).call(this, target, targetAttributes);
        const struct = targetAttributes.reduce(
          (acc, attribute) => {
            return acc = {
              ...acc,
              ...{
                [attribute.name]: {
                  type: `array<${attribute.type}>`,
                  value: attribute.array
                }
              }
            };
          },
          {
            weight: {
              type: "f32",
              value: weights && weights.length ? weights[index] : 0
            }
          }
        );
        const targetBinding = new BufferBinding({
          label: "Morph target " + index,
          name: "morphTarget" + index,
          bindingType: "storage",
          visibility: ["vertex"],
          struct
        });
        if (weightAnimation) {
          weightAnimation.addWeightBindingInput(targetBinding.inputs.weight);
        }
        bindings.push(targetBinding);
      });
      if (!meshDescriptor.parameters.bindings) {
        meshDescriptor.parameters.bindings = [];
      }
      meshDescriptor.parameters.bindings = [...meshDescriptor.parameters.bindings, ...bindings];
    }
    if (this.gltf.skins) {
      this.gltf.skins.forEach((skin, skinIndex) => {
        if (!meshDescriptor.parameters.bindings) {
          meshDescriptor.parameters.bindings = [];
        }
        instances.forEach((node, instanceIndex) => {
          if (node.skin !== void 0 && node.skin === skinIndex) {
            const skinDef = this.scenesManager.skins[skinIndex];
            meshDescriptor.parameters.bindings = [...meshDescriptor.parameters.bindings, skinDef.binding];
            if (instanceIndex > 0) {
              const tempBbox = meshDescriptor.parameters.geometry.boundingBox.clone();
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
    }
    const defaultMaterialParams = this.scenesManager.materialsParams[primitive.material];
    const materialTextures = this.scenesManager.materialsTextures[primitive.material];
    meshDescriptor.texturesDescriptors = materialTextures?.texturesDescriptors || [];
    meshDescriptor.parameters = { ...meshDescriptor.parameters, ...defaultMaterialParams };
    const material = this.gltf.materials && this.gltf.materials[primitive.material] || {};
    const { extensions } = material;
    if (extensions) {
      for (const extension of Object.keys(extensions)) {
        if (extension === "KHR_materials_unlit" && this.gltf.extensionsRequired && this.gltf.extensionsRequired.includes(extension)) {
          meshDescriptor.extensionsUsed.push(extension);
        } else {
          meshDescriptor.extensionsUsed.push(extension);
        }
      }
    }
    const dispersion = extensions && extensions.KHR_materials_dispersion || null;
    const transmission = extensions && extensions.KHR_materials_transmission || null;
    const volume = extensions && extensions.KHR_materials_volume || null;
    const hasTransmission = transmission || volume || dispersion;
    const useTransmission = this.gltf.extensionsUsed && (this.gltf.extensionsUsed.includes("KHR_materials_transmission") || this.gltf.extensionsUsed.includes("KHR_materials_volume") || this.gltf.extensionsUsed.includes("KHR_materials_dispersion"));
    meshDescriptor.parameters.samplers = [];
    meshDescriptor.parameters.textures = [];
    if (useTransmission && hasTransmission) {
      meshDescriptor.parameters.transmissive = true;
    }
    if (useTransmission && hasTransmission) {
      this.renderer.createTransmissionTarget();
      meshDescriptor.texturesDescriptors.push({
        texture: this.renderer.transmissionTarget.texture,
        sampler: this.renderer.transmissionTarget.sampler
      });
    }
    if (instancesCount > 1) {
      const instanceMatricesBinding = new BufferBinding({
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
          }
        }
      });
      const instancesBinding = new BufferBinding({
        label: "Instances",
        name: "instances",
        visibility: ["vertex", "fragment"],
        bindingType: "storage",
        childrenBindings: [
          {
            binding: instanceMatricesBinding,
            count: instancesCount,
            forceArray: true
          }
        ]
      });
      instancesBinding.childrenBindings.forEach((binding, index) => {
        const instanceNode = nodes[index];
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
      if (!meshDescriptor.parameters.bindings) {
        meshDescriptor.parameters.bindings = [];
      }
      meshDescriptor.parameters.bindings.push(instancesBinding);
    }
    for (let i = 0; i < nodes.length; i++) {
      const tempBbox = meshDescriptor.parameters.geometry.boundingBox.clone();
      const transformedBbox = tempBbox.applyMat4(meshDescriptor.nodes[i].worldMatrix);
      this.scenesManager.boundingBox.min.min(transformedBbox.min);
      this.scenesManager.boundingBox.max.max(transformedBbox.max);
    }
    this.scenesManager.boundingBox.max.max(new Vec3(1e-3));
    if (primitive.extensions) {
      if (primitive.extensions["KHR_materials_variants"] && this.gltf.extensionsUsed && this.gltf.extensionsUsed.includes("KHR_materials_variants")) {
        meshDescriptor.extensionsUsed.push("KHR_materials_variants");
        this.gltf.extensions["KHR_materials_variants"].variants.forEach((variant, index) => {
          const variantMaterial = primitive.extensions["KHR_materials_variants"].mappings.find(
            (mapping) => mapping.variants && mapping.variants.includes(index)
          );
          if (variantMaterial) {
            const gltfVariantMaterial = this.gltf.materials[variantMaterial.material];
            const variantMaterialParams = this.scenesManager.materialsParams[variantMaterial.material];
            const materialTextures2 = this.scenesManager.materialsTextures[variantMaterial.material];
            const texturesDescriptors = materialTextures2?.texturesDescriptors || [];
            if (useTransmission && hasTransmission) {
              texturesDescriptors.push({
                texture: this.renderer.transmissionTarget.texture,
                sampler: this.renderer.transmissionTarget.sampler
              });
            }
            const extensions2 = { gltfVariantMaterial };
            const extensionsUsed = [];
            if (extensions2) {
              for (const extension of Object.keys(extensions2)) {
                if (extension === "KHR_materials_unlit" && this.gltf.extensionsRequired && this.gltf.extensionsRequired.includes(extension)) {
                  extensionsUsed.push(extension);
                } else {
                  extensionsUsed.push(extension);
                }
              }
            }
            const variantDescriptor = {
              variantName: variant.name,
              parent: meshDescriptor.parent,
              nodes: meshDescriptor.nodes,
              extensionsUsed: [...meshDescriptor.extensionsUsed, ...extensionsUsed],
              texturesDescriptors,
              parameters: {
                geometry: meshDescriptor.parameters.geometry,
                label: variant.name + " " + variantMaterialParams.label,
                transmissive: !!meshDescriptor.parameters.transmissive,
                bindings: meshDescriptor.parameters.bindings ?? [],
                uniforms: variantMaterialParams.uniforms,
                transparent: !!variantMaterialParams.transparent,
                cullMode: variantMaterialParams.cullMode,
                ...variantMaterialParams.targets && { targets: variantMaterialParams.targets }
              }
            };
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
    for (const [primitive, primitiveInstance] of __privateGet(this, _primitiveInstances)) {
      const { nodes, meshDescriptor } = primitiveInstance;
      meshDescriptor.nodes = nodes;
      this.scenesManager.meshesDescriptors.push(meshDescriptor);
      this.createGeometry(primitive, primitiveInstance);
      this.createMaterial(primitive, primitiveInstance);
    }
  }
  /**
   * Add all the needed {@link Mesh} based on the {@link ScenesManager#meshesDescriptors | ScenesManager meshesDescriptors} array.
   * @param patchMeshesParameters - allow to optionally patch the {@link Mesh} parameters before creating it (can be used to add custom shaders, uniforms or storages, change rendering options, etc.)
   * @returns - Array of created {@link Mesh}.
   */
  addMeshes(patchMeshesParameters = (meshDescriptor) => {
  }) {
    this.scenesManager.node.updateMatrixStack();
    return this.scenesManager.meshesDescriptors.map((meshDescriptor) => {
      if (meshDescriptor.parameters.geometry) {
        patchMeshesParameters(meshDescriptor);
        const mesh = new Mesh(this.renderer, {
          ...meshDescriptor.parameters
        });
        meshDescriptor.alternateMaterials.set("Default", mesh.material);
        meshDescriptor.alternateDescriptors.forEach((descriptor) => {
          const matricesBindings = mesh.material.getBufferBindingByName("matrices");
          descriptor.parameters.bindings = [matricesBindings, ...descriptor.parameters.bindings];
          const {
            label,
            shaders,
            uniforms,
            bindings,
            samplers,
            textures,
            targets,
            transparent
          } = descriptor.parameters;
          const alternateMaterial = new RenderMaterial(this.renderer, {
            ...JSON.parse(JSON.stringify(mesh.material.options.rendering)),
            // use default cloned mesh rendering options
            label,
            shaders,
            uniforms,
            bindings,
            ...samplers && { samplers },
            ...textures && { textures },
            ...targets && { targets },
            transparent: !!transparent,
            verticesOrder: meshDescriptor.parameters.geometry.verticesOrder,
            topology: meshDescriptor.parameters.geometry.topology
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
    __privateSet(this, _primitiveInstances, /* @__PURE__ */ new Map());
  }
};
_primitiveInstances = new WeakMap();
_getSparseAccessorIndicesAndValues = new WeakSet();
getSparseAccessorIndicesAndValues_fn = function(accessor) {
  if (!accessor.sparse)
    return { indices: null, values: null };
  const accessorConstructor = _GLTFScenesManager.getTypedArrayConstructorFromComponentType(accessor.componentType);
  const attrSize = _GLTFScenesManager.getVertexAttributeParamsFromType(accessor.type).size;
  const sparseIndicesConstructor = _GLTFScenesManager.getTypedArrayConstructorFromComponentType(
    accessor.sparse.indices.componentType
  );
  const sparseIndicesBufferView = this.gltf.bufferViews[accessor.sparse.indices.bufferView];
  const sparseIndices = new sparseIndicesConstructor(
    this.gltf.arrayBuffers[sparseIndicesBufferView.buffer],
    accessor.byteOffset + sparseIndicesBufferView.byteOffset,
    accessor.sparse.count
  );
  const sparseValuesBufferView = this.gltf.bufferViews[accessor.sparse.values.bufferView];
  const sparseValues = new accessorConstructor(
    this.gltf.arrayBuffers[sparseValuesBufferView.buffer],
    accessor.byteOffset + sparseValuesBufferView.byteOffset,
    accessor.sparse.count * attrSize
  );
  return {
    indices: sparseIndices,
    values: sparseValues
  };
};
_parsePrimitiveProperty = new WeakSet();
parsePrimitiveProperty_fn = function(primitiveProperty, attributes) {
  let interleavedArray = null;
  let interleavedBufferView = null;
  let maxByteOffset = 0;
  const primitiveAttributes = Object.entries(primitiveProperty);
  primitiveAttributes.sort((a, b) => a[1] - b[1]);
  const primitiveAttributesValues = Object.values(primitiveProperty);
  primitiveAttributesValues.sort((a, b) => a - b);
  for (const [attribName, accessorIndex] of primitiveAttributes) {
    const name = _GLTFScenesManager.getCleanAttributeName(attribName);
    const accessor = this.gltf.accessors[accessorIndex];
    const constructor = accessor.componentType ? _GLTFScenesManager.getTypedArrayConstructorFromComponentType(accessor.componentType) : Float32Array;
    const bufferView = this.gltf.bufferViews[accessor.bufferView];
    const byteStride = bufferView.byteStride;
    const accessorByteOffset = accessor.byteOffset;
    const isInterleaved = byteStride !== void 0 && accessorByteOffset !== void 0 && accessorByteOffset < byteStride;
    if (isInterleaved) {
      maxByteOffset = Math.max(accessorByteOffset, maxByteOffset);
    } else {
      maxByteOffset = 0;
    }
    if (name === "position") {
      interleavedBufferView = bufferView;
    }
    const attributeParams = _GLTFScenesManager.getVertexAttributeParamsFromType(accessor.type);
    const { size } = attributeParams;
    let array;
    if (maxByteOffset > 0) {
      const parentArray = new constructor(
        this.gltf.arrayBuffers[bufferView.buffer],
        0,
        bufferView.byteLength / constructor.BYTES_PER_ELEMENT
      );
      array = new constructor(accessor.count * size);
      const arrayStride = accessorByteOffset / constructor.BYTES_PER_ELEMENT;
      for (let i = 0; i < accessor.count; i++) {
        for (let j = 0; j < size; j++) {
          array[i * size + j] = parentArray[arrayStride + size * i + size * i + j];
        }
      }
    } else {
      if (bufferView.byteStride && bufferView.byteStride > constructor.BYTES_PER_ELEMENT * size) {
        const dataView = new DataView(
          this.gltf.arrayBuffers[bufferView.buffer],
          bufferView.byteOffset + accessor.byteOffset
        );
        array = new constructor(accessor.count * size);
        for (let i = 0; i < accessor.count; i++) {
          const baseOffset = i * bufferView.byteStride;
          for (let j = 0; j < size; j++) {
            array[i * size + j] = dataView.getUint16(baseOffset + j * constructor.BYTES_PER_ELEMENT, true);
          }
        }
      } else {
        array = new constructor(
          this.gltf.arrayBuffers[bufferView.buffer],
          accessor.byteOffset + bufferView.byteOffset,
          accessor.count * size
        );
      }
    }
    if (accessor.sparse) {
      const { indices, values } = __privateMethod(this, _getSparseAccessorIndicesAndValues, getSparseAccessorIndicesAndValues_fn).call(this, accessor);
      for (let i = 0; i < indices.length; i++) {
        for (let j = 0; j < size; j++) {
          array[indices[i] * size + j] = values[i * size + j];
        }
      }
    }
    if (name.includes("weights")) {
      for (let i = 0; i < accessor.count * size; i += size) {
        const x = array[i];
        const y = array[i + 1];
        const z = array[i + 2];
        const w = array[i + 3];
        let len = Math.abs(x) + Math.abs(y) + Math.abs(z) + Math.abs(w);
        if (len > 0) {
          len = 1 / Math.sqrt(len);
        } else {
          len = 1;
        }
        array[i] *= len;
        array[i + 1] *= len;
        array[i + 2] *= len;
        array[i + 3] *= len;
      }
    }
    const attribute = {
      name,
      ...attributeParams,
      array
    };
    attributes.push(attribute);
  }
  if (maxByteOffset > 0) {
    const accessorsBufferViews = primitiveAttributesValues.map(
      (accessorIndex) => this.gltf.accessors[accessorIndex].bufferView
    );
    if (!accessorsBufferViews.every((val) => val === accessorsBufferViews[0])) {
      let totalStride = 0;
      const mainBufferStrides = {};
      const arrayLength = primitiveAttributesValues.reduce((acc, accessorIndex) => {
        const accessor = this.gltf.accessors[accessorIndex];
        const attrSize = _GLTFScenesManager.getVertexAttributeParamsFromType(accessor.type).size;
        if (!mainBufferStrides[accessor.bufferView]) {
          mainBufferStrides[accessor.bufferView] = 0;
        }
        mainBufferStrides[accessor.bufferView] = Math.max(
          mainBufferStrides[accessor.bufferView],
          accessor.byteOffset + attrSize * Float32Array.BYTES_PER_ELEMENT
        );
        totalStride += attrSize * Float32Array.BYTES_PER_ELEMENT;
        return acc + accessor.count * attrSize;
      }, 0);
      interleavedArray = new Float32Array(Math.ceil(arrayLength / 4) * 4);
      primitiveAttributesValues.forEach((accessorIndex) => {
        const accessor = this.gltf.accessors[accessorIndex];
        const bufferView = this.gltf.bufferViews[accessor.bufferView];
        const attrSize = _GLTFScenesManager.getVertexAttributeParamsFromType(accessor.type).size;
        const { indices, values } = __privateMethod(this, _getSparseAccessorIndicesAndValues, getSparseAccessorIndicesAndValues_fn).call(this, accessor);
        for (let i = 0; i < accessor.count; i++) {
          const startOffset = accessor.byteOffset / Float32Array.BYTES_PER_ELEMENT + i * totalStride / Float32Array.BYTES_PER_ELEMENT;
          const subarray = new Float32Array(
            this.gltf.arrayBuffers[bufferView.buffer],
            bufferView.byteOffset + accessor.byteOffset + i * mainBufferStrides[accessor.bufferView],
            attrSize
          );
          if (indices && values && indices.includes(i)) {
            for (let j = 0; i < attrSize; j++) {
              subarray[j] = values[i * attrSize + j];
            }
          }
          interleavedArray.subarray(startOffset, startOffset + attrSize).set(subarray);
        }
      });
      const cleanAttributeNames = Object.entries(primitiveProperty).map(
        (prop) => _GLTFScenesManager.getCleanAttributeName(prop[0])
      );
      this.sortAttributesByNames(cleanAttributeNames, attributes);
    } else {
      interleavedArray = new Float32Array(
        this.gltf.arrayBuffers[interleavedBufferView.buffer],
        interleavedBufferView.byteOffset,
        Math.ceil(interleavedBufferView.byteLength / 4) * 4 / Float32Array.BYTES_PER_ELEMENT
      );
      let stride = 0;
      primitiveAttributesValues.forEach((accessorIndex) => {
        const accessor = this.gltf.accessors[accessorIndex];
        const attrSize = _GLTFScenesManager.getVertexAttributeParamsFromType(accessor.type).size;
        const { indices, values } = __privateMethod(this, _getSparseAccessorIndicesAndValues, getSparseAccessorIndicesAndValues_fn).call(this, accessor);
        if (indices && values) {
          for (let i = 0; i < indices.length; i++) {
            for (let j = 0; j < attrSize; j++) {
              const arrayStride = stride + attrSize * i;
              interleavedArray[arrayStride + indices[i] * attrSize + j] = values[i * attrSize + j];
            }
          }
        }
        stride += attrSize;
      });
      const primitivePropertiesSortedByByteOffset = Object.entries(primitiveProperty).sort((a, b) => {
        const accessorAByteOffset = this.gltf.accessors[a[1]].byteOffset;
        const accessorBByteOffset = this.gltf.accessors[b[1]].byteOffset;
        return accessorAByteOffset - accessorBByteOffset;
      });
      const accessorNameOrder = primitivePropertiesSortedByByteOffset.map(
        (property) => _GLTFScenesManager.getCleanAttributeName(property[0])
      );
      this.sortAttributesByNames(accessorNameOrder, attributes);
    }
  }
  return interleavedArray;
};
let GLTFScenesManager = _GLTFScenesManager;

export { GLTFScenesManager };
