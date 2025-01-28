import { declareAttributesVars } from '../../chunks/vertex/body/declare-attributes-vars.mjs';
import { getVertexPositionNormal } from '../../chunks/vertex/body/get-vertex-position-normal.mjs';

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
  
  ${declareAttributesVars({ geometry })}
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

export { getDefaultPointShadowDepthVs };
