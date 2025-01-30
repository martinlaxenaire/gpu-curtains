import { constants } from '../../chunks/utils/constants'
import { common } from '../../chunks/utils/common'
import { hammersley2D } from '../../chunks/utils/hammersley-2D'
import { generateTBN } from '../../chunks/utils/generate-TBN'
import { BRDF_GGX } from '../../chunks/utils/BRDF_GGX'

// LUT for GGX distribution
// ported from https://github.com/KhronosGroup/glTF-Sample-Viewer/blob/9940e4b4f4a2a296351bcd35035cc518deadc298/source/shaders/ibl_filtering.frag
/**
 * Compute a BRDF LUT (look up table) texture.
 */
export const computeBRDFLUT = /* wgsl */ `
${constants}
${common}
${hammersley2D}
${generateTBN}
${BRDF_GGX}

// GGX microfacet distribution
struct MicrofacetDistributionSample {
  pdf: f32,
  cosTheta: f32,
  sinTheta: f32,
  phi: f32
};

// https://www.cs.cornell.edu/~srm/publications/EGSR07-btdf.html
// This implementation is based on https://bruop.github.io/ibl/,
//  https://www.tobias-franke.eu/log/2014/03/30/notes_on_importance_sampling.html
// and https://developer.nvidia.com/gpugems/GPUGems3/gpugems3_ch20.html
fn GGX(xi: vec2f, roughness: f32) -> MicrofacetDistributionSample {
  var ggx: MicrofacetDistributionSample;

  // evaluate sampling equations
  let alpha: f32 = roughness * roughness;
  ggx.cosTheta = clamp(sqrt((1.0 - xi.y) / (1.0 + (alpha * alpha - 1.0) * xi.y)), 0.0, 1.0);
  ggx.sinTheta = sqrt(1.0 - ggx.cosTheta * ggx.cosTheta);
  ggx.phi = 2.0 * PI * xi.x;

  // evaluate GGX pdf (for half vector)
  ggx.pdf = DistributionGGX(ggx.cosTheta, alpha);

  // Apply the Jacobian to obtain a pdf that is parameterized by l
  // see https://bruop.github.io/ibl/
  // Typically you'd have the following:
  // float pdf = DistributionGGX(NoH, roughness) * NoH / (4.0 * VoH);
  // but since V = N => VoH == NoH
  ggx.pdf /= 4.0;

  return ggx;
}

fn Lambertian(xi: vec2f, roughness: f32) -> MicrofacetDistributionSample {
    var lambertian: MicrofacetDistributionSample;

  // Cosine weighted hemisphere sampling
  // http://www.pbr-book.org/3ed-2018/Monte_Carlo_Integration/2D_Sampling_with_Multidimensional_Transformations.html#Cosine-WeightedHemisphereSampling
  lambertian.cosTheta = sqrt(1.0 - xi.y);
  lambertian.sinTheta = sqrt(xi.y); // equivalent to \`sqrt(1.0 - cosTheta*cosTheta)\`;
  lambertian.phi = 2.0 * PI * xi.x;

  lambertian.pdf = lambertian.cosTheta / PI; // evaluation for solid angle, therefore drop the sinTheta

  return lambertian;
}

// getImportanceSample returns an importance sample direction with pdf in the .w component
fn getImportanceSample(Xi: vec2<f32>, N: vec3f, roughness: f32) -> vec4f {
  var importanceSample: MicrofacetDistributionSample;
  
  importanceSample = GGX(Xi, roughness);
  
   // transform the hemisphere sample to the normal coordinate frame
  // i.e. rotate the hemisphere to the normal direction
  let localSpaceDirection: vec3f = normalize(vec3(
    importanceSample.sinTheta * cos(importanceSample.phi), 
    importanceSample.sinTheta * sin(importanceSample.phi), 
    importanceSample.cosTheta
  ));
  
  let TBN: mat3x3f = generateTBN(N);
  let direction: vec3f = TBN * localSpaceDirection;

  return vec4(direction, importanceSample.pdf);
}

@compute @workgroup_size(16, 16, 1)
fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {  
  let texelSize: vec2<u32> = textureDimensions(lutStorageTexture);

  let x: u32 = global_id.x;
  let y: u32 = global_id.y;

  // Check bounds
  if (x >= texelSize.x || y >= texelSize.y) {
     return;
  }
  
  let epsilon: f32 = 1e-6;

  // Compute roughness and N·V from texture coordinates
  let NdotV: f32 = max(f32(x) / f32(texelSize.x - 1), epsilon);    // Maps x-axis to N·V (0.0 to 1.0)
  let roughness: f32 = max(f32(y) / f32(texelSize.y - 1), epsilon);  // Maps y-axis to roughness (0.0 to 1.0)

  // Calculate view vector and normal vector
  let V: vec3<f32> = vec3<f32>(sqrt(1.0 - NdotV * NdotV), 0.0, NdotV);  // Normalized view vector
  let N: vec3<f32> = vec3<f32>(0.0, 0.0, 1.0);                          // Normal is along z-axis

  // Initialize integration variables
  var A: f32 = 0.0;
  var B: f32 = 0.0;
  var C: f32 = 0.0;

  // Monte Carlo integration to calculate A and B factors
  let sampleCount: u32 = params.sampleCount;
  for (var i: u32 = 0; i < sampleCount; i++) {
    let Xi: vec2<f32> = hammersley2d(i, sampleCount);  // Importance sampling (Hammersley sequence)
    
    //let H: vec3<f32> = importanceSampleGGX(Xi, N, roughness);
    let importanceSample: vec4f = getImportanceSample(Xi, N, roughness);
    let H: vec3f = importanceSample.xyz;
    // let pdf: f32 = importanceSample.w;
    
    let L: vec3<f32> = normalize(reflect(-V, H));
    
    let NdotL: f32 = clamp(L.z, 0.0, 1.0);
    let NdotH: f32 = clamp(H.z, 0.0, 1.0);
    let VdotH: f32 = clamp(dot(V, H), 0.0, 1.0);

    // Ensure valid light direction
    if (NdotL > 0.0) {     
      // LUT for GGX distribution.

      // Taken from: https://bruop.github.io/ibl
      // Shadertoy: https://www.shadertoy.com/view/3lXXDB
      // Terms besides V are from the GGX PDF we're dividing by.
      let V_pdf: f32 = GeometrySmith(NdotV, NdotL, roughness) * VdotH * NdotL / max(NdotH, epsilon);
      let Fc: f32 = pow(1.0 - VdotH, 5.0);
      A += (1.0 - Fc) * V_pdf;
      B += Fc * V_pdf;
      C += 0.0;
    }
  }

  // Average the integration result
  // The PDF is simply pdf(v, h) -> NDF * <nh>.
  // To parametrize the PDF over l, use the Jacobian transform, yielding to: pdf(v, l) -> NDF * <nh> / 4<vh>
  // Since the BRDF divide through the PDF to be normalized, the 4 can be pulled out of the integral.
  A = A * 4.0 / f32(sampleCount);
  B = B * 4.0 / f32(sampleCount);
  C = C * 4.0 * 2.0 * PI / f32(sampleCount);
    
  // Store the result in the LUT texture
  textureStore(lutStorageTexture, vec2<u32>(x, y), vec4<f32>(A, B, C, 1.0));
}
`
