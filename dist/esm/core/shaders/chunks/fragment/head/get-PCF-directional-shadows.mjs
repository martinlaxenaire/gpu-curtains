//#region src/core/shaders/chunks/fragment/head/get-PCF-directional-shadows.ts
/**
* Get the global PCF soft shadows contributions from all the current {@link CameraRenderer} {@link DirectionalLight}.
* @param renderer - {@link CameraRenderer} used by the {@link DirectionalLight}.
*/
const getPCFDirectionalShadows = (renderer) => {
	const directionalLights = renderer.shadowCastingLights.filter((light) => light.type === "directionalLights");
	const minDirectionalLights = Math.max(renderer.lightsBindingParams.directionalLights.max, 1);
	return `
fn getPCFDirectionalShadows(worldPosition: vec3f, fragmentPosition: vec2f) -> array<f32, ${minDirectionalLights}> {
  var directionalShadowContribution: array<f32, ${minDirectionalLights}>;
  
  var lightDirection: vec3f;
  
  ${directionalLights.map((light, index) => {
		return `lightDirection = worldPosition - directionalLights.elements[${index}].direction;
      
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
          ` : `directionalShadowContribution[${index}] = 1.0;`}`;
	}).join("\n")}
  
  return directionalShadowContribution;
}
`;
};
//#endregion
export { getPCFDirectionalShadows };
