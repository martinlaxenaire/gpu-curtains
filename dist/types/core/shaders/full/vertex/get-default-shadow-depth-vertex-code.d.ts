import { VertexShaderInputParams } from './get-vertex-code';
/**
 * Get default ({@link core/lights/DirectionalLight.DirectionalLight | DirectionalLight}) shadow map pass vertex shader.
 * @param lightIndex - Index of the {@link core/lights/DirectionalLight.DirectionalLight | DirectionalLight} for which to render the depth pass.
 * @param parameters - {@link VertexShaderInputParams} used to compute the output `worldPosition` and `normal` vectors.
 */
export declare const getDefaultShadowDepthVs: (lightIndex: number, { bindings, geometry }: VertexShaderInputParams) => string;
