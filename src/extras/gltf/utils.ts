import { MaterialTextureDescriptor, MeshDescriptor } from '../../types/gltf/GLTFScenesManager'
import { ShaderOptions } from '../../types/Materials'
import { Texture } from '../../core/textures/Texture'
import { Sampler } from '../../core/samplers/Sampler'
import { ComputePass, ComputePassParams } from '../../core/computePasses/ComputePass'
import { Renderer } from '../../core/renderers/utils'
import { throwWarning } from '../../utils/utils'

/**
 * Parameters used to build the shaders
 */
export interface ShaderBuilderParameters {
  /** Additional WGSL chunks to add to the shaders. */
  chunks?: {
    /** Additional WGSL chunk to add to the fragment shader head. */
    additionalFragmentHead?: string
    /** Preliminary modification to apply to the fragment shader `color` `vec4f` variable before applying any lightning calculations. */
    preliminaryColorContribution?: string
    /** Ambient light contribution to apply to the fragment shader `lightContribution.ambient` `vec3f` variable. Default is `vec3(1.0)`. */
    ambientContribution?: string
    /** Light contribution to apply to the fragment shader `lightContribution.diffuse` `vec3f` and `lightContribution.specular` `vec3f` variables. Default is `vec3(0.0)` for both. */
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
 *
 * The shaders built by this function allow you to access a bunch of variables inside your fragment shader that you can use in your {@link ShaderBuilderParameters | shader parameters} chunks:
 *
 * - `geometryNormal: vec3f`: the normalized geometry normals.
 * - `normal: vec3f` or `N: vec3f`: the computed normalized normals accounting for the `normalTexture` and `tangent` attributes is defined, the `geometryNormal` else.
 * - `worldPosition: vec3f`: the world position.
 * - `viewDirection: vec3f`: the view direction in world space (camera position minus world position).
 * - `V: vec3f`: the normalized view direction in world space (camera position minus world position).
 * - `NdotV: f32`: the clamped dot product of `N` and `V`.
 * - `metallic: f32`: the metallic value. Default to `1.0`.
 * - `roughness: f32`: the roughness value. Default to `1.0`.
 * - `f0: vec3f`: the fresnel reflectance.
 * - `emissive: vec3f`: the emissive color value. Default to `vec3(0.0)`.
 * - `occlusion: f32`: the occlusion value. Default to `1.0`.
 * - `lightContribution: LightContribution`: the final light contribution to use. You should add your respective lightning calculations to this variable components, defined as follows:<br>
 * ```wgsl
 * struct LightContribution {
 *   ambient: vec3f, // default to vec3(1.0)
 *   diffuse: vec3f, // default to vec3(0.0)
 *   specular: vec3f, // default to vec3(0.0)
 * };
 * ```
 * - `color: vec4f`: the color that will be outputted. You can manipulate it with the `preliminaryColorContribution` (applied before lightning calculations) and `additionalColorContribution` (applied after lightning calculations).
 *
 * @param meshDescriptor - {@link MeshDescriptor} built by the {@link extras/gltf/GLTFScenesManager.GLTFScenesManager | GLTFScenesManager}
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
    vsOutput.worldPosition = worldPos.xyz / worldPos.w;
    vsOutput.viewDirection = camera.position - vsOutput.worldPosition.xyz;
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

  const vertexOutput = /*wgsl */ `
    struct VSOutput {
      ${vertexOutputContent}
    };`

  const fragmentInput = /*wgsl */ `
    struct VSOutput {
      @builtin(front_facing) frontFacing: bool,
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
  const returnColor = /* wgsl */ `
      return vec4(
        linearTosRGB(
          toneMapKhronosPbrNeutral(
            color.rgb
          )
        ),
        color.a
      );
  `

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
      
      if (baseColor.a < material.alphaCutoff) {
        discard;
      }
    `
  }

  baseColor += /* wgsl */ `
      color = baseColor;
  `

  // normal map

