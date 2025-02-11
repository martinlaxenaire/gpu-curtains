import { VertexShaderInputParams } from './get-vertex-shader-code';
/**
 * Get {@link core/lights/PointLight.PointLight | PointLight} shadow map pass vertex shader.
 * @param lightIndex - Index of the {@link core/lights/PointLight.PointLight | PointLight} for which to render the depth pass.
 * @param parameters - {@link VertexShaderInputParams} used to compute the output `worldPosition` and `normal` vectors.
 */
export declare const getDefaultPointShadowDepthVs: (lightIndex: number, { bindings, geometry }: VertexShaderInputParams) => string;
