import { MeshDescriptor } from '../../types/gltf/GLTFScenesManager'
import { ShaderOptions } from '../../types/Materials'
import { Texture } from '../../core/textures/Texture'
import { Sampler } from '../../core/samplers/Sampler'
import { throwWarning } from '../../utils/utils'
import { getLambert, GetShadingParams } from '../../core/shaders/chunks/shading/lambert-shading'
import { getPhong } from '../../core/shaders/chunks/shading/phong-shading'
import { getPBR } from '../../core/shaders/chunks/shading/pbr-shading'
import { getIBL } from '../../core/shaders/chunks/shading/ibl-shading'
import { EnvironmentMap } from '../environment-map/EnvironmentMap'
import { BufferElement } from '../../core/bindings/bufferElements/BufferElement'
import { BufferBinding } from '../../core/bindings/BufferBinding'
import { getFullVertexOutput } from '../../core/shaders/chunks/vertex/get_vertex_output'

/** Defines all kinds of shading models available. */
export type ShadingModels = 'Lambert' | 'Phong' | 'PBR' | 'IBL'

/**
 * Parameters to use for IBL textures.
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
export interface ShaderBuilderParameters {
  /** Shading model to use. */
  shadingModel?: ShadingModels
  /** Additional WGSL chunks to add to the shaders. */
  chunks?: {
    /** Additional WGSL chunk to add to the fragment shader head. */
    additionalFragmentHead?: string
    /** Preliminary modification to apply to the fragment shader `color` `vec4f` variable before applying any lightning calculations. */
    preliminaryColorContribution?: string
    /** Additional modification to apply to the fragment shader `color` `vec4f` variable before returning it. */
    additionalColorContribution?: string
  }
  /** Additional IBL parameters to pass as uniform and textures. */
  iblParameters?: {
    /** Environment diffuse strength. Default to `0.5`. */
    diffuseStrength?: number
    /** Environment specular strength. Default to `0.5`. */
    specularStrength?: number
    /** {@link EnvironmentMap} to use for IBL shading. */
    environmentMap?: EnvironmentMap
  }
}

/** Shaders returned by the shaders builder function. */
export interface BuiltShaders {
  /** Vertex shader returned by the PBR shader builder. */
  vertex: ShaderOptions
  /** Fragment shader returned by the PBR shader builder. */
  fragment: ShaderOptions
}

/**
 * Build shaders made for glTF parsed objects, based on a {@link MeshDescriptor} and optional {@link ShaderBuilderParameters | shader parameters}.
 *
 * @param meshDescriptor - {@link MeshDescriptor} built by the {@link extras/gltf/GLTFScenesManager.GLTFScenesManager | GLTFScenesManager}
 * @param shaderParameters - {@link ShaderBuilderParameters | shader parameters} to use.
 * @returns - An object containing the shaders.
 */
