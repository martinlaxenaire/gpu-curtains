export type ToneMappingTypes = 'linear' | 'khronos';
export interface GetShadingParams {
    addUtils?: boolean;
    receiveShadows?: boolean;
    toneMapping?: ToneMappingTypes | boolean;
    useOcclusion?: boolean;
}
export declare const lambertUtils: string;
export declare const getLambertDirect = "\nfn getLambertDirect(\n  normal: vec3f,\n  diffuseColor: vec3f,\n  directLight: DirectLight,\n  ptr_reflectedLight: ptr<function, ReflectedLight>\n) {\n  let L = normalize(directLight.direction);\n  let NdotL = max(dot(normal, L), 0.0);\n  \n  let irradiance: vec3f = NdotL * directLight.color;\n  (*ptr_reflectedLight).directDiffuse += irradiance * BRDF_Lambert( diffuseColor );\n}\n";
/**
 * Shader chunk to add to the head of a fragment shader to be able to use lambert shading.
 *
 * @example
 * ```wgsl
 * var color: vec3f = vec3(1.0);
 * color = getLambert(normal, worldPosition, color);
 * ```
 */
export declare const getLambert: ({ addUtils, receiveShadows, toneMapping, useOcclusion }?: GetShadingParams) => string;
