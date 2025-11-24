import { BRDF_GGX } from './BRDF_GGX'
import { BRDFCharlie } from './BRDF-Charlie'
import { common } from './common'
import { constants } from './constants'
import { generateTBN } from './generate-TBN'
import { getImportanceSamples } from './get-importance-samples'
import { hammersley2D } from './hammersley-2D'

// from https://github.com/KhronosGroup/glTF-Sample-Renderer/blob/4deade77ce977dcd1e7918c949c2289e80eac365/source/shaders/ibl_filtering.frag
/**
 * WGSL code to generate the mip levels of a PMREM cube texture based on a environment cubemap texture (with mips).
 */
export const PMREMGeneration = /* wgsl */ `
${constants}
${common}
${hammersley2D}
${generateTBN}
${BRDF_GGX}
${BRDFCharlie}
${getImportanceSamples}

struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) direction: vec3f,
};

// Cube face lookup vectors
// positive and negative Y need to be inverted
const faceVectors = array<array<vec3f, 2>, 6>(
  array<vec3f, 2>(vec3f(1.0, 0.0, 0.0), vec3f(0.0, 1.0, 0.0)), // +X
  array<vec3f, 2>(vec3f(-1.0, 0.0, 0.0), vec3f(0.0, 1.0, 0.0)), // -X
  array<vec3f, 2>(vec3f(0.0, 1.0, 0.0), vec3f(0.0, 0.0, -1.0)), // +Y
  array<vec3f, 2>(vec3f(0.0, -1.0, 0.0), vec3f(0.0, 0.0, 1.0)),  // -Y
  array<vec3f, 2>(vec3f(0.0, 0.0, 1.0), vec3f(0.0, 1.0, 0.0)), // +Z
  array<vec3f, 2>(vec3f(0.0, 0.0, -1.0), vec3f(0.0, 1.0, 0.0)) // -Z
);

fn texelDirection(faceIndex : u32, u : f32, v : f32) -> vec3f {
  let forward = faceVectors[faceIndex][0];
  let up = faceVectors[faceIndex][1];
  let right = normalize(cross(up, forward));
  return normalize(forward + (2.0 * u - 1.0) * right + (2.0 * v - 1.0) * up);
}

@vertex fn vs(
    @builtin(vertex_index) vertexIndex : u32
) -> VSOutput {
    let pos = array(
      vec2f(0.0, 0.0),  // center
      vec2f(1.0, 0.0),  // right, center
      vec2f(0.0, 1.0),  // center, top

      // 2nd triangle
      vec2f(0.0, 1.0),  // center, top
      vec2f(1.0, 0.0),  // right, center
      vec2f(1.0, 1.0),  // right, top
    );

    var vsOutput: VSOutput;
    let xy = pos[vertexIndex];
    vsOutput.position = vec4f(xy * 2.0 - 1.0, 0.0, 1.0);
    let uv: vec2f = vec2f(xy.x, 1.0 - xy.y);
    let direction = texelDirection(params.faceIndex, uv.x, 1.0 - uv.y);
    vsOutput.direction = direction;
    return vsOutput;
}

// Mipmap Filtered Samples (GPU Gems 3, 20.4)
// https://developer.nvidia.com/gpugems/gpugems3/part-iii-rendering/chapter-20-gpu-based-importance-sampling
// https://cgg.mff.cuni.cz/~jaroslav/papers/2007-sketch-fis/Final_sap_0073.pdf
fn computeLod(pdf: f32, faceSize: u32, numSamples: u32) -> f32 {
  // // Solid angle of current sample -- bigger for less likely samples
  // let omegaS: f32 = 1.0 / (f32(numSamples) * pdf);
  // // Solid angle of texel
  // // note: the factor of 4.0 * PI 
  // let omegaP: f32 = 4.0 * PI / (6.0 * f32(faceSize) * f32(faceSize));
  // // Mip level is determined by the ratio of our sample's solid angle to a texel's solid angle 
  // // note that 0.5 * log2 is equivalent to log4
  // let lod: f32 = 0.5 * log2(omegaS / omegaP);

  // babylon introduces a factor of K (=4) to the solid angle ratio
  // this helps to avoid undersampling the environment map
  // this does not appear in the original formulation by Jaroslav Krivanek and Mark Colbert
  // log4(4) == 1
  // lod += 1.0;

  // We achieved good results by using the original formulation from Krivanek & Colbert adapted to cubemaps

  // https://cgg.mff.cuni.cz/~jaroslav/papers/2007-sketch-fis/Final_sap_0073.pdf
  let lod: f32 = 0.5 * log2( 6.0 * f32(faceSize) * f32(faceSize) / (f32(numSamples) * pdf));

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
  let faceSize: u32 = params.faceSize;

  // determine roughness for this mip.
  let maxMipF: f32 = f32(max(1u, maxMipLevel - 1u));
  let roughness = saturate( f32(currentMipLevel) / maxMipF );

  let N: vec3f = normalize(fsInput.direction);
  let TBN = generateTBN(N);

  var color: vec3f = vec3(0.0);
  var weight: f32 = 0.0;

  // For very low roughness, just sample the environment directly
  if (roughness < 0.001) {
    color = textureSampleLevel(cubeTexture, clampSampler, N, 0.0).rgb;
    return vec4(color, 1.0);
  }

  for(var i = 0u; i < numSamples; i++) {
    // generate a quasi monte carlo point in the unit square [0.1)^2
    let Xi: vec2f = hammersley2d(i, numSamples);

    let importanceSample: vec4f = getImportanceSampleGGX(Xi, N, roughness);

    let H: vec3f = normalize(TBN * importanceSample.xyz);
    let pdf: f32 = importanceSample.w;

    // mipmap filtered samples (GPU Gems 3, 20.4)
    let lod: f32 = computeLod(pdf, faceSize, numSamples);

    // Note: reflect takes incident vector.
    let V: vec3f = N;
    let L: vec3f = normalize(reflect(-V, H));
    let NdotL: f32 = dot(N, L);

    if (NdotL > 0.0) {
        let intensityScale: f32 = 1.0; // TODO?
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
