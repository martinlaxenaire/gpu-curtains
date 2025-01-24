import { GetShadingParams } from './lambert-shading';
/** Basic minimum utils needed to compute PBR shading. Extends {@link lambertUtils | utils needed for lambert shading}. */
export declare const pbrUtils: string;
/** Helper function chunk appended internally and used to compute PBR direct light contributions. */
export declare const getPBRDirect = "\nfn DistributionGGX(NdotH: f32, roughness: f32) -> f32 {\n  let a: f32 = pow2( roughness );\n  let a2: f32 = pow2( a );\n\n  let denom: f32 = (pow2( NdotH ) * (a2 - 1.0) + 1.0);\n\n  return RECIPROCAL_PI * a2 / ( pow2( denom ) );\n}\n\nfn GeometrySmith(NdotL: f32, NdotV: f32, roughness: f32) -> f32 {\n  let a: f32 = pow2( roughness );\n  let a2: f32 = pow2( a );\n  \n  let gv: f32 = NdotL * sqrt( a2 + ( 1.0 - a2 ) * pow2( NdotV ) );\n  let gl: f32 = NdotV * sqrt( a2 + ( 1.0 - a2 ) * pow2( NdotL ) );\n\n  return 0.5 / max( gv + gl, EPSILON );\n}\n\nfn BRDF_GGX(\n  NdotV: f32,\n  NdotL: f32,\n  NdotH: f32,\n  VdotH: f32,\n  roughness: f32,\n  specularFactor: f32,\n  specularColor: vec3f\n) -> vec3f {\n  // cook-torrance brdf\n  let G: f32 = GeometrySmith(NdotL, NdotV, roughness);\n  let D: f32 = DistributionGGX(NdotH, roughness);\n  let F: vec3f = F_Schlick(VdotH, specularColor, specularFactor);\n  \n  return G * D * F;\n}\n\nfn getPBRDirect(\n  normal: vec3f,\n  diffuseColor: vec3f,\n  viewDirection: vec3f,\n  specularFactor: f32,\n  specularColor: vec3f,\n  metallic: f32,\n  roughness: f32,\n  directLight: DirectLight,\n  ptr_reflectedLight: ptr<function, ReflectedLight>\n) {\n  let N: vec3f = normalize(normal);\n  let L: vec3f = normalize(directLight.direction);\n  let V: vec3f = normalize(viewDirection);\n  let H: vec3f = normalize(V + L);\n  let NdotV: f32 = clamp(dot(N, V), 0.0, 1.0);\n  let NdotL: f32 = clamp(dot(N, L), 0.0, 1.0);\n  let NdotH: f32 = clamp(dot(N, H), 0.0, 1.0);\n  let VdotH: f32 = clamp(dot(V, H), 0.0, 1.0);\n\n  let irradiance: vec3f = NdotL * directLight.color;\n  let ggx: vec3f = BRDF_GGX(NdotV, NdotL, NdotH, VdotH, roughness, specularFactor, specularColor);\n  \n  let diffuseContribution: vec3f = BRDF_Lambert(diffuseColor);\n  \n  (*ptr_reflectedLight).directDiffuse += irradiance * diffuseContribution;\n  (*ptr_reflectedLight).directSpecular += irradiance * ggx;\n}\n";
/**
 * Shader chunk to add to the head of a fragment shader to be able to use PBR shading.
 * @param parameters - {@link GetShadingParams | parameters} used to append the right chunks and calculate the PBR shading.
 *
 * @example
 * ```wgsl
 * var color: vec4f = vec4(1.0);
 * color = getPBR(
 *   normal,
 *   worldPosition,
 *   color,
 *   viewDirection,
 *   metallic,
 *   roughness,
 *   specularFactor,
 *   specularColor,
 *   ior,
 * );
 * ```
 */
export declare const getPBR: ({ addUtils, receiveShadows, toneMapping, useOcclusion }?: GetShadingParams) => string;
