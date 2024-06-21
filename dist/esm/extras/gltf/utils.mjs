import { Texture } from '../../core/textures/Texture.mjs';
import { Sampler } from '../../core/samplers/Sampler.mjs';
import { ComputePass } from '../../core/computePasses/ComputePass.mjs';
import { throwWarning } from '../../utils/utils.mjs';

const buildShaders = (meshDescriptor, shaderParameters = null) => {
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
      return vec4(
        linearTosRGB(
          toneMapKhronosPbrNeutral(
            color.rgb
          )
        ),
        color.a
      );
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
  normalMap += /* wgsl */
  `
      let worldPosition: vec3f = fsInput.worldPosition;
      let viewDirection: vec3f = fsInput.viewDirection;
      let N: vec3f = normal;
      let V: vec3f = normalize(viewDirection);
      let NdotV: f32 = clamp(dot(N, V), 0.0, 1.0);
  `;
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
  const initLightShading = (
    /* wgsl */
    `
      var lightContribution: LightContribution;
      
      lightContribution.ambient = vec3(1.0);
      lightContribution.diffuse = vec3(0.0);
      lightContribution.specular = vec3(0.0);
  `
  );
  const defaultAdditionalHead = "";
  const defaultPreliminaryColor = "";
  const defaultAdditionalColor = "";
  const defaultAmbientContribution = "";
  const defaultLightContribution = "";
  shaderParameters = shaderParameters ?? {};
  let chunks = shaderParameters.chunks;
  if (!chunks) {
    chunks = {
      additionalFragmentHead: defaultAdditionalHead,
      ambientContribution: defaultAmbientContribution,
      preliminaryColorContribution: defaultPreliminaryColor,
      lightContribution: defaultLightContribution,
      additionalColorContribution: defaultAdditionalColor
    };
  } else {
    if (!chunks.additionalFragmentHead)
      chunks.additionalFragmentHead = defaultAdditionalHead;
    if (!chunks.preliminaryColorContribution)
      chunks.preliminaryColorContribution = defaultPreliminaryColor;
    if (!chunks.ambientContribution)
      chunks.ambientContribution = defaultAmbientContribution;
    if (!chunks.lightContribution)
      chunks.lightContribution = defaultLightContribution;
    if (!chunks.additionalColorContribution)
      chunks.additionalColorContribution = defaultAdditionalColor;
  }
  const applyLightShading = (
    /* wgsl */
    `      
      lightContribution.ambient *= color.rgb * occlusion;
      lightContribution.diffuse *= occlusion;
      lightContribution.specular *= occlusion;
      
      color = vec4(
        lightContribution.ambient + lightContribution.diffuse + lightContribution.specular + emissive,
        color.a
      );
  `
  );
  const fs = (
    /* wgsl */
    `
    // Light
    struct LightContribution {
      ambient: vec3f,
      diffuse: vec3f,
      specular: vec3f,
    };
  
    // PBR
    const PI = ${Math.PI};
    
    // tone maping
    fn toneMapKhronosPbrNeutral( color: vec3f ) -> vec3f {
      var toneMapColor = color; 
      const startCompression: f32 = 0.8 - 0.04;
      const desaturation: f32 = 0.15;
      var x: f32 = min(toneMapColor.r, min(toneMapColor.g, toneMapColor.b));
      var offset: f32 = select(0.04, x - 6.25 * x * x, x < 0.08);
      toneMapColor = toneMapColor - offset;
      var peak: f32 = max(toneMapColor.r, max(toneMapColor.g, toneMapColor.b));
      if (peak < startCompression) {
        return toneMapColor;
      }
      const d: f32 = 1. - startCompression;
      let newPeak: f32 = 1. - d * d / (peak + d - startCompression);
      toneMapColor *= newPeak / peak;
      let g: f32 = 1. - 1. / (desaturation * (peak - newPeak) + 1.);
      return mix(toneMapColor, newPeak * vec3(1, 1, 1), g);
    }
    
  
    // linear <-> sRGB conversions
    fn linearTosRGB(linear: vec3f) -> vec3f {
      if (all(linear <= vec3(0.0031308))) {
        return linear * 12.92;
      }
      return (pow(abs(linear), vec3(1.0/2.4)) * 1.055) - vec3(0.055);
    }
  
    fn sRGBToLinear(srgb: vec3f) -> vec3f {
      if (all(srgb <= vec3(0.04045))) {
        return srgb / vec3(12.92);
      }
      return pow((srgb + vec3(0.055)) / vec3(1.055), vec3(2.4));
    }
    
    ${chunks.additionalFragmentHead}
  
    ${fragmentInput}
  
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {       
      ${initColor}
      ${baseColor}

      ${normalMap}
      ${metallicRoughness}  
      ${initLightShading}  
      
      // user defined preliminary color contribution
      ${chunks.preliminaryColorContribution}
        
      ${f0}
      ${emissiveOcclusion}
      
      // user defined lightning
      ${chunks.ambientContribution}
      ${chunks.lightContribution}
      
      ${applyLightShading}
      
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
const buildPBRShaders = (meshDescriptor, shaderParameters = null) => {
  let chunks = shaderParameters?.chunks;
  const pbrAdditionalFragmentHead = (
    /* wgsl */
    `
    fn FresnelSchlick(cosTheta: f32, F0: vec3f) -> vec3f {
      return F0 + (vec3(1.0) - F0) * pow(1.0 - cosTheta, 5.0);
    }
    
    fn DistributionGGX(NdotH: f32, roughness: f32) -> f32 {
      let a      = roughness*roughness;
      let a2     = a*a;
      let NdotH2 = NdotH*NdotH;
    
      let num    = a2;
      let denom  = (NdotH2 * (a2 - 1.0) + 1.0);
    
      return num / (PI * denom * denom);
    }
    
    fn GeometrySchlickGGX(NdotV : f32, roughness : f32) -> f32 {
      let r = (roughness + 1.0);
      let k = (r*r) / 8.0;
    
      let num   = NdotV;
      let denom = NdotV * (1.0 - k) + k;
    
      return num / denom;
    }
    
    fn GeometrySmith(NdotL: f32, NdotV: f32, roughness : f32) -> f32 {
      let ggx2  = GeometrySchlickGGX(NdotV, roughness);
      let ggx1  = GeometrySchlickGGX(NdotL, roughness);
    
      return ggx1 * ggx2;
    }
  `
  );
  if (!chunks) {
    chunks = {
      additionalFragmentHead: pbrAdditionalFragmentHead
    };
  } else {
    if (!chunks.additionalFragmentHead) {
      chunks.additionalFragmentHead = pbrAdditionalFragmentHead;
    } else {
      chunks.additionalFragmentHead += pbrAdditionalFragmentHead;
    }
  }
  return buildShaders(meshDescriptor, shaderParameters);
};
const buildIBLShaders = (meshDescriptor, shaderParameters = null) => {
  shaderParameters = shaderParameters || {};
  const iblParameters = shaderParameters?.iblParameters;
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
  const { lutTexture, envDiffuseTexture, envSpecularTexture } = iblParameters || {};
  const useIBLContribution = envDiffuseTexture && envDiffuseTexture.texture && envSpecularTexture && envSpecularTexture.texture && lutTexture && lutTexture.texture;
  let iblContributionHead = "";
  let iblLightContribution = "";
  if (useIBLContribution) {
    meshDescriptor.parameters.textures = [
      ...meshDescriptor.parameters.textures,
      lutTexture.texture,
      envDiffuseTexture.texture,
      envSpecularTexture.texture
    ];
    lutTexture.samplerName = lutTexture.samplerName || "defaultSampler";
    envDiffuseTexture.samplerName = envDiffuseTexture.samplerName || "defaultSampler";
    envSpecularTexture.samplerName = envSpecularTexture.samplerName || "defaultSampler";
    iblContributionHead = /* wgsl */
    `  
    const RECIPROCAL_PI = ${1 / Math.PI};
    const RECIPROCAL_PI2 = ${0.5 / Math.PI};
    
    fn cartesianToPolar(n: vec3f) -> vec2f {
      var uv: vec2f;
      uv.x = atan2(n.z, n.x) * RECIPROCAL_PI2 + 0.5;
      uv.y = asin(n.y) * RECIPROCAL_PI + 0.5;
      return uv;
    }
    
    struct IBLContribution {
      diffuse: vec3f,
      specular: vec3f,
    };
    
    fn getIBLContribution(NdotV: f32, roughness: f32, normal: vec3f, reflection: vec3f, diffuseColor: vec3f, f0: vec3f) -> IBLContribution {
      var iblContribution: IBLContribution;
    
      let brdfSamplePoint: vec2f = clamp(vec2(NdotV, roughness), vec2(0.0), vec2(1.0));
      
      let brdf: vec3f = textureSample(
        ${lutTexture.texture.options.name},
        ${lutTexture.samplerName},
        brdfSamplePoint
      ).rgb;
    
      let Fr: vec3f = max(vec3(1.0 - roughness), f0) - f0;
      let k_S: vec3f = f0 + Fr * pow(1.0 - NdotV, 5.0);
      var FssEss: vec3f = k_S * brdf.x + brdf.y;
      
      // IBL specular
      let lod: f32 = roughness * f32(textureNumLevels(${envSpecularTexture.texture.options.name}) - 1);
      
      let specularLight: vec4f = textureSampleLevel(
        ${envSpecularTexture.texture.options.name},
        ${envSpecularTexture.samplerName},
        ${envSpecularTexture.texture.options.viewDimension === "cube" ? "reflection" : "cartesianToPolar(reflection)"},
        lod
      );
      
      iblContribution.specular = specularLight.rgb * FssEss * ibl.specularStrength;
      
      // IBL diffuse
      let diffuseLight: vec4f = textureSample(
        ${envDiffuseTexture.texture.options.name},
        ${envDiffuseTexture.samplerName},
        ${envDiffuseTexture.texture.options.viewDimension === "cube" ? "normal" : "cartesianToPolar(normal)"}
      );
      
      // product of specularFactor and specularTexture.a
      let specularWeight: f32 = 1.0;
            
      FssEss = specularWeight * k_S * brdf.x + brdf.y;
      
      let Ems: f32 = (1.0 - (brdf.x + brdf.y));
      let F_avg: vec3f = specularWeight * (f0 + (1.0 - f0) / 21.0);
      let FmsEms: vec3f = Ems * FssEss * F_avg / (1.0 - F_avg * Ems);
      let k_D: vec3f = diffuseColor * (1.0 - FssEss + FmsEms);
      
      iblContribution.diffuse = (FmsEms + k_D) * diffuseLight.rgb * ibl.diffuseStrength;
      
      return iblContribution;
    }
    `;
    iblLightContribution = /* wgsl */
    `
      let reflection: vec3f = normalize(reflect(-V, N));
      
      let iblDiffuseColor: vec3f = mix(color.rgb, vec3(0.0), vec3(metallic));
    
      let iblContribution = getIBLContribution(NdotV, roughness, N, reflection, iblDiffuseColor, f0);
      
      lightContribution.diffuse += iblContribution.diffuse;
      lightContribution.specular += iblContribution.specular;
    `;
  }
  let chunks = shaderParameters?.chunks;
  if (!chunks) {
    chunks = {
      additionalFragmentHead: iblContributionHead,
      lightContribution: iblLightContribution
    };
  } else {
    if (!chunks.additionalFragmentHead) {
      chunks.additionalFragmentHead = iblContributionHead;
    } else {
      chunks.additionalFragmentHead += iblContributionHead;
    }
    if (!chunks.lightContribution) {
      chunks.lightContribution = iblLightContribution;
    } else {
      chunks.lightContribution = iblLightContribution + chunks.lightContribution;
    }
    if (!chunks.ambientContribution && useIBLContribution) {
      chunks.ambientContribution = "lightContribution.ambient = vec3(0.0);";
    }
  }
  shaderParameters.chunks = chunks;
  return buildPBRShaders(meshDescriptor, shaderParameters);
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

export { buildIBLShaders, buildPBRShaders, buildShaders, computeDiffuseFromSpecular };
