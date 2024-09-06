import { Texture } from '../../core/textures/Texture.mjs';
import { Sampler } from '../../core/samplers/Sampler.mjs';
import { ComputePass } from '../../core/computePasses/ComputePass.mjs';
import { throwWarning } from '../../utils/utils.mjs';
import { getLambert } from '../../core/shaders/chunks/shading/lambert-shading.mjs';
import { getPhong } from '../../core/shaders/chunks/shading/phong-shading.mjs';
import { getPBR } from '../../core/shaders/chunks/shading/pbr-shading.mjs';
import { getIBL } from '../../core/shaders/chunks/shading/ibl-shading.mjs';

const buildShaders = (meshDescriptor, shaderParameters = {}) => {
  const baseColorTexture = meshDescriptor.textures.find((t) => t.texture === "baseColorTexture");
  const normalTexture = meshDescriptor.textures.find((t) => t.texture === "normalTexture");
  const emissiveTexture = meshDescriptor.textures.find((t) => t.texture === "emissiveTexture");
  const occlusionTexture = meshDescriptor.textures.find((t) => t.texture === "occlusionTexture");
  const metallicRoughnessTexture = meshDescriptor.textures.find((t) => t.texture === "metallicRoughnessTexture");
  const facultativeAttributes = meshDescriptor.attributes.filter((attribute) => attribute.name !== "position");
  const structAttributes = facultativeAttributes.map((attribute, index) => {
    return `@location(${index}) ${attribute.name}: ${attribute.type},`;
  }).join("\n	");
  let outputPositions = (
    /* wgsl */
    `
    let worldPos = matrices.model * vec4(attributes.position, 1.0);
    vsOutput.position = camera.projection * camera.view * worldPos;
    vsOutput.worldPosition = worldPos.xyz / worldPos.w;
    vsOutput.viewDirection = camera.position - vsOutput.worldPosition.xyz;
  `
  );
  let outputNormal = facultativeAttributes.find((attr) => attr.name === "normal") ? "vsOutput.normal = getWorldNormal(attributes.normal);" : "";
  if (meshDescriptor.parameters.storages && meshDescriptor.parameters.storages.instances) {
    outputPositions = /* wgsl */
    `
      let worldPos: vec4f = instances[attributes.instanceIndex].modelMatrix * vec4f(attributes.position, 1.0);
      vsOutput.position = camera.projection * camera.view * worldPos;
      vsOutput.worldPosition = worldPos.xyz;
      vsOutput.viewDirection = camera.position - vsOutput.worldPosition;
      `;
    outputNormal = `vsOutput.normal = normalize((instances[attributes.instanceIndex].normalMatrix * vec4(attributes.normal, 0.0)).xyz);`;
  }
  const outputAttributes = facultativeAttributes.filter((attr) => attr.name !== "normal").map((attribute) => {
    return `vsOutput.${attribute.name} = attributes.${attribute.name};`;
  }).join("\n	");
  let vertexOutputContent = `
      @builtin(position) position: vec4f,
      @location(${facultativeAttributes.length}) viewDirection: vec3f,
      @location(${facultativeAttributes.length + 1}) worldPosition: vec3f,
      ${structAttributes}
  `;
  let outputNormalMap = "";
  const tangentAttribute = facultativeAttributes.find((attr) => attr.name === "tangent");
  const useNormalMap = !!(normalTexture && tangentAttribute);
  if (useNormalMap) {
    vertexOutputContent += `
      @location(${facultativeAttributes.length + 2}) bitangent: vec3f,
      `;
    outputNormalMap = `
        vsOutput.tangent = normalize(matrices.model * attributes.tangent);
        vsOutput.bitangent = cross(vsOutput.normal, vsOutput.tangent.xyz) * attributes.tangent.w;
      `;
  }
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
    
      ${outputPositions}
      ${outputNormal}
      ${outputAttributes}
      
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
  let normalMap = meshDescriptor.attributes.find((attribute) => attribute.name === "normal") ? (
    /* wgsl */
    `
      let faceDirection = select(-1.0, 1.0, fsInput.frontFacing);
      let geometryNormal: vec3f = normalize(faceDirection * fsInput.normal);
    `
  ) : (
    /* wgsl */
    `let geometryNormal: vec3f = normalize(vec3(0.0, 0.0, 1.0));`
  );
  if (useNormalMap) {
    normalMap += /* wgsl */
    `
      let tbn = mat3x3<f32>(normalize(fsInput.tangent.xyz), normalize(fsInput.bitangent), geometryNormal);
      let normalMap = textureSample(normalTexture, ${normalTexture.sampler}, fsInput.${normalTexture.texCoordAttributeName}).rgb;
      let normal = normalize(tbn * (2.0 * normalMap - vec3(material.normalMapScale, material.normalMapScale, 1.0)));
    `;
  } else {
    normalMap += /* wgsl */
    `
      let normal = geometryNormal;
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
  const { lutTexture, envDiffuseTexture, envSpecularTexture } = iblParameters || {};
  const useIBLContribution = envDiffuseTexture && envDiffuseTexture.texture && envSpecularTexture && envSpecularTexture.texture && lutTexture && lutTexture.texture;
  if (useIBLContribution && shadingModel === "IBL") {
    meshDescriptor.parameters.uniforms = {
      ...meshDescriptor.parameters.uniforms,
      ...{
        ibl: {
          struct: {
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
      lutTexture.texture,
      envDiffuseTexture.texture,
      envSpecularTexture.texture
    ];
    lutTexture.samplerName = lutTexture.samplerName || "defaultSampler";
    envDiffuseTexture.samplerName = envDiffuseTexture.samplerName || "defaultSampler";
    envSpecularTexture.samplerName = envSpecularTexture.samplerName || "defaultSampler";
  } else if (shadingModel === "IBL") {
    throwWarning(
      "IBL shading requested but one of the LUT, environment specular or diffuse texture is missing. Defaulting to PBR shading."
    );
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
    if (!chunks.additionalFragmentHead)
      chunks.additionalFragmentHead = defaultAdditionalHead;
    if (!chunks.preliminaryColorContribution)
      chunks.preliminaryColorContribution = defaultPreliminaryColor;
    if (!chunks.additionalColorContribution)
      chunks.additionalColorContribution = defaultAdditionalColor;
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
          ${lutTexture.texture.options.name},
          ${lutTexture.samplerName},
          ${envSpecularTexture.texture.options.name},
          ${envSpecularTexture.samplerName},
          ${envDiffuseTexture.texture.options.name},
          ${envDiffuseTexture.samplerName},
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
const computeDiffuseFromSpecular = async (renderer, diffuseTexture, specularTexture) => {
  if (specularTexture.options.viewDimension !== "cube") {
    throwWarning(
      "Could not compute the diffuse texture because the specular texture is not a cube map:" + specularTexture.options.viewDimension
    );
    return;
  }
  const computeDiffuseShader = `    
    fn radicalInverse_VdC(inputBits: u32) -> f32 {
        var bits: u32 = inputBits;
        bits = (bits << 16u) | (bits >> 16u);
        bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
        bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
        bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
        bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
        return f32(bits) * 2.3283064365386963e-10; // / 0x100000000
    }
    
    // hammersley2d describes a sequence of points in the 2d unit square [0,1)^2
    // that can be used for quasi Monte Carlo integration
    fn hammersley2d(i: u32, N: u32) -> vec2f {
        return vec2(f32(i) / f32(N), radicalInverse_VdC(i));
    }
    
    // TBN generates a tangent bitangent normal coordinate frame from the normal
    // (the normal must be normalized)
    fn generateTBN(normal: vec3f) -> mat3x3f {
      var bitangent: vec3f = vec3(0.0, 1.0, 0.0);
  
      let NdotUp: f32 = dot(normal, vec3(0.0, 1.0, 0.0));
      let epsilon: f32 = 0.0000001;
      
      if (1.0 - abs(NdotUp) <= epsilon) {
        // Sampling +Y or -Y, so we need a more robust bitangent.
        if (NdotUp > 0.0) {
          bitangent = vec3(0.0, 0.0, 1.0);
        }
        else {
          bitangent = vec3(0.0, 0.0, -1.0);
        }
      }
  
      let tangent: vec3f = normalize(cross(bitangent, normal));
      bitangent = cross(normal, tangent);
  
      return mat3x3f(tangent, bitangent, normal);
    }
    
    // Mipmap Filtered Samples (GPU Gems 3, 20.4)
    // https://developer.nvidia.com/gpugems/gpugems3/part-iii-rendering/chapter-20-gpu-based-importance-sampling
    // https://cgg.mff.cuni.cz/~jaroslav/papers/2007-sketch-fis/Final_sap_0073.pdf
    fn computeLod(pdf: f32) -> f32 {
      // https://cgg.mff.cuni.cz/~jaroslav/papers/2007-sketch-fis/Final_sap_0073.pdf
      return 0.5 * log2( 6.0 * f32(params.faceSize) * f32(params.faceSize) / (f32(params.sampleCount) * pdf));
    }
    
    fn transformDirection(face: u32, uv: vec2f) -> vec3f {
      // Transform the direction based on the cubemap face
      switch (face) {
        case 0u {
          // +X
          return vec3f( 1.0,  uv.y, -uv.x);
        }
        case 1u {
          // -X
          return vec3f(-1.0,  uv.y,  uv.x);
        }
        case 2u {
          // +Y
          return vec3f( uv.x,  -1.0, uv.y);
        }
        case 3u {
          // -Y
          return vec3f( uv.x, 1.0,  -uv.y);
        }
        case 4u {
          // +Z
          return vec3f( uv.x,  uv.y,  1.0);
        }
        case 5u {
          // -Z
          return vec3f(-uv.x,  uv.y, -1.0);
        }
        default {
          return vec3f(0.0, 0.0, 0.0);
        }
      }
    }
    
    const PI = ${Math.PI};

    @compute @workgroup_size(8, 8, 1) fn main(
      @builtin(global_invocation_id) GlobalInvocationID: vec3u,
    ) {
      let faceSize: u32 = params.faceSize;
      let sampleCount: u32 = params.sampleCount;
      
      let face: u32 = GlobalInvocationID.z;
      let x: u32 = GlobalInvocationID.x;
      let y: u32 = GlobalInvocationID.y;
  
      if (x >= faceSize || y >= faceSize) {
          return;
      }
  
      let texelSize: f32 = 1.0 / f32(faceSize);
      let halfTexel: f32 = texelSize * 0.5;
      
      var uv: vec2f = vec2(
        (f32(x) + halfTexel) * texelSize,
        (f32(y) + halfTexel) * texelSize
      );
      
      uv = uv * 2.0 - 1.0;
  
      let normal: vec3<f32> = transformDirection(face, uv);
      
      var irradiance: vec3f = vec3f(0.0, 0.0, 0.0);
  
      for (var i: u32 = 0; i < sampleCount; i++) {
        // generate a quasi monte carlo point in the unit square [0.1)^2
        let xi: vec2f = hammersley2d(i, sampleCount);
        
        let cosTheta: f32 = sqrt(1.0 - xi.y);
        let sinTheta: f32 = sqrt(1.0 - cosTheta * cosTheta);
        let phi: f32 = 2.0 * PI * xi.x;
        let pdf: f32 = cosTheta / PI; // evaluation for solid angle, therefore drop the sinTheta

        let sampleVec: vec3f = vec3f(
            sinTheta * cos(phi),
            sinTheta * sin(phi),
            cosTheta
        );
        
        let TBN: mat3x3f = generateTBN(normalize(normal));
        
        var direction: vec3f = TBN * sampleVec;
        
        // invert along Y axis
        direction.y *= -1.0;
        
        let lod: f32 = computeLod(pdf);

        // Convert sampleVec to texture coordinates of the specular env map
        irradiance += textureSampleLevel(
          envSpecularTexture,
          specularSampler,
          direction,
          min(lod, f32(params.maxMipLevel))
        ).rgb;
      }
  
      irradiance /= f32(sampleCount);

      textureStore(diffuseEnvMap, vec2(x, y), face, vec4f(irradiance, 1.0));
    }
  `;
  let diffuseStorageTexture = new Texture(renderer, {
    label: "Diffuse storage cubemap",
    name: "diffuseEnvMap",
    format: "rgba32float",
    visibility: ["compute"],
    usage: ["copySrc", "storageBinding"],
    type: "storage",
    fixedSize: {
      width: specularTexture.size.width,
      height: specularTexture.size.height,
      depth: 6
    },
    viewDimension: "2d-array"
  });
  const sampler = new Sampler(renderer, {
    label: "Compute diffuse sampler",
    name: "specularSampler",
    addressModeU: "clamp-to-edge",
    addressModeV: "clamp-to-edge",
    minFilter: "linear",
    magFilter: "linear"
  });
  let computeDiffusePass = new ComputePass(renderer, {
    autoRender: false,
    // we're going to render only on demand
    dispatchSize: [Math.ceil(specularTexture.size.width / 8), Math.ceil(specularTexture.size.height / 8), 6],
    shaders: {
      compute: {
        code: computeDiffuseShader
      }
    },
    uniforms: {
      params: {
        struct: {
          faceSize: {
            type: "u32",
            value: specularTexture.size.width
          },
          maxMipLevel: {
            type: "u32",
            value: specularTexture.texture.mipLevelCount
          },
          sampleCount: {
            type: "u32",
            value: 2048
          }
        }
      }
    },
    samplers: [sampler],
    textures: [specularTexture, diffuseStorageTexture]
  });
  await computeDiffusePass.material.compileMaterial();
  renderer.onBeforeRenderScene.add(
    (commandEncoder) => {
      renderer.renderSingleComputePass(commandEncoder, computeDiffusePass);
      commandEncoder.copyTextureToTexture(
        {
          texture: diffuseStorageTexture.texture
        },
        {
          texture: diffuseTexture.texture
        },
        [diffuseTexture.texture.width, diffuseTexture.texture.height, diffuseTexture.texture.depthOrArrayLayers]
      );
    },
    { once: true }
  );
  renderer.onAfterCommandEncoderSubmission.add(
    () => {
      computeDiffusePass.destroy();
      diffuseStorageTexture.destroy();
      diffuseStorageTexture = null;
      computeDiffusePass = null;
    },
    { once: true }
  );
};

export { buildShaders, computeDiffuseFromSpecular };
