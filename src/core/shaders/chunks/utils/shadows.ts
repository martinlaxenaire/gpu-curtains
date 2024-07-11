import { DirectionalLight } from '../../../lights/DirectionalLight'
import { PointLight } from '../../../lights/PointLight'
import { CameraRenderer } from '../../../renderers/utils'
import { getLambert, getPhong } from './lights'

// DIRECTIONAL SHADOWS

export const getDefaultShadowDepthVs = (lightShadowIndex = 0) => /* wgsl */ `
@vertex fn main(
  attributes: Attributes,
) -> @builtin(position) vec4f {  
  let directionalShadow: DirectionalShadowsElement = directionalShadows.directionalShadowsElements[${lightShadowIndex}];
  
  var worldPosition: vec4f = matrices.model * vec4(attributes.position, 1.0);
  
  let normal = getWorldNormal(attributes.normal);
  let lightDirection: vec3f = normalize(worldPosition.xyz - directionalLights.elements[${lightShadowIndex}].direction);
  let NdotL: f32 = dot(normalize(normal), lightDirection);
  let sinNdotL = sqrt(1.0 - NdotL * NdotL);
  let normalBias: f32 = directionalShadow.normalBias * sinNdotL;
  
  worldPosition = vec4(worldPosition.xyz - normal * normalBias, worldPosition.w);
  
  return directionalShadow.projectionMatrix * directionalShadow.viewMatrix * worldPosition;
}`

export const getPCFShadowContribution = /* wgsl */ `
fn getPCFShadowContribution(index: i32, worldPosition: vec3f, depthTexture: texture_depth_2d) -> f32 {
  // Percentage-closer filtering. Sample texels in the region
  // to smooth the result.
  var visibility = 0.0;
  
  let lightShadow: DirectionalShadowsElement = directionalShadows.directionalShadowsElements[index];
  
  var shadowCoords: vec3f = vec3((lightShadow.projectionMatrix * lightShadow.viewMatrix * vec4(worldPosition, 1.0)).xyz);
  
  // Convert XY to (0, 1)
  // Y is flipped because texture coords are Y-down.
  shadowCoords = vec3(
    shadowCoords.xy * vec2(0.5, -0.5) + vec2(0.5),
    shadowCoords.z
  );
  
  let size: vec2f = vec2f(textureDimensions(depthTexture).xy);
  
  let oneOverShadowDepthTextureSize: vec2f = 1.0 / size;
  for (var y = -1; y <= 1; y++) {
    for (var x = -1; x <= 1; x++) {
      let offset = vec2f(vec2(x, y)) * oneOverShadowDepthTextureSize;
      
      visibility += textureSampleCompare(
        depthTexture,
        depthComparisonSampler,
        shadowCoords.xy + offset,
        shadowCoords.z - lightShadow.bias
      );
    }
  }
  visibility /= 9.0;
  
  visibility = clamp(visibility, 1.0 - clamp(lightShadow.intensity, 0.0, 1.0), 1.0);
  
  let inFrustum: bool = shadowCoords.x >= 0.0 && shadowCoords.x <= 1.0 && shadowCoords.y >= 0.0 && shadowCoords.y <= 1.0;
  let frustumTest: bool = inFrustum && shadowCoords.z <= 1.0;
  
  return select(1.0, visibility, frustumTest);
}
`

export const getPCFDirectionalShadows = (renderer: CameraRenderer) => {
  const directionalLights = renderer.shadowCastingLights.filter(
    (light) => light.type === 'directionalLights'
  ) as DirectionalLight[]

  return /* wgsl */ `
fn getPCFDirectionalShadows(worldPosition: vec3f) -> array<vec3f, ${directionalLights.length}> {
  var directionalShadowContribution: array<vec3f, ${directionalLights.length}>;
  
  var lightDirection: vec3f;
  var shadow: f32;
  
  ${directionalLights
    .map((light, index) => {
      return `lightDirection = worldPosition - directionalLights.elements[${index}].direction;
      
      directionalShadowContribution[${index}] = directionalLights.elements[${index}].color;
      
      shadow = select( 1.0, getPCFShadowContribution(${index}, worldPosition, shadowDepthTexture${index}), directionalShadows.directionalShadowsElements[${index}].isActive > 0);
      
      directionalShadowContribution[${index}] *= shadow;`
    })
    .join('\n')}
  
  return directionalShadowContribution;
}
`
}

// POINT SHADOWS

