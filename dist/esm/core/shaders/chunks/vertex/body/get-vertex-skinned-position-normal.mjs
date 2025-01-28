const getVertexSkinnedPositionNormal = ({ bindings = [], geometry }) => {
  let output = "";
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

export { getVertexSkinnedPositionNormal };
