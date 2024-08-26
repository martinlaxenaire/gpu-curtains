// TODO add more tone mapping options?
// see https://github.com/dmnsgn/glsl-tone-map

/** Defines all available tone mapping types */
export type ToneMappingTypes = 'linear' | 'khronos'

/** Tone mapping utils chunks. */
export const toneMappingUtils = /* wgsl */ `
fn linearToOutput3(value: vec3f) -> vec3f {
  return vec3( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThan3( value.rgb, vec3( 0.0031308 ) ) ) ) );
}

fn linearToOutput4(value: vec4f) -> vec4f {
  return vec4( linearToOutput3(value.rgb), value.a );
}

// linear <-> sRGB conversions
fn linearTosRGB(linear: vec3f) -> vec3f {
  if (all(linear <= vec3(0.0031308))) {
    return linear * 12.92;
  }
  return (pow(abs(linear), vec3(1.0/2.4)) * 1.055) - vec3(0.055);
}

fn sRGBToLinear(srgb: vec3f) -> vec3f {
  if (all(srgb <= vec3(0.04045))) {
    return srgb / vec3(12.92);
  }
  return pow((srgb + vec3(0.055)) / vec3(1.055), vec3(2.4));
}

fn toneMapKhronosPbrNeutral( color: vec3f ) -> vec3f {
  var toneMapColor = color; 
  const startCompression: f32 = 0.8 - 0.04;
  const desaturation: f32 = 0.15;
  var x: f32 = min(toneMapColor.r, min(toneMapColor.g, toneMapColor.b));
  var offset: f32 = select(0.04, x - 6.25 * x * x, x < 0.08);
  toneMapColor = toneMapColor - offset;
  var peak: f32 = max(toneMapColor.r, max(toneMapColor.g, toneMapColor.b));
  if (peak < startCompression) {
    return toneMapColor;
  }
  const d: f32 = 1. - startCompression;
  let newPeak: f32 = 1. - d * d / (peak + d - startCompression);
  toneMapColor *= newPeak / peak;
  let g: f32 = 1. - 1. / (desaturation * (peak - newPeak) + 1.);
  return mix(toneMapColor, newPeak * vec3(1, 1, 1), g);
}
`
