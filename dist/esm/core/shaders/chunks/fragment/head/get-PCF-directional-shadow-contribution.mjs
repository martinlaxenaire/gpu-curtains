const getPCFDirectionalShadowContribution = (
  /* wgsl */
  `
fn getPCFDirectionalShadowContribution(index: i32, worldPosition: vec3f, depthTexture: texture_depth_2d) -> f32 {
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
  
  return getPCFBaseShadowContribution(
    shadowCoords,
    directionalShadow.pcfSamples,
    directionalShadow.bias,
    directionalShadow.intensity,
    depthTexture
  );
}
`
);

export { getPCFDirectionalShadowContribution };
