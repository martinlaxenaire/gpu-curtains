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

  const facultativeAttributes = meshDescriptor.attributes.filter((attribute) => attribute.name !== 'position')

  const structAttributes = facultativeAttributes
    .map((attribute, index) => {
      return `@location(${index}) ${attribute.name}: ${attribute.type},`
    })
    .join('\n\t\t')

  const declareAttributes = meshDescriptor.attributes
    .map((attribute) => {
      return /* wgsl */ `var ${attribute.name} = attributes.${attribute.name};`
    })
    .join('\n\t')

  const outputAttributes = facultativeAttributes
    .filter((attr) => attr.name !== 'normal')
    .map((attribute) => {
      return `vsOutput.${attribute.name} = ${attribute.name};`
    })
    .join('\n\t')

  // VERTEX
  let vertexOutputContent = `
      @builtin(position) position: vec4f,
      ${structAttributes}
      @location(${facultativeAttributes.length}) viewDirection: vec3f,
      @location(${facultativeAttributes.length + 1}) worldPosition: vec3f,
  `

  let outputNormalMap = ''
  const tangentAttribute = facultativeAttributes.find((attr) => attr.name === 'tangent')
  const useNormalMap = !!(normalTexture && tangentAttribute)

  if (useNormalMap) {
    vertexOutputContent += `
      @location(${facultativeAttributes.length + 2}) bitangent: vec3f,
      `

    outputNormalMap = `
        vsOutput.tangent = normalize(matrices.model * tangent);
        vsOutput.bitangent = cross(vsOutput.normal, vsOutput.tangent.xyz) * tangent.w;
      `
  }

  // morph targets
  let morphTargets = ''
  const morphTargetsBindings = meshDescriptor.parameters.bindings
    ? (meshDescriptor.parameters.bindings.filter((binding) => binding.name.includes('morphTarget')) as BufferBinding[])
    : []

  // skins
  let skinTransformations = ''
  const skinJoints = facultativeAttributes.filter((attr) => attr.name.includes('joints'))
  const skinWeights = facultativeAttributes.filter((attr) => attr.name.includes('weights'))
  const skinBindings = meshDescriptor.parameters.bindings
    ? meshDescriptor.parameters.bindings.filter((binding) => binding.name.includes('skin'))
    : []

  const hasSkin = skinJoints.length && skinWeights.length && skinBindings.length

  if (hasSkin) {
    skinJoints.forEach((skinJoint, index) => {
      skinTransformations += /* wgsl */ `let skinMatrix${index}: mat4x4f = 
        ${skinWeights[index].name}.x * skin${index}.joints[u32(${skinJoint.name}.x)].jointMatrix +
        ${skinWeights[index].name}.y * skin${index}.joints[u32(${skinJoint.name}.y)].jointMatrix +
        ${skinWeights[index].name}.z * skin${index}.joints[u32(${skinJoint.name}.z)].jointMatrix +
        ${skinWeights[index].name}.w * skin${index}.joints[u32(${skinJoint.name}.w)].jointMatrix;
      
      worldPos = skinMatrix${index} * worldPos;
      
      // normal
      let skinNormalMatrix${index}: mat4x4f = 
        ${skinWeights[index].name}.x * skin${index}.joints[u32(${skinJoint.name}.x)].normalMatrix +
        ${skinWeights[index].name}.y * skin${index}.joints[u32(${skinJoint.name}.y)].normalMatrix +
        ${skinWeights[index].name}.z * skin${index}.joints[u32(${skinJoint.name}.z)].normalMatrix +
        ${skinWeights[index].name}.w * skin${index}.joints[u32(${skinJoint.name}.w)].normalMatrix;
        
      let skinNormalMatrix${index}_3: mat3x3f = mat3x3f(
        vec3(skinNormalMatrix${index}[0].xyz),
        vec3(skinNormalMatrix${index}[1].xyz),
        vec3(skinNormalMatrix${index}[2].xyz)
      );
        
      normal = skinNormalMatrix${index}_3 * normal;
      normal = normalize(normal);
      `
    })
  }

  let outputPositions = /* wgsl */ `worldPos = matrices.model * worldPos;
      vsOutput.worldPosition = worldPos.xyz / worldPos.w;
      vsOutput.position = camera.projection * camera.view * worldPos;
      vsOutput.viewDirection = camera.position - vsOutput.worldPosition.xyz;
  `
  let outputNormal = hasSkin ? 'vsOutput.normal = normalize(normal);' : 'vsOutput.normal = getWorldNormal(normal);'

  if (meshDescriptor.parameters.storages && meshDescriptor.parameters.storages.instances) {
    outputPositions = /* wgsl */ `worldPos = instances[attributes.instanceIndex].modelMatrix * worldPos;
      vsOutput.worldPosition = worldPos.xyz / worldPos.w;
      vsOutput.position = camera.projection * camera.view * worldPos;
      vsOutput.viewDirection = camera.position - vsOutput.worldPosition;
      `

    outputNormal = hasSkin
      ? 'vsOutput.normal = normalize(normal);'
      : `vsOutput.normal = normalize((instances[attributes.instanceIndex].normalMatrix * vec4(normal, 0.0)).xyz);`
  }

  morphTargetsBindings.forEach((binding) => {
    Object.values(binding.inputs)
      .filter((input) => input.name !== 'weight')
      .forEach((input) => {
        const bindingType = BufferElement.getType(input.type)
        const attributeType = meshDescriptor.attributes.find((attribute) => attribute.name === input.name).type

        if (bindingType === attributeType) {
          morphTargets += `${input.name} += ${binding.name}.weight * ${binding.name}.elements[attributes.vertexIndex].${input.name};\n\t`
        } else {
          // TODO other cases?!
          if (bindingType === 'vec3f' && attributeType === 'vec4f') {
            morphTargets += `${input.name} += ${binding.name}.weight * vec4(${binding.name}.elements[attributes.vertexIndex].${input.name}, 0.0);\n\t`
          }
        }
      })
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
      
      ${declareAttributes}
      ${morphTargets}
      
      var worldPos: vec4f = vec4(position, 1.0);
      
      ${skinTransformations}
      
      ${outputPositions}
      ${outputNormal}
      ${outputAttributes}
      ${outputNormalMap}

      return vsOutput;
    }
  `

  // FRAGMENT
  const initColor = /* wgsl */ 'var color: vec4f = vec4();'
  const returnColor = /* wgsl */ `
      return color;
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

  let normalMap = /* wgsl */ `
      let faceDirection = select(-1.0, 1.0, fsInput.frontFacing);
      let geometryNormal: vec3f = faceDirection * normal;
    `

  if (useNormalMap) {
    normalMap += /* wgsl */ `
      let tbn = mat3x3f(normalize(fsInput.tangent.xyz), normalize(fsInput.bitangent), geometryNormal);
      let normalMap = textureSample(normalTexture, ${normalTexture.sampler}, fsInput.${normalTexture.texCoordAttributeName}).rgb;
      normal = normalize(tbn * (2.0 * normalMap - vec3(material.normalMapScale, material.normalMapScale, 1.0)));
    `
  } else if (normalTexture) {
    normalMap += /* wgsl */ `
      let Q1: vec3f = dpdx(worldPosition);
      let Q2: vec3f = dpdy(worldPosition);
      let st1: vec2f = dpdx(fsInput.${normalTexture.texCoordAttributeName});
      let st2: vec2f = dpdy(fsInput.${normalTexture.texCoordAttributeName});
      
      let T: vec3f = normalize(Q1 * st2.y - Q2 * st1.y);
      let B: vec3f = normalize(-Q1 * st2.x + Q2 * st1.x);
      
      let tbn = mat3x3f(T, B, geometryNormal);
      let normalMap = textureSample(normalTexture, ${normalTexture.sampler}, fsInput.${normalTexture.texCoordAttributeName}).rgb;
      normal = normalize(tbn * (2.0 * normalMap - vec3(material.normalMapScale, material.normalMapScale, 1.0)));
    `
  } else {
    normalMap += /* wgsl */ `
      normal = geometryNormal;
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

  // user defined chunks
  const defaultAdditionalHead = (() => {
    switch (shadingModel) {
      case 'Lambert':
      default:
        return getLambert(shadingOptions)
      case 'Phong':
        return getPhong(shadingOptions)
      case 'PBR':
        return getPBR(shadingOptions)
      case 'IBL':
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
      case 'IBL':
        return /* wgsl */ `
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
