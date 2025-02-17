import { VertexShaderInputBaseParams } from './get-vertex-shader-code';
/**
 * Get default ({@link core/lights/DirectionalLight.DirectionalLight | DirectionalLight}) shadow map pass vertex shader.
 * @param lightIndex - Index of the {@link core/lights/DirectionalLight.DirectionalLight | DirectionalLight} for which to render the depth pass.
 * @param parameters - {@link VertexShaderInputBaseParams} used to compute the output `worldPosition` and `normal` vectors.
 */
export declare const getDefaultDirectionalShadowDepthVs: (lightIndex: number, { bindings, geometry }: VertexShaderInputBaseParams) => string;
