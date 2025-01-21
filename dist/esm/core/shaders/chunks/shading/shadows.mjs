import { getVertexPositionNormal } from '../vertex/get_vertex_output.mjs';

const getDefaultShadowDepthVs = (lightIndex = 0, { bindings = [], geometry }) => (
  /* wgsl */
  `
@vertex fn main(
  attributes: Attributes,
) -> @builtin(position) vec4f {  
  let directionalShadow: DirectionalShadowsElement = directionalShadows.directionalShadowsElements[${lightIndex}];
  
  ${getVertexPositionNormal({ bindings, geometry })}
  
  let worldPos = worldPosition.xyz / worldPosition.w;
  let lightDirection: vec3f = normalize(worldPos - directionalLights.elements[${lightIndex}].direction);
  let NdotL: f32 = dot(normalize(normal), lightDirection);
  let sinNdotL = sqrt(1.0 - NdotL * NdotL);
  let normalBias: f32 = directionalShadow.normalBias * sinNdotL;
  
  worldPosition = vec4(worldPos - normal * normalBias, 1.0);
  
  return directionalShadow.projectionMatrix * directionalShadow.viewMatrix * worldPosition;
}`
);
const getPCFShadowContribution = (
  /* wgsl */
  `
fn getPCFShadowContribution(index: i32, worldPosition: vec3f, depthTexture: texture_depth_2d) -> f32 {
  let directionalShadow: DirectionalShadowsElement = directionalShadows.directionalShadowsElements[index];
  
  // get shadow coords
  var shadowCoords: vec3f = vec3((directionalShadow.projectionMatrix * directionalShadow.viewMatrix * vec4(worldPosition, 1.0)).xyz);
  
  // Convert XY to (0, 1)
  // Y is flipped because texture coords are Y-down.
  shadowCoords = vec3(
    shadowCoords.xy * vec2(0.5, -0.5) + vec2(0.5),
    shadowCoords.z
  );
  
  var visibility = 0.0;
  
  let inFrustum: bool = shadowCoords.x >= 0.0 && shadowCoords.x <= 1.0 && shadowCoords.y >= 0.0 && shadowCoords.y <= 1.0;
  let frustumTest: bool = inFrustum && shadowCoords.z <= 1.0;
  
  if(frustumTest) {
    // Percentage-closer filtering. Sample texels in the region
    // to smooth the result.
    let size: vec2f = vec2f(textureDimensions(depthTexture).xy);
  
    let texelSize: vec2f = 1.0 / size;
    
    let sampleCount: i32 = directionalShadow.pcfSamples;
    let maxSamples: f32 = f32(sampleCount) - 1.0;
  
    for (var x = 0; x < sampleCount; x++) {
      for (var y = 0; y < sampleCount; y++) {
        let offset = texelSize * vec2(
          f32(x) - maxSamples * 0.5,
          f32(y) - maxSamples * 0.5
        );
        
        visibility += textureSampleCompareLevel(
          depthTexture,
          depthComparisonSampler,
          shadowCoords.xy + offset,
          shadowCoords.z - directionalShadow.bias
        );
      }
    }
    visibility /= f32(sampleCount * sampleCount);
    
    visibility = clamp(visibility, 1.0 - clamp(directionalShadow.intensity, 0.0, 1.0), 1.0);
  }
  else {
    visibility = 1.0;
  }
  
  return visibility;
}
`
);
const getPCFDirectionalShadows = (renderer) => {
  const directionalLights = renderer.shadowCastingLights.filter(
    (light) => light.type === "directionalLights"
  );
  const minDirectionalLights = Math.max(renderer.lightsBindingParams.directionalLights.max, 1);
  return (
    /* wgsl */
    `
fn getPCFDirectionalShadows(worldPosition: vec3f) -> array<f32, ${minDirectionalLights}> {
  var directionalShadowContribution: array<f32, ${minDirectionalLights}>;
  
  var lightDirection: vec3f;
  
  ${directionalLights.map((light, index) => {
      return `lightDirection = worldPosition - directionalLights.elements[${index}].direction;
      
      ${light.shadow.isActive ? `
      if(directionalShadows.directionalShadowsElements[${index}].isActive > 0) {
        directionalShadowContribution[${index}] = getPCFShadowContribution(
          ${index},
          worldPosition,
          shadowDepthTexture${index}
        );
      } else {
        directionalShadowContribution[${index}] = 1.0;
      }
          ` : `directionalShadowContribution[${index}] = 1.0;`}`;
    }).join("\n")}
  
  return directionalShadowContribution;
}
`
  );
};
const getDefaultPointShadowDepthVs = (lightIndex = 0, { bindings = [], geometry }) => (
  /* wgsl */
  `
struct PointShadowVSOutput {
  @builtin(position) position: vec4f,
  @location(0) worldPosition: vec3f,
}

@vertex fn main(
  attributes: Attributes,
) -> PointShadowVSOutput {  
  var pointShadowVSOutput: PointShadowVSOutput;
  
  ${getVertexPositionNormal({ bindings, geometry })}
  
  let worldPos = worldPosition.xyz / worldPosition.w;
  
  let pointShadow: PointShadowsElement = pointShadows.pointShadowsElements[${lightIndex}];
  
  let lightDirection: vec3f = normalize(pointLights.elements[${lightIndex}].position - worldPos);
  let NdotL: f32 = dot(normalize(normal), lightDirection);
  let sinNdotL = sqrt(1.0 - NdotL * NdotL);
  let normalBias: f32 = pointShadow.normalBias * sinNdotL;
  
  worldPosition = vec4(worldPos - normal * normalBias, 1.0);
    
  var shadowPosition: vec4f = pointShadow.projectionMatrix * pointShadow.viewMatrices[pointShadow.face] * worldPosition;

  pointShadowVSOutput.position = shadowPosition;
  pointShadowVSOutput.worldPosition = worldPos;

  return pointShadowVSOutput;
}`
);
const getDefaultPointShadowDepthFs = (lightIndex = 0) => (
  /* wgsl */
  `
struct PointShadowVSOutput {
  @builtin(position) position: vec4f,
  @location(0) worldPosition: vec3f,
}

@fragment fn main(fsInput: PointShadowVSOutput) -> @builtin(frag_depth) f32 {
  // get distance between fragment and light source
  var lightDistance: f32 = length(fsInput.worldPosition - pointLights.elements[${lightIndex}].position);
  
  let pointShadow: PointShadowsElement = pointShadows.pointShadowsElements[${lightIndex}];
  
  // map to [0, 1] range by dividing by far plane - near plane
  lightDistance = (lightDistance - pointShadow.cameraNear) / (pointShadow.cameraFar - pointShadow.cameraNear);
  
  // write this as modified depth
  return clamp(lightDistance, 0.0, 1.0);
}`
);
const getPCFPointShadowContribution = (
  /* wgsl */
  `
fn getPCFPointShadowContribution(index: i32, shadowPosition: vec4f, depthCubeTexture: texture_depth_cube) -> f32 {
  let pointShadow: PointShadowsElement = pointShadows.pointShadowsElements[index];

  // Percentage-closer filtering. Sample texels in the region
  // to smooth the result.
  var visibility = 0.0;
  var closestDepth = 0.0;
  let currentDepth: f32 = shadowPosition.w;
  let cameraRange: f32 = pointShadow.cameraFar - pointShadow.cameraNear;
  let normalizedDepth: f32 = (shadowPosition.w - pointShadow.cameraNear) / cameraRange;

  let maxSize: f32 = f32(max(textureDimensions(depthCubeTexture).x, textureDimensions(depthCubeTexture).y));

  let texelSize: vec3f = vec3(1.0 / maxSize);
  let sampleCount: i32 = pointShadow.pcfSamples;
  let maxSamples: f32 = f32(sampleCount) - 1.0;
  
  for (var x = 0; x < sampleCount; x++) {
    for (var y = 0; y < sampleCount; y++) {
      for (var z = 0; z < sampleCount; z++) {
        let offset = texelSize * vec3(
          f32(x) - maxSamples * 0.5,
          f32(y) - maxSamples * 0.5,
          f32(z) - maxSamples * 0.5
        );

        closestDepth = textureSampleCompareLevel(
          depthCubeTexture,
          depthComparisonSampler,
          shadowPosition.xyz + offset,
          normalizedDepth - pointShadow.bias
        );

        closestDepth *= cameraRange;

        visibility += select(0.0, 1.0, currentDepth <= closestDepth);
      }
    }
  }
  
  visibility /= f32(sampleCount * sampleCount * sampleCount);
  
  visibility = clamp(visibility, 1.0 - clamp(pointShadow.intensity, 0.0, 1.0), 1.0);
  
  return visibility;
}`
);
const getPCFPointShadows = (renderer) => {
  const pointLights = renderer.shadowCastingLights.filter((light) => light.type === "pointLights");
  const minPointLights = Math.max(renderer.lightsBindingParams.pointLights.max, 1);
  return (
    /* wgsl */
    `
fn getPCFPointShadows(worldPosition: vec3f) -> array<f32, ${minPointLights}> {
  var pointShadowContribution: array<f32, ${minPointLights}>;
  
  var lightDirection: vec3f;
  var lightDistance: f32;
  var lightColor: vec3f;
  
  ${pointLights.map((light, index) => {
      return `lightDirection = pointLights.elements[${index}].position - worldPosition;
      
      lightDistance = length(lightDirection);
      lightColor = pointLights.elements[${index}].color * rangeAttenuation(pointLights.elements[${index}].range, lightDistance);
      
      ${light.shadow.isActive ? `
      if(pointShadows.pointShadowsElements[${index}].isActive > 0 && length(lightColor) > 0.0001) {
        pointShadowContribution[${index}] = getPCFPointShadowContribution(
          ${index},
          vec4(lightDirection, length(lightDirection)),
          pointShadowCubeDepthTexture${index}
        );
      } else {
        pointShadowContribution[${index}] = 1.0;
      }
            ` : `pointShadowContribution[${index}] = 1.0;`}`;
    }).join("\n")}
  
  return pointShadowContribution;
}
`
  );
};
const getPCFShadows = (
  /* wgsl */
  `
  let pointShadows = getPCFPointShadows(worldPosition);
  let directionalShadows = getPCFDirectionalShadows(worldPosition);
`
);
const applyDirectionalShadows = (
  /* wgsl */
  `
    directLight.color *= directionalShadows[i];
`
);
const applyPointShadows = (
  /* wgsl */
  `
    directLight.color *= pointShadows[i];
`
);

export { applyDirectionalShadows, applyPointShadows, getDefaultPointShadowDepthFs, getDefaultPointShadowDepthVs, getDefaultShadowDepthVs, getPCFDirectionalShadows, getPCFPointShadowContribution, getPCFPointShadows, getPCFShadowContribution, getPCFShadows };
