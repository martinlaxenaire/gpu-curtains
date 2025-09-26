import { lambertUtils } from './lambert-shading.mjs';
import { REIndirectSpecular } from '../fragment/head/RE-indirect-specular.mjs';
import { getIBLTransmission } from '../fragment/head/get-IBL-transmission.mjs';
import { getPBRDirect } from '../fragment/head/get-PBR-direct.mjs';
import { getPBRShading } from '../fragment/body/get-PBR-shading.mjs';
import { applyToneMapping } from '../fragment/body/apply-tone-mapping.mjs';

const getPBR = ({
  addUtils = true,
  receiveShadows = false,
  toneMapping,
  outputColorSpace,
  useOcclusion = false,
  environmentMap = null,
  transmissionBackgroundTexture = null,
  extensionsUsed = []
} = {}) => (
  /* wgsl */
  `
${addUtils ? lambertUtils : ""}
${REIndirectSpecular}
${getIBLTransmission}
${getPBRDirect}

fn getPBR(
  normal: vec3f,
  worldPosition: vec3f,
  color: vec4f,
  viewDirection: vec3f,
  metallic: f32,
  roughness: f32,
  specularIntensity: f32,
  specularColor: vec3f,
  ior: f32,
  transmission: f32,
  dispersion: f32,
  thickness: f32,
  attenuationDistance: f32,
  attenuationColor: vec3f,
  ${useOcclusion ? "occlusion: f32," : ""}
) -> vec4f {
  ${!useOcclusion ? "let occlusion: f32 = 1.0;" : ""}
  
  var outputColor: vec4f = color;
  
  ${getPBRShading({ receiveShadows, environmentMap, transmissionBackgroundTexture, extensionsUsed })}
  
  outputColor = vec4(outgoingLight, outputColor.a);
  
  ${applyToneMapping({ toneMapping, outputColorSpace })}
    
  return outputColor;
}
`
);

export { getPBR };
