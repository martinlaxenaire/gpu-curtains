import { Mesh } from '../../core/meshes/Mesh.mjs';
import { isCameraRenderer } from '../../core/renderers/utils.mjs';
import { getFragmentShaderCode } from '../../core/shaders/full/fragment/get-fragment-shader-code.mjs';
import { Vec2 } from '../../math/Vec2.mjs';
import { Vec3 } from '../../math/Vec3.mjs';
import { getVertexShaderCode } from '../../core/shaders/full/vertex/get-vertex-shader-code.mjs';
import { sRGBToLinear } from '../../math/color-utils.mjs';

class LitMesh extends Mesh {
  /**
   * LitMesh constructor
   * @param renderer - {@link CameraRenderer} object or {@link GPUCurtains} class object used to create this {@link LitMesh}.
   * @param parameters - {@link LitMeshParameters} used to create this {@link LitMesh}.
   */
  constructor(renderer, parameters = {}) {
    renderer = isCameraRenderer(renderer, "LitMesh");
    const { material, ...defaultParams } = parameters;
    let { colorSpace } = material;
    if (!colorSpace) {
      colorSpace = "srgb";
    }
    const {
      shading,
      additionalVaryings,
      vertexChunks,
      fragmentChunks,
      toneMapping,
      // material uniform values
      color,
      opacity,
      alphaCutoff,
      metallic,
      roughness,
      normalScale,
      occlusionIntensity,
      emissiveIntensity,
      emissiveColor,
      specularIntensity,
      specularColor,
      shininess,
      transmission,
      ior,
      dispersion,
      thickness,
      attenuationDistance,
      attenuationColor,
      // texture descriptors
      baseColorTexture,
      normalTexture,
      emissiveTexture,
      occlusionTexture,
      metallicRoughnessTexture,
      specularTexture,
      specularFactorTexture,
      specularColorTexture,
      transmissionTexture,
      thicknessTexture,
      environmentMap
    } = material;
    const materialUniform = LitMesh.getMaterialUniform({
      shading,
      colorSpace,
      color,
      opacity,
      alphaCutoff,
      metallic,
      roughness,
      normalScale,
      occlusionIntensity,
      emissiveIntensity,
      emissiveColor,
      specularIntensity,
      specularColor,
      shininess,
      transmission,
      ior,
      dispersion,
      thickness,
      attenuationDistance,
      attenuationColor,
      environmentMap
    });
    if (defaultParams.uniforms) {
      defaultParams.uniforms = {
        ...defaultParams.uniforms,
        ...{
          material: materialUniform
        }
      };
    } else {
      defaultParams.uniforms = {
        material: materialUniform
      };
    }
    if (!defaultParams.textures) {
      defaultParams.textures = [];
    }
    if (!defaultParams.samplers) {
      defaultParams.samplers = [];
    }
    const materialTextures = LitMesh.getMaterialTexturesDescriptors({
      shading,
      baseColorTexture,
      normalTexture,
      emissiveTexture,
      occlusionTexture,
      metallicRoughnessTexture,
      specularTexture,
      specularFactorTexture,
      specularColorTexture,
      transmissionTexture,
      thicknessTexture
    });
    materialTextures.forEach((textureDescriptor) => {
      if (textureDescriptor.sampler) {
        const samplerExists = defaultParams.samplers.find((s) => s.uuid === textureDescriptor.sampler.uuid);
        if (!samplerExists) {
          defaultParams.samplers.push(textureDescriptor.sampler);
        }
      }
      defaultParams.textures.push(textureDescriptor.texture);
    });
    const useEnvMap = environmentMap && (shading === "PBR" || !shading);
    if (useEnvMap) {
      if (!defaultParams.textures) {
        defaultParams.textures = [];
      }
      defaultParams.textures = [
        ...defaultParams.textures,
        environmentMap.lutTexture,
        environmentMap.diffuseTexture,
        environmentMap.specularTexture
      ];
      if (!defaultParams.samplers) {
        defaultParams.samplers = [];
      }
      defaultParams.samplers = [...defaultParams.samplers, environmentMap.sampler];
    }
    let transmissionBackgroundTexture = null;
    if (parameters.transmissive) {
      renderer.createTransmissionTarget();
      transmissionBackgroundTexture = {
        texture: renderer.transmissionTarget.texture,
        sampler: renderer.transmissionTarget.sampler
      };
    }
    const extensionsUsed = [];
    if (dispersion) {
      extensionsUsed.push("KHR_materials_dispersion");
    }
    const hasNormal = defaultParams.geometry && defaultParams.geometry.getAttributeByName("normal");
    if (defaultParams.geometry && !hasNormal) {
      defaultParams.geometry.computeGeometry();
    }
    const vs = LitMesh.getVertexShaderCode({
      bindings: defaultParams.bindings,
      geometry: defaultParams.geometry,
      chunks: vertexChunks,
      additionalVaryings
    });
    const fs = LitMesh.getFragmentShaderCode({
      shadingModel: shading,
      chunks: fragmentChunks,
      extensionsUsed,
      receiveShadows: defaultParams.receiveShadows,
      toneMapping,
      geometry: defaultParams.geometry,
      additionalVaryings,
      materialUniform,
      baseColorTexture,
      normalTexture,
      metallicRoughnessTexture,
      specularTexture,
      specularFactorTexture,
      specularColorTexture,
      transmissionTexture,
      thicknessTexture,
      emissiveTexture,
      occlusionTexture,
      transmissionBackgroundTexture,
      environmentMap
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
    super(renderer, { ...defaultParams, ...{ shaders } });
    if (useEnvMap) {
      environmentMap.onRotationAxisChanged(() => {
        this.uniforms.material.envRotation.value = environmentMap.rotationMatrix;
      });
    }
  }
  /**
   * Get the material {@link BufferBindingParams} to build the material uniform.
   * @param parameters - {@link GetLitMeshMaterialUniform} parameters.
   * @returns - Material uniform {@link BufferBindingParams}.
   */
  static getMaterialUniform(parameters) {
    const {
      shading,
      colorSpace,
      color,
      opacity,
      alphaCutoff,
      metallic,
      roughness,
      normalScale,
      occlusionIntensity,
      emissiveIntensity,
      emissiveColor,
      specularIntensity,
      specularColor,
      shininess,
      transmission,
      ior,
      dispersion,
      thickness,
      attenuationDistance,
      attenuationColor,
      environmentMap
    } = parameters;
    const baseUniformStruct = {
      color: {
        type: "vec3f",
        value: color !== void 0 ? colorSpace === "srgb" ? sRGBToLinear(color.clone()) : color.clone() : new Vec3(1)
      },
      opacity: {
        type: "f32",
        value: opacity !== void 0 ? opacity : 1
      },
      alphaCutoff: {
        type: "f32",
        value: alphaCutoff !== void 0 ? alphaCutoff : 0.5
      }
    };
    const diffuseUniformStruct = {
      ...baseUniformStruct,
      normalScale: {
        type: "vec2f",
        value: normalScale !== void 0 ? normalScale : new Vec2(1)
      },
      occlusionIntensity: {
        type: "f32",
        value: occlusionIntensity !== void 0 ? occlusionIntensity : 1
      },
      emissiveIntensity: {
        type: "f32",
        value: emissiveIntensity !== void 0 ? emissiveIntensity : 1
      },
      emissiveColor: {
        type: "vec3f",
        value: emissiveColor !== void 0 ? colorSpace === "srgb" ? sRGBToLinear(emissiveColor.clone()) : emissiveColor.clone() : new Vec3()
      }
    };
    const specularUniformStruct = {
      ...diffuseUniformStruct,
      specularIntensity: {
        type: "f32",
        value: specularIntensity !== void 0 ? specularIntensity : 1
      },
      specularColor: {
        type: "vec3f",
        value: specularColor !== void 0 ? colorSpace === "srgb" ? sRGBToLinear(specularColor.clone()) : specularColor.clone() : new Vec3(1)
      }
    };
    const phongUniformStruct = {
      ...specularUniformStruct,
      shininess: {
        type: "f32",
        value: shininess !== void 0 ? shininess : 30
      }
    };
    const pbrUniformStruct = {
      ...specularUniformStruct,
      metallic: {
        type: "f32",
        value: metallic !== void 0 ? metallic : 1
      },
      roughness: {
        type: "f32",
        value: roughness !== void 0 ? roughness : 1
      },
      transmission: {
        type: "f32",
        value: transmission !== void 0 ? transmission : 0
      },
      ior: {
        type: "f32",
        value: ior !== void 0 ? ior : 1.5
      },
      dispersion: {
        type: "f32",
        value: dispersion !== void 0 ? dispersion : 0
      },
      thickness: {
        type: "f32",
        value: thickness !== void 0 ? thickness : 0
      },
      attenuationDistance: {
        type: "f32",
        value: attenuationDistance !== void 0 ? attenuationDistance : Infinity
      },
      attenuationColor: {
        type: "vec3f",
        value: attenuationColor !== void 0 ? colorSpace === "srgb" ? sRGBToLinear(attenuationColor.clone()) : attenuationColor.clone() : new Vec3(1)
      },
      ...environmentMap && {
        envRotation: {
          type: "mat3x3f",
          value: environmentMap.rotationMatrix
        },
        envDiffuseIntensity: {
          type: "f32",
          value: environmentMap.options.diffuseIntensity
        },
        envSpecularIntensity: {
          type: "f32",
          value: environmentMap.options.specularIntensity
        }
      }
    };
    const materialStruct = (() => {
      switch (shading) {
        case "Unlit":
          return baseUniformStruct;
        case "Lambert":
          return diffuseUniformStruct;
        case "Phong":
          return phongUniformStruct;
        case "PBR":
        default:
          return pbrUniformStruct;
      }
    })();
    return {
      visibility: ["fragment"],
      struct: materialStruct
    };
  }
  /**
   * Get all the material {@link ShaderTextureDescriptor} as an array.
   * @param parameters - {@link GetMaterialTexturesDescriptors} parameters.
   * @returns - Array of {@link ShaderTextureDescriptor} to use.
   */
  static getMaterialTexturesDescriptors(parameters) {
    const {
      shading,
      baseColorTexture,
      normalTexture,
      emissiveTexture,
      occlusionTexture,
      metallicRoughnessTexture,
      specularTexture,
      specularFactorTexture,
      specularColorTexture,
      transmissionTexture,
      thicknessTexture
    } = parameters;
    const baseTextures = [baseColorTexture];
    const diffuseTextures = [...baseTextures, normalTexture, emissiveTexture, occlusionTexture];
    const specularTextures = [
      ...diffuseTextures,
      metallicRoughnessTexture,
      specularTexture,
      specularFactorTexture,
      specularColorTexture
    ];
    const pbrTextures = [...specularTextures, transmissionTexture, thicknessTexture];
    const materialTextures = (() => {
      switch (shading) {
        case "Unlit":
          return baseTextures;
        case "Lambert":
          return diffuseTextures;
        case "Phong":
          return specularTextures;
        case "PBR":
        default:
          return pbrTextures;
      }
    })();
    return materialTextures.filter(Boolean);
  }
  /**
   * Generate the {@link LitMesh} vertex shader code.
   * @param parameters - {@link VertexShaderInputParams} used to generate the vertex shader code.
   * @returns - The vertex shader generated based on the provided parameters.
   */
  static getVertexShaderCode(parameters) {
    return getVertexShaderCode(parameters);
  }
  /**
   * Generate the {@link LitMesh} fragment shader.
   * @param parameters - {@link FragmentShaderInputParams} used to build the fragment shader.
   * @returns - The fragment shader generated based on the provided parameters.
   */
  static getFragmentShaderCode(parameters) {
    return getFragmentShaderCode(parameters);
  }
}

export { LitMesh };
