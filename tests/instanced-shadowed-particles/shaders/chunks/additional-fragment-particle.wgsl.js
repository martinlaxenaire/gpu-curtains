export const additionalFragmentParticle = /* wgsl */ `
  // color manipulations
  var color: vec3f = outputColor.rgb;
  
  // contrast
  color = applyBrightness(color, shading.brightness);
  color = applyContrast(color, shading.contrast);
  color = applyExposure(color, shading.exposure);
  color = applySaturation(color, shading.saturation);
  
  outputColor = vec4(color, outputColor.a);
`
