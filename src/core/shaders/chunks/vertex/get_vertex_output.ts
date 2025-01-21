import { BufferBinding } from '../../../bindings/BufferBinding'
import { Geometry } from '../../../geometries/Geometry'
import { BufferElement } from '../../../bindings/bufferElements/BufferElement'

/** Defines the parameters used to create the vertex shader. */
export interface VertexShaderInputParams {
  /** Array of {@link BufferBinding} used to create the vertex shader. Typical {@link BufferBinding} used are `instances`, and the ones that include `morphTarget` or `skin` in their `name` properties. */
  bindings?: BufferBinding[]
  /** {@link Geometry} used to create the vertex shader. Will use the {@link Geometry#vertexBuffers | vertexBuffers} and {@link Geometry#instancesCount | instancesCount} properties. */
  geometry: Geometry
}

/**
 * Generate the part of the vertex shader dedicated to compute the output `worldPosition` and `normal` vectors. Account for instancing (using a {@link BufferBinding} with `instances` name if any), morph targets and skinning using the provided {@link Geometry} and {@link BufferBinding} array parameters.
 *
 * Used internally by the various {@link core/shadows/Shadow.Shadow | Shadow} classes and the {@link extras/gltf/GLTFScenesManager | GLTFScenesManager} class.
 *
 * @param parameters - {@link VertexShaderInputParams} used to compute the output `worldPosition` and `normal` vectors.
 * @returns - The part of the vertex shader dedicated to computing the output `worldPosition` and `normal` vectors.
 */
export const getVertexPositionNormal = ({ bindings = [], geometry }: VertexShaderInputParams): string => {
  let output = ''

  output += geometry.vertexBuffers
    .map((vertexBuffer) =>
      vertexBuffer.attributes
        .map((attribute) => {
          return /* wgsl */ `
  var ${attribute.name} = attributes.${attribute.name};`
        })
        .join('')
    )
    .join('\n')

  const hasInstances = geometry.instancesCount > 1

  const skinJoints = []
  const skinWeights = []
  if (geometry.vertexBuffers && geometry.vertexBuffers.length) {
    geometry.vertexBuffers.forEach((vertexBuffer) => {
      vertexBuffer.attributes.forEach((attribute) => {
        if (attribute.name.includes('joints')) {
          skinJoints.push(attribute)
        }

        if (attribute.name.includes('weights')) {
          skinWeights.push(attribute)
        }
      })
    })
  }

  const skinBindings = bindings.filter((binding) => binding.name.includes('skin'))
  const morphTargetsBindings = bindings.filter((binding) => binding.name.includes('morphTarget')) as BufferBinding[]

  // morph targets
  morphTargetsBindings.forEach((binding) => {
    const morphAttributes = Object.values(binding.inputs).filter((input) => input.name !== 'weight')

    morphAttributes.forEach((input) => {
      const bindingType = BufferElement.getType(input.type)
      const attribute = geometry.getAttributeByName(input.name)

      if (attribute) {
        const attributeType = attribute.type

        // we could have only one attribute that's morphed
        const attributeBindingVar =
          morphAttributes.length === 1
            ? `${binding.name}.${input.name}[attributes.vertexIndex]`
            : `${binding.name}.elements[attributes.vertexIndex].${input.name}`

        if (bindingType === attributeType) {
          output += `${input.name} += ${binding.name}.weight * ${attributeBindingVar};\n\t`
        } else {
          // TODO other cases?!
          if (bindingType === 'vec3f' && attributeType === 'vec4f') {
            output += `${input.name} += ${binding.name}.weight * vec4(${attributeBindingVar}, 0.0);\n\t`
          }
        }
      }
    })
  })

  output += /* wgsl */ `
  var worldPosition: vec4f = vec4(position, 1.0);
  `

  // skins
  const hasSkin = skinJoints.length && skinWeights.length && skinBindings.length

  if (hasSkin) {
    output += hasInstances
      ? `
  var instancesWorldPosition = array<vec4f, ${geometry.instancesCount}>();
  var instancesNormal = array<vec3f, ${geometry.instancesCount}>();
      `
      : ''

    output += `
  let skinJoints: vec4f = ${skinJoints.map((skinJoint) => skinJoint.name).join(' + ')};`

    output += `
  var skinWeights: vec4f = ${skinWeights.map((skinWeight) => skinWeight.name).join(' + ')};
  
  let skinWeightsSum = dot(skinWeights, vec4(1.0));
  if(skinWeightsSum > 0.0) {
    skinWeights = skinWeights / skinWeightsSum;
  }
    `

    skinBindings.forEach((binding, bindingIndex) => {
      output += /* wgsl */ `
  ${hasInstances ? '// instancing with different skins: joints calculations for skin ' + bindingIndex + '\n' : ''}
  // position
  let skinMatrix_${bindingIndex}: mat4x4f = 
    skinWeights.x * ${binding.name}.joints[u32(skinJoints.x)].jointMatrix +
    skinWeights.y * ${binding.name}.joints[u32(skinJoints.y)].jointMatrix +
    skinWeights.z * ${binding.name}.joints[u32(skinJoints.z)].jointMatrix +
    skinWeights.w * ${binding.name}.joints[u32(skinJoints.w)].jointMatrix;
      
  ${
    hasInstances
      ? 'instancesWorldPosition[' + bindingIndex + '] = skinMatrix_' + bindingIndex + ' * worldPosition;'
      : 'worldPosition = skinMatrix_' + bindingIndex + ' * worldPosition;'
  }
      
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
      
  ${
    hasInstances
      ? 'instancesNormal[' + bindingIndex + '] = skinNormalMatrix_' + bindingIndex + '_3 * normal;'
      : 'normal = skinNormalMatrix_' + bindingIndex + '_3 * normal;'
  }
      `
    })
  }

  output += /* wgsl */ `
  var modelMatrix: mat4x4f;
  `

  if (hasInstances) {
    if (hasSkin) {
      output += /* wgsl */ `
  worldPosition = instancesWorldPosition[attributes.instanceIndex];
  normal = instancesNormal[attributes.instanceIndex];
      `
    }

    output += /* wgsl */ `
  modelMatrix = instances.matrices[attributes.instanceIndex].model;
  worldPosition = modelMatrix * worldPosition;
  
  normal = normalize(instances.matrices[attributes.instanceIndex].normal * normal);
    `
  } else {
    output += /* wgsl */ `
  modelMatrix = matrices.model;
  worldPosition = modelMatrix * worldPosition;
  normal = getWorldNormal(normal);
    `
  }

  return output
}

