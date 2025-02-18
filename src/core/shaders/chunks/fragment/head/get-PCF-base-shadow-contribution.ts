/** Helper chunk to compute the shadow visibility of a fragment using `shadowCoords`, a 2D `depthTexture` and shadow properties using PCF. Returns `1` when fully visible and `0` when fully shadowed. */
export const getPCFBaseShadowContribution = /* wgsl */ `
fn getPCFBaseShadowContribution(
  shadowCoords: vec3f,
  pcfSamples: i32,
  bias: f32,
  intensity: f32,
  depthTexture: texture_depth_2d
) -> f32 {
  var visibility = 0.0;
  
  let inFrustum: bool = shadowCoords.x >= 0.0 && shadowCoords.x <= 1.0 && shadowCoords.y >= 0.0 && shadowCoords.y <= 1.0;
  let frustumTest: bool = inFrustum && shadowCoords.z <= 1.0;
  
  if(frustumTest) {
    // Percentage-closer filtering. Sample texels in the region
    // to smooth the result.
    let size: vec2f = vec2f(textureDimensions(depthTexture).xy);
  
    let texelSize: vec2f = 1.0 / size;
    
    let sampleCount: i32 = pcfSamples;
    let maxSamples: f32 = f32(sampleCount) - 1.0;
  
    for (var x = 0; x < sampleCount; x++) {
      for (var y = 0; y < sampleCount; y++) {
        let offset = texelSize * vec2(
          f32(x) - maxSamples * 0.5,
          f32(y) - maxSamples * 0.5
        );
        
        visibility += textureSampleCompareLevel(
          depthTexture,
          depthComparisonSampler,
          shadowCoords.xy + offset,
          shadowCoords.z - bias
        );
      }
    }
    visibility /= f32(sampleCount * sampleCount);
    
    visibility = mix(1.0, visibility, saturate(intensity));
  }
  else {
    visibility = 1.0;
  }
  
  return visibility;
}
`
