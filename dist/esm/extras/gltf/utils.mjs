import { getVertexShaderCode } from '../../core/shaders/full/vertex/get-vertex-shader-code.mjs';
import { getFragmentShaderCode } from '../../core/shaders/full/fragment/get-fragment-shader-code.mjs';

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
  const transmissionBackgroundTexture = meshDescriptor.parameters.transmissive ? {
    texture: "transmissionBackgroundTexture",
    sampler: "transmissionSampler",
    texCoordAttributeName: "uv"
  } : null;
  let { shadingModel } = shaderParameters;
  if (!shadingModel) {
    shadingModel = "PBR";
  }
  const isUnlit = meshDescriptor.extensionsUsed.includes("KHR_materials_unlit");
  if (isUnlit) {
    shadingModel = "Unlit";
  }
  let { vertexChunks, fragmentChunks } = shaderParameters || {};
  const { environmentMap } = shaderParameters || {};
  if (environmentMap) {
    meshDescriptor.parameters.textures = [
      ...meshDescriptor.parameters.textures,
      environmentMap.lutTexture,
      environmentMap.diffuseTexture,
      environmentMap.specularTexture
    ];
    meshDescriptor.parameters.samplers = [...meshDescriptor.parameters.samplers, environmentMap.sampler];
  }
  const vs = getVertexShaderCode({
    bindings: meshDescriptor.parameters.bindings,
    geometry: meshDescriptor.parameters.geometry,
    chunks: vertexChunks
  });
  const fs = getFragmentShaderCode({
    shadingModel,
    chunks: fragmentChunks,
    receiveShadows: !!meshDescriptor.parameters.receiveShadows,
    toneMapping: "Khronos",
    geometry: meshDescriptor.parameters.geometry,
    materialUniform: meshDescriptor.parameters.uniforms.material,
    materialUniformName: "material",
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
