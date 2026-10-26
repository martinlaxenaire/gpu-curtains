export const blendPassFs = /* wgsl */ `
struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
};

@fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
    let sceneSample = textureSample(renderTexture, defaultSampler, fsInput.uv);

    let volumetricSample = textureSample(blurTexture, defaultSampler, fsInput.uv);
    return select(sceneSample + volumetricSample, volumetricSample, params.debugView > 0.0);
}
`

export const gaussianBlurPassFs = /* wgsl */ `
struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
};

@fragment
fn main(fsInput: VSOutput) -> @location(0) vec4f {
    let textureSize = params.resolution;
    let texelSize: vec2f = 1.0 / textureSize;

    var color = vec4f(0.0);
    var totalWeight = 0.0;

    const numSamples = 13;
        let offsets = array<i32, numSamples>(-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6);
        let weights = array<f32, numSamples>(
            0.00916, 0.01979, 0.03877, 0.07030, 0.11588,
            0.16311, 0.18367,
            0.16311, 0.11588, 0.07030, 0.03877, 0.01979, 0.00916
          );

    for (var i = 0; i <= numSamples; i++) {
        let offsetUV = fsInput.uv + params.direction * params.radius * f32(offsets[i]) * texelSize;
        color += textureSample(volumetricTargetTexture, defaultSampler, offsetUV) * weights[i];
        totalWeight += weights[i];
    }

    return color / totalWeight;
}
`

// cheaper volumetric pass:
// https://github.com/alienkitty/alien.js/blob/main/src/shaders/VolumetricLightShader.js
export const volumetricLightingPass = /* wgsl */ `
fn pow2(x: f32) -> f32 {
    return x * x;
}

fn pow4(x: f32) -> f32 {
    let x2 = x * x;
    return x2 * x2;
}

fn rangeAttenuation(range: f32, distance: f32, decay: f32) -> f32 {
    var distanceFalloff = 1.0 / max(pow(distance, decay), 0.01);
    if (range > 0.0) {
        distanceFalloff *= pow2(saturate(1.0 - pow4(distance / range)));
    }
    return distanceFalloff;
}

fn linearizeDepth(rawDepth: f32, near: f32, far: f32) -> f32 {
    return near * far / (far - rawDepth * (far - near));
}

fn beersLaw(dist: f32, absorption: f32) -> f32 {
    return exp(-dist * absorption);
}

fn worldPosFromScreenPos(
    uv: vec2f,
    depthNdc: f32
) -> vec3f {
    // WebGPU NDC: X and Y in [-1, 1], Z in [0, 1].
    let posClip = vec4f(
        uv.x * 2.0 - 1.0,
        1.0 - uv.y * 2.0,
        depthNdc,
        1.0
    );

    let posWorldH = camera.inverseViewProjectionMatrix * posClip;

    return posWorldH.xyz / posWorldH.w;
}

struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
};

@fragment fn main(fsInput: VSOutput) -> @location(0) vec4<f32> {
    let pointShadow: PointShadowsElement = pointShadows.pointShadowsElements[0];
    let pointLight = pointLights.elements[0];

    // Sample depth
    let rawDepth = textureLoad(depthTexture, vec2<i32>(fsInput.position.xy / params.qualityRatio), 0);

    // Reconstruct world position
    let worldPos = worldPosFromScreenPos(fsInput.uv, rawDepth);

    // === Volumetric lighting ===

    let numSteps = params.nbSteps;
    var accumulated = 0.0;
    var totalTransmittance = 1.0;

    let fullRay = worldPos - camera.position;
    let rayDir = normalize(fullRay);
    let rayStart = camera.position + rayDir * camera.near;
    let ray = worldPos - rayStart;
    let rayLength = length(ray);
    let stepSize = rayLength / f32(numSteps);

    // blue noise
    let blueNoiseDimensions = vec2f(textureDimensions(blueNoiseTexture));
    let blueNoiseSample = textureSample(blueNoiseTexture, defaultSampler, fsInput.position.xy / blueNoiseDimensions).r;
    let offset = fract(blueNoiseSample + (params.frames % 32) / sqrt(0.5));

    let density = max(0.0, params.density);
    let extinction = density * params.fogIntensity;

    for (var i = 0u; i <= numSteps; i++) {
        if(totalTransmittance < 0.01) {
            break;
        }

        let step = f32(i) / f32(numSteps);
        let t = step * rayLength * offset;

        if(t < camera.near || t > camera.far) {
            continue;
        }

        let samplePos = rayStart + rayDir * t;

        let lightDistance = length(pointLight.position - samplePos);

        let attenuation = rangeAttenuation(pointLight.range, lightDistance, 2.0);

        if (attenuation < 1e-6) {
            continue;
        }

        let lightDir = normalize(pointLight.position - samplePos);
        var lightRange = max(pointLight.range, 0.00001);

        let referenceDepth = lightDistance / lightRange;

        let visibility = textureSampleCompareLevel(
            pointShadowCubeDepthTexture0,
            depthComparisonSampler,
            lightDir,
            referenceDepth - pointShadow.bias
        );

        let occlusion = select(0.0, 1.0, lightDistance <= visibility * lightRange);

        if(occlusion < 0.001) {
            continue;
        }

        // Henyey-Greenstein approximation or basic phase
        let phase = max(dot(lightDir, rayDir), 0.0);

        let accumulation: f32 = attenuation * phase * stepSize * occlusion * density;

        accumulated += accumulation;

        totalTransmittance *= beersLaw(stepSize * extinction, 1.0);
    }

    return vec4(accumulated * params.lightColor, accumulated);
}
`
