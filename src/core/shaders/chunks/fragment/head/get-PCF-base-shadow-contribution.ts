/** Helper chunk to compute the shadow visibility of a fragment using `shadowCoords`, a 2D `depthTexture` and shadow properties using PCF. Returns `1` when fully visible and `0` when fully shadowed. */
export const getPCFBaseShadowContribution = /* wgsl */ `
// Interleaved Gradient Noise for randomizing sampling patterns
fn interleavedGradientNoise(position: vec2f) -> f32 {
  return fract(52.9829189 * fract(dot(position, vec2(0.06711056, 0.00583715))));
}

// Vogel disk sampling for uniform circular distribution
fn vogelDiskSample(sampleIndex: i32, samplesCount: i32, phi: f32) -> vec2f {
  let goldenAngle: f32 = 2.399963229728653;
  let r: f32 = sqrt((f32(sampleIndex) + 0.5) / f32(samplesCount));
  let theta: f32 = f32(sampleIndex) * goldenAngle + phi;
  return vec2(cos(theta), sin(theta)) * r;
}

fn getPCFBaseShadowContribution(
  shadowCoords: vec3f,
  fragmentPosition: vec2f,
  pcfSamples: i32,
  shadowRadius: f32,
  bias: f32,
  intensity: f32,
  depthTexture: texture_depth_2d
) -> f32 {  
  let inFrustum: bool = shadowCoords.x >= 0.0 && shadowCoords.x <= 1.0 && shadowCoords.y >= 0.0 && shadowCoords.y <= 1.0;
  let frustumTest: bool = inFrustum && shadowCoords.z <= 1.0;

  if(!frustumTest) {
    return 1.0;
  }

  var visibility = 0.0;
  
  // Percentage-closer filtering. Sample texels in the region
  // to smooth the result.
  let size: vec2f = vec2f(textureDimensions(depthTexture).xy);

  let texelSize: vec2f = 1.0 / size;

  // Hardware PCF with LinearFilter gives us 4-tap filtering per sample
  // 5 samples using Vogel disk + IGN = effectively 20 filtered taps with better distribution
  let radius: f32 = shadowRadius * texelSize.x;

  // Use IGN to rotate sampling pattern per pixel
  let phi: f32 = interleavedGradientNoise(fragmentPosition.xy) * PI2;

  for(var i: i32 = 0; i < pcfSamples; i++) {
    let offset: vec2f = vogelDiskSample(i, pcfSamples, phi) * radius;

    visibility += textureSampleCompareLevel(
      depthTexture,
      depthComparisonSampler,
      shadowCoords.xy + offset,
      shadowCoords.z - bias
    );
  }

  visibility /= f32(pcfSamples);
  
  return mix(1.0, visibility, saturate(intensity));  
}
`
