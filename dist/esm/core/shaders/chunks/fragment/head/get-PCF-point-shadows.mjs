//#region src/core/shaders/chunks/fragment/head/get-PCF-point-shadows.ts
/**
* Get the global PCF soft shadows contributions from all the current {@link CameraRenderer} {@link PointLight}.
* @param renderer - {@link CameraRenderer} used by the {@link PointLight}.
*/
const getPCFPointShadows = (renderer) => {
	const pointLights = renderer.shadowCastingLights.filter((light) => light.type === "pointLights");
	const minPointLights = Math.max(renderer.lightsBindingParams.pointLights.max, 1);
	return `
fn getPCFPointShadows(worldPosition: vec3f, fragmentPosition: vec2f) -> array<f32, ${minPointLights}> {
  var pointShadowContribution: array<f32, ${minPointLights}>;
  
  var lightDirection: vec3f;
  var lightDistance: f32;
  var lightColor: vec3f;
  
  ${pointLights.map((light, index) => {
		return `
      lightDirection = pointLights.elements[${index}].position - worldPosition;
      
      lightDistance = length(lightDirection);
      lightColor = pointLights.elements[${index}].color * rangeAttenuation(pointLights.elements[${index}].range, lightDistance, 2.0);
      
      ${light.shadow.isActive ? `
      if(pointShadows.pointShadowsElements[${index}].isActive > 0 && length(lightColor) > EPSILON) {
        pointShadowContribution[${index}] = getPCFPointShadowContribution(
          ${index},
          vec4(lightDirection, length(lightDirection)),
          fragmentPosition,
          pointShadowCubeDepthTexture${index}
        );
      } else {
        pointShadowContribution[${index}] = 1.0;
      }
            ` : `
      pointShadowContribution[${index}] = 1.0;`}`;
	}).join("\n")}
  
  return pointShadowContribution;
}
`;
};
//#endregion
export { getPCFPointShadows };
