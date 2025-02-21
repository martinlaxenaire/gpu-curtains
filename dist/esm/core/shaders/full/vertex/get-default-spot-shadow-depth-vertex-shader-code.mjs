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
  
  let worldPos = worldPosition.xyz / worldPosition.w;
  
  let lightDirection: vec3f = normalize(worldPos - spotShadow.direction);
  let NdotL: f32 = dot(normal, lightDirection);
  let sinNdotL = sqrt(1.0 - NdotL * NdotL);
  let normalBias: f32 = spotShadow.normalBias * sinNdotL;
  
  worldPosition = vec4(worldPos - normal * normalBias, 1.0);
  
  return spotShadow.projectionMatrix * spotShadow.viewMatrix * worldPosition;
}`
);

export { getDefaultSpotShadowDepthVs };
