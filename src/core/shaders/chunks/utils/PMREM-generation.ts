import { constants } from './constants'
import { generateTBN } from './generate-TBN'
import { hammersley2D } from './hammersley-2D'

// from https://github.com/KhronosGroup/glTF-Sample-Renderer/blob/4deade77ce977dcd1e7918c949c2289e80eac365/source/shaders/ibl_filtering.frag
export const PMREMGeneration = /* wgsl */ `
struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) direction: vec3f,
};

// Cube face lookup vectors
// positive and negative Y need to be inverted
const faceVectors = array<array<vec3<f32>, 2>, 6>(
  array<vec3<f32>, 2>(vec3<f32>(1.0, 0.0, 0.0), vec3<f32>(0.0, 1.0, 0.0)), // +X
  array<vec3<f32>, 2>(vec3<f32>(-1.0, 0.0, 0.0), vec3<f32>(0.0, 1.0, 0.0)), // -X
  array<vec3<f32>, 2>(vec3<f32>(0.0, 1.0, 0.0), vec3<f32>(0.0, 0.0, -1.0)), // +Y
  array<vec3<f32>, 2>(vec3<f32>(0.0, -1.0, 0.0), vec3<f32>(0.0, 0.0, 1.0)),  // -Y
  array<vec3<f32>, 2>(vec3<f32>(0.0, 0.0, 1.0), vec3<f32>(0.0, 1.0, 0.0)), // +Z
  array<vec3<f32>, 2>(vec3<f32>(0.0, 0.0, -1.0), vec3<f32>(0.0, 1.0, 0.0)) // -Z
);

fn texelDirection(faceIndex : u32, u : f32, v : f32) -> vec3<f32> {
  let forward = faceVectors[faceIndex][0];
  let up = faceVectors[faceIndex][1];
  let right = normalize(cross(up, forward));
  return normalize(forward + (2.0 * u - 1.0) * right + (2.0 * v - 1.0) * up);
}

@vertex fn vs(
    @builtin(vertex_index) vertexIndex : u32
) -> VSOutput {
    let pos = array(

    vec2f( 0.0,  0.0),  // center
    vec2f( 1.0,  0.0),  // right, center
    vec2f( 0.0,  1.0),  // center, top

    // 2st triangle
    vec2f( 0.0,  1.0),  // center, top
    vec2f( 1.0,  0.0),  // right, center
    vec2f( 1.0,  1.0),  // right, top
    );

    var vsOutput: VSOutput;
    let xy = pos[vertexIndex];
    vsOutput.position = vec4f(xy * 2.0 - 1.0, 0.0, 1.0);
    let uv: vec2f = vec2f(xy.x, 1.0 - xy.y);
    let direction = texelDirection(params.faceIndex, uv.x, 1.0 - uv.y);
    vsOutput.direction = direction;
    return vsOutput;
}

${constants}
${hammersley2D}
${generateTBN}

// glTF-Sample-Viewer
struct MicrofacetDistributionSample {
    pdf: f32,
    cosTheta: f32,
    sinTheta: f32,
    phi: f32
}

fn D_GGX(NdotH: f32, roughness: f32) -> f32 {
  let a: f32 = NdotH * roughness;
  let k: f32 = roughness / (1.0 - NdotH * NdotH + a * a);
  return k * k * (1.0 / PI);
}

// GGX microfacet distribution
// https://www.cs.cornell.edu/~srm/publications/EGSR07-btdf.html
// This implementation is based on https://bruop.github.io/ibl/,
//  https://www.tobias-franke.eu/log/2014/03/30/notes_on_importance_sampling.html
// and https://developer.nvidia.com/gpugems/GPUGems3/gpugems3_ch20.html
fn GGX(xi: vec2f, roughness: f32) -> MicrofacetDistributionSample {
  var ggx: MicrofacetDistributionSample;

  // evaluate sampling equations
  let alpha: f32 = roughness * roughness;
  ggx.cosTheta = saturate(sqrt((1.0 - xi.y) / (1.0 + (alpha * alpha - 1.0) * xi.y)));
  ggx.sinTheta = sqrt(1.0 - ggx.cosTheta * ggx.cosTheta);
  ggx.phi = 2.0 * PI * xi.x;

  // evaluate GGX pdf (for half vector)
  ggx.pdf = D_GGX(ggx.cosTheta, alpha);

  // Apply the Jacobian to obtain a pdf that is parameterized by l
  // see https://bruop.github.io/ibl/
  // Typically you'd have the following:
  // float pdf = D_GGX(NoH, roughness) * NoH / (4.0 * VoH);
  // but since V = N => VoH == NoH
  ggx.pdf /= 4.0;

  return ggx;
}

// getImportanceSample returns an importance sample direction with pdf in the .w component
fn getImportanceSample(sampleIndex: u32, N: vec3f, roughness: f32) -> vec4f {
  // generate a quasi monte carlo point in the unit square [0.1)^2
  let xi: vec2f = hammersley2d(sampleIndex, params.numSamples);

  var importanceSample: MicrofacetDistributionSample;

  // Trowbridge-Reitz / GGX microfacet model (Walter et al)
  // https://www.cs.cornell.edu/~srm/publications/EGSR07-btdf.html
  importanceSample = GGX(xi, roughness);

  // transform the hemisphere sample to the normal coordinate frame
  // i.e. rotate the hemisphere to the normal direction
  let localSpaceDirection: vec3f = normalize(vec3(
    importanceSample.sinTheta * cos(importanceSample.phi), 
    importanceSample.sinTheta * sin(importanceSample.phi), 
    importanceSample.cosTheta
  ));

  let TBN = generateTBN(N);
  let direction: vec3f = TBN * localSpaceDirection;

  return vec4(direction, importanceSample.pdf);
}

// Mipmap Filtered Samples (GPU Gems 3, 20.4)
// https://developer.nvidia.com/gpugems/gpugems3/part-iii-rendering/chapter-20-gpu-based-importance-sampling
// https://cgg.mff.cuni.cz/~jaroslav/papers/2007-sketch-fis/Final_sap_0073.pdf
fn computeLod(pdf: f32) -> f32 {
  // // Solid angle of current sample -- bigger for less likely samples
  // float omegaS = 1.0 / (float(u_sampleCount) * pdf);
  // // Solid angle of texel
  // // note: the factor of 4.0 * MATH_PI 
  // float omegaP = 4.0 * MATH_PI / (6.0 * float(u_width) * float(u_width));
  // // Mip level is determined by the ratio of our sample's solid angle to a texel's solid angle 
  // // note that 0.5 * log2 is equivalent to log4
  // float lod = 0.5 * log2(omegaS / omegaP);

  // babylon introduces a factor of K (=4) to the solid angle ratio
  // this helps to avoid undersampling the environment map
  // this does not appear in the original formulation by Jaroslav Krivanek and Mark Colbert
  // log4(4) == 1
  // lod += 1.0;

  // We achieved good results by using the original formulation from Krivanek & Colbert adapted to cubemaps

  // https://cgg.mff.cuni.cz/~jaroslav/papers/2007-sketch-fis/Final_sap_0073.pdf
  let lod: f32 = 0.5 * log2( 6.0 * f32(params.faceSize) * f32(params.faceSize) / (f32(params.numSamples) * pdf));

  return lod;
}

struct Params {
  faceIndex: u32,
  mipLevel: u32,
  maxMipLevel: u32,
  numSamples: u32,
  faceSize: u32
}

@group(0) @binding(0) var clampSampler: sampler;
@group(0) @binding(1) var cubeTexture: texture_cube<f32>;
@group(0) @binding(2) var<uniform> params: Params;

@fragment fn fs(fsInput: VSOutput) -> @location(0) vec4f {
  let faceIndex: u32 = params.faceIndex;
  let currentMipLevel: u32 = params.mipLevel;
  let maxMipLevel: u32 = params.maxMipLevel;
  let numSamples: u32 = params.numSamples;

  // determine roughness for this mip.
  let maxMipF: f32 = f32(max(1u, maxMipLevel - 1u));
  let roughness = saturate( f32(currentMipLevel) / maxMipF );

  let N: vec3f = normalize(fsInput.direction);

  var color: vec3f = vec3(0.0);
  var weight: f32 = 0.0;

  // For very low roughness, just sample the environment directly
  if (roughness < 0.001) {
    color = textureSampleLevel(cubeTexture, clampSampler, N, 0.0).rgb;
    return vec4(color, 1.0);
  }

  for(var i = 0u; i < numSamples; i++) {
    let importanceSample: vec4f = getImportanceSample(i, N, roughness);

    let H: vec3f = vec3(importanceSample.xyz);
    let pdf: f32 = importanceSample.w;

    // mipmap filtered samples (GPU Gems 3, 20.4)
    let lod: f32 = computeLod(pdf);
    // let lod: f32 = min(computeLod(pdf), f32(currentMipLevel) - 1.0);

    // Note: reflect takes incident vector.
    let V: vec3f = N;
    let L: vec3f = normalize(reflect(-V, H));
    let NdotL: f32 = dot(N, L);

    if (NdotL > 0.0) {
        let intensityScale: f32 = 1.0; // TODO
        let sampleColor = textureSampleLevel(cubeTexture, clampSampler, L, lod).rgb * intensityScale;
        color += sampleColor * NdotL;
        weight += NdotL;
    }
  }

  color = select(
    color / f32(numSamples),
    color / weight,
    weight > 0.0
  );

  return vec4(color, 1.0);
}
`
