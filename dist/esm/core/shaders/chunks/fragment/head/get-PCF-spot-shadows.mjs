const getPCFSpotShadows = (renderer) => {
  const spotLights = renderer.shadowCastingLights.filter((light) => light.type === "spotLights");
  const minSpotLights = Math.max(renderer.lightsBindingParams.spotLights.max, 1);
  return (
    /* wgsl */
    `
fn getPCFSpotShadows(worldPosition: vec3f) -> array<f32, ${minSpotLights}> {
  var spotShadowContribution: array<f32, ${minSpotLights}>;
  
  var lightDirection: vec3f;
  
  ${spotLights.map((light, index) => {
      return `lightDirection = worldPosition - spotLights.elements[${index}].direction;
      
      ${light.shadow.isActive ? `
      if(spotShadows.spotShadowsElements[${index}].isActive > 0) {
        spotShadowContribution[${index}] = getPCFSpotShadowContribution(
          ${index},
          worldPosition,
          spotShadowDepthTexture${index}
        );
      } else {
        spotShadowContribution[${index}] = 1.0;
      }
          ` : `spotShadowContribution[${index}] = 1.0;`}`;
    }).join("\n")}
  
  return spotShadowContribution;
}
`
  );
};

export { getPCFSpotShadows };
