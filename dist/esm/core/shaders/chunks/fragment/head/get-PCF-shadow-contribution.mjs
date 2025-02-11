const getPCFShadowContribution = (
  /* wgsl */
  `
fn getPCFShadowContribution(index: i32, worldPosition: vec3f, depthTexture: texture_depth_2d) -> f32 {
  let directionalShadow: DirectionalShadowsElement = directionalShadows.directionalShadowsElements[index];
  
  // get shadow coords
  let projectedShadowCoords: vec4f = directionalShadow.projectionMatrix * directionalShadow.viewMatrix * vec4(worldPosition, 1.0);
  var shadowCoords: vec3f = projectedShadowCoords.xyz / projectedShadowCoords.w;
  
  // Convert XY to (0, 1)
  // Y is flipped because texture coords are Y-down.
  shadowCoords = vec3(
    shadowCoords.xy * vec2(0.5, -0.5) + vec2(0.5),
    shadowCoords.z
  );
  
  var visibility = 0.0;
  
  let inFrustum: bool = shadowCoords.x >= 0.0 && shadowCoords.x <= 1.0 && shadowCoords.y >= 0.0 && shadowCoords.y <= 1.0;
  let frustumTest: bool = inFrustum && shadowCoords.z <= 1.0;
  
  if(frustumTest) {
    // Percentage-closer filtering. Sample texels in the region
    // to smooth the result.
    let size: vec2f = vec2f(textureDimensions(depthTexture).xy);
  
    let texelSize: vec2f = 1.0 / size;
    
    let sampleCount: i32 = directionalShadow.pcfSamples;
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
          shadowCoords.z - directionalShadow.bias
        );
      }
    }
    visibility /= f32(sampleCount * sampleCount);
    
    visibility = clamp(visibility, 1.0 - saturate(directionalShadow.intensity), 1.0);
  }
  else {
    visibility = 1.0;
  }
  
  return visibility;
}
`
);

export { getPCFShadowContribution };
