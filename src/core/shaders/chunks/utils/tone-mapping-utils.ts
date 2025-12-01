// TODO add more tone mapping options?
// see https://github.com/dmnsgn/glsl-tone-map
// and https://github.com/mrdoob/three.js/blob/57e59a97c00bd07e439dbd8ac7a76f66c06ca2cc/src/renderers/shaders/ShaderChunk/tonemapping_pars_fragment.glsl.js
/** Tone mapping utils chunks. */
export const toneMappingUtils = /* wgsl */ `
// linear <-> sRGB conversions
fn linearTosRGB(linear: vec3f) -> vec3f {
  return vec3( mix( pow( linear.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), linear.rgb * 12.92, vec3( lessThan3( linear.rgb, vec3( 0.0031308 ) ) ) ) );
}

fn linearTosRGB_4(linear: vec4f) -> vec4f {
  return vec4( linearTosRGB(linear.rgb), linear.a );
}

fn sRGBToLinear(srgb: vec3f) -> vec3f {
  if (all(srgb <= vec3(0.04045))) {
    return srgb / vec3(12.92);
  }
  return pow((srgb + vec3(0.055)) / vec3(1.055), vec3(2.4));
}

fn sRGBToLinear_4(srgb: vec4f) -> vec4f {
  return vec4( sRGBToLinear(srgb.rgb), srgb.a );
}

// forward: color / (1 + color)
fn inverseReinhardToneMapping(color: vec3f) -> vec3f {
    return color / max(vec3(1e-5), vec3(1.0) - color);
}

// source: https://www.cs.utah.edu/docs/techreports/2002/pdf/UUCS-02-001.pdf
fn ReinhardToneMapping( color: vec3f ) -> vec3f {
	return saturate( color / ( vec3( 1.0 ) + color ) );
}

fn inverseCineonToneMapping(color: vec3f) -> vec3f {
  // Step 1: undo gamma
  let T = pow(color, vec3f(1.0 / 2.2));

  // Invert the rational polynomial per channel
  var x = vec3f(0.0);
  for (var i = 0; i < 3; i = i + 1) {
    let t = T[i];

    // If t >= 1 → clipped → cannot recover, return max guess
    if (t >= 1.0) {
        x[i] = 1e6; // just put a very large HDR value
        continue;
    }

    let A = 6.2 * (t - 1.0);
    let B = 1.7 * t - 0.5;
    let C = 0.06 * t;

    let disc = B * B - 4.0 * A * C;

    // Solve quadratic (positive root)
    let xval = (-B + sqrt(max(disc, 0.0))) / (2.0 * A);

    x[i] = xval;
  }

  // Step 3: undo the initial offset clamp
  return x + vec3f(0.004);
}

// source: http://filmicworlds.com/blog/filmic-tonemapping-operators/
fn CineonToneMapping( color: vec3f ) -> vec3f {
	// filmic operator by Jim Hejl and Richard Burgess-Dawson
	let maxColor = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( maxColor * ( 6.2 * maxColor + 0.5 ) ) / ( maxColor * ( 6.2 * maxColor + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}

fn inverseKhronosToneMapping(color: vec3f) -> vec3f {
  // iterative solve: approximate original HDR color
  var c = color; // initial guess: LDR

  // Do 4–6 iterations (cheap and stable)
  for (var i = 0; i < 5; i = i + 1) {
    let f = KhronosToneMapping(c);
    let error = color - f;

    // Step factor (empirically tuned)
    let step = 0.75;

    c = c + error * step;
  }

  return max(c, vec3f(0.0));
}

// https://modelviewer.dev/examples/tone-mapping
fn KhronosToneMapping( color: vec3f ) -> vec3f {
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
