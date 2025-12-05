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
    let { material, ...defaultParams } = parameters;
    if (!material) material = {};
    let {
      colorSpace,
      transmissiveInputColorSpace,
      transmissiveInputToneMapping,
      outputColorSpace,
      flatShading,
      fragmentOutput
    } = material;
    if (!colorSpace) {
      colorSpace = "srgb";
    }
    if (!outputColorSpace) {
      outputColorSpace = "srgb";
    }
    if (!transmissiveInputColorSpace) {
      transmissiveInputColorSpace = "srgb";
    }
    if (transmissiveInputToneMapping === void 0) {
      transmissiveInputToneMapping = "Khronos";
    }
    if (!fragmentOutput) {
      fragmentOutput = {
        struct: [
          {
            type: "vec4f",
            name: "color"
          }
        ],
        output: (
          /* wgsl */
          `
  var output: FSOutput;
  output.color = outputColor;
  return output;`
        )
      };
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
      multiscatterColor,
      scatterAnisotropy,
      sheenColor,
      sheenRoughness,
      anisotropy,
      anisotropyVector,
      clearcoat,
      clearcoatRoughness,
      clearcoatNormalScale,
      iridescence,
      iridescenceIOR,
      iridescenceThicknessRange,
      diffuseTransmission,
      diffuseTransmissionColor,
      // texture descriptors
      baseColorTexture,
      normalTexture,
      emissiveTexture,
      occlusionTexture,
      metallicRoughnessTexture,
      specularTexture,
      specularFactorTexture,
      specularColorTexture,
      transmissionThicknessTexture,
      transmissionTexture,
      thicknessTexture,
      sheenTexture,
      sheenColorTexture,
      sheenRoughnessTexture,
      anisotropyTexture,
      clearcoatTexture,
      clearcoatFactorTexture,
      clearcoatRoughnessTexture,
      clearcoatNormalTexture,
      iridescenceTexture,
      iridescenceFactorTexture,
      iridescenceThicknessTexture,
      diffuseTransmissionTexture,
      diffuseTransmissionFactorTexture,
      diffuseTransmissionColorTexture,
      // environment map
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
      multiscatterColor,
      scatterAnisotropy,
      sheenColor,
      sheenRoughness,
      anisotropy,
      anisotropyVector,
      clearcoat,
      clearcoatRoughness,
      clearcoatNormalScale,
      iridescence,
      iridescenceIOR,
      iridescenceThicknessRange,
      diffuseTransmission,
      diffuseTransmissionColor,
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
      transmissionThicknessTexture,
      transmissionTexture,
      thicknessTexture,
      sheenTexture,
      sheenColorTexture,
      sheenRoughnessTexture,
      anisotropyTexture,
      clearcoatTexture,
      clearcoatFactorTexture,
      clearcoatRoughnessTexture,
      clearcoatNormalTexture,
      iridescenceTexture,
      iridescenceFactorTexture,
      iridescenceThicknessTexture,
      diffuseTransmissionTexture,
      diffuseTransmissionFactorTexture,
      diffuseTransmissionColorTexture
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
        environmentMap.diffuseTexture,
        environmentMap.specularTexture
      ];
      if (environmentMap.lutTexture) {
        defaultParams.textures = [...defaultParams.textures, environmentMap.lutTexture];
      }
      if (!defaultParams.samplers) {
        defaultParams.samplers = [];
      }
      defaultParams.samplers = [...defaultParams.samplers, environmentMap.sampler];
    }
    const extensionsUsed = [];
    let transmissionBackgroundTexture = null;
    if (parameters.transmissive) {
      extensionsUsed.push("KHR_materials_transmission");
      renderer.createTransmissionTarget();
      transmissionBackgroundTexture = {
        texture: renderer.transmissionTarget.texture,
        sampler: renderer.transmissionTarget.sampler
      };
    }
    if (thickness) {
      extensionsUsed.push("KHR_materials_volume");
    }
    if (dispersion) {
      extensionsUsed.push("KHR_materials_dispersion");
    }
    if (sheenColor || sheenRoughness) {
      extensionsUsed.push("KHR_materials_sheen");
    }
    if (anisotropy !== void 0) {
      extensionsUsed.push("KHR_materials_anisotropy");
    }
    if (clearcoat) {
      extensionsUsed.push("KHR_materials_clearcoat");
    }
    if (iridescence) {
      extensionsUsed.push("KHR_materials_iridescence");
    }
    if (diffuseTransmission !== void 0) {
      extensionsUsed.push("KHR_materials_diffuse_transmission");
    }
    if (multiscatterColor !== void 0 || scatterAnisotropy !== void 0) {
      extensionsUsed.push("KHR_materials_volume_scatter");
    }
    const hasNormal = defaultParams.geometry && defaultParams.geometry.getAttributeByName("normal");
    if (defaultParams.geometry && !hasNormal) {
      defaultParams.geometry.computeGeometry();
      flatShading = true;
    }
    const vs = LitMesh.getVertexShaderCode({
      bindings: defaultParams.bindings,
      geometry: defaultParams.geometry,
      chunks: vertexChunks,
      additionalVaryings
    });
    const cullMode = parameters.cullMode ?? "back";
    const fs = LitMesh.getFragmentShaderCode({
      shadingModel: shading,
      outputColorSpace,
      fragmentOutput,
      chunks: fragmentChunks,
      extensionsUsed,
      receiveShadows: defaultParams.receiveShadows,
      cullMode,
      flatShading,
      toneMapping,
      transmissiveInputColorSpace,
      transmissiveInputToneMapping,
      geometry: defaultParams.geometry,
      additionalVaryings,
      materialUniform,
      baseColorTexture,
      normalTexture,
      metallicRoughnessTexture,
      specularTexture,
      specularFactorTexture,
      specularColorTexture,
      transmissionThicknessTexture,
      transmissionTexture,
      thicknessTexture,
      emissiveTexture,
      occlusionTexture,
      sheenTexture,
      sheenColorTexture,
      sheenRoughnessTexture,
      anisotropyTexture,
      clearcoatTexture,
      clearcoatFactorTexture,
      clearcoatRoughnessTexture,
      clearcoatNormalTexture,
      iridescenceTexture,
      iridescenceFactorTexture,
      iridescenceThicknessTexture,
      diffuseTransmissionTexture,
      diffuseTransmissionFactorTexture,
      diffuseTransmissionColorTexture,
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
      multiscatterColor,
      scatterAnisotropy,
      sheenColor,
      sheenRoughness,
      anisotropy,
      anisotropyVector,
      clearcoat,
      clearcoatRoughness,
      clearcoatNormalScale,
      iridescence,
      iridescenceIOR,
      iridescenceThicknessRange,
      diffuseTransmission,
      diffuseTransmissionColor,
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
    const diffuseUniformStruct = {
      ...baseUniformStruct,
      normalScale: {
        type: "vec2f",
        value: normalScale !== void 0 ? normalScale : new Vec2(1)
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
      multiscatterColor: {
        type: "vec3f",
        value: multiscatterColor !== void 0 ? colorSpace === "srgb" ? sRGBToLinear(multiscatterColor.clone()) : multiscatterColor.clone() : new Vec3(0)
      },
      scatterAnisotropy: {
        type: "f32",
        value: scatterAnisotropy !== void 0 ? scatterAnisotropy : 0
      },
      // sheen
      sheenColor: {
        type: "vec3f",
        value: sheenColor !== void 0 ? colorSpace === "srgb" ? sRGBToLinear(sheenColor.clone()) : sheenColor.clone() : new Vec3(0)
      },
      sheenRoughness: {
        type: "f32",
        value: sheenRoughness !== void 0 ? sheenRoughness : 0
      },
      // anisotropy
      anisotropy: {
        type: "f32",
        value: anisotropy !== void 0 ? anisotropy : 0
      },
      anisotropyVector: {
        type: "vec2f",
        value: anisotropyVector !== void 0 ? anisotropyVector.clone() : new Vec2(1, 0)
      },
      // clearcoat
      clearcoat: {
        type: "f32",
        value: clearcoat !== void 0 ? clearcoat : 0
      },
      clearcoatRoughness: {
        type: "f32",
        value: clearcoatRoughness !== void 0 ? clearcoatRoughness : 0
      },
      clearcoatNormalScale: {
        type: "vec2f",
        value: clearcoatNormalScale !== void 0 ? clearcoatNormalScale.clone() : new Vec2(1)
      },
      // iridescence
      iridescence: {
        type: "f32",
        value: iridescence !== void 0 ? iridescence : 0
      },
      iridescenceIOR: {
        type: "f32",
        value: iridescenceIOR !== void 0 ? iridescenceIOR : 1.3
      },
      iridescenceThicknessRange: {
        type: "vec2f",
        value: iridescenceThicknessRange !== void 0 ? iridescenceThicknessRange.clone() : new Vec2(100, 400)
      },
      diffuseTransmission: {
        type: "f32",
        value: diffuseTransmission !== void 0 ? diffuseTransmission : 0
      },
      diffuseTransmissionColor: {
        type: "vec3f",
        value: diffuseTransmissionColor !== void 0 ? colorSpace === "srgb" ? sRGBToLinear(diffuseTransmissionColor.clone()) : diffuseTransmissionColor.clone() : new Vec3(1)
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
      transmissionThicknessTexture,
      transmissionTexture,
      thicknessTexture,
      sheenTexture,
      sheenColorTexture,
      sheenRoughnessTexture,
      anisotropyTexture,
      clearcoatTexture,
      clearcoatFactorTexture,
      clearcoatRoughnessTexture,
      clearcoatNormalTexture,
      iridescenceTexture,
      iridescenceFactorTexture,
      iridescenceThicknessTexture,
      diffuseTransmissionTexture,
      diffuseTransmissionFactorTexture,
      diffuseTransmissionColorTexture
    } = parameters;
    const baseTextures = [baseColorTexture, emissiveTexture, occlusionTexture];
    const diffuseTextures = [...baseTextures, normalTexture];
    const specularTextures = [
      ...diffuseTextures,
      metallicRoughnessTexture,
      specularTexture,
      specularFactorTexture,
      specularColorTexture
    ];
    const pbrTextures = [
      ...specularTextures,
      transmissionThicknessTexture,
      transmissionTexture,
      thicknessTexture,
      sheenTexture,
      sheenColorTexture,
      sheenRoughnessTexture,
      anisotropyTexture,
      clearcoatTexture,
      clearcoatFactorTexture,
      clearcoatRoughnessTexture,
      clearcoatNormalTexture,
      iridescenceTexture,
      iridescenceFactorTexture,
      iridescenceThicknessTexture,
      diffuseTransmissionTexture,
      diffuseTransmissionFactorTexture,
      diffuseTransmissionColorTexture
    ];
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
