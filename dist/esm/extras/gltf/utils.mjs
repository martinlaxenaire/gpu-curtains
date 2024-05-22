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
    vsOutput.worldPosition = worldPos.xyz;
    vsOutput.viewDirection = camera.position - worldPos.xyz;
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
  const vertexOutput = `
    struct VSOutput {
      ${vertexOutputContent}
    };`;
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
    "return color;"
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
  let normalMap = `let normal: vec3f = normalize(fsInput.normal);`;
  if (useNormalMap) {
    normalMap = `
      let tbn = mat3x3<f32>(normalize(fsInput.tangent.xyz), normalize(fsInput.bitangent), normalize(fsInput.normal));
      let normalMap = textureSample(normalTexture, ${normalTexture.sampler}, fsInput.${normalTexture.texCoordAttributeName}).rgb;
      let normal = normalize(tbn * (2.0 * normalMap - vec3(material.normalMapScale, material.normalMapScale, 1.0)));
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
      metallic = metallic * metallicRoughness.b;
      roughness = roughness * metallicRoughness.g;
    `;
  }
  const f0 = (
    /* wgsl */
    `
      let dielectricSpec: vec3f = vec3(0.04, 0.04, 0.04);
      let f0 = mix(dielectricSpec, color.rgb, vec3(metallic));
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
      emissive = textureSample(emissiveTexture, ${emissiveTexture.sampler}, fsInput.${emissiveTexture.texCoordAttributeName}).rgb * material.emissiveFactor;
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
      var ambientContribution: vec3f;
      var lightContribution: vec3f;
      color = baseColor;
  `
  );
  const defaultAmbientContribution = (
    /* wgsl */
    `
    ambientContribution = vec3(1.0);
  `
  );
  const defaultLightContribution = (
    /* wgsl */
    `
    lightContribution = vec3(0.0);
  `
  );
  if (!shaderParameters) {
    shaderParameters = {
      ambientContribution: defaultAmbientContribution,
      lightContribution: defaultLightContribution
    };
  } else {
    if (!shaderParameters.ambientContribution)
      shaderParameters.ambientContribution = defaultAmbientContribution;
    if (!shaderParameters.lightContribution)
      shaderParameters.lightContribution = defaultLightContribution;
  }
  const applyLightShading = (
    /* wgsl */
    `
      let ambient = ambientContribution * color.rgb * occlusion;
      color = vec4(linearTosRGB(lightContribution + ambient + emissive), color.a);
      //color = vec4(lightContribution + ambient + emissive, color.a);
  `
  );
  const fs = (
    /* wgsl */
    `
    // linear <-> sRGB conversions
    fn linearTosRGB(linear : vec3f) -> vec3f {
      if (all(linear <= vec3(0.0031308))) {
        return linear * 12.92;
      }
      return (pow(abs(linear), vec3(1.0/2.4)) * 1.055) - vec3(0.055);
    }
  
    fn sRGBToLinear(srgb : vec3f) -> vec3f {
      if (all(srgb <= vec3(0.04045))) {
        return srgb / vec3(12.92);
      }
      return pow((srgb + vec3(0.055)) / vec3(1.055), vec3(2.4));
    }
    
    // PBR
    const PI = ${Math.PI};
    
    fn FresnelSchlick(cosTheta : f32, F0 : vec3f) -> vec3f {
      return F0 + (vec3(1.0) - F0) * pow(1.0 - cosTheta, 5.0);
    }
    
    fn DistributionGGX(N : vec3f, H : vec3f, roughness : f32) -> f32 {
      let a      = roughness*roughness;
      let a2     = a*a;
      let NdotH  = max(dot(N, H), 0.0);
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
    
    fn GeometrySmith(N : vec3f, V : vec3f, L : vec3f, roughness : f32) -> f32 {
      let NdotV = max(dot(N, V), 0.0);
      let NdotL = max(dot(N, L), 0.0);
      let ggx2  = GeometrySchlickGGX(NdotV, roughness);
      let ggx1  = GeometrySchlickGGX(NdotL, roughness);
    
      return ggx1 * ggx2;
    }
    
    fn rangeAttenuation(range : f32, distance : f32) -> f32 {
      if (range <= 0.0) {
          // Negative range means no cutoff
          return 1.0 / pow(distance, 2.0);
      }
      return clamp(1.0 - pow(distance / range, 4.0), 0.0, 1.0) / pow(distance, 2.0);
    }
  
    ${vertexOutput}
  
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {          
      ${initColor}
      ${baseColor}
      ${normalMap}
      ${metallicRoughness}
      ${f0}
      ${emissiveOcclusion}
      
      ${initLightShading}
      
      // user defined lightning
      ${shaderParameters.ambientContribution}
      ${shaderParameters.lightContribution}
      
      
      ${applyLightShading}
      ${returnColor}
    }
  `
  );
  return {
    shaders: {
      vertex: {
        code: vs,
        entryPoint: "main"
      },
      fragment: {
        code: fs,
        entryPoint: "main"
      }
    }
  };
};

export { buildShaders };
