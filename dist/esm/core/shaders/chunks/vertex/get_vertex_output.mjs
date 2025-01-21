import { BufferElement } from '../../../bindings/bufferElements/BufferElement.mjs';

const getVertexPositionNormal = ({ bindings = [], geometry }) => {
  let output = "";
  output += geometry.vertexBuffers.map(
    (vertexBuffer) => vertexBuffer.attributes.map((attribute) => {
      return (
        /* wgsl */
        `
  var ${attribute.name} = attributes.${attribute.name};`
      );
    }).join("")
  ).join("\n");
  const hasInstances = geometry.instancesCount > 1;
  const skinJoints = [];
  const skinWeights = [];
  if (geometry.vertexBuffers && geometry.vertexBuffers.length) {
    geometry.vertexBuffers.forEach((vertexBuffer) => {
      vertexBuffer.attributes.forEach((attribute) => {
        if (attribute.name.includes("joints")) {
          skinJoints.push(attribute);
        }
        if (attribute.name.includes("weights")) {
          skinWeights.push(attribute);
        }
      });
    });
  }
  const skinBindings = bindings.filter((binding) => binding.name.includes("skin"));
  const morphTargetsBindings = bindings.filter((binding) => binding.name.includes("morphTarget"));
  morphTargetsBindings.forEach((binding) => {
    const morphAttributes = Object.values(binding.inputs).filter((input) => input.name !== "weight");
    morphAttributes.forEach((input) => {
      const bindingType = BufferElement.getType(input.type);
      const attribute = geometry.getAttributeByName(input.name);
      if (attribute) {
        const attributeType = attribute.type;
        const attributeBindingVar = morphAttributes.length === 1 ? `${binding.name}.${input.name}[attributes.vertexIndex]` : `${binding.name}.elements[attributes.vertexIndex].${input.name}`;
        if (bindingType === attributeType) {
          output += `${input.name} += ${binding.name}.weight * ${attributeBindingVar};
	`;
        } else {
          if (bindingType === "vec3f" && attributeType === "vec4f") {
            output += `${input.name} += ${binding.name}.weight * vec4(${attributeBindingVar}, 0.0);
	`;
          }
        }
      }
    });
  });
  output += /* wgsl */
  `
  var worldPosition: vec4f = vec4(position, 1.0);
  `;
  const hasSkin = skinJoints.length && skinWeights.length && skinBindings.length;
  if (hasSkin) {
    output += hasInstances ? `
  var instancesWorldPosition = array<vec4f, ${geometry.instancesCount}>();
  var instancesNormal = array<vec3f, ${geometry.instancesCount}>();
      ` : "";
    output += `
  let skinJoints: vec4f = ${skinJoints.map((skinJoint) => skinJoint.name).join(" + ")};`;
    output += `
  var skinWeights: vec4f = ${skinWeights.map((skinWeight) => skinWeight.name).join(" + ")};
  
  let skinWeightsSum = dot(skinWeights, vec4(1.0));
  if(skinWeightsSum > 0.0) {
    skinWeights = skinWeights / skinWeightsSum;
  }
    `;
    skinBindings.forEach((binding, bindingIndex) => {
      output += /* wgsl */
      `
  ${hasInstances ? "// instancing with different skins: joints calculations for skin " + bindingIndex + "\n" : ""}
  // position
  let skinMatrix_${bindingIndex}: mat4x4f = 
    skinWeights.x * ${binding.name}.joints[u32(skinJoints.x)].jointMatrix +
    skinWeights.y * ${binding.name}.joints[u32(skinJoints.y)].jointMatrix +
    skinWeights.z * ${binding.name}.joints[u32(skinJoints.z)].jointMatrix +
    skinWeights.w * ${binding.name}.joints[u32(skinJoints.w)].jointMatrix;
      
  ${hasInstances ? "instancesWorldPosition[" + bindingIndex + "] = skinMatrix_" + bindingIndex + " * worldPosition;" : "worldPosition = skinMatrix_" + bindingIndex + " * worldPosition;"}
      
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
      
  ${hasInstances ? "instancesNormal[" + bindingIndex + "] = skinNormalMatrix_" + bindingIndex + "_3 * normal;" : "normal = skinNormalMatrix_" + bindingIndex + "_3 * normal;"}
      `;
    });
  }
  output += /* wgsl */
  `
  var modelMatrix: mat4x4f;
  `;
  if (hasInstances) {
    if (hasSkin) {
      output += /* wgsl */
      `
  worldPosition = instancesWorldPosition[attributes.instanceIndex];
  normal = instancesNormal[attributes.instanceIndex];
      `;
    }
    output += /* wgsl */
    `
  modelMatrix = instances.matrices[attributes.instanceIndex].model;
  worldPosition = modelMatrix * worldPosition;
  
  normal = normalize(instances.matrices[attributes.instanceIndex].normal * normal);
    `;
  } else {
    output += /* wgsl */
    `
  modelMatrix = matrices.model;
  worldPosition = modelMatrix * worldPosition;
  normal = getWorldNormal(normal);
    `;
  }
  return output;
};
const getFullVertexOutput = ({ bindings = [], geometry }) => {
  let output = getVertexPositionNormal({ bindings, geometry });
  output += /* wgsl */
  `
  vsOutput.position = camera.projection * camera.view * worldPosition;
  vsOutput.normal = normal;
  vsOutput.worldPosition = worldPosition.xyz / worldPosition.w;
  vsOutput.viewDirection = camera.position - vsOutput.worldPosition;
  `;
  const tangentAttribute = geometry.getAttributeByName("tangent");
  if (tangentAttribute) {
    output += /* wgsl */
    `
  vsOutput.tangent = normalize(modelMatrix * tangent);
    `;
  }
  output += geometry.vertexBuffers.map(
    (vertexBuffer) => vertexBuffer.attributes.filter((attr) => attr.name !== "normal" && attr.name !== "position" && attr.name !== "tangent").map((attribute) => {
      return (
        /* wgsl */
        `
  vsOutput.${attribute.name} = ${attribute.name};`
      );
    }).join("")
  ).join("\n");
  return output;
};

export { getFullVertexOutput, getVertexPositionNormal };
