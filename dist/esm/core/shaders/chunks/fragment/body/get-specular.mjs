import { getTextureSample } from './get-texture-sample.mjs';

const getSpecular = ({
  specularTexture = null,
  specularFactorTexture = null,
  specularColorTexture = null
} = {}) => {
  let specular = (
    /* wgsl */
    `
  var specularF90: f32 = 1.0;`
  );
  if (specularTexture) {
    specular += getTextureSample(specularTexture, "specular");
    specular += /* wgsl */
    `
  specularIntensity = specularIntensity * specularSample.a;
  specularColor = specularColor * specularSample.rgb;`;
  } else {
    if (specularFactorTexture) {
      specular += getTextureSample(specularFactorTexture, "specularFactor");
      specular += /* wgsl */
      `
  specularIntensity = specularIntensity * specularFactorSample.a;`;
    }
    if (specularColorTexture) {
      specular += getTextureSample(specularColorTexture, "specularColor");
      specular += /* wgsl */
      `
  specularColor = specularColor * specularColorSample.rgb;`;
    }
  }
  specular += /* wgsl */
  `
  specularF90 = mix(specularIntensity, 1.0, metallic);
  specularColor = min( pow2( ( ior - 1.0 ) / ( ior + 1.0 ) ) * specularColor, vec3( 1.0 ) ) * specularIntensity;
  let specularColorBlended: vec3f = mix(specularColor, diffuseColor, metallic);
  `;
  return specular;
};

export { getSpecular };
