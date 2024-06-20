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
    
    fn getIBLContribution(NdotV: f32, roughness: f32, n: vec3f, reflection: vec3f, diffuseColor: vec3f, f0: vec3f) -> IBLContribution {
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
        ${envDiffuseTexture.texture.options.viewDimension === "cube" ? "n" : "cartesianToPolar(n)"}
      );
            
      FssEss = ibl.specularStrength * k_S * brdf.x + brdf.y;
      
      let Ems: f32 = (1.0 - (brdf.x + brdf.y));
      let F_avg: vec3f = ibl.specularStrength * (f0 + (1.0 - f0) / 21.0);
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

export { buildIBLShaders, buildPBRShaders, buildShaders };
