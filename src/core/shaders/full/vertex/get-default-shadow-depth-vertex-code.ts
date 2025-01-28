import { VertexShaderInputParams } from './get-vertex-code'
import { declareAttributesVars } from '../../chunks/vertex/body/declare-attributes-vars'
import { getVertexPositionNormal } from '../../chunks/vertex/body/get-vertex-position-normal'

/**
 * Get default ({@link core/lights/DirectionalLight.DirectionalLight | DirectionalLight}) shadow map pass vertex shader.
 * @param lightIndex - Index of the {@link core/lights/DirectionalLight.DirectionalLight | DirectionalLight} for which to render the depth pass.
 * @param parameters - {@link VertexShaderInputParams} used to compute the output `worldPosition` and `normal` vectors.
 */
export const getDefaultShadowDepthVs = (
  lightIndex = 0,
  { bindings = [], geometry }: VertexShaderInputParams
): string => /* wgsl */ `
@vertex fn main(
  attributes: Attributes,
) -> @builtin(position) vec4f {  
  let directionalShadow: DirectionalShadowsElement = directionalShadows.directionalShadowsElements[${lightIndex}];
  
  ${declareAttributesVars({ geometry })}
  ${getVertexPositionNormal({ bindings, geometry })}
  
  let worldPos = worldPosition.xyz / worldPosition.w;
  let lightDirection: vec3f = normalize(worldPos - directionalLights.elements[${lightIndex}].direction);
  let NdotL: f32 = dot(normalize(normal), lightDirection);
  let sinNdotL = sqrt(1.0 - NdotL * NdotL);
  let normalBias: f32 = directionalShadow.normalBias * sinNdotL;
  
  worldPosition = vec4(worldPos - normal * normalBias, 1.0);
  
  return directionalShadow.projectionMatrix * directionalShadow.viewMatrix * worldPosition;
}`
