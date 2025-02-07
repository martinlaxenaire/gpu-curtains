export const additionalFragmentHeadParticle = /* wgsl */ `
fn applyBrightness(color: vec3f, brightness: f32) -> vec3f {
  return color + brightness;
}

fn applyContrast(color: vec3f, contrast: f32) -> vec3f {
  return 0.5 + (1.0 + contrast) * (color - 0.5);
}

fn applyExposure(color: vec3f, exposure: f32) -> vec3f {
  return color * (1.0 + exposure);
}

fn applySaturation(color: vec3f, saturation: f32) -> vec3f {
  let luminosityFactor: vec3f = vec3(0.2126, 0.7152, 0.0722);
  let grayscale: vec3f = vec3(dot(color.rgb, luminosityFactor));
  
  return mix(grayscale, color.rgb, 1.0 + saturation);
}
`
