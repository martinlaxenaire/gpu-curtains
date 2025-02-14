/** WGSL functions to calculate the transmission effect of transmissive meshes using the renderer scene background texture. */
export const getIBLTransmission = /* wgsl */ `
fn getVolumeTransmissionRay(normal: vec3f, viewDirection: vec3f, thickness: f32, ior: f32, modelScale: vec3f) -> vec3f {
  let refractionVector = refract(-viewDirection, normal, 1.0 / ior);    
  return normalize(refractionVector) * thickness * modelScale;
}

fn applyIorToRoughness(roughness: f32, ior: f32) -> f32 {
  return roughness * saturate(ior * 2.0 - 2.0);
}

fn getTransmissionSample( fragCoord: vec2f, roughness: f32, ior: f32, transmissionSceneTexture: texture_2d<f32>, sampler: sampler ) -> vec4f {
  let transmissionSamplerSize: vec2f = vec2f(textureDimensions(transmissionSceneTexture));
  let lod: f32 = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
  return textureSampleLevel( transmissionSceneTexture, sampler, fragCoord.xy, lod );
}

fn volumeAttenuation(transmissionDistance: f32, attenuationColor: vec3f, attenuationDistance: f32) -> vec3f {
  if (isinf(attenuationDistance)) {
    return vec3(1.0);
  } else {
    let attenuationCoefficient = -log(attenuationColor) / attenuationDistance;
    let transmittance = exp(-attenuationCoefficient * transmissionDistance);
    return transmittance;
  }
}

fn getIBLVolumeRefraction(
  normal: vec3f,
  viewDirection: vec3f,
  roughness: f32,
  diffuseColor: vec4f,
  specularColor: vec3f,
  specularF90: f32,
  position: vec3f,
  modelScale: vec3f,
  viewMatrix: mat4x4f,
  projMatrix: mat4x4f,
  dispersion: f32,
  ior: f32,
  thickness: f32,
  attenuationColor: vec3f,
  attenuationDistance: f32,
  transmissionBackgroundTexture: texture_2d<f32>,
  defaultSampler: sampler,
) -> vec4f {
    // TODO dispersion
    var transmittedLight: vec4f;
    var transmissionRayLength: f32;
    var transmittance: vec3f;
    
    // Calculate the transmission ray
    let transmissionRay: vec3f = getVolumeTransmissionRay(normal, viewDirection, thickness, ior, modelScale);
    let refractedRayExit = position + transmissionRay;

    // Transform to NDC space
    let ndcPos = projMatrix * viewMatrix * vec4(refractedRayExit, 1.0);
    var refractionCoords = ndcPos.xy / ndcPos.w;
    refractionCoords = (refractionCoords + 1.0) / 2.0;
    refractionCoords = vec2(refractionCoords.x, 1.0 - refractionCoords.y); // webgpu Y flip

    // Sample the transmission texture
    transmittedLight = getTransmissionSample(refractionCoords, roughness, ior, transmissionBackgroundTexture, defaultSampler);

    // Compute transmittance
    transmittance = diffuseColor.rgb * volumeAttenuation(length(transmissionRay), attenuationColor, attenuationDistance);

    // Apply attenuation to transmitted light
    let attenuatedColor = transmittance * transmittedLight.rgb;

    // Compute Fresnel term using an environment BRDF
    let F = EnvironmentBRDF(normal, viewDirection, specularColor, specularF90, roughness);

    // Average the transmittance for a single factor
    let transmittanceFactor = (transmittance.r + transmittance.g + transmittance.b) / 3.0;

    // Combine results into the final color
    return vec4(
      (1.0 - F) * attenuatedColor,
      1.0 - (1.0 - transmittedLight.a) * transmittanceFactor
    );
}

fn getIBLVolumeRefractionWithDispersion(
  normal: vec3f,
  viewDirection: vec3f,
  roughness: f32,
  diffuseColor: vec4f,
  specularColor: vec3f,
  specularF90: f32,
  position: vec3f,
  modelScale: vec3f,
  viewMatrix: mat4x4f,
  projMatrix: mat4x4f,
  dispersion: f32,
  ior: f32,
  thickness: f32,
  attenuationColor: vec3f,
  attenuationDistance: f32,
  transmissionBackgroundTexture: texture_2d<f32>,
  defaultSampler: sampler,
) -> vec4f {
    var transmittedLight: vec4f;
    var transmissionRayLength: f32;
    var transmittance: vec3f;
    
    let halfSpread: f32 = (ior - 1.0) * 0.025 * dispersion;
    let iors: vec3f = vec3(ior - halfSpread, ior, ior + halfSpread);
    
    for(var i: i32 = 0; i < 3; i++) {
      let transmissionRay: vec3f = getVolumeTransmissionRay(normal, viewDirection, thickness, iors[i], modelScale);
      transmissionRayLength = length(transmissionRay);
      let refractedRayExit = position + transmissionRay;

      // Transform to NDC space
      let ndcPos = projMatrix * viewMatrix * vec4(refractedRayExit, 1.0);
      var refractionCoords = ndcPos.xy / ndcPos.w;
      refractionCoords = (refractionCoords + 1.0) / 2.0;
      refractionCoords = vec2(refractionCoords.x, 1.0 - refractionCoords.y); // webgpu Y flip
      
      let transmissionSample: vec4f = getTransmissionSample(refractionCoords, roughness, iors[i], transmissionBackgroundTexture, defaultSampler);
      
      transmittedLight[i] = transmissionSample[i];
      transmittedLight.a += transmissionSample.a;
      
      // Compute transmittance
      let diffuse: vec3f = diffuseColor.rgb;
      transmittance[i] = diffuse[i] * volumeAttenuation(length(transmissionRay), attenuationColor, attenuationDistance)[i];
    }
    
    transmittedLight.a /= 3.0;

    // Apply attenuation to transmitted light
    let attenuatedColor = transmittance * transmittedLight.rgb;

    // Compute Fresnel term using an environment BRDF
    let F = EnvironmentBRDF(normal, viewDirection, specularColor, specularF90, roughness);

    // Average the transmittance for a single factor
    let transmittanceFactor = (transmittance.r + transmittance.g + transmittance.b) / 3.0;

    // Combine results into the final color
    return vec4(
      (1.0 - F) * attenuatedColor,
      1.0 - (1.0 - transmittedLight.a) * transmittanceFactor
    );
}
`
