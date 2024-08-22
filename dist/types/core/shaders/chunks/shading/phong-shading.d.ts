import { GetShadingParams } from './lambert-shading';
export declare const getPhongDirect = "\nfn D_BlinnPhong( shininess: f32, NdotH: f32 ) -> f32 {\n  return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( NdotH, shininess );\n}\n\nfn BRDF_BlinnPhong(\n  normal: vec3f,\n  viewDirection: vec3f,\n  specularColor: vec3f,\n  shininess: f32,\n  directLight: DirectLight\n) -> vec3f {\n  let L = normalize(directLight.direction);\n  let NdotL = max(dot(normal, L), 0.0);\n  let H: vec3f = normalize(viewDirection + L);\n  \n  let NdotH: f32 = clamp(dot(normal, H), 0.0, 1.0);\n  let VdotH: f32 = clamp(dot(viewDirection, H), 0.0, 1.0);\n  let NdotV: f32 = clamp( dot(normal, viewDirection), 0.0, 1.0 );\n  \n  let F: vec3f = F_Schlick(VdotH, specularColor);\n  \n  let G: f32 = 0.25; // blinn phong implicit\n  \n  let D = D_BlinnPhong(shininess, NdotH);\n  \n  let specular: vec3f = F * G * D;\n        \n  return specular;\n}\n\nfn getPhongDirect(\n  normal: vec3f,\n  diffuseColor: vec3f,\n  viewDirection: vec3f,\n  specularColor: vec3f,\n  specularStrength: f32,\n  shininess: f32,\n  directLight: DirectLight,\n  ptr_reflectedLight: ptr<function, ReflectedLight>\n) {\n  let L = normalize(directLight.direction);\n  let NdotL = max(dot(normal, L), 0.0);\n  \n  let irradiance: vec3f = NdotL * directLight.color;\n  (*ptr_reflectedLight).directDiffuse += irradiance * BRDF_Lambert( diffuseColor );\n  (*ptr_reflectedLight).directSpecular += irradiance * BRDF_BlinnPhong( normal, viewDirection, specularColor, shininess, directLight ) * specularStrength;\n}\n";
/**
 * Shader chunk to add to the head of a fragment shader to be able to use phong shading.
 *
 * @example
 * ```wgsl
 * var color: vec3f = vec3(1.0);
 * let specularColor: vec3f = vec3(1.0);
 * let specularStrength: f32 = 1.0;
 * let shininess: f32 = 32.0;
 * color = getPhong(normal, worldPosition, color, viewDirection, specularColor, specularStrength, shininess);
 * ```
 */
export declare const getPhong: ({ addUtils, receiveShadows, toneMapping, useOcclusion }?: GetShadingParams) => string;
