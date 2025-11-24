/**
 * Importance sample helper functions for GGX and Charlie sheen. Must be used with the `common`, `constants`, `BRDF_GGX` and `BRDFCharlie` chunks.
 */
export const getImportanceSamples = /* wgsl */ `
// microfacet distribution (GGX and Charlie)
struct MicrofacetDistributionSample {
  pdf: f32,
  cosTheta: f32,
  sinTheta: f32,
  phi: f32
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
  ggx.pdf = DistributionGGX(ggx.cosTheta, roughness);

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
  charlie.pdf = D_Charlie(roughness, charlie.cosTheta);

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
`
