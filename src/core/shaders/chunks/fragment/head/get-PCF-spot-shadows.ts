import { CameraRenderer } from '../../../../renderers/utils'
import { SpotLight } from '../../../../lights/SpotLight'

/**
 * Get the global PCF soft shadows contributions from all the current {@link CameraRenderer} {@link SpotLight}.
 * @param renderer - {@link CameraRenderer} used by the {@link SpotLight}.
 */
export const getPCFSpotShadows = (renderer: CameraRenderer): string => {
  const spotLights = renderer.shadowCastingLights.filter((light) => light.type === 'spotLights') as SpotLight[]

  const minSpotLights = Math.max(renderer.lightsBindingParams.spotLights.max, 1)

  return /* wgsl */ `
fn getPCFSpotShadows(worldPosition: vec3f) -> array<f32, ${minSpotLights}> {
  var spotShadowContribution: array<f32, ${minSpotLights}>;
  
  var lightDirection: vec3f;
  
  ${spotLights
    .map((light, index) => {
      return `lightDirection = worldPosition - spotLights.elements[${index}].direction;
      
      ${
        light.shadow.isActive
          ? `
      if(spotShadows.spotShadowsElements[${index}].isActive > 0) {
        spotShadowContribution[${index}] = getPCFSpotShadowContribution(
          ${index},
          worldPosition,
          spotShadowDepthTexture${index}
        );
      } else {
        spotShadowContribution[${index}] = 1.0;
      }
          `
          : `spotShadowContribution[${index}] = 1.0;`
      }`
    })
    .join('\n')}
  
  return spotShadowContribution;
}
`
}
