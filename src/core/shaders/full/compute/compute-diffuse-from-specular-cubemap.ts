import { Texture } from '../../../textures/Texture'
import { constants } from '../../chunks/utils/constants'
import { hammersley2D } from '../../chunks/utils/hammersley-2D'
import { generateTBN } from '../../chunks/utils/generate-TBN'

// ported from https://github.com/KhronosGroup/glTF-Sample-Viewer/blob/9940e4b4f4a2a296351bcd35035cc518deadc298/source/shaders/ibl_filtering.frag
/**
 * Compute a diffuse cube map texture from a specular cube map {@link Texture}.
 * @param specularTexture - Specular cube map {@link Texture} to use.
 */
export const computeDiffuseFromSpecularCubemap = (specularTexture: Texture) => /* wgsl */ `
${constants}
${hammersley2D}
${generateTBN}

// Mipmap Filtered Samples (GPU Gems 3, 20.4)
// https://developer.nvidia.com/gpugems/gpugems3/part-iii-rendering/chapter-20-gpu-based-importance-sampling
// https://cgg.mff.cuni.cz/~jaroslav/papers/2007-sketch-fis/Final_sap_0073.pdf
fn computeLod(pdf: f32) -> f32 {
  // https://cgg.mff.cuni.cz/~jaroslav/papers/2007-sketch-fis/Final_sap_0073.pdf
  return 0.5 * log2( 6.0 * f32(params.faceSize) * f32(params.faceSize) / (f32(params.sampleCount) * pdf));
}

fn transformDirection(face: u32, uv: vec2f) -> vec3f {
  // Transform the direction based on the cubemap face
  switch (face) {
    case 0u {
      // +X
      return vec3f( 1.0,  uv.y, -uv.x);
    }
    case 1u {
      // -X
      return vec3f(-1.0,  uv.y,  uv.x);
    }
    case 2u {
      // +Y
      return vec3f( uv.x,  -1.0, uv.y);
    }
    case 3u {
      // -Y
      return vec3f( uv.x, 1.0,  -uv.y);
    }
    case 4u {
      // +Z
      return vec3f( uv.x,  uv.y,  1.0);
    }
    case 5u {
      // -Z
      return vec3f(-uv.x,  uv.y, -1.0);
    }
    default {
      return vec3f(0.0, 0.0, 0.0);
    }
  }
}

@compute @workgroup_size(8, 8, 1) fn main(
  @builtin(global_invocation_id) GlobalInvocationID: vec3u,
) {
  let faceSize: u32 = params.faceSize;
  let sampleCount: u32 = params.sampleCount;
  
  let face: u32 = GlobalInvocationID.z;
  let x: u32 = GlobalInvocationID.x;
  let y: u32 = GlobalInvocationID.y;

  if (x >= faceSize || y >= faceSize) {
    return;
  }

  let texelSize: f32 = 1.0 / f32(faceSize);
  let halfTexel: f32 = texelSize * 0.5;
  
  var uv: vec2f = vec2(
    (f32(x) + halfTexel) * texelSize,
    (f32(y) + halfTexel) * texelSize
  );
  
  uv = uv * 2.0 - 1.0;

  let normal: vec3<f32> = transformDirection(face, uv);
  
  var irradiance: vec3f = vec3f(0.0, 0.0, 0.0);

  for (var i: u32 = 0; i < sampleCount; i++) {
    // generate a quasi monte carlo point in the unit square [0.1)^2
    let xi: vec2f = hammersley2d(i, sampleCount);
    
    let cosTheta: f32 = sqrt(1.0 - xi.y);
    let sinTheta: f32 = sqrt(1.0 - cosTheta * cosTheta);
    let phi: f32 = 2.0 * PI * xi.x;
    let pdf: f32 = cosTheta / PI; // evaluation for solid angle, therefore drop the sinTheta

    let sampleVec: vec3f = vec3f(
      sinTheta * cos(phi),
      sinTheta * sin(phi),
      cosTheta
    );
    
    let TBN: mat3x3f = generateTBN(normalize(normal));
    
    var direction: vec3f = TBN * sampleVec;
    
    // invert along Y axis
    direction.y *= -1.0;
    
    let lod: f32 = computeLod(pdf);
    
    let sampleLevel = min(lod, f32(params.maxMipLevel));

    // Convert sampleVec to texture coordinates of the specular env map
    irradiance += textureSampleLevel(
      ${specularTexture.options.name},
      clampSampler,
      direction,
      sampleLevel
    ).rgb;
  }

  irradiance /= f32(sampleCount);

  textureStore(diffuseEnvMap, vec2(x, y), face, vec4f(irradiance, 1.0));
}
`