  let normalMap = meshDescriptor.attributes.find((attribute) => attribute.name === 'normal')
    ? /* wgsl */ `
      let faceDirection = select(-1.0, 1.0, fsInput.frontFacing);
      let geometryNormal: vec3f = normalize(faceDirection * fsInput.normal);
    `
    : /* wgsl */ `let geometryNormal: vec3f = normalize(vec3(0.0, 0.0, 1.0));`

  if (useNormalMap) {
    normalMap += /* wgsl */ `
      let tbn = mat3x3<f32>(normalize(fsInput.tangent.xyz), normalize(fsInput.bitangent), geometryNormal);
      let normalMap = textureSample(normalTexture, ${normalTexture.sampler}, fsInput.${normalTexture.texCoordAttributeName}).rgb;
      let normal = normalize(tbn * (2.0 * normalMap - vec3(material.normalMapScale, material.normalMapScale, 1.0)));
    `
  } else {
    normalMap += /* wgsl */ `
      let normal = geometryNormal;
    `
  }

  normalMap += /* wgsl */ `
      let worldPosition: vec3f = fsInput.worldPosition;
      let viewDirection: vec3f = fsInput.viewDirection;
      let N: vec3f = normal;
      let V: vec3f = normalize(viewDirection);
      let NdotV: f32 = clamp(dot(N, V), 0.0, 1.0);
  `

  // metallic roughness
  let metallicRoughness = /*  wgsl */ `
      var metallic = material.metallicFactor;
      var roughness = material.roughnessFactor;
  `

  if (metallicRoughnessTexture) {
    metallicRoughness += /* wgsl */ `
      let metallicRoughness = textureSample(metallicRoughnessTexture, ${metallicRoughnessTexture.sampler}, fsInput.${metallicRoughnessTexture.texCoordAttributeName});
      
      metallic = clamp(metallic * metallicRoughness.b, 0.0, 1.0);
      roughness = clamp(roughness * metallicRoughness.g, 0.0, 1.0);
    `
  }

  const f0 = /* wgsl */ `
      let f0: vec3f = mix(vec3(0.04), color.rgb, vec3(metallic));
  `

  // emissive and occlusion
  let emissiveOcclusion = /* wgsl */ `
      var emissive: vec3f = vec3(0.0);
      var occlusion: f32 = 1.0;
  `

