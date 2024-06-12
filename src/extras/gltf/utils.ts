import { MeshDescriptor } from '../../types/gltf/GLTFScenesManager'
import { ShaderOptions } from '../../types/Materials'
import { Texture } from '../../core/textures/Texture'

/**
 * Parameters used to build the shaders
 */
export interface ShaderBuilderParameters {
  /** Additional WGSL chunks to add to the shaders. */
  chunks?: {
    /** Additional WGSL chunk to add to the fragment shader head. */
    additionalFragmentHead?: string
    /** Ambient light contribution to apply to the fragment shader `ambientContribution` `vec3f` variable. Default is `vec3(1.0)`. */
    ambientContribution?: string
    /** Light contribution to apply to the fragment shader `lightContribution` `vec3f` variable. Default is `vec3(0.0)`. */
    lightContribution?: string
    /** Additional modification to apply to the fragment shader `color` `vec4f` variable before returning it. */
    additionalColorContribution?: string
  }
}

/** Shaders returned by the shaders builder function. */
export interface BuiltShaders {
  /** Vertex shader returned by the PBR shader builder. */
  vertex: ShaderOptions
  /** Fragment shader returned by the PBR shader builder. */
  fragment: ShaderOptions
}

// helper to build vertex and fragment shaders based on our meshDescriptor object
/**
 * Build shaders based on a {@link MeshDescriptor} and optional {@link ShaderBuilderParameters | shader parameters}.
 * @param meshDescriptor - {@link MeshDescriptor} built by the {extras/gltf/GLTFScenesManager.GLTFScenesManager | GLTFScenesManager}
 * @param shaderParameters - {@link ShaderBuilderParameters | shader parameters} to use.
 * @returns - object containing the shaders
 */
