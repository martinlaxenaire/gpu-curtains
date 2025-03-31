import { VertexShaderInputBaseParams } from './get-vertex-shader-code'
import { declareAttributesVars } from '../../chunks/vertex/body/declare-attributes-vars'
import { getVertexTransformedPositionNormal } from '../../chunks/vertex/body/get-vertex-transformed-position-normal'

/**
 * Get default ({@link core/lights/DirectionalLight.DirectionalLight | DirectionalLight}) shadow map pass vertex shader.
 * @param lightIndex - Index of the {@link core/lights/DirectionalLight.DirectionalLight | DirectionalLight} for which to render the depth pass.
 * @param parameters - {@link VertexShaderInputBaseParams} used to compute the output `worldPosition` and `normal` vectors.
 */
export const getDefaultDirectionalShadowDepthVs = (
  lightIndex = 0,
  { bindings = [], geometry }: VertexShaderInputBaseParams
): string => /* wgsl */ `
@vertex fn main(
  attributes: Attributes,
) -> @builtin(position) vec4f {  
  let directionalShadow: DirectionalShadowsElement = directionalShadows.directionalShadowsElements[${lightIndex}];
  
  ${declareAttributesVars({ geometry })}
  ${getVertexTransformedPositionNormal({ bindings, geometry })}
  
  // shadows calculations in view space instead of world space
  // prevents world-space scaling issues for normal bias
  let viewMatrix: mat4x4f = directionalShadow.viewMatrix;
  var shadowViewPos: vec3f = (viewMatrix * worldPosition).xyz;

  // Transform normal into shadow view space
  let shadowNormal: vec3f = normalize((viewMatrix * vec4(normal, 0.0)).xyz);
  
  // Light direction remains constant in shadow space
  let lightDirection: vec3f = normalize((viewMatrix * vec4(-directionalShadow.direction, 0.0)).xyz);
  
  let NdotL: f32 = dot(shadowNormal, lightDirection);
  let sinNdotL = sqrt(1.0 - NdotL * NdotL);
  let normalBias: f32 = directionalShadow.normalBias * sinNdotL;
  
  // Apply bias in shadow view space
  shadowViewPos -= shadowNormal * normalBias;
  
  // Transform to shadow clip space
  return directionalShadow.projectionMatrix * vec4(shadowViewPos, 1.0);
}`