export const getDefaultPointShadowDepthVs = (pointShadowIndex = 0) => /* wgsl */ `
struct PointShadowVSOutput {
  @builtin(position) position: vec4f,
  @location(0) worldPosition: vec3f,
}

@vertex fn main(
  attributes: Attributes,
) -> PointShadowVSOutput {  
  var pointShadowVSOutput: PointShadowVSOutput;
  var worldPosition: vec4f = matrices.model * vec4(attributes.position, 1.0);
  
  let pointShadow: PointShadowsElement = pointShadows.pointShadowsElements[${pointShadowIndex}];
  
  let normal = getWorldNormal(attributes.normal);
  let lightDirection: vec3f = normalize(pointLights.elements[${pointShadowIndex}].position - worldPosition.xyz);
  let NdotL: f32 = dot(normalize(normal), lightDirection);
  let sinNdotL = sqrt(1.0 - NdotL * NdotL);
  let normalBias: f32 = pointShadow.normalBias * sinNdotL;
  
  worldPosition = vec4(worldPosition.xyz - normal * normalBias, worldPosition.w);
    
  var position: vec4f = pointShadow.projectionMatrix * pointShadow.viewMatrices[pointShadow.face] * worldPosition;

  pointShadowVSOutput.position = position;
  pointShadowVSOutput.worldPosition = worldPosition.xyz;

  return pointShadowVSOutput;
}`

export const getDefaultPointShadowDepthFs = (pointShadowIndex = 0) => /* wgsl */ `
struct PointShadowVSOutput {
  @builtin(position) position: vec4f,
  @location(0) worldPosition: vec3f,
}

@fragment fn main(fsInput: PointShadowVSOutput) -> @builtin(frag_depth) f32 {
  // get distance between fragment and light source
  var lightDistance: f32 = length(fsInput.worldPosition - pointLights.elements[${pointShadowIndex}].position);
  
  let pointShadow: PointShadowsElement = pointShadows.pointShadowsElements[${pointShadowIndex}];
  
  // map to [0;1] range by dividing by far plane
  lightDistance = (lightDistance - pointShadow.cameraNear) / (pointShadow.cameraFar - pointShadow.cameraNear);
  
  // write this as modified depth
  return clamp(lightDistance, 0.0, 1.0);
}`

// export const getDefaultShadowPosition = /* wgsl */ `
// fn getDefaultPositionFromLight(directionalShadow: DirectionalShadowsElement, position: vec3f) -> vec4f {
//   return directionalShadow.projectionMatrix * directionalShadow.viewMatrix * matrices.model * vec4(position, 1.0);
// }
//
// fn getDefaultShadowPosition(directionalShadow: DirectionalShadowsElement, position: vec3f) -> vec3f {
//   // XY is in (-1, 1) space, Z is in (0, 1) space
//   let positionFromLight: vec4f = getDefaultPositionFromLight(directionalShadow, position);
//
//   // Convert XY to (0, 1)
//   // Y is flipped because texture coords are Y-down.
//   return vec3(
//     positionFromLight.xy * vec2(0.5, -0.5) + vec2(0.5),
//     positionFromLight.z
//   );
// }`
//
// export const getPCFShadowContributionOld = (light: DirectionalLight) => /* wgsl */ {
//   if (!light.shadow.isActive) {
//     return 'fn getPCFShadowContributionOld(directionalShadow: DirectionalShadowsElement, shadowPosition: vec3f) -> f32 { return 1.0; }'
//   } else {
//     return `
// fn getPCFShadowContributionOld(directionalShadow: DirectionalShadowsElement, shadowPosition: vec3f) -> f32 {
//   // Percentage-closer filtering. Sample texels in the region
//   // to smooth the result.
//   var visibility = 0.0;
//
//   let size: vec2f = vec2f(textureDimensions(${light.shadow.depthTexture.options.name}).xy);
//
//   let oneOverShadowDepthTextureSize: vec2f = 1.0 / size;
//   for (var y = -1; y <= 1; y++) {
//     for (var x = -1; x <= 1; x++) {
//       let offset = vec2f(vec2(x, y)) * oneOverShadowDepthTextureSize;
//
//       visibility += textureSampleCompare(
//         ${light.shadow.depthTexture.options.name},
//         depthComparisonSampler,
//         shadowPosition.xy + offset,
//         shadowPosition.z - lightShadow.bias
//       );
//     }
//   }
//   visibility /= 9.0;
//
//   visibility = clamp(visibility, 1.0 - clamp(lightShadow.intensity, 0.0, 1.0), 1.0);
//
//   let inFrustum: bool = shadowPosition.x >= 0.0 && shadowPosition.x <= 1.0 && shadowPosition.y >= 0.0 && shadowPosition.y <= 1.0;
//   let frustumTest: bool = inFrustum && shadowPosition.z <= 1.0;
//
//   return select(1.0, visibility, frustumTest);
// }`
//   }
// }