  if (emissiveTexture) {
    emissiveOcclusion += /* wgsl */ `
      emissive = textureSample(emissiveTexture, ${emissiveTexture.sampler}, fsInput.${emissiveTexture.texCoordAttributeName}).rgb;
      
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
      var lightContribution: LightContribution;
      
      lightContribution.ambient = vec3(1.0);
      lightContribution.diffuse = vec3(0.0);
      lightContribution.specular = vec3(0.0);
  `

  // user defined chunks
  const defaultAdditionalHead = ''
  const defaultPreliminaryColor = ''
  const defaultAdditionalColor = ''
  const defaultAmbientContribution = ''
  const defaultLightContribution = ''

  shaderParameters = shaderParameters ?? {}

  let chunks = shaderParameters.chunks

  if (!chunks) {
    chunks = {
      additionalFragmentHead: defaultAdditionalHead,
      ambientContribution: defaultAmbientContribution,
      preliminaryColorContribution: defaultPreliminaryColor,
      lightContribution: defaultLightContribution,
      additionalColorContribution: defaultAdditionalColor,
    }
  } else {
    if (!chunks.additionalFragmentHead) chunks.additionalFragmentHead = defaultAdditionalHead
    if (!chunks.preliminaryColorContribution) chunks.preliminaryColorContribution = defaultPreliminaryColor
    if (!chunks.ambientContribution) chunks.ambientContribution = defaultAmbientContribution
    if (!chunks.lightContribution) chunks.lightContribution = defaultLightContribution
    if (!chunks.additionalColorContribution) chunks.additionalColorContribution = defaultAdditionalColor
  }

  const applyLightShading = /* wgsl */ `
      // apply color to ambient    
      lightContribution.ambient *= color.rgb;
      
      // apply color based on metallic to diffuse
      lightContribution.diffuse *= mix(color.rgb, vec3(0.0), vec3(metallic));
      
      let totalLight: vec3f = lightContribution.ambient + lightContribution.diffuse + lightContribution.specular;
      
      color = vec4(
        totalLight * occlusion + emissive,
        color.a
      );
  `

  const fs = /* wgsl */ `
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
    fn FresnelSchlick(cosTheta: f32, f0: vec3f) -> vec3f {
      return f0 + (vec3(1.0) - f0) * pow(1.0 - cosTheta, 5.0);
    }
    
    fn DistributionGGX(NdotH: f32, roughness: f32) -> f32 {
      let a: f32 = roughness * roughness;
      let a2: f32 = a * a;
      let NdotH2: f32 = NdotH * NdotH;
    
      let num: f32 = a2;
      let denom: f32 = (NdotH2 * (a2 - 1.0) + 1.0);
    
      return num / (PI * denom * denom);
    }
    
    fn GeometrySchlickGGX(NdotV : f32, roughness: f32) -> f32 {
      let r: f32 = (roughness + 1.0);
      let k: f32 = (r * r) / 8.0;
    
      let num: f32 = NdotV;
      let denom: f32 = NdotV * (1.0 - k) + k;
    
      return num / denom;
    }
    
    fn GeometrySmith(NdotL: f32, NdotV: f32, roughness: f32) -> f32 {
      let ggx2: f32 = GeometrySchlickGGX(NdotV, roughness);
      let ggx1: f32 = GeometrySchlickGGX(NdotL, roughness);
    
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
 * Parameters to use for IBL textures
 */
export interface IBLShaderTextureParams {
  /** {@link Texture} to use. */
  texture: Texture
  /** {@link Sampler#name | Sampler name} to use. */
  samplerName?: Sampler['name']
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
    /** Look Up Table texture parameters to use for IBL. */
    lutTexture?: IBLShaderTextureParams
    /** Environment diffuse texture parameters to use for IBL. */
    envDiffuseTexture?: IBLShaderTextureParams
    /** Environment specular texture parameters to use for IBL. */
    envSpecularTexture?: IBLShaderTextureParams
  }
}

// based on https://github.khronos.org/glTF-Sample-Viewer-Release/
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
  shaderParameters = shaderParameters || {}
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

  const useIBLContribution =
    envDiffuseTexture &&
    envDiffuseTexture.texture &&
    envSpecularTexture &&
    envSpecularTexture.texture &&
    lutTexture &&
    lutTexture.texture

  let iblContributionHead = ''
  let iblLightContribution = ''

  if (useIBLContribution) {
    meshDescriptor.parameters.textures = [
      ...meshDescriptor.parameters.textures,
      lutTexture.texture,
      envDiffuseTexture.texture,
      envSpecularTexture.texture,
    ]

    lutTexture.samplerName = lutTexture.samplerName || 'defaultSampler'
    envDiffuseTexture.samplerName = envDiffuseTexture.samplerName || 'defaultSampler'
    envSpecularTexture.samplerName = envSpecularTexture.samplerName || 'defaultSampler'

    iblContributionHead = /* wgsl */ `  
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
        ${envSpecularTexture.texture.options.viewDimension === 'cube' ? 'reflection' : 'cartesianToPolar(reflection)'},
        lod
      );
      
      iblContribution.specular = specularLight.rgb * FssEss * ibl.specularStrength;
      
