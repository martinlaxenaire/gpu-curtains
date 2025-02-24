import { declareAttributesVars } from '../../chunks/vertex/body/declare-attributes-vars.mjs';
import { getVertexTransformedPositionNormal } from '../../chunks/vertex/body/get-vertex-transformed-position-normal.mjs';

const getDefaultSpotShadowDepthVs = (lightIndex = 0, { bindings = [], geometry }) => (
  /* wgsl */
  `
struct SpotShadowVSOutput {
  @builtin(position) position: vec4f,
  @location(0) worldPosition: vec3f,
}

@vertex fn main(
  attributes: Attributes,
) -> @builtin(position) vec4f {  
  var spotShadowVSOutput: SpotShadowVSOutput;
  let spotShadow: SpotShadowsElement = spotShadows.spotShadowsElements[${lightIndex}];
  
  ${declareAttributesVars({ geometry })}
  ${getVertexTransformedPositionNormal({ bindings, geometry })}
  
  // shadows calculations in view space instead of world space
  // prevents world-space scaling issues for normal bias
  let viewMatrix: mat4x4f = spotShadow.viewMatrix;
  var shadowViewPos: vec3f = (viewMatrix * worldPosition).xyz;
  let lightViewPos: vec3f = (viewMatrix * vec4(spotShadow.position, 1.0)).xyz;

  // Transform normal into shadow view space
  let shadowNormal: vec3f = normalize((viewMatrix * vec4(normal, 0.0)).xyz);
  
  // Compute light direction in shadow space
  let lightDirection: vec3f = normalize(lightViewPos - shadowViewPos);
  
  let NdotL: f32 = dot(shadowNormal, lightDirection);
  let sinNdotL = sqrt(1.0 - NdotL * NdotL);
  let normalBias: f32 = spotShadow.normalBias * sinNdotL;
  
  // Apply bias in shadow view space
  shadowViewPos -= shadowNormal * normalBias;
  
  return spotShadow.projectionMatrix * vec4(shadowViewPos, 1.0);
}`
);

export { getDefaultSpotShadowDepthVs };
