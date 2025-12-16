const getPCFDirectionalShadows = (renderer) => {
  const directionalLights = renderer.shadowCastingLights.filter(
    (light) => light.type === "directionalLights"
  );
  const minDirectionalLights = Math.max(renderer.lightsBindingParams.directionalLights.max, 1);
  return (
    /* wgsl */
    `
fn getPCFDirectionalShadows(worldPosition: vec3f, fragmentPosition: vec2f) -> array<f32, ${minDirectionalLights}> {
  var directionalShadowContribution: array<f32, ${minDirectionalLights}>;
  
  var lightDirection: vec3f;
  
  ${directionalLights.map((light, index) => {
      return (
        /* wgsl */
        `lightDirection = worldPosition - directionalLights.elements[${index}].direction;
      
      ${light.shadow.isActive ? `
      if(directionalShadows.directionalShadowsElements[${index}].isActive > 0) {
        directionalShadowContribution[${index}] = getPCFDirectionalShadowContribution(
          ${index},
          worldPosition,
          fragmentPosition,
          directionalShadowDepthTexture${index}
        );
      } else {
        directionalShadowContribution[${index}] = 1.0;
      }
          ` : (
          /*wgsl */
          `directionalShadowContribution[${index}] = 1.0;`
        )}`
      );
    }).join("\n")}
  
  return directionalShadowContribution;
}
`
  );
};

export { getPCFDirectionalShadows };
