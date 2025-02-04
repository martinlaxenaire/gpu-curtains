import { getVertexShaderCode } from '../../core/shaders/full/vertex/get-vertex-shader-code.mjs';
import { getFragmentShaderCode } from '../../core/shaders/full/fragment/get-fragment-shader-code.mjs';

const buildShaders = (meshDescriptor, shaderParameters = {}) => {
  let { shadingModel } = shaderParameters;
  if (!shadingModel) {
    shadingModel = "PBR";
  }
  const isUnlit = meshDescriptor.extensionsUsed.includes("KHR_materials_unlit");
  if (isUnlit) {
    shadingModel = "Unlit";
  }
  const baseColorTexture = meshDescriptor.texturesDescriptors.find((t) => t.texture.options.name === "baseColorTexture");
  const normalTexture = meshDescriptor.texturesDescriptors.find((t) => t.texture.options.name === "normalTexture");
  const emissiveTexture = meshDescriptor.texturesDescriptors.find((t) => t.texture.options.name === "emissiveTexture");
  const occlusionTexture = meshDescriptor.texturesDescriptors.find((t) => t.texture.options.name === "occlusionTexture");
  const metallicRoughnessTexture = meshDescriptor.texturesDescriptors.find(
    (t) => t.texture.options.name === "metallicRoughnessTexture"
  );
  const specularTexture = meshDescriptor.texturesDescriptors.find((t) => t.texture.options.name === "specularTexture");
  const specularFactorTexture = specularTexture || meshDescriptor.texturesDescriptors.find((t) => t.texture.options.name === "specularFactorTexture");
  const specularColorTexture = specularTexture || meshDescriptor.texturesDescriptors.find((t) => t.texture.options.name === "specularColorTexture");
  const transmissionTexture = meshDescriptor.texturesDescriptors.find(
    (t) => t.texture.options.name === "transmissionTexture"
  );
  const thicknessTexture = meshDescriptor.texturesDescriptors.find((t) => t.texture.options.name === "thicknessTexture");
  const transmissionBackgroundTexture = meshDescriptor.texturesDescriptors.find(
    (t) => t.texture.options.name === "transmissionBackgroundTexture"
  );
  if (!meshDescriptor.parameters.textures) {
    meshDescriptor.parameters.textures = [];
  }
  if (!meshDescriptor.parameters.samplers) {
    meshDescriptor.parameters.samplers = [];
  }
  if (shadingModel !== "Unlit") {
    meshDescriptor.texturesDescriptors.forEach((textureDescriptor) => {
      const samplerExists = meshDescriptor.parameters.samplers.find((s) => s.uuid === textureDescriptor.sampler.uuid);
      if (!samplerExists) {
        meshDescriptor.parameters.samplers.push(textureDescriptor.sampler);
      }
      meshDescriptor.parameters.textures.push(textureDescriptor.texture);
    });
  } else if (baseColorTexture) {
    const samplerExists = meshDescriptor.parameters.samplers.find((s) => s.uuid === baseColorTexture.sampler.uuid);
    if (!samplerExists) {
      meshDescriptor.parameters.samplers.push(baseColorTexture.sampler);
    }
    meshDescriptor.parameters.textures.push(baseColorTexture.texture);
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
  meshDescriptor.alternateDescriptors?.forEach((descriptor) => {
    descriptor.parameters.uniforms = { ...meshDescriptor.parameters.uniforms, ...descriptor.parameters.uniforms };
    descriptor.parameters.shaders = buildShaders(descriptor, shaderParameters);
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
