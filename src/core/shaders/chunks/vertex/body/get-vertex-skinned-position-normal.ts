import { VertexShaderInputBaseParams } from '../../../full/vertex/get-vertex-shader-code'

/**
 * Compute the skinning transformations using the provided {@link core/geometries/Geometry.Geometry | Geometry} and {@link core/bindings/BufferBinding.BufferBinding | BufferBinding} array parameters if any.
 * @param parameters - {@link VertexShaderInputBaseParams} used to compute the skinned `worldPosition` and `normal` vectors if any skinning is defined in the {@link core/geometries/Geometry.Geometry | Geometry} attributes.
 * @returns - The part of the vertex shader where the skinning is applied.
 */
export const getVertexSkinnedPositionNormal = ({ bindings = [], geometry }: VertexShaderInputBaseParams): string => {
  let output = ''

  const hasInstances = geometry.instancesCount > 1 && bindings.find((binding) => binding.name === 'instances')

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

  const hasSkin = skinJoints.length && skinWeights.length && skinBindings.length

  if (hasSkin) {
    output += hasInstances
      ? /* wgsl */ `
  var instancesWorldPosition = array<vec4f, ${geometry.instancesCount}>();
  var instancesNormal = array<vec3f, ${geometry.instancesCount}>();
      `
      : ''

    output += /* wgsl */ `
  let skinJoints: vec4u = vec4u(${skinJoints.map((skinJoint) => skinJoint.name).join(' + ')});`

    output += /* wgsl */ `
  var skinWeights: vec4f = vec4f(${skinWeights.map((skinWeight) => skinWeight.name).join(' + ')});
  
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
    skinWeights.x * ${binding.name}.joints[skinJoints.x].jointMatrix +
    skinWeights.y * ${binding.name}.joints[skinJoints.y].jointMatrix +
    skinWeights.z * ${binding.name}.joints[skinJoints.z].jointMatrix +
    skinWeights.w * ${binding.name}.joints[skinJoints.w].jointMatrix;
      
  ${
    hasInstances
      ? 'instancesWorldPosition[' + bindingIndex + '] = skinMatrix_' + bindingIndex + ' * worldPosition;'
      : 'worldPosition = skinMatrix_' + bindingIndex + ' * worldPosition;'
  }
      
  // normal
  let skinNormalMatrix_${bindingIndex}: mat4x4f = 
    skinWeights.x * ${binding.name}.joints[skinJoints.x].normalMatrix +
    skinWeights.y * ${binding.name}.joints[skinJoints.y].normalMatrix +
    skinWeights.z * ${binding.name}.joints[skinJoints.z].normalMatrix +
    skinWeights.w * ${binding.name}.joints[skinJoints.w].normalMatrix;
    
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
  worldPosition = instancesWorldPosition[instanceIndex];
  normal = instancesNormal[instanceIndex];
      `
    }

    output += /* wgsl */ `
  modelMatrix = instances.matrices[instanceIndex].model;
  worldPosition = modelMatrix * worldPosition;
  normal = normalize(instances.matrices[instanceIndex].normal * normal) * instances.matrices[instanceIndex].handedness;
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
