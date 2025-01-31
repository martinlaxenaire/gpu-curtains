import { lambertUtils } from './lambert-shading.mjs';
import { getPhongDirect } from '../fragment/head/get-phong-direct.mjs';
import { toneMappingUtils } from '../fragment/head/tone-mapping-utils.mjs';
import { getPhongShading } from '../fragment/body/get-phong-shading.mjs';

const getPhong = ({ addUtils = true, receiveShadows = false, toneMapping = "Linear", useOcclusion = false } = {}) => (
  /* wgsl */
  `
${addUtils ? lambertUtils : ""}
${getPhongDirect}
${toneMapping ? toneMappingUtils : ""}

fn getPhong(
  normal: vec3f,
  worldPosition: vec3f,
  outputColor: vec4f,
  viewDirection: vec3f,
  specularIntensity: f32,
  specularColor: vec3f,
  shininess: f32,
  ${useOcclusion ? "occlusion: f32," : ""}
) -> vec4f {
  ${!useOcclusion ? "let occlusion: f32 = 1.0;" : ""}

  ${getPhongShading({ receiveShadows })}
  
  ${toneMapping === "Linear" ? "outgoingLight = linearToOutput3(outgoingLight);" : toneMapping === "Khronos" ? "outgoingLight = linearTosRGB(toneMapKhronosPbrNeutral(outgoingLight));" : ""}
  
  return vec4(outgoingLight, outputColor.a);;
}
`
);

export { getPhong };
