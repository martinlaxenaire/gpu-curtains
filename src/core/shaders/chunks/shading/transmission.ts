export const transmissionUtils = /* wgsl */ `
fn EnvironmentBRDF(
    normal: vec3<f32>, 
    viewDir: vec3<f32>, 
    specularColor: vec3<f32>, 
    specularF90: f32, 
    roughness: f32
) -> vec3<f32> {
    let fab = DFGApprox(normal, viewDir, roughness);
    return specularColor * fab.x + specularF90 * fab.y;
}

fn isinf(value: f32) -> bool {
  return value > 1.0e38 || value < -1.0e38;
}

fn getVolumeTransmissionRay(n: vec3f, v: vec3f, thickness: f32, ior: f32, modelMatrix: mat4x4f) -> vec3f {
    let refractionVector = refract(-v, normalize(n), 1.0 / ior);
    let modelScale = vec3(
        length(modelMatrix[0].xyz),
        length(modelMatrix[1].xyz),
        length(modelMatrix[2].xyz)
    );
    return normalize(refractionVector) * thickness * modelScale;
}

fn applyIorToRoughness(roughness: f32, ior: f32) -> f32 {
    return roughness * clamp(ior * 2.0 - 2.0, 0.0, 1.0);
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

fn applyVolumeAttenuation(radiance: vec3f, transmissionDistance: f32, attenuationColor: vec3f, attenuationDistance: f32) -> vec3f {
    if (attenuationDistance == 0.0) {
        return radiance;
    } else {
        let transmittance: vec3f = pow(attenuationColor, vec3(transmissionDistance / attenuationDistance));
        return transmittance * radiance;
    }
}

fn getIBLVolumeRefraction(
    n: vec3f,
    v: vec3f,
    roughness: f32,
    diffuseColor: vec4f,
    specularColor: vec3f,
    specularF90: f32,
    position: vec3f,
    modelMatrix: mat4x4f,
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
    // Calculate the transmission ray
    let transmissionRay = getVolumeTransmissionRay(n, v, thickness, ior, modelMatrix);
    let refractedRayExit = position + transmissionRay;

    // Transform to NDC space
    let ndcPos = projMatrix * viewMatrix * vec4(refractedRayExit, 1.0);
    var refractionCoords = ndcPos.xy / ndcPos.w;
    refractionCoords = (refractionCoords + 1.0) / 2.0;
    refractionCoords = vec2(refractionCoords.x, 1.0 - refractionCoords.y); // webgpu Y flip

    // Sample the transmission texture
    let transmittedLight = getTransmissionSample(refractionCoords, roughness, ior, transmissionBackgroundTexture, defaultSampler);

    // Compute transmittance
    let transmittance = diffuseColor.rgb * volumeAttenuation(length(transmissionRay), attenuationColor, attenuationDistance);

    // Apply attenuation to transmitted light
    let attenuatedColor = transmittance * transmittedLight.rgb;

    // Compute Fresnel term using an environment BRDF
    let F = EnvironmentBRDF(n, v, specularColor, specularF90, roughness);

    // Average the transmittance for a single factor
    let transmittanceFactor = (transmittance.r + transmittance.g + transmittance.b) / 3.0;

    // Combine results into the final color
    return vec4(
        (1.0 - F) * attenuatedColor,
        1.0 - (1.0 - transmittedLight.a) * transmittanceFactor
    );
}

fn getIBLVolumeRefraction_2(
    n: vec3f,
    v: vec3f,
    roughness: f32,
    diffuseColor: vec4f,
    f0: vec3f,
    f90: vec3f,
    position: vec3f,
    modelMatrix: mat4x4f,
    viewMatrix: mat4x4f,
    projMatrix: mat4x4f,
    ior: f32,
    thickness: f32,
    attenuationColor: vec3f,
    attenuationDistance: f32,
    dispersion: f32,

    transmissionBackgroundTexture: texture_2d<f32>,
    defaultSampler: sampler,
    lutTexture: texture_2d<f32>,
    clampSampler: sampler,
) -> vec3f {
    // Calculate the transmission ray
    let transmissionRay = getVolumeTransmissionRay(n, v, thickness, ior, modelMatrix);
    let transmissionRayLength: f32 = length(transmissionRay);
    
    let refractedRayExit = position + transmissionRay;

    // Transform to NDC space
    let ndcPos = projMatrix * viewMatrix * vec4(refractedRayExit, 1.0);
    var refractionCoords = ndcPos.xy / ndcPos.w;
    refractionCoords = (refractionCoords + 1.0) / 2.0;
    refractionCoords = vec2(refractionCoords.x, 1.0 - refractionCoords.y); // webgpu non Y flip

    // Sample the transmission texture
    let transmittedLight = getTransmissionSample(refractionCoords, roughness, ior, transmissionBackgroundTexture, defaultSampler);

    // Compute transmittance
    let attenuatedColor: vec3f = applyVolumeAttenuation(transmittedLight.rgb, transmissionRayLength, attenuationColor, attenuationDistance);
    
    let NdotV: f32 = clamp(dot(n, v), 0.0, 1.0);
    
    let brdfSamplePoint: vec2f = clamp(vec2(NdotV, roughness), vec2(0.0), vec2(1.0));
    
    let brdf: vec2f = textureSample(
      lutTexture,
      clampSampler,
      brdfSamplePoint
    ).rg;
    
    let specularColor: vec3f = f0 * brdf.x + f90 * brdf.y;
    return (1.0 - specularColor) * attenuatedColor * diffuseColor.rgb;
}
`
