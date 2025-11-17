import { getTextureSample } from './get-texture-sample.mjs';

const getSheen = ({
  extensionsUsed = [],
  sheenTexture = null,
  sheenColorTexture = null,
  sheenRoughnessTexture = null
} = {}) => {
  let sheen = (
    /* wgsl */
    `
  var sheenSpecularDirect: vec3f = vec3(0.0);
  var sheenSpecularIndirect: vec3f = vec3(0.0);`
  );
  if (!extensionsUsed.includes("KHR_materials_sheen")) {
    return sheen;
  }
  if (sheenTexture) {
    sheen += getTextureSample(sheenTexture, "sheen");
    sheen += /* wgsl */
    `
  sheenColor = sheenColor * sheenSample.rgb;
  sheenRoughness = sheenRoughness * sheenSample.a;
    `;
  } else {
    if (sheenColorTexture) {
      sheen += getTextureSample(sheenColorTexture, "sheenColor");
      sheen += /* wgsl */
      `
  sheenColor = sheenColor * sheenColorSample.rgb;
    `;
    }
    if (sheenRoughnessTexture) {
      sheen += getTextureSample(sheenRoughnessTexture, "sheenRoughness");
      sheen += /* wgsl */
      `
  sheenRoughness = sheenRoughness * sheenRoughnessSample.a;
  `;
    }
  }
  return sheen;
};

export { getSheen };