export const getPCFPointShadowContribution = /* wgsl */ `
fn getPCFPointShadowContribution(index: i32, shadowPosition: vec4f, depthCubeTexture: texture_depth_cube) -> f32 {
  let pointShadow: PointShadowsElement = pointShadows.pointShadowsElements[index];

  // Percentage-closer filtering. Sample texels in the region
  // to smooth the result.
  var visibility = 0.0;
  // var closestDepth = 0.0;
  // let currentDepth: f32 = shadowPosition.w;
  //
  // let maxSize: f32 = f32(max(textureDimensions(pointShadowMapDepthTextureArray).x, textureDimensions(pointShadowMapDepthTextureArray).y));
  //
  // let oneOverShadowDepthTextureSize: vec3f = vec3(1.0 / maxSize);
  // for (var y = -1; y <= 1; y++) {
  //   for (var x = -1; x <= 1; x++) {
  //     for (var z = -1; z <= 1; z++) {
  //       let offset = vec3f(vec3f(vec3(x, y, z)) * oneOverShadowDepthTextureSize);
  //
  //       closestDepth = textureSampleCompare(
  //         pointShadowMapDepthTextureArray,
  //         depthComparisonSampler,
  //         shadowPosition.xyz + offset,
  //         index,
  //         (shadowPosition.w - pointShadow.cameraNear) / (pointShadow.cameraFar - pointShadow.cameraNear)
  //       );
  //
  //       closestDepth *= (pointShadow.cameraFar - pointShadow.cameraNear);
  //       if(currentDepth - pointShadow.bias <= closestDepth) {
  //         visibility += 1.0;
  //       }
  //     }
  //   }
  // }
  // visibility /= 27.0;
  
  var shadow = 1.0;
  let lightToPosition: vec3f = shadowPosition.xyz;
  let lightToPositionLength: f32 = shadowPosition.w;
  let shadowRadius: f32 = 1.0;

  var dp: f32 = ( lightToPositionLength - pointShadow.cameraNear ) / ( pointShadow.cameraFar - pointShadow.cameraNear );
  dp -= pointShadow.bias;
  let bd3D: vec3f = normalize( lightToPosition );
  let texelSize: vec2f = vec2( 1.0 ) / ( vec2f(textureDimensions(depthCubeTexture).xy) * vec2( 4.0, 2.0 ) );
  let offset: vec2f = vec2( -1, 1 ) * shadowRadius * texelSize.y;
  shadow = (
    textureSampleCompare(
      depthCubeTexture,
      depthComparisonSampler,
      bd3D + offset.xyy * texelSize.y,
      dp
    ) +
    textureSampleCompare(
      depthCubeTexture,
      depthComparisonSampler,
      bd3D + offset.yyy * texelSize.y,
      dp
    ) +
    textureSampleCompare(
      depthCubeTexture,
      depthComparisonSampler,
      bd3D + offset.xyx * texelSize.y,
      dp
    ) +
    textureSampleCompare(
      depthCubeTexture,
      depthComparisonSampler,
      bd3D + offset.yyx * texelSize.y,
      dp
    ) +
    textureSampleCompare(
      depthCubeTexture,
      depthComparisonSampler,
      bd3D,
      dp
    ) +
    textureSampleCompare(
      depthCubeTexture,
      depthComparisonSampler,
      bd3D + offset.xxy * texelSize.y,
      dp
    ) +
    textureSampleCompare(
      depthCubeTexture,
      depthComparisonSampler,
      bd3D + offset.yxy * texelSize.y,
      dp
    ) +
    textureSampleCompare(
      depthCubeTexture,
      depthComparisonSampler,
      bd3D + offset.xxx * texelSize.y,
      dp
    ) +
    textureSampleCompare(
      depthCubeTexture,
      depthComparisonSampler,
      bd3D + offset.yxx * texelSize.y,
      dp
    )
  ) * ( 1.0 / 9.0 );


  shadow = select(1.0, shadow, lightToPositionLength - pointShadow.cameraFar <= 0.0 && lightToPositionLength - pointShadow.cameraNear >= 0.0);

  visibility = mix( 1.0, shadow, pointShadow.intensity );
  
  // visibility = select(0.0, 1.0 - shadow, lightToPositionLength - pointShadow.cameraFar <= 0.0 && lightToPositionLength - pointShadow.cameraNear >= 0.0);
  // visibility = clamp(visibility, 1.0 - clamp(pointShadow.intensity, 0.0, 1.0), 1.0);
  
  // closestDepth = textureSampleCompare(
  //   pointShadowMapDepthTextureArray,
  //   depthComparisonSampler,
  //   shadowPosition.xyz,
  //   index,
  //   (shadowPosition.w - 0.1) / (150.0 - 0.1)
  // );
  //
  // closestDepth *= (150.0 - 0.1);
  //
  // // now test for shadows
  // visibility = select(1.0, 0.0, currentDepth - pointShadow.bias > closestDepth);
  
  //visibility = clamp(visibility, 1.0 - clamp(pointShadow.intensity, 0.0, 1.0), 1.0);
  
  return visibility;
}`