/**
 * Generate the vertex shader computing the output `worldPosition`, `normal` and other various outputted vectors such as `position`, `viewDirection` and eventually `tangent`. Account for instancing (using a {@link BufferBinding} with `instances` name if any), morph targets and skinning using the provided {@link Geometry} and {@link BufferBinding} array parameters.
 *
 * Uses {@link getVertexPositionNormal} first to compute the `worldPosition` and `normal` vectors, then output everything using the `vsOutput` WGSL struct.
 *
 * Used internally by the {@link extras/gltf/GLTFScenesManager | GLTFScenesManager} class.
 *
 * @param parameters - {@link VertexShaderInputParams} used to generate the vertex shader.
 * @returns - The vertex shader code generated.
 */
export const getFullVertexOutput = ({ bindings = [], geometry }: VertexShaderInputParams): string => {
  let output = getVertexPositionNormal({ bindings, geometry })

  output += /* wgsl */ `
  vsOutput.position = camera.projection * camera.view * worldPosition;
  vsOutput.normal = normal;
  vsOutput.worldPosition = worldPosition.xyz / worldPosition.w;
  vsOutput.viewDirection = camera.position - vsOutput.worldPosition;
  `

  const tangentAttribute = geometry.getAttributeByName('tangent')
  if (tangentAttribute) {
    output += /* wgsl */ `
  vsOutput.tangent = normalize(modelMatrix * tangent);
    `
  }

  // output all attributes except position, normal and tangent
  // since we've handled them above
  output += geometry.vertexBuffers
    .map((vertexBuffer) =>
      vertexBuffer.attributes
        .filter((attr) => attr.name !== 'normal' && attr.name !== 'position' && attr.name !== 'tangent')
        .map((attribute) => {
          return /* wgsl */ `
  vsOutput.${attribute.name} = ${attribute.name};`
        })
        .join('')
    )
    .join('\n')

  return output
}
