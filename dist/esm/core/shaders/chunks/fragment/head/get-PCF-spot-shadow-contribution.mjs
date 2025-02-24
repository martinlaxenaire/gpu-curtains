const getPCFSpotShadowContribution = (
  /* wgsl */
  `
fn getPCFSpotShadowContribution(index: i32, worldPosition: vec3f, depthTexture: texture_depth_2d) -> f32 {
  let spotShadow: SpotShadowsElement = spotShadows.spotShadowsElements[index];
  
  // get shadow coords
  let projectedShadowCoords: vec4f = spotShadow.projectionMatrix * spotShadow.viewMatrix * vec4(worldPosition, 1.0);
  var shadowCoords: vec3f = projectedShadowCoords.xyz / projectedShadowCoords.w;
  
  // Convert XY to (0, 1)
  // Y is flipped because texture coords are Y-down.
  shadowCoords = vec3(
    shadowCoords.xy * vec2(0.5, -0.5) + vec2(0.5),
    shadowCoords.z
  );
  
  return getPCFBaseShadowContribution(
    shadowCoords,
    spotShadow.pcfSamples,
    spotShadow.bias,
    spotShadow.intensity,
    depthTexture
  );
}
`
);

export { getPCFSpotShadowContribution };
