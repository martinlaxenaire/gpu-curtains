import { lambertUtils } from './lambert-shading.mjs';
import { getPhongDirect } from '../fragment/head/get-phong-direct.mjs';
import { getPhongShading } from '../fragment/body/get-phong-shading.mjs';
import { applyToneMapping } from '../fragment/body/apply-tone-mapping.mjs';

const getPhong = ({ addUtils = true, receiveShadows = false, toneMapping, useOcclusion = false } = {}) => (
  /* wgsl */
  `
${addUtils ? lambertUtils : ""}
${getPhongDirect}

fn getPhong(
  normal: vec3f,
  worldPosition: vec3f,
  color: vec4f,
  viewDirection: vec3f,
  specularIntensity: f32,
  specularColor: vec3f,
  shininess: f32,
  ${useOcclusion ? "occlusion: f32," : ""}
) -> vec4f {
  ${!useOcclusion ? "let occlusion: f32 = 1.0;" : ""}

  var outputColor: vec4f = color;

  ${getPhongShading({ receiveShadows })}
  
  outputColor = vec4(outgoingLight, outputColor.a);
  
  ${applyToneMapping({ toneMapping })}
    
  return outputColor;
}
`
);

export { getPhong };