export const getPCFPointShadows = (renderer: CameraRenderer) => {
  const pointLights = renderer.shadowCastingLights.filter((light) => light.type === 'pointLights') as PointLight[]

  return /* wgsl */ `
fn getPCFPointShadows(worldPosition: vec3f) -> array<vec3f, ${pointLights.length}> {
  var pointShadowContribution: array<vec3f, ${pointLights.length}>;
  
  var lightDirection: vec3f;
  var attenuation: f32;
  var shadow: f32;
  
  ${pointLights
    .map((light, index) => {
      return `lightDirection = pointLights.elements[${index}].position - worldPosition;
      
      attenuation = rangeAttenuation(pointLights.elements[${index}].range, length(lightDirection));
      pointShadowContribution[${index}] = pointLights.elements[${index}].color * attenuation;
      
      shadow = select( 1.0, getPCFPointShadowContribution(${index}, vec4(lightDirection, length(lightDirection)), pointShadowCubeDepthTexture${index}), pointShadows.pointShadowsElements[${index}].isActive > 0);
      
      pointShadowContribution[${index}] *= shadow;`
    })
    .join('\n')}
  
  return pointShadowContribution;
}
`
}

export const getLambertWithShadows = /* wgsl */ `
${getLambert}

fn getLambertWithShadows(
  normal: vec3f,
  worldPosition: vec3f,
  diffuseColor: vec3f
) -> vec3f {
  var directLight: DirectLight;
  var reflectedLight: ReflectedLight;
  
  let pointShadows = getPCFPointShadows(worldPosition);
  let directionalShadows = getPCFDirectionalShadows(worldPosition);

  // point lights
  for(var i = 0; i < pointLights.count; i++) {
    getPointLightInfo(pointLights.elements[i], worldPosition, &directLight);
    
    if(directLight.visible) {
      directLight.color *= pointShadows[i];
    }
    
    getLambertDirect(normal, diffuseColor, directLight, &reflectedLight);
  }
  
  // directional lights
  for(var i = 0; i < directionalLights.count; i++) {
    getDirectionalLightInfo(directionalLights.elements[i], worldPosition, &directLight);
    
    directLight.color *= directionalShadows[i];
    
    getLambertDirect(normal, diffuseColor, directLight, &reflectedLight);
  }
  
  // ambient lights
  getLambertTotalIndirectDiffuse(diffuseColor, &reflectedLight);
  
  let outgoingLight: vec3f = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular;
  
  return linearToOutput3(outgoingLight);
}
`

export const getPhongWithShadows = /* wgsl */ `
${getPhong}

fn getPhongWithShadows(
  normal: vec3f,
  worldPosition: vec3f,
  diffuseColor: vec3f,
  viewDirection: vec3f,
  specularColor: vec3f,
  specularStrength: f32,
  shininess: f32
) -> vec3f {
  var directLight: DirectLight;
  var reflectedLight: ReflectedLight;
  
  let pointShadows = getPCFPointShadows(worldPosition);
  let directionalShadows = getPCFDirectionalShadows(worldPosition);

  // point lights
  for(var i = 0; i < pointLights.count; i++) {
    getPointLightInfo(pointLights.elements[i], worldPosition, &directLight);
    
    if(directLight.visible) {
      directLight.color *= pointShadows[i];
    }
    
    getPhongDirect(normal, diffuseColor, viewDirection, specularColor, specularStrength, shininess, directLight, &reflectedLight);
  }
  
  // directional lights
  for(var i = 0; i < directionalLights.count; i++) {
    getDirectionalLightInfo(directionalLights.elements[i], worldPosition, &directLight);
    
    directLight.color *= directionalShadows[i];
    
    getPhongDirect(normal, diffuseColor, viewDirection, specularColor, specularStrength, shininess, directLight, &reflectedLight);
  }
  
  // ambient lights
  getLambertTotalIndirectDiffuse(diffuseColor, &reflectedLight);
  
  let outgoingLight: vec3f = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular;
  
  return linearToOutput3(outgoingLight);
}
`