export const buildShaders = (
  meshDescriptor: MeshDescriptor,
  shaderParameters: ShaderBuilderParameters = null
): BuiltShaders => {
  // textures check
  const baseColorTexture = meshDescriptor.textures.find((t) => t.texture === 'baseColorTexture')
  const normalTexture = meshDescriptor.textures.find((t) => t.texture === 'normalTexture')
  const emissiveTexture = meshDescriptor.textures.find((t) => t.texture === 'emissiveTexture')
  const occlusionTexture = meshDescriptor.textures.find((t) => t.texture === 'occlusionTexture')
  const metallicRoughnessTexture = meshDescriptor.textures.find((t) => t.texture === 'metallicRoughnessTexture')

  const facultativeAttributes = meshDescriptor.attributes.filter((attribute) => attribute.name !== 'position')

  const structAttributes = facultativeAttributes
    .map((attribute, index) => {
      return `@location(${index}) ${attribute.name}: ${attribute.type},`
    })
    .join('\n\t')

  let outputPositions = /* wgsl */ `
    let worldPos = matrices.model * vec4(attributes.position, 1.0);
    vsOutput.position = camera.projection * camera.view * worldPos;
    vsOutput.worldPosition = worldPos.xyz;
    vsOutput.viewDirection = camera.position - worldPos.xyz;
  `
  let outputNormal = facultativeAttributes.find((attr) => attr.name === 'normal')
    ? 'vsOutput.normal = getWorldNormal(attributes.normal);'
    : ''

  if (meshDescriptor.parameters.storages && meshDescriptor.parameters.storages.instances) {
    outputPositions = /* wgsl */ `
      let worldPos: vec4f = instances[attributes.instanceIndex].modelMatrix * vec4f(attributes.position, 1.0);
      vsOutput.position = camera.projection * camera.view * worldPos;
      vsOutput.worldPosition = worldPos.xyz;
      vsOutput.viewDirection = camera.position - vsOutput.worldPosition;
      `

    outputNormal = `vsOutput.normal = normalize((instances[attributes.instanceIndex].normalMatrix * vec4(attributes.normal, 0.0)).xyz);`
  }

  const outputAttributes = facultativeAttributes
    .filter((attr) => attr.name !== 'normal')
    .map((attribute) => {
      return `vsOutput.${attribute.name} = attributes.${attribute.name};`
    })
    .join('\n\t')

  let vertexOutputContent = `
      @builtin(position) position: vec4f,
      @location(${facultativeAttributes.length}) viewDirection: vec3f,
      @location(${facultativeAttributes.length + 1}) worldPosition: vec3f,
      ${structAttributes}
  `

  let outputNormalMap = ''
  const tangentAttribute = facultativeAttributes.find((attr) => attr.name === 'tangent')
  const useNormalMap = !!(normalTexture && tangentAttribute)

  if (useNormalMap) {
    vertexOutputContent += `
      @location(${facultativeAttributes.length + 2}) bitangent: vec3f,
      `

    outputNormalMap = `
        vsOutput.tangent = normalize(matrices.model * attributes.tangent);
        vsOutput.bitangent = cross(vsOutput.normal, vsOutput.tangent.xyz) * attributes.tangent.w;
      `
  }

  const vertexOutput = `
    struct VSOutput {
      ${vertexOutputContent}
    };`

  const vs = /* wgsl */ `
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

  // not a PBR material for now, as it does not use roughness/metalness
  // we might want to implement it later
  // see https://github.com/oframe/ogl/blob/master/examples/load-gltf.html#L133
  const initColor = /* wgsl */ 'var color: vec4f = vec4();'
  const returnColor = /* wgsl */ 'return color;'

  // start with the base color
  // use vertex color 0 if defined
  const vertexColor = meshDescriptor.attributes.find((attr) => attr.name === 'color0')
  let baseColor = /* wgsl */ !!vertexColor
    ? vertexColor.type === 'vec3f'
      ? 'var baseColor: vec4f = vec4(fsInput.color0, 1.0) * material.baseColorFactor;'
      : 'var baseColor: vec4f = fsInput.color0 * material.baseColorFactor;'
    : 'var baseColor: vec4f = material.baseColorFactor;'

  if (baseColorTexture) {
    baseColor = /* wgsl */ `
      var baseColor: vec4f = textureSample(baseColorTexture, ${baseColorTexture.sampler}, fsInput.${baseColorTexture.texCoordAttributeName}) * material.baseColorFactor;
      
      // baseColor = vec4(sRGBToLinear(baseColor.rgb), baseColor.a);
      
      if (baseColor.a < material.alphaCutoff) {
        discard;
      }
    `
  }

  // normal map

  let normalMap = meshDescriptor.attributes.find((attribute) => attribute.name === 'normal')
    ? `let normal: vec3f = normalize(fsInput.normal);`
    : `let normal: vec3f = vec3(0.0);`

  if (useNormalMap) {
    normalMap = `
      let tbn = mat3x3<f32>(normalize(fsInput.tangent.xyz), normalize(fsInput.bitangent), normalize(fsInput.normal));
      let normalMap = textureSample(normalTexture, ${normalTexture.sampler}, fsInput.${normalTexture.texCoordAttributeName}).rgb;
      let normal = normalize(tbn * (2.0 * normalMap - vec3(material.normalMapScale, material.normalMapScale, 1.0)));
    `
  }

  // metallic roughness
  let metallicRoughness = /*  wgsl */ `
      var metallic = material.metallicFactor;
      var roughness = material.roughnessFactor;
  `

  if (metallicRoughnessTexture) {
    metallicRoughness += /* wgsl */ `
      let metallicRoughness = textureSample(metallicRoughnessTexture, ${metallicRoughnessTexture.sampler}, fsInput.${metallicRoughnessTexture.texCoordAttributeName});
      metallic = clamp(metallic * metallicRoughness.b, 0.001, 1.0);
      roughness = clamp(roughness * metallicRoughness.g, 0.001, 1.0);
    `
  }

  const f0 = /* wgsl */ `
      let dielectricSpec: vec3f = vec3(0.04, 0.04, 0.04);
      let f0 = mix(dielectricSpec, color.rgb, vec3(metallic));
  `

  // emissive and occlusion
  let emissiveOcclusion = /* wgsl */ `
      var emissive: vec3f = vec3(0.0);
      var occlusion: f32 = 1.0;
  `

  if (emissiveTexture) {
    emissiveOcclusion += /* wgsl */ `
      emissive = textureSample(emissiveTexture, ${emissiveTexture.sampler}, fsInput.${emissiveTexture.texCoordAttributeName}).rgb;
      
      // emissive = sRGBToLinear(emissive);
      
      emissive *= material.emissiveFactor;
      `
    if (occlusionTexture) {
      emissiveOcclusion += /* wgsl */ `
      occlusion = textureSample(occlusionTexture, ${occlusionTexture.sampler}, fsInput.${occlusionTexture.texCoordAttributeName}).r;
      `
    }
  }

  emissiveOcclusion += /* wgsl */ `
      occlusion = 1.0 + material.occlusionStrength * (occlusion - 1.0);
  `

  // add lightning
  const initLightShading = /* wgsl */ `
      var ambientContribution: vec3f;
      var lightContribution: vec3f;
      color = baseColor;
  `

  // user defined chunks
  const defaultAdditionalHead = ''
  const defaultAdditionalColor = ''
  const defaultAmbientContribution = /* wgsl */ `
    ambientContribution = vec3(1.0);
  `
  const defaultLightContribution = /* wgsl */ `
    lightContribution = vec3(0.0);
  `

  shaderParameters = shaderParameters ?? {}

  let chunks = shaderParameters.chunks

  if (!chunks) {
    chunks = {
      additionalFragmentHead: defaultAdditionalHead,
      ambientContribution: defaultAmbientContribution,
      lightContribution: defaultLightContribution,
      additionalColorContribution: defaultAdditionalColor,
    }
  } else {
    if (!chunks.additionalFragmentHead) chunks.additionalFragmentHead = defaultAdditionalHead
    if (!chunks.ambientContribution) chunks.ambientContribution = defaultAmbientContribution
    if (!chunks.lightContribution) chunks.lightContribution = defaultLightContribution
    if (!chunks.additionalColorContribution) chunks.additionalColorContribution = defaultAdditionalColor
  }

  const applyLightShading = /* wgsl */ `
      let ambient = ambientContribution * color.rgb * occlusion;
      
      color = vec4(
        linearTosRGB(
          toneMapKhronosPbrNeutral(
            lightContribution + ambient + emissive
          )
        ),
        color.a
      );
  `

  const fs = /* wgsl */ `
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
      ${chunks.ambientContribution}
      ${chunks.lightContribution}
      
      ${applyLightShading}
      
      ${chunks.additionalColorContribution}
      
      ${returnColor}
    }
  `

  return {
    vertex: {
      code: vs,
      entryPoint: 'main',
    },
    fragment: {
      code: fs,
      entryPoint: 'main',
    },
  }
}

// helper to build PBR vertex and fragment shaders based on our meshDescriptor object
// see https://github.com/toji/webgpu-clustered-shading/blob/main/js/webgpu-renderer/shaders/pbr.js
/**
 * Build Physically Based Rendering shaders based on a {@link MeshDescriptor} and optional {@link ShaderBuilderParameters | PBR shader parameters}.
 * @param meshDescriptor - {@link MeshDescriptor} built by the {extras/gltf/GLTFScenesManager.GLTFScenesManager | GLTFScenesManager}
 * @param shaderParameters - {@link ShaderBuilderParameters | PBR shader parameters} to use.
 * @returns - object containing the shaders
 */
export const buildPBRShaders = (
  meshDescriptor: MeshDescriptor,
  shaderParameters: ShaderBuilderParameters = null
): BuiltShaders => {
  let chunks = shaderParameters?.chunks

  const pbrAdditionalFragmentHead = /* wgsl */ `
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

  if (!chunks) {
    chunks = {
      additionalFragmentHead: pbrAdditionalFragmentHead,
    }
  } else {
    if (!chunks.additionalFragmentHead) {
      chunks.additionalFragmentHead = pbrAdditionalFragmentHead
    } else {
      chunks.additionalFragmentHead += pbrAdditionalFragmentHead
    }
  }

  return buildShaders(meshDescriptor, shaderParameters)
}

