// LUT for GGX distribution
// ported from https://github.com/KhronosGroup/glTF-Sample-Viewer/blob/9940e4b4f4a2a296351bcd35035cc518deadc298/source/shaders/ibl_filtering.frag
// TODO use chunks (hammersley, V_SmithGGXCorrelated / GeometrySmith, generateTBN, etc.)
export default /* wgsl */ `
fn radicalInverse_VdC(inputBits: u32) -> f32 {
  var bits: u32 = inputBits;
  bits = (bits << 16u) | (bits >> 16u);
  bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
  bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
  bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
  bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
  return f32(bits) * 2.3283064365386963e-10; // / 0x100000000
}

// hammersley2d describes a sequence of points in the 2d unit square [0,1)^2
// that can be used for quasi Monte Carlo integration
fn hammersley2d(i: u32, N: u32) -> vec2f {
  return vec2(f32(i) / f32(N), radicalInverse_VdC(i));
}

// GGX microfacet distribution
struct MicrofacetDistributionSample {
  pdf: f32,
  cosTheta: f32,
  sinTheta: f32,
  phi: f32
};

fn D_GGX(NdotH: f32, roughness: f32) -> f32 {
  let a: f32 = NdotH * roughness;
  let k: f32 = roughness / (1.0 - NdotH * NdotH + a * a);
  return k * k * (1.0 / ${Math.PI});
}

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
  ggx.phi = 2.0 * ${Math.PI} * xi.x;

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

fn Lambertian(xi: vec2f, roughness: f32) -> MicrofacetDistributionSample {
    var lambertian: MicrofacetDistributionSample;

  // Cosine weighted hemisphere sampling
  // http://www.pbr-book.org/3ed-2018/Monte_Carlo_Integration/2D_Sampling_with_Multidimensional_Transformations.html#Cosine-WeightedHemisphereSampling
  lambertian.cosTheta = sqrt(1.0 - xi.y);
  lambertian.sinTheta = sqrt(xi.y); // equivalent to \`sqrt(1.0 - cosTheta*cosTheta)\`;
  lambertian.phi = 2.0 * ${Math.PI} * xi.x;

  lambertian.pdf = lambertian.cosTheta / ${Math.PI}; // evaluation for solid angle, therefore drop the sinTheta

  return lambertian;
}

// TBN generates a tangent bitangent normal coordinate frame from the normal
// (the normal must be normalized)
fn generateTBN(normal: vec3f) -> mat3x3f {
  var bitangent: vec3f = vec3(0.0, 1.0, 0.0);

  let NdotUp: f32 = dot(normal, vec3(0.0, 1.0, 0.0));
  let epsilon: f32 = 0.0000001;
  
  if (1.0 - abs(NdotUp) <= epsilon) {
    // Sampling +Y or -Y, so we need a more robust bitangent.
    if (NdotUp > 0.0) {
      bitangent = vec3(0.0, 0.0, 1.0);
    }
    else {
      bitangent = vec3(0.0, 0.0, -1.0);
    }
  }

  let tangent: vec3f = normalize(cross(bitangent, normal));
  bitangent = cross(normal, tangent);

  return mat3x3f(tangent, bitangent, normal);
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

// From the filament docs. Geometric Shadowing function
// https://google.github.io/filament/Filament.html#toc4.4.2
fn V_SmithGGXCorrelated(NoV: f32, NoL: f32, roughness: f32) -> f32 {
  let a2: f32 = pow(roughness, 4.0);
  let GGXV: f32 = NoL * sqrt(NoV * NoV * (1.0 - a2) + a2);
  let GGXL: f32 = NoV * sqrt(NoL * NoL * (1.0 - a2) + a2);
  return 0.5 / (GGXV + GGXL);
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
      let V_pdf: f32 = V_SmithGGXCorrelated(NdotV, NdotL, roughness) * VdotH * NdotL / max(NdotH, epsilon);
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
  C = C * 4.0 * 2.0 * ${Math.PI} / f32(sampleCount);
    
  // Store the result in the LUT texture
  textureStore(lutStorageTexture, vec2<u32>(x, y), vec4<f32>(A, B, C, 1.0));
}
`
