const getPCFPointShadowContribution = (
  /* wgsl */
  `
fn getPCFPointShadowContribution(index: i32, shadowPosition: vec4f, depthCubeTexture: texture_depth_cube) -> f32 {
  let pointShadow: PointShadowsElement = pointShadows.pointShadowsElements[index];

  // Percentage-closer filtering. Sample texels in the region
  // to smooth the result.
  var visibility = 0.0;
  var closestDepth = 0.0;
  let currentDepth: f32 = shadowPosition.w;
  let cameraRange: f32 = pointShadow.cameraFar - pointShadow.cameraNear;
  let normalizedDepth: f32 = (shadowPosition.w - pointShadow.cameraNear) / cameraRange;

  let maxSize: f32 = f32(max(textureDimensions(depthCubeTexture).x, textureDimensions(depthCubeTexture).y));

  let texelSize: vec3f = vec3(1.0 / maxSize);
  let sampleCount: i32 = pointShadow.pcfSamples;
  let maxSamples: f32 = f32(sampleCount) - 1.0;
  
  for (var x = 0; x < sampleCount; x++) {
    for (var y = 0; y < sampleCount; y++) {
      for (var z = 0; z < sampleCount; z++) {
        let offset = texelSize * vec3(
          f32(x) - maxSamples * 0.5,
          f32(y) - maxSamples * 0.5,
          f32(z) - maxSamples * 0.5
        );

        closestDepth = textureSampleCompareLevel(
          depthCubeTexture,
          depthComparisonSampler,
          shadowPosition.xyz + offset,
          normalizedDepth - pointShadow.bias
        );

        closestDepth *= cameraRange;

        visibility += select(0.0, 1.0, currentDepth <= closestDepth);
      }
    }
  }
  
  visibility /= f32(sampleCount * sampleCount * sampleCount);
  
  visibility = clamp(visibility, 1.0 - saturate(pointShadow.intensity), 1.0);
  
  return visibility;
}`
);

export { getPCFPointShadowContribution };