export const buildShaders = (
  meshDescriptor: MeshDescriptor,
  shaderParameters = {} as ShaderBuilderParameters
): BuiltShaders => {
  // textures check
  const baseColorTexture = meshDescriptor.textures.find((t) => t.texture === 'baseColorTexture')
  const normalTexture = meshDescriptor.textures.find((t) => t.texture === 'normalTexture')
  const emissiveTexture = meshDescriptor.textures.find((t) => t.texture === 'emissiveTexture')
  const occlusionTexture = meshDescriptor.textures.find((t) => t.texture === 'occlusionTexture')
  const metallicRoughnessTexture = meshDescriptor.textures.find((t) => t.texture === 'metallicRoughnessTexture')
  const transmissionTexture = meshDescriptor.textures.find((t) => t.texture === 'transmissionTexture')
  const thicknessTexture = meshDescriptor.textures.find((t) => t.texture === 'thicknessTexture')
  const transmissionBackgroundTexture = meshDescriptor.textures.find(
    (t) => t.texture === 'transmissionBackgroundTexture'
  )

  const facultativeAttributes = meshDescriptor.attributes.filter((attribute) => attribute.name !== 'position')

  const structAttributes = facultativeAttributes
    .map((attribute, index) => {
      return `
  @location(${index}) ${attribute.name}: ${attribute.type},`
    })
    .join('')

  // VERTEX
  let vertexOutputContent = `
  @builtin(position) position: vec4f,
  ${structAttributes}
  @location(${facultativeAttributes.length}) viewDirection: vec3f,
  @location(${facultativeAttributes.length + 1}) worldPosition: vec3f,
  `

  let outputBitangent = ''
  const tangentAttribute = facultativeAttributes.find((attr) => attr.name === 'tangent')
  const hasTangent = !!(normalTexture && tangentAttribute)

  if (hasTangent) {
    vertexOutputContent += `
  @location(${facultativeAttributes.length + 2}) bitangent: vec3f,
      `

    outputBitangent = `
  vsOutput.bitangent = cross(vsOutput.normal, vsOutput.tangent.xyz) * vsOutput.tangent.w;
      `
  }

  const fullVertexOutput = getFullVertexOutput({
    bindings: meshDescriptor.parameters.bindings as BufferBinding[],
    geometry: meshDescriptor.parameters.geometry,
  })

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
    
  ${fullVertexOutput}
  ${outputBitangent}

  return vsOutput;
}
`

  // FRAGMENT
  const initColor = /* wgsl */ 'var color: vec4f = vec4();'
  const returnColor = /* wgsl */ `
  return color;`

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

  let normalMap = /* wgsl */ `
  let faceDirection = select(-1.0, 1.0, fsInput.frontFacing);
  let geometryNormal: vec3f = faceDirection * normal;
  var tangent: vec3f;
  var bitangent: vec3f;`

  if (normalTexture) {
    if (hasTangent) {
      normalMap += /* wgsl */ `
  tangent = normalize(fsInput.tangent.xyz);
  bitangent = normalize(fsInput.bitangent);
  `
    } else {
      normalMap += /* wgsl */ `
  let Q1: vec3f = dpdx(worldPosition);
  let Q2: vec3f = dpdy(worldPosition);
  let st1: vec2f = dpdx(fsInput.${normalTexture.texCoordAttributeName});
  let st2: vec2f = dpdy(fsInput.${normalTexture.texCoordAttributeName});
  
  tangent = normalize(Q1 * st2.y - Q2 * st1.y);
  bitangent = normalize(-Q1 * st2.x + Q2 * st1.x);
  `
    }

    normalMap += /* wgsl */ `
  let tbn = mat3x3f(tangent, bitangent, geometryNormal);
  let normalMap = textureSample(normalTexture, ${normalTexture.sampler}, fsInput.${normalTexture.texCoordAttributeName}).rgb;
  normal = normalize(tbn * (2.0 * normalMap - vec3(material.normalMapScale, material.normalMapScale, 1.0)));`
  } else {
    normalMap += /* wgsl */ `
  normal = geometryNormal;`
  }

  // metallic roughness
  let metallicRoughness = /*  wgsl */ `
  var metallic = material.metallicFactor;
  var roughness = material.roughnessFactor;`

  if (metallicRoughnessTexture) {
    metallicRoughness += /* wgsl */ `
  let metallicRoughness = textureSample(metallicRoughnessTexture, ${metallicRoughnessTexture.sampler}, fsInput.${metallicRoughnessTexture.texCoordAttributeName});
  
  metallic = clamp(metallic * metallicRoughness.b, 0.0, 1.0);
  roughness = clamp(roughness * metallicRoughness.g, 0.0, 1.0);
  `
  }

  let transmission = /* wgsl */ `
  var transmission: f32 = 0.0;
  var thickness: f32 = 0.0;`

  if (transmissionBackgroundTexture) {
    transmission += /* wgsl */ `
  transmission = material.transmissionFactor;
  thickness = material.thicknessFactor;`

    if (transmissionTexture) {
      transmission += /* wgsl */ `
  let transmissionSample: vec4f = textureSample(transmissionTexture, ${transmissionTexture.sampler}, fsInput.${transmissionTexture.texCoordAttributeName});
  
  transmission = clamp(transmission * transmissionSample.r, 0.0, 1.0);`
    }

    if (thicknessTexture) {
      transmission += /* wgsl */ `
  let thicknessSample: vec4f = textureSample(thicknessTexture, ${thicknessTexture.sampler}, fsInput.${thicknessTexture.texCoordAttributeName});
  
  thickness = thickness * thicknessSample.g;`
    }
  }

  const f0 = /* wgsl */ `
  let f0: vec3f = mix(vec3(0.04), color.rgb, vec3(metallic));`

  // emissive and occlusion
  let emissiveOcclusion = /* wgsl */ `
  var emissive: vec3f = vec3(0.0);
  var occlusion: f32 = 1.0;`

  if (emissiveTexture) {
    emissiveOcclusion += /* wgsl */ `
  emissive = textureSample(emissiveTexture, ${emissiveTexture.sampler}, fsInput.${emissiveTexture.texCoordAttributeName}).rgb;
  emissive *= material.emissiveFactor;`
    if (occlusionTexture) {
      emissiveOcclusion += /* wgsl */ `
  occlusion = textureSample(occlusionTexture, ${occlusionTexture.sampler}, fsInput.${occlusionTexture.texCoordAttributeName}).r;`
    }
  }

  emissiveOcclusion += /* wgsl */ `
  occlusion = 1.0 + material.occlusionStrength * (occlusion - 1.0);`

  // Shader parameters
  let { shadingModel } = shaderParameters
  if (!shadingModel) {
    shadingModel = 'PBR'
  }

  let { chunks } = shaderParameters || {}
  const { iblParameters } = shaderParameters || {}
  const { environmentMap } = iblParameters || {}

  if (environmentMap && shadingModel === 'IBL') {
    // add lights & ibl uniforms
    meshDescriptor.parameters.uniforms = {
      ...meshDescriptor.parameters.uniforms,
      ...{
        ibl: {
          struct: {
            envRotation: {
              type: 'mat3x3f',
              value: environmentMap.rotation,
            },
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

    meshDescriptor.parameters.textures = [
      ...meshDescriptor.parameters.textures,
      environmentMap.lutTexture,
      environmentMap.diffuseTexture,
      environmentMap.specularTexture,
    ]

    meshDescriptor.parameters.samplers = [...meshDescriptor.parameters.samplers, environmentMap.sampler]
  } else if (shadingModel === 'IBL') {
    throwWarning('IBL shading requested but the environment map missing. Defaulting to PBR shading.')
    shadingModel = 'PBR'
  }

  const shadingOptions: GetShadingParams = {
    toneMapping: 'khronos',
    receiveShadows: !!meshDescriptor.parameters.receiveShadows,
    useOcclusion: true,
  }

  // transmission
  if (transmissionBackgroundTexture && (shadingModel === 'PBR' || shadingModel === 'IBL')) {
    shadingModel += 'Transmission'
  }

  // user defined chunks
  const defaultAdditionalHead = (() => {
    switch (shadingModel) {
      case 'Lambert':
      default:
        return getLambert(shadingOptions)
      case 'Phong':
        return getPhong(shadingOptions)
      case 'PBR':
      case 'PBRTransmission':
        return getPBR(shadingOptions)
      case 'IBL':
      case 'IBLTransmission':
        return getIBL(shadingOptions)
    }
  })()

  const defaultPreliminaryColor = ''
  const defaultAdditionalColor = ''

  if (!chunks) {
    chunks = {
      additionalFragmentHead: defaultAdditionalHead,
      preliminaryColorContribution: defaultPreliminaryColor,
      additionalColorContribution: defaultAdditionalColor,
    }
  } else {
    if (!chunks.additionalFragmentHead) {
      chunks.additionalFragmentHead = defaultAdditionalHead
    } else {
      chunks.additionalFragmentHead = defaultAdditionalHead + chunks.additionalFragmentHead
    }

    if (!chunks.preliminaryColorContribution) {
      chunks.preliminaryColorContribution = defaultPreliminaryColor
    } else {
      chunks.preliminaryColorContribution = defaultPreliminaryColor + chunks.preliminaryColorContribution
    }

    if (!chunks.additionalColorContribution) {
      chunks.additionalColorContribution = defaultAdditionalColor
    } else {
      chunks.additionalColorContribution = defaultAdditionalColor + chunks.additionalColorContribution
    }
  }

  // TODO shininess, specularStrength, specularColor
  const applyLightShading: string = (() => {
    switch (shadingModel) {
      case 'Lambert':
      default:
        return /* wgsl */ `
  color = vec4(
    getLambert(
      normal,
      worldPosition,
      color.rgb,
      occlusion
    ),
    color.a
  );`
      case 'Phong':
        return /* wgsl */ `
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
      case 'PBR':
        return /* wgsl */ `
  color = getPBR(
    normal,
    worldPosition,
    color,
    viewDirection,
    f0,
    metallic,
    roughness,
    occlusion
  );`
      case 'PBRTransmission':
        return /* wgsl */ `
  color = getPBRTransmission(
    normal,
    worldPosition,
    color,
    viewDirection,
    f0,
    metallic,
    roughness,
    transmission,
    material.ior,
    material.dispersion,
    thickness,
    material.attenuationDistance,
    material.attenuationColor,
    ${transmissionBackgroundTexture.texture},
    ${transmissionBackgroundTexture.sampler},
    occlusion
  );`
      case 'IBL':
        return /* wgsl */ `
  color = getIBL(
    normal,
    worldPosition,
    color,
    viewDirection,
    f0,
    metallic,
    roughness,
    ${environmentMap.sampler.name},
    ${environmentMap.lutTexture.options.name},
    ${environmentMap.specularTexture.options.name},
    ${environmentMap.diffuseTexture.options.name},
    occlusion
  );`
      case 'IBLTransmission':
        return /* wgsl */ `
  color = getIBLTransmission(
    normal,
    worldPosition,
    color,
    viewDirection,
    f0,
    metallic,
    roughness,
    transmission,
    ${environmentMap.sampler.name},
    ${environmentMap.lutTexture.options.name},
    ${environmentMap.specularTexture.options.name},
    ${environmentMap.diffuseTexture.options.name},
    material.ior,
    material.dispersion,
    thickness,
    material.attenuationDistance,
    material.attenuationColor,
    ${transmissionBackgroundTexture.texture},
    ${transmissionBackgroundTexture.sampler},
    occlusion
  );`
    }
  })()

  const applyEmissive = /* wgsl */ `
  color = vec4(color.rgb + emissive, color.a);
  `

  const fs = /* wgsl */ `  
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
  ${transmission}
  ${emissiveOcclusion}
  ${applyLightShading}
  ${applyEmissive}
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
