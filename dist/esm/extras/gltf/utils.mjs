import { getVertexCode } from '../../core/shaders/full/vertex/get-vertex-code.mjs';
import { getFragmentCode } from '../../core/shaders/full/fragment/get-fragment-code.mjs';

const buildShaders = (meshDescriptor, shaderParameters = {}) => {
  const baseColorTexture = meshDescriptor.textures.find((t) => t.texture === "baseColorTexture");
  const normalTexture = meshDescriptor.textures.find((t) => t.texture === "normalTexture");
  const emissiveTexture = meshDescriptor.textures.find((t) => t.texture === "emissiveTexture");
  const occlusionTexture = meshDescriptor.textures.find((t) => t.texture === "occlusionTexture");
  const metallicRoughnessTexture = meshDescriptor.textures.find((t) => t.texture === "metallicRoughnessTexture");
  const specularTexture = meshDescriptor.textures.find((t) => t.texture === "specularTexture");
  const specularFactorTexture = specularTexture || meshDescriptor.textures.find((t) => t.texture === "specularFactorTexture");
  const specularColorTexture = specularTexture || meshDescriptor.textures.find((t) => t.texture === "specularColorTexture");
  const transmissionTexture = meshDescriptor.textures.find((t) => t.texture === "transmissionTexture");
  const thicknessTexture = meshDescriptor.textures.find((t) => t.texture === "thicknessTexture");
  const transmissionBackgroundTexture = meshDescriptor.textures.find(
    (t) => t.texture === "transmissionBackgroundTexture"
  );
  let { shadingModel } = shaderParameters;
  if (!shadingModel) {
    shadingModel = "PBR";
  }
  const isUnlit = meshDescriptor.extensionsUsed.includes("KHR_materials_unlit");
  if (isUnlit) {
    shadingModel = "Unlit";
  }
  let { chunks } = shaderParameters || {};
  const { environmentMap } = shaderParameters || {};
  if (environmentMap) {
    meshDescriptor.parameters.uniforms.material.struct = {
      ...meshDescriptor.parameters.uniforms.material.struct,
      ...{
        envRotation: {
          type: "mat3x3f",
          value: environmentMap.rotation
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
    meshDescriptor.parameters.textures = [
      ...meshDescriptor.parameters.textures,
      environmentMap.lutTexture,
      environmentMap.diffuseTexture,
      environmentMap.specularTexture
    ];
    meshDescriptor.parameters.samplers = [...meshDescriptor.parameters.samplers, environmentMap.sampler];
  }
  const vs = getVertexCode({
    bindings: meshDescriptor.parameters.bindings,
    geometry: meshDescriptor.parameters.geometry
  });
  const fs = getFragmentCode({
    shadingModel,
    chunks,
    receiveShadows: !!meshDescriptor.parameters.receiveShadows,
    toneMapping: "Khronos",
    geometry: meshDescriptor.parameters.geometry,
    extensionsUsed: meshDescriptor.extensionsUsed,
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
  return {
    vertex: {
      code: vs,
      entryPoint: "main"
    },
    fragment: {
      code: fs,
      entryPoint: "main"
    }
  };
};

export { buildShaders };
