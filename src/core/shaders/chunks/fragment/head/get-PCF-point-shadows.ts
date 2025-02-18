import { CameraRenderer } from '../../../../renderers/utils'
import { PointLight } from '../../../../lights/PointLight'

/**
 * Get the global PCF soft shadows contributions from all the current {@link CameraRenderer} {@link PointLight}.
 * @param renderer - {@link CameraRenderer} used by the {@link PointLight}.
 */
export const getPCFPointShadows = (renderer: CameraRenderer): string => {
  const pointLights = renderer.shadowCastingLights.filter((light) => light.type === 'pointLights') as PointLight[]

  const minPointLights = Math.max(renderer.lightsBindingParams.pointLights.max, 1)

  return /* wgsl */ `
fn getPCFPointShadows(worldPosition: vec3f) -> array<f32, ${minPointLights}> {
  var pointShadowContribution: array<f32, ${minPointLights}>;
  
  var lightDirection: vec3f;
  var lightDistance: f32;
  var lightColor: vec3f;
  
  ${pointLights
    .map((light, index) => {
      return `lightDirection = pointLights.elements[${index}].position - worldPosition;
      
      lightDistance = length(lightDirection);
      lightColor = pointLights.elements[${index}].color * rangeAttenuation(pointLights.elements[${index}].range, lightDistance, 2.0);
      
      ${
        light.shadow.isActive
          ? `
      if(pointShadows.pointShadowsElements[${index}].isActive > 0 && length(lightColor) > EPSILON) {
        pointShadowContribution[${index}] = getPCFPointShadowContribution(
          ${index},
          vec4(lightDirection, length(lightDirection)),
          pointShadowCubeDepthTexture${index}
        );
      } else {
        pointShadowContribution[${index}] = 1.0;
      }
            `
          : `pointShadowContribution[${index}] = 1.0;`
      }`
    })
    .join('\n')}
  
  return pointShadowContribution;
}
`
}
