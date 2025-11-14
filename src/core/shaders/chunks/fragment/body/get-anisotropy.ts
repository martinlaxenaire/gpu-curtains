import { ShaderTextureDescriptor } from '../../../../../extras/meshes/LitMesh'
import { PBRFragmentShaderInputParams } from '../../../full/fragment/get-fragment-shader-code'
import { getTextureSample } from './get-texture-sample'

export const getAnisotropy = ({
  extensionsUsed = [],
  anisotropyTexture = null,
}: {
  extensionsUsed?: PBRFragmentShaderInputParams['extensionsUsed']
  anisotropyTexture?: ShaderTextureDescriptor
} = {}): string => {
  let anisotropy = /* wgsl */ `
  var anisotropyT: vec3f = vec3(0.0);
  var anisotropyB: vec3f = vec3(0.0);
  var alphaT: f32 = 0.0;
  anisotropyVector *= anisotropy;
  `

  if (extensionsUsed.includes('KHR_materials_anisotropy')) {
    if (anisotropyTexture) {
      anisotropy += getTextureSample(anisotropyTexture, 'anisotropy')
      anisotropy += /* wgsl */ `
  let anisotropyMat: mat2x2f = mat2x2f(anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x);
  anisotropyVector = anisotropyMat * normalize( 2.0 * anisotropySample.rg - vec2( 1.0 ) ) * anisotropySample.b;`
    }

    anisotropy += /* wgsl */ `
  anisotropy = length( anisotropyVector );

  if( anisotropy == 0.0 ) {
    anisotropyVector = vec2( 1.0, 0.0 );
  } else {
    anisotropyVector /= anisotropy;
    anisotropy = saturate( anisotropy );
  }

  alphaT = mix( pow2( roughness ), 1.0, pow2( anisotropy ) );
  
  anisotropyT = tbn[ 0 ] * anisotropyVector.x + tbn[ 1 ] * anisotropyVector.y;
  anisotropyB = tbn[ 1 ] * anisotropyVector.x - tbn[ 0 ] * anisotropyVector.y;
  `
  }

  return anisotropy
}