/**
 * Parameters used to build the shaders
 */
export interface IBLShaderBuilderParameters extends ShaderBuilderParameters {
  /** Additional IBL parameters to pass as uniform and textures. */
  iblParameters?: {
    /** Environment diffuse strength. Default to `0.5`. */
    diffuseStrength?: number
    /** Environment specular strength. Default to `0.5`. */
    specularStrength?: number
    /** Look Up Table texture to use for IBL. */
    lutTexture: Texture
    /** Environment diffuse texture to use for IBL. */
    envDiffuseTexture: Texture
    /** Environment specular texture to use for IBL. */
    envSpecularTexture: Texture
  }
}

// based on https://github.com/oframe/ogl/blob/master/examples/load-gltf.html#L133
/**
 * Build Image Based Lightning shaders based on a {@link MeshDescriptor} and optional {@link ShaderBuilderParameters | IBL shader parameters}.
 * @param meshDescriptor - {@link MeshDescriptor} built by the {extras/gltf/GLTFScenesManager.GLTFScenesManager | GLTFScenesManager}
 * @param shaderParameters - {@link ShaderBuilderParameters | IBL shader parameters} to use.
 * @returns - object containing the shaders
 */
export const buildIBLShaders = (
  meshDescriptor: MeshDescriptor,
  shaderParameters: IBLShaderBuilderParameters = null
): BuiltShaders => {
  const iblParameters = shaderParameters?.iblParameters

  // add lights & ibl uniforms
  meshDescriptor.parameters.uniforms = {
    ...meshDescriptor.parameters.uniforms,
    ...{
      ibl: {
        struct: {
          diffuseStrength: {
            type: 'f32',
            value: iblParameters?.diffuseStrength ?? 0.5,
          },
          specularStrength: {
            type: 'f32',
            value: iblParameters?.specularStrength ?? 0.5,
          },
        },
      },
    },
  }

  // IBL
  const { lutTexture, envDiffuseTexture, envSpecularTexture } = iblParameters || {}

  const useIBLContribution = envDiffuseTexture && envSpecularTexture && lutTexture

  let iblContributionHead = ''
  let iblContribution = ''

  if (useIBLContribution) {
    meshDescriptor.parameters.textures = [
      ...meshDescriptor.parameters.textures,
      lutTexture,
      envDiffuseTexture,
      envSpecularTexture,
    ]

    const lutTextureDescriptor = {
      texture: lutTexture.options.name,
      sampler: 'defaultSampler',
    }

    const envDiffuseTextureDescriptor = {
      texture: envDiffuseTexture.options.name,
      sampler: 'defaultSampler',
    }

    const envSpecularTextureDescriptor = {
      texture: envSpecularTexture.options.name,
      sampler: 'defaultSampler',
    }

    meshDescriptor.textures = [
      ...meshDescriptor.textures,
      lutTextureDescriptor,
      envDiffuseTextureDescriptor,
      envSpecularTextureDescriptor,
    ]

    iblContributionHead = /* wgsl */ `
    const RECIPROCAL_PI = ${1 / Math.PI};
    const RECIPROCAL_PI2 = ${0.5 / Math.PI};
    const ENV_LODS = 4.0;
    const LN2 = 0.6931472;
    
    fn rGBMToLinear(rgbm: vec4f) -> vec4f {
      let maxRange: f32 = 6.0;
      return vec4(rgbm.xyz * rgbm.w * maxRange, 1.0);
    }
    
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
    
    fn getIBLContribution(NdV: f32, roughness: f32, n: vec3f, reflection: vec3f, diffuseColor: vec3f, specularColor: vec3f) -> IBLContribution {
      let brdf: vec3f = sRGBToLinear(textureSample(${lutTextureDescriptor.texture}, ${
      lutTextureDescriptor.sampler
    }, vec2(NdV, roughness)).rgb);
      var diffuseLight: vec3f = rGBMToLinear(textureSample(${envDiffuseTextureDescriptor.texture}, ${
      envDiffuseTextureDescriptor.sampler
    }, cartesianToPolar(n))).rgb;      
      diffuseLight = mix(vec3(1), diffuseLight, ibl.diffuseStrength);
      var blend: f32 = roughness * ENV_LODS;
      let level0: f32 = floor(blend);
      let level1: f32 = min(ENV_LODS, level0 + 1.0);
      blend -= level0;
      var uvSpec: vec2f = cartesianToPolar(reflection);
      uvSpec.y /= 2.0;
      var uv0: vec2f = uvSpec;
      var uv1: vec2f = uvSpec;
      uv0 /= pow(2.0, level0);
      uv0.y += 1.0 - exp(-LN2 * level0);
      uv1 /= pow(2.0, level1);
      uv1.y += 1.0 - exp(-LN2 * level1);
      let specular0: vec3f = rGBMToLinear(textureSample(${envSpecularTextureDescriptor.texture}, ${
      envSpecularTextureDescriptor.sampler
    }, uv0)).rgb;
      let specular1: vec3f = rGBMToLinear(textureSample(${envSpecularTextureDescriptor.texture}, ${
      envSpecularTextureDescriptor.sampler
    }, uv1)).rgb;
      let specularLight: vec3f = mix(specular0, specular1, blend);      
      
      var iblContribution: IBLContribution;
      iblContribution.diffuse = diffuseLight * diffuseColor;
      
      let reflectivity: f32 = pow((1.0 - roughness), 2.0) * 0.05;
      iblContribution.specular = specularLight * (specularColor * brdf.x + brdf.y + reflectivity);
      iblContribution.specular *= ibl.specularStrength;
      
      return iblContribution;
    }
    `

    iblContribution = /* wgsl */ `
      let reflection: vec3f = normalize(reflect(-normalize(fsInput.viewDirection), normal));
      
      let diffuseColor: vec3f = baseColor.rgb * (vec3(1.0) - f0) * (1.0 - metallic);
      let specularColor: vec3f = mix(f0, baseColor.rgb, metallic);
    
      let iblContribution = getIBLContribution(max(dot(normal, normalize(fsInput.viewDirection)), 0.0), roughness, normal, reflection, diffuseColor, specularColor);
      
      color = vec4(color.rgb + iblContribution.diffuse + iblContribution.specular, color.a);
      
      // Add IBL spec to alpha for reflections on transparent surfaces (glass)
      color.a = max(color.a, max(max(iblContribution.specular.r, iblContribution.specular.g), iblContribution.specular.b));
    `
  }

  let chunks = shaderParameters?.chunks

  if (!chunks) {
    chunks = {
      additionalFragmentHead: iblContributionHead,
      additionalColorContribution: iblContribution,
    }
  } else {
    if (!chunks.additionalFragmentHead) {
      chunks.additionalFragmentHead = iblContributionHead
    } else {
      chunks.additionalFragmentHead += iblContributionHead
    }

    if (!chunks.additionalColorContribution) {
      chunks.additionalColorContribution = iblContribution
    } else {
      chunks.additionalColorContribution += iblContribution
    }
  }

  return buildPBRShaders(meshDescriptor, shaderParameters)
}
