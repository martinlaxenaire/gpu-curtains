import { constants } from '../../chunks/utils/constants'
import { common } from '../../chunks/utils/common'
import { hammersley2D } from '../../chunks/utils/hammersley-2D'
import { generateTBN } from '../../chunks/utils/generate-TBN'
import { BRDF_GGX } from '../../chunks/fragment/head/BRDF_GGX'

// LUT for GGX distribution
// ported from https://github.com/KhronosGroup/glTF-Sample-Renderer/blob/main/source/shaders/ibl_filtering.frag
/**
 * Compute a BRDF LUT (look up table) texture. `RG` channels are used for BRDF GGX, `B` channel is used for BRDF "Charlie" sheen.
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
}

struct ImportanceSampleVars {
  H: vec3f,
  pdf: f32,
  L: vec3f,
  NdotL: f32,
  NdotH: f32,
  VdotH: f32
}

// https://www.cs.cornell.edu/~srm/publications/EGSR07-btdf.html
// This implementation is based on https://bruop.github.io/ibl/,
//  https://www.tobias-franke.eu/log/2014/03/30/notes_on_importance_sampling.html
// and https://developer.nvidia.com/gpugems/GPUGems3/gpugems3_ch20.html
fn GGX(xi: vec2f, roughness: f32) -> MicrofacetDistributionSample {
  var ggx: MicrofacetDistributionSample;

  // evaluate sampling equations
  let alpha: f32 = max(roughness * roughness, EPSILON);
  ggx.cosTheta = sqrt((1.0 - xi.y) / (1.0 + (alpha * alpha - 1.0) * xi.y));
  ggx.sinTheta = sqrt(1.0 - ggx.cosTheta * ggx.cosTheta);
  ggx.phi = 2.0 * PI * xi.x;

  // evaluate GGX pdf (for half vector)
  // ggx.pdf = DistributionGGX(ggx.cosTheta, roughness);

  // Apply the Jacobian to obtain a pdf that is parameterized by l
  // see https://bruop.github.io/ibl/
  // Typically you'd have the following:
  // float pdf = DistributionGGX(NoH, roughness) * NoH / (4.0 * VoH);
  // but since V = N => VoH == NoH
  ggx.pdf /= 4.0;

  return ggx;
}

fn Charlie(xi: vec2f, roughness: f32) -> MicrofacetDistributionSample {
  var charlie: MicrofacetDistributionSample;

  let alpha = max(roughness * roughness, EPSILON);
  charlie.sinTheta = pow(xi.y, alpha / (2.0 * alpha + 1.0));
  charlie.cosTheta = sqrt(1.0 - charlie.sinTheta * charlie.sinTheta);
  charlie.phi = 2.0 * PI * xi.x;

  // evaluate Charlie pdf (for half vector)
  // charlie.pdf = D_Charlie(roughness, charlie.cosTheta);

  // Apply the Jacobian to obtain a pdf that is parameterized by l
  charlie.pdf /= 4.0;

  return charlie;
}

// getImportanceSampleGGX returns an importance sample direction with pdf in the .w component
fn getImportanceSampleGGX(Xi: vec2f, N: vec3f, roughness: f32) -> vec4f {
  var importanceSample: MicrofacetDistributionSample;
  
  importanceSample = GGX(Xi, roughness);
  
  // transform the hemisphere sample to the normal coordinate frame
  // i.e. rotate the hemisphere to the normal direction
  let H: vec3f = normalize(vec3(
    importanceSample.sinTheta * cos(importanceSample.phi), 
    importanceSample.sinTheta * sin(importanceSample.phi), 
    importanceSample.cosTheta
  ));

  return vec4(H, importanceSample.pdf);
}

fn getImportanceSampleCharlie(Xi: vec2f, N: vec3f, roughness: f32) -> vec4f {
  var importanceSample: MicrofacetDistributionSample;

  importanceSample = Charlie(Xi, roughness);

  // transform the hemisphere sample to the normal coordinate frame
  // i.e. rotate the hemisphere to the normal direction
  let H: vec3f = normalize(vec3(
    importanceSample.sinTheta * cos(importanceSample.phi), 
    importanceSample.sinTheta * sin(importanceSample.phi), 
    importanceSample.cosTheta
  ));

  return vec4(H, importanceSample.pdf);
}

fn getImportanceSampleVars(importanceSample: vec4f, V: vec3f, TBN: mat3x3f) -> ImportanceSampleVars {
  var importanceSampleVars: ImportanceSampleVars;
  let H: vec3f = normalize(TBN * importanceSample.xyz);
  let L: vec3f = normalize(reflect(-V, H));

  importanceSampleVars.H = H;
  importanceSampleVars.pdf = importanceSample.w;

  importanceSampleVars.L = L;

  importanceSampleVars.NdotL = saturate(L.z);
  importanceSampleVars.NdotH = saturate(H.z);
  importanceSampleVars.VdotH = saturate(dot(V, H));

  return importanceSampleVars;
}

// NDF
// https://github.com/google/filament/blob/master/shaders/src/brdf.fs#L136
fn V_Ashikhmin(NdotL: f32, NdotV: f32) -> f32 {
  return saturate(1.0 / (4.0 * clamp(NdotL + NdotV - NdotL * NdotV, EPSILON, 1.0)));
}

// NDF
// https://github.com/google/filament/blob/main/shaders/src/surface_brdf.fs#L94
fn D_Charlie(sheenRoughness: f32, NdotH: f32) -> f32 {
  // Estevez and Kulla 2017, "Production Friendly Microfacet Sheen BRDF"
  let invAlpha: f32  = 1.0 / max(sheenRoughness * sheenRoughness, EPSILON);
  let cos2h: f32 = NdotH * NdotH;
  let sin2h: f32 = max(1.0 - cos2h, 0.0078125); // 2^(-14/2), so sin2h^2 > 0 in fp16
  return (2.0 + invAlpha) * pow(sin2h, invAlpha * 0.5) / (2.0 * PI);
}

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) global_id : vec3u) {  
  let texelSize: vec2u = textureDimensions(lutStorageTexture);

  let x: u32 = global_id.x;
  let y: u32 = global_id.y;

  // Check bounds
  if (x >= texelSize.x || y >= texelSize.y) {
     return;
  }
  
  // Compute roughness and N·V from texture coordinates
  let NdotV: f32 = f32(x) / f32(texelSize.x - 1);    // Maps x-axis to N·V (0.0 to 1.0)
  let roughness: f32 = f32(y) / f32(texelSize.y - 1);  // Maps y-axis to roughness (0.0 to 1.0)

  // Calculate view vector and normal vector
  let V: vec3f = vec3(sqrt(1.0 - NdotV * NdotV), 0.0, NdotV);  // Normalized view vector
  let N: vec3f = vec3(0.0, 0.0, 1.0);                          // Normal is along z-axis

  // Initialize integration variables
  var A: f32 = 0.0;
  var B: f32 = 0.0;
  var C: f32 = 0.0;

  let TBN: mat3x3f = generateTBN(N);

  // Monte Carlo integration to calculate A and B factors
  let sampleCount: u32 = params.sampleCount;
  for (var i: u32 = 0; i < sampleCount; i++) {
    let Xi: vec2f = hammersley2d(i, sampleCount);  // Importance sampling (Hammersley sequence)
    
    let importanceSampleGGX: vec4f = getImportanceSampleGGX(Xi, N, max(roughness, 0.0525));
    let sampleGGX: ImportanceSampleVars = getImportanceSampleVars(importanceSampleGGX, V, TBN);

    // Ensure valid light direction
    if (sampleGGX.NdotL > 0.0) {     
      // LUT for GGX distribution.

      // Taken from: https://bruop.github.io/ibl
      // Shadertoy: https://www.shadertoy.com/view/3lXXDB
      // Terms besides V are from the GGX PDF we're dividing by.
      let geometryV: f32 = GeometrySmith(NdotV, sampleGGX.NdotL, max(roughness, 0.0525));
      let V_pdf: f32 = geometryV * sampleGGX.VdotH * sampleGGX.NdotL / max(sampleGGX.NdotH, EPSILON);
      let Fc: f32 = pow(1.0 - sampleGGX.VdotH, 5.0);
      A += (1.0 - Fc) * V_pdf;
      B += Fc * V_pdf;
    }

    let importanceSampleCharlie: vec4f = getImportanceSampleCharlie(Xi, N, roughness);
    let sampleCharlie: ImportanceSampleVars = getImportanceSampleVars(importanceSampleCharlie, V, TBN);

    if(sampleCharlie.NdotL > 0.0) {
      // LUT for Charlie distribution.
      let sheenDistribution: f32 = D_Charlie(roughness, sampleCharlie.NdotH);
      let sheenVisibility: f32 = V_Ashikhmin(sampleCharlie.NdotL, NdotV);
      C += sheenVisibility * sheenDistribution * sampleCharlie.NdotL * sampleCharlie.VdotH;
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
