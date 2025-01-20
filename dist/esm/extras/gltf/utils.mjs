import { throwWarning } from '../../utils/utils.mjs';
import { getLambert } from '../../core/shaders/chunks/shading/lambert-shading.mjs';
import { getPhong } from '../../core/shaders/chunks/shading/phong-shading.mjs';
import { getPBR } from '../../core/shaders/chunks/shading/pbr-shading.mjs';
import { getIBL } from '../../core/shaders/chunks/shading/ibl-shading.mjs';
import { BufferElement } from '../../core/bindings/bufferElements/BufferElement.mjs';
import { getFullVertexOutput } from '../../core/shaders/chunks/vertex/get_vertex_output.mjs';

const buildShaders = (meshDescriptor, shaderParameters = {}) => {
  const baseColorTexture = meshDescriptor.textures.find((t) => t.texture === "baseColorTexture");
  const normalTexture = meshDescriptor.textures.find((t) => t.texture === "normalTexture");
  const emissiveTexture = meshDescriptor.textures.find((t) => t.texture === "emissiveTexture");
  const occlusionTexture = meshDescriptor.textures.find((t) => t.texture === "occlusionTexture");
  const metallicRoughnessTexture = meshDescriptor.textures.find((t) => t.texture === "metallicRoughnessTexture");
  const facultativeAttributes = meshDescriptor.attributes.filter((attribute) => attribute.name !== "position");
  const structAttributes = facultativeAttributes.map((attribute, index) => {
    return `
  @location(${index}) ${attribute.name}: ${attribute.type},`;
  }).join("");
  meshDescriptor.attributes.map((attribute) => {
    return (
      /* wgsl */
      `var ${attribute.name} = attributes.${attribute.name};`
    );
  }).join("\n	");
  facultativeAttributes.filter((attr) => attr.name !== "normal").map((attribute) => {
    return `vsOutput.${attribute.name} = ${attribute.name};`;
  }).join("\n	");
  const useInstancing = !!(meshDescriptor.parameters.storages && meshDescriptor.parameters.storages.instances);
  let vertexOutputContent = `
  @builtin(position) position: vec4f,
  ${structAttributes}
  @location(${facultativeAttributes.length}) viewDirection: vec3f,
  @location(${facultativeAttributes.length + 1}) worldPosition: vec3f,
  `;
  let outputNormalMap = "";
  const tangentAttribute = facultativeAttributes.find((attr) => attr.name === "tangent");
  const useNormalMap = !!(normalTexture && tangentAttribute);
  if (useNormalMap) {
    vertexOutputContent += `
  @location(${facultativeAttributes.length + 2}) bitangent: vec3f,
      `;
    outputNormalMap = `
  vsOutput.bitangent = cross(vsOutput.normal, vsOutput.tangent.xyz) * vsOutput.tangent.w;
      `;
  }
  let skinTransformations = "";
  const skinJoints = facultativeAttributes.filter((attr) => attr.name.includes("joints"));
  const skinWeights = facultativeAttributes.filter((attr) => attr.name.includes("weights"));
  const skinBindings = meshDescriptor.parameters.bindings ? meshDescriptor.parameters.bindings.filter((binding) => binding.name.includes("skin")) : [];
  const hasSkin = skinJoints.length && skinWeights.length && skinBindings.length;
  if (hasSkin) {
    skinTransformations = useInstancing ? `
      var instancesWorldPos = array<vec4f, ${meshDescriptor.parameters.geometry.instancesCount}>();
      var instancesNormal = array<vec3f, ${meshDescriptor.parameters.geometry.instancesCount}>();
      ` : "";
    skinTransformations += `
      let skinJoints: vec4f = ${skinJoints.map((skinJoint) => skinJoint.name).join(" + ")};`;
    skinTransformations += `
      var skinWeights: vec4f = ${skinWeights.map((skinWeight) => skinWeight.name).join(" + ")};
      
      let skinWeightsSum = dot(skinWeights, vec4(1.0));
      if(skinWeightsSum > 0.0) {
        skinWeights = skinWeights / skinWeightsSum;
      }
    `;
    skinBindings.forEach((binding, bindingIndex) => {
      skinTransformations += /* wgsl */
      `
      ${useInstancing ? "// instancing with different skins: joints calculations for skin " + bindingIndex + "\n" : ""}
      // position
      let skinMatrix_${bindingIndex}: mat4x4f = 
        skinWeights.x * ${binding.name}.joints[u32(skinJoints.x)].jointMatrix +
        skinWeights.y * ${binding.name}.joints[u32(skinJoints.y)].jointMatrix +
        skinWeights.z * ${binding.name}.joints[u32(skinJoints.z)].jointMatrix +
        skinWeights.w * ${binding.name}.joints[u32(skinJoints.w)].jointMatrix;
      
      ${useInstancing ? "instancesWorldPos[" + bindingIndex + "] = skinMatrix_" + bindingIndex + " * worldPos;" : "worldPos = skinMatrix_" + bindingIndex + " * worldPos;"}
      
      // normal
      let skinNormalMatrix_${bindingIndex}: mat4x4f = 
        skinWeights.x * ${binding.name}.joints[u32(skinJoints.x)].normalMatrix +
        skinWeights.y * ${binding.name}.joints[u32(skinJoints.y)].normalMatrix +
        skinWeights.z * ${binding.name}.joints[u32(skinJoints.z)].normalMatrix +
        skinWeights.w * ${binding.name}.joints[u32(skinJoints.w)].normalMatrix;
        
      let skinNormalMatrix_${bindingIndex}_3: mat3x3f = mat3x3f(
        vec3(skinNormalMatrix_${bindingIndex}[0].xyz),
        vec3(skinNormalMatrix_${bindingIndex}[1].xyz),
        vec3(skinNormalMatrix_${bindingIndex}[2].xyz)
      );
      
      ${useInstancing ? "instancesNormal[" + bindingIndex + "] = skinNormalMatrix_" + bindingIndex + "_3 * normal;" : "normal = skinNormalMatrix_" + bindingIndex + "_3 * normal;"}
      `;
    });
    skinTransformations += `
      normal = normalize(${useInstancing ? "instancesNormal[attributes.instanceIndex]" : "normal"});
    `;
  }
  let morphTargets = "";
  const morphTargetsBindings = meshDescriptor.parameters.bindings ? meshDescriptor.parameters.bindings.filter((binding) => binding.name.includes("morphTarget")) : [];
  morphTargetsBindings.forEach((binding) => {
    Object.values(binding.inputs).filter((input) => input.name !== "weight").forEach((input) => {
      const bindingType = BufferElement.getType(input.type);
      const attributeType = meshDescriptor.attributes.find((attribute) => attribute.name === input.name).type;
      if (bindingType === attributeType) {
        morphTargets += `${input.name} += ${binding.name}.weight * ${binding.name}.elements[attributes.vertexIndex].${input.name};
	`;
      } else {
        if (bindingType === "vec3f" && attributeType === "vec4f") {
          morphTargets += `${input.name} += ${binding.name}.weight * vec4(${binding.name}.elements[attributes.vertexIndex].${input.name}, 0.0);
	`;
        }
      }
    });
  });
  const fullVertexOutput = getFullVertexOutput({
    bindings: meshDescriptor.parameters.bindings,
    geometry: meshDescriptor.parameters.geometry
  });
  const vertexOutput = (
    /*wgsl */
    `
struct VSOutput {
  ${vertexOutputContent}
};`
  );
  const fragmentInput = (
    /*wgsl */
    `
struct VSOutput {
  @builtin(front_facing) frontFacing: bool,
  ${vertexOutputContent}
};`
  );
  const vs = (
    /* wgsl */
    `
${vertexOutput}

@vertex fn main(
  attributes: Attributes,
) -> VSOutput {
  var vsOutput: VSOutput;
    
  ${fullVertexOutput}
  
  ${outputNormalMap}

  return vsOutput;
}
  `
  );
  const initColor = (
    /* wgsl */
    "var color: vec4f = vec4();"
  );
  const returnColor = (
    /* wgsl */
    `
      return color;
  `
  );
  const vertexColor = meshDescriptor.attributes.find((attr) => attr.name === "color0");
  let baseColor = (
    /* wgsl */
    !!vertexColor ? vertexColor.type === "vec3f" ? "var baseColor: vec4f = vec4(fsInput.color0, 1.0) * material.baseColorFactor;" : "var baseColor: vec4f = fsInput.color0 * material.baseColorFactor;" : "var baseColor: vec4f = material.baseColorFactor;"
  );
  if (baseColorTexture) {
    baseColor = /* wgsl */
    `
      var baseColor: vec4f = textureSample(baseColorTexture, ${baseColorTexture.sampler}, fsInput.${baseColorTexture.texCoordAttributeName}) * material.baseColorFactor;
      
      if (baseColor.a < material.alphaCutoff) {
        discard;
      }
    `;
  }
  baseColor += /* wgsl */
  `
      color = baseColor;
  `;
  let normalMap = (
    /* wgsl */
    `
      let faceDirection = select(-1.0, 1.0, fsInput.frontFacing);
      let geometryNormal: vec3f = faceDirection * normal;
    `
  );
  if (useNormalMap) {
    normalMap += /* wgsl */
    `
      let tbn = mat3x3f(normalize(fsInput.tangent.xyz), normalize(fsInput.bitangent), geometryNormal);
      let normalMap = textureSample(normalTexture, ${normalTexture.sampler}, fsInput.${normalTexture.texCoordAttributeName}).rgb;
      normal = normalize(tbn * (2.0 * normalMap - vec3(material.normalMapScale, material.normalMapScale, 1.0)));
    `;
  } else if (normalTexture) {
    normalMap += /* wgsl */
    `
      let Q1: vec3f = dpdx(worldPosition);
      let Q2: vec3f = dpdy(worldPosition);
      let st1: vec2f = dpdx(fsInput.${normalTexture.texCoordAttributeName});
      let st2: vec2f = dpdy(fsInput.${normalTexture.texCoordAttributeName});
      
      let T: vec3f = normalize(Q1 * st2.y - Q2 * st1.y);
      let B: vec3f = normalize(-Q1 * st2.x + Q2 * st1.x);
      
      let tbn = mat3x3f(T, B, geometryNormal);
      let normalMap = textureSample(normalTexture, ${normalTexture.sampler}, fsInput.${normalTexture.texCoordAttributeName}).rgb;
      normal = normalize(tbn * (2.0 * normalMap - vec3(material.normalMapScale, material.normalMapScale, 1.0)));
    `;
  } else {
    normalMap += /* wgsl */
    `
      normal = geometryNormal;
    `;
  }
  let metallicRoughness = (
    /*  wgsl */
    `
      var metallic = material.metallicFactor;
      var roughness = material.roughnessFactor;
  `
  );
  if (metallicRoughnessTexture) {
    metallicRoughness += /* wgsl */
    `
      let metallicRoughness = textureSample(metallicRoughnessTexture, ${metallicRoughnessTexture.sampler}, fsInput.${metallicRoughnessTexture.texCoordAttributeName});
      
      metallic = clamp(metallic * metallicRoughness.b, 0.0, 1.0);
      roughness = clamp(roughness * metallicRoughness.g, 0.0, 1.0);
    `;
  }
  const f0 = (
    /* wgsl */
    `
      let f0: vec3f = mix(vec3(0.04), color.rgb, vec3(metallic));
  `
  );
  let emissiveOcclusion = (
    /* wgsl */
    `
      var emissive: vec3f = vec3(0.0);
      var occlusion: f32 = 1.0;
  `
  );
  if (emissiveTexture) {
    emissiveOcclusion += /* wgsl */
    `
      emissive = textureSample(emissiveTexture, ${emissiveTexture.sampler}, fsInput.${emissiveTexture.texCoordAttributeName}).rgb;
      
      emissive *= material.emissiveFactor;
      `;
    if (occlusionTexture) {
      emissiveOcclusion += /* wgsl */
      `
      occlusion = textureSample(occlusionTexture, ${occlusionTexture.sampler}, fsInput.${occlusionTexture.texCoordAttributeName}).r;
      `;
    }
  }
  emissiveOcclusion += /* wgsl */
  `
      occlusion = 1.0 + material.occlusionStrength * (occlusion - 1.0);
  `;
  let { shadingModel } = shaderParameters;
  if (!shadingModel) {
    shadingModel = "PBR";
  }
  let { chunks } = shaderParameters || {};
  const { iblParameters } = shaderParameters || {};
  const { environmentMap } = iblParameters || {};
  if (environmentMap && shadingModel === "IBL") {
    meshDescriptor.parameters.uniforms = {
      ...meshDescriptor.parameters.uniforms,
      ...{
        ibl: {
          struct: {
            envRotation: {
              type: "mat3x3f",
              value: environmentMap.rotation
            },
            diffuseStrength: {
              type: "f32",
              value: iblParameters?.diffuseStrength ?? 0.5
            },
            specularStrength: {
              type: "f32",
              value: iblParameters?.specularStrength ?? 0.5
            }
          }
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
  } else if (shadingModel === "IBL") {
    throwWarning("IBL shading requested but the environment map missing. Defaulting to PBR shading.");
    shadingModel = "PBR";
  }
  const shadingOptions = {
    toneMapping: "khronos",
    receiveShadows: !!meshDescriptor.parameters.receiveShadows,
    useOcclusion: true
  };
  const defaultAdditionalHead = (() => {
    switch (shadingModel) {
      case "Lambert":
      default:
        return getLambert(shadingOptions);
      case "Phong":
        return getPhong(shadingOptions);
      case "PBR":
        return getPBR(shadingOptions);
      case "IBL":
        return getIBL(shadingOptions);
    }
  })();
  const defaultPreliminaryColor = "";
  const defaultAdditionalColor = "";
  if (!chunks) {
    chunks = {
      additionalFragmentHead: defaultAdditionalHead,
      preliminaryColorContribution: defaultPreliminaryColor,
      additionalColorContribution: defaultAdditionalColor
    };
  } else {
    if (!chunks.additionalFragmentHead) {
      chunks.additionalFragmentHead = defaultAdditionalHead;
    } else {
      chunks.additionalFragmentHead = defaultAdditionalHead + chunks.additionalFragmentHead;
    }
    if (!chunks.preliminaryColorContribution) {
      chunks.preliminaryColorContribution = defaultPreliminaryColor;
    } else {
      chunks.preliminaryColorContribution = defaultPreliminaryColor + chunks.preliminaryColorContribution;
    }
    if (!chunks.additionalColorContribution) {
      chunks.additionalColorContribution = defaultAdditionalColor;
    } else {
      chunks.additionalColorContribution = defaultAdditionalColor + chunks.additionalColorContribution;
    }
  }
  const applyLightShading = (() => {
    switch (shadingModel) {
      case "Lambert":
      default:
        return (
          /* wgsl */
          `
      color = vec4(
        getLambert(
          normal,
          worldPosition,
          color.rgb,
          occlusion
        ),
        color.a
      );`
        );
      case "Phong":
        return (
          /* wgsl */
          `
      color = vec4(
        getPhong(
          normal,
          worldPosition,
          color.rgb,
          viewDirection,
          f0, // specular color
          metallic * (1.0 - roughness) + (1.0 - metallic) * 0.04, // specular strength
          (1.0 - roughness) * 30.0, // TODO shininess
          occlusion
        ),
        color.a
      );`
        );
      case "PBR":
        return (
          /* wgsl */
          `
      color = vec4(
        getPBR(
          normal,
          worldPosition,
          color.rgb,
          viewDirection,
          f0,
          metallic,
          roughness,
          occlusion
        ),
        color.a
      );`
        );
      case "IBL":
        return (
          /* wgsl */
          `
      color = vec4(
        getIBL(
          normal,
          worldPosition,
          color.rgb,
          viewDirection,
          f0,
          metallic,
          roughness,
          ${environmentMap.sampler.name},
          ${environmentMap.lutTexture.options.name},
          ${environmentMap.specularTexture.options.name},
          ${environmentMap.diffuseTexture.options.name},
          occlusion
        ),
        color.a
      );`
        );
    }
  })();
  const applyEmissive = (
    /* wgsl */
    `
    color = vec4(color.rgb + emissive, color.a);
  `
  );
  const fs = (
    /* wgsl */
    `  
    ${chunks.additionalFragmentHead}
  
    ${fragmentInput}
  
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {       
      ${initColor}
      ${baseColor}
      
      let worldPosition: vec3f = fsInput.worldPosition;
      let viewDirection: vec3f = fsInput.viewDirection;
      var normal: vec3f = normalize(fsInput.normal);
      
      ${normalMap}
      ${metallicRoughness}  
      
      // user defined preliminary color contribution
      ${chunks.preliminaryColorContribution}
        
      ${f0}
      ${emissiveOcclusion}
      
      ${applyLightShading}
      ${applyEmissive}
      
      // user defined additional color contribution
      ${chunks.additionalColorContribution}
      
      ${returnColor}
    }
  `
  );
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