      // IBL diffuse
      let diffuseLight: vec4f = textureSample(
        ${envDiffuseTexture.texture.options.name},
        ${envDiffuseTexture.samplerName},
        ${envDiffuseTexture.texture.options.viewDimension === 'cube' ? 'normal' : 'cartesianToPolar(normal)'}
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
    `

    iblLightContribution = /* wgsl */ `
      let reflection: vec3f = normalize(reflect(-V, N));
      
      let iblDiffuseColor: vec3f = mix(color.rgb, vec3(0.0), vec3(metallic));
    
      let iblContribution = getIBLContribution(NdotV, roughness, N, reflection, iblDiffuseColor, f0);
      
      lightContribution.diffuse += iblContribution.diffuse;
      lightContribution.specular += iblContribution.specular;
    `
  }

  let chunks = shaderParameters?.chunks

  if (!chunks) {
    chunks = {
      additionalFragmentHead: iblContributionHead,
      lightContribution: iblLightContribution,
    }
  } else {
    if (!chunks.additionalFragmentHead) {
      chunks.additionalFragmentHead = iblContributionHead
    } else {
      chunks.additionalFragmentHead += iblContributionHead
    }

    if (!chunks.lightContribution) {
      chunks.lightContribution = iblLightContribution
    } else {
      chunks.lightContribution = iblLightContribution + chunks.lightContribution
    }

    // remove ambient contribution if it's not defined but IBL is applied
    if (!chunks.ambientContribution && useIBLContribution) {
      chunks.ambientContribution = 'lightContribution.ambient = vec3(0.0);'
    }
  }

  shaderParameters.chunks = chunks

  return buildPBRShaders(meshDescriptor, shaderParameters)
}

/**
 * Compute a diffuse cube map from a specular cube map using a {@link ComputePass} and copy the result into the diffuse texture {@link GPUTexture}.
 * @param renderer - {@link Renderer} to use.
 * @param diffuseTexture - diffuse cube map texture onto which the result of the {@link ComputePass} should be copied.
 * @param specularTexture - specular cube map texture to use as a source.
 */
export const computeDiffuseFromSpecular = async (
  renderer: Renderer,
  diffuseTexture: Texture,
  specularTexture: Texture
) => {
  if (specularTexture.options.viewDimension !== 'cube') {
    throwWarning(
      'Could not compute the diffuse texture because the specular texture is not a cube map:' +
        specularTexture.options.viewDimension
    )
    return
  }

  // ported from https://github.com/KhronosGroup/glTF-Sample-Viewer/blob/9940e4b4f4a2a296351bcd35035cc518deadc298/source/shaders/ibl_filtering.frag
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
  `

  let diffuseStorageTexture = new Texture(renderer, {
    label: 'Diffuse storage cubemap',
    name: 'diffuseEnvMap',
    format: 'rgba32float',
    visibility: ['compute'],
    usage: ['copySrc', 'storageBinding'],
    type: 'storage',
    fixedSize: {
      width: specularTexture.size.width,
      height: specularTexture.size.height,
      depth: 6,
    },
    viewDimension: '2d-array',
  })

  const sampler = new Sampler(renderer, {
    label: 'Compute diffuse sampler',
    name: 'specularSampler',
    addressModeU: 'clamp-to-edge',
    addressModeV: 'clamp-to-edge',
    minFilter: 'linear',
    magFilter: 'linear',
  })

  let computeDiffusePass = new ComputePass(renderer, {
    autoRender: false, // we're going to render only on demand
    dispatchSize: [Math.ceil(specularTexture.size.width / 8), Math.ceil(specularTexture.size.height / 8), 6],
    shaders: {
      compute: {
        code: computeDiffuseShader,
      },
    },
    uniforms: {
      params: {
        struct: {
          faceSize: {
            type: 'u32',
            value: specularTexture.size.width,
          },
          maxMipLevel: {
            type: 'u32',
            value: specularTexture.texture.mipLevelCount,
          },
          sampleCount: {
            type: 'u32',
            value: 2048,
          },
        },
      },
    },
    samplers: [sampler],
    textures: [specularTexture, diffuseStorageTexture],
  })

  await computeDiffusePass.material.compileMaterial()

  renderer.onBeforeRenderScene.add(
    (commandEncoder) => {
      // run the compute pass just once
      renderer.renderSingleComputePass(commandEncoder, computeDiffusePass)

      // copy the result to our diffuse texture
      commandEncoder.copyTextureToTexture(
        {
          texture: diffuseStorageTexture.texture,
        },
        {
          texture: diffuseTexture.texture,
        },
        [diffuseTexture.texture.width, diffuseTexture.texture.height, diffuseTexture.texture.depthOrArrayLayers]
      )
    },
    { once: true }
  )

  renderer.onAfterCommandEncoderSubmission.add(
    () => {
      // once command encoder has been submitted, free the resources
      computeDiffusePass.destroy()
      diffuseStorageTexture.destroy()
      diffuseStorageTexture = null
      computeDiffusePass = null
    },
    { once: true }
  )
}
