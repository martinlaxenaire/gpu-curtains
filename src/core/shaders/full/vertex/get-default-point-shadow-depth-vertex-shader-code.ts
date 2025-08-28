import { VertexShaderInputParams } from './get-vertex-shader-code'
import { declareAttributesVars } from '../../chunks/vertex/body/declare-attributes-vars'
import { getVertexTransformedPositionNormal } from '../../chunks/vertex/body/get-vertex-transformed-position-normal'

/**
 * Get {@link core/lights/PointLight.PointLight | PointLight} shadow map pass vertex shader.
 * @param lightIndex - Index of the {@link core/lights/PointLight.PointLight | PointLight} for which to render the depth pass.
 * @param parameters - {@link VertexShaderInputParams} used to compute the output `worldPosition` and `normal` vectors.
 */
export const getDefaultPointShadowDepthVs = (
  lightIndex = 0,
  { bindings = [], geometry }: VertexShaderInputParams
) => /* wgsl */ `
struct PointShadowVSOutput {
  @builtin(position) position: vec4f,
  @location(0) worldPosition: vec3f,
}

@vertex fn main(
  attributes: Attributes,
) -> PointShadowVSOutput {  
  var pointShadowVSOutput: PointShadowVSOutput;
  let pointShadow: PointShadowsElement = pointShadows.pointShadowsElements[${lightIndex}];
  
  ${declareAttributesVars({ geometry })}
  ${getVertexTransformedPositionNormal({ bindings, geometry })}
  
  let worldPos = worldPosition.xyz / worldPosition.w;

  // TODO accessing viewMatrices from our pointShadow reference makes Firefox bug?!
  // let viewMatrix: mat4x4f = pointShadow.viewMatrices[cubeFace.face];
  // we need to access it directly instead!
  let viewMatrix: mat4x4f = pointShadows.pointShadowsElements[${lightIndex}].viewMatrices[cubeFace.face];
  
  // shadows calculations in view space instead of world space
  // prevents world-space scaling issues for normal bias
  var shadowViewPos: vec3f = (viewMatrix * worldPosition).xyz;
  let lightViewPos: vec3f = (viewMatrix * vec4(pointShadow.position, 1.0)).xyz;

  // Transform normal into shadow view space
  let shadowNormal: vec3f = normalize((viewMatrix * vec4(normal, 0.0)).xyz);
  
  // Compute light direction in shadow space
  let lightDirection: vec3f = normalize(lightViewPos - shadowViewPos);
  
  let NdotL: f32 = dot(shadowNormal, lightDirection);
  let sinNdotL = sqrt(1.0 - NdotL * NdotL);
  let normalBias: f32 = pointShadow.normalBias * sinNdotL;
  
  // Apply bias in shadow view space
  shadowViewPos -= shadowNormal * normalBias;
  
  pointShadowVSOutput.position = pointShadow.projectionMatrix * vec4(shadowViewPos, 1.0);
  pointShadowVSOutput.worldPosition = worldPos;
  
  return pointShadowVSOutput;
}`
