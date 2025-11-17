import { getTextureSample } from './get-texture-sample.mjs';

const getIridescence = ({
  extensionsUsed = [],
  iridescenceTexture = null,
  iridescenceThicknessTexture = null
} = {}) => {
  let iridescence = (
    /* wgsl */
    `
  var iridescenceThickness: f32 = 0.0;
  var iridescenceF0: vec3f = vec3(0.0);
  var iridescenceFresnel: vec3f = vec3(0.0);`
  );
  if (!extensionsUsed.includes("KHR_materials_iridescence")) {
    return iridescence;
  }
  if (iridescenceTexture) {
    iridescence += getTextureSample(iridescenceTexture, "iridescence");
    iridescence += /* wgsl */
    `
  iridescence = iridescence * iridescenceSample.r;`;
  }
  if (iridescenceThicknessTexture) {
    iridescence += getTextureSample(iridescenceThicknessTexture, "iridescenceThickness");
    iridescence += /* wgsl */
    `
  iridescenceThickness = (iridescenceThicknessRange.y - iridescenceThicknessRange.x) * iridescenceThicknessSample.g + iridescenceThicknessRange.x;`;
  } else {
    iridescence += /* wgsl */
    `
  iridescenceThickness = iridescenceThicknessRange.y;
    `;
  }
  iridescence += /* wgsl */
  `
  let dotNVi: f32 = saturate( dot( normal, viewDirection ) );

  if ( iridescenceThickness == 0.0 ) {
    iridescence = 0.0;
  } else {
    iridescence = saturate( iridescence );
  }

  if ( iridescence > 0.0 ) {
    iridescenceFresnel = evalIridescence( 1.0, iridescenceIOR, dotNVi, iridescenceThickness, specularColor );

    // Iridescence F0 approximation
    iridescenceF0 = Schlick_to_F0( iridescenceFresnel, 1.0, dotNVi );
  }`;
  return iridescence;
};

export { getIridescence };
