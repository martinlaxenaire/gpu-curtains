import { ShaderTextureDescriptor } from '../../../../../extras/meshes/LitMesh'
import { PBRFragmentShaderInputParams } from '../../../full/fragment/get-fragment-shader-code'
import { getTextureSample } from './get-texture-sample'

/**
 * Set the `iridescence` (`f32`), `iridescenceThickness` (`f32`), `iridescenceF0` (`vec3f`) and `iridescenceFresnel` (`vec3f`) values.
 *
 * @param parameters - Parameters used to create the shader chunk.
 * @param parameters.extensionsUsed - {@link PBRFragmentShaderInputParams.extensionsUsed | extensionsUsed} to check if iridescence is enabled.
 * @param parameters.iridescenceTexture - {@link ShaderTextureDescriptor | Iridescence texture descriptor} (using the `R` channel for intensity and `G` channel for thickness) to use if any.
 * @param parameters.iridescenceFactorTexture - {@link ShaderTextureDescriptor | Iridescence factor texture descriptor} (using the `R` channel) to use if any.
 * @param parameters.iridescenceThicknessTexture - {@link ShaderTextureDescriptor | Iridescence thickness texture descriptor} (using the `G` channel) to use if any.
 */
export const getIridescence = ({
  extensionsUsed = [],
  iridescenceTexture = null,
  iridescenceFactorTexture = null,
  iridescenceThicknessTexture = null,
}: {
  extensionsUsed?: PBRFragmentShaderInputParams['extensionsUsed']
  iridescenceTexture?: ShaderTextureDescriptor
  iridescenceFactorTexture?: ShaderTextureDescriptor
  iridescenceThicknessTexture?: ShaderTextureDescriptor
} = {}): string => {
  let iridescence = /* wgsl */ `
  var iridescenceThickness: f32 = 0.0;
  var iridescenceF0: vec3f = vec3(0.0);
  var iridescenceFresnelDielectric: vec3f = vec3(0.0);
  var iridescenceFresnelMetallic: vec3f = vec3(0.0);
  var iridescenceFresnel: vec3f = vec3(0.0);`

  if (!extensionsUsed.includes('KHR_materials_iridescence')) {
    return iridescence
  }

  if (iridescenceTexture) {
    iridescence += getTextureSample(iridescenceTexture, 'iridescence')
    iridescence += /* wgsl */ `
  iridescence = iridescence * iridescenceSample.r;
  iridescenceThickness = (iridescenceThicknessRange.y - iridescenceThicknessRange.x) * iridescenceSample.g + iridescenceThicknessRange.x;`
  } else {
    if (iridescenceFactorTexture) {
      iridescence += getTextureSample(iridescenceFactorTexture, 'iridescenceFactor')
      iridescence += /* wgsl */ `
  iridescence = iridescence * iridescenceFactorSample.r;`
    }

    if (iridescenceThicknessTexture) {
      iridescence += getTextureSample(iridescenceThicknessTexture, 'iridescenceThickness')
      iridescence += /* wgsl */ `
  iridescenceThickness = (iridescenceThicknessRange.y - iridescenceThicknessRange.x) * iridescenceThicknessSample.g + iridescenceThicknessRange.x;`
    } else {
      iridescence += /* wgsl */ `
  iridescenceThickness = iridescenceThicknessRange.y;
    `
    }
  }

  iridescence += /* wgsl */ `
  let dotNVi: f32 = saturate( dot( normal, viewDirection ) );

  if ( iridescenceThickness == 0.0 ) {
    iridescence = 0.0;
  } else {
    iridescence = saturate( iridescence );
  }

  if ( iridescence > 0.0 ) {
    iridescenceFresnelDielectric = evalIridescence( 1.0, iridescenceIOR, dotNVi, iridescenceThickness, specularColor );
		iridescenceFresnelMetallic = evalIridescence( 1.0, iridescenceIOR, dotNVi, iridescenceThickness, diffuseColor );
    iridescenceFresnel = mix( iridescenceFresnelDielectric, iridescenceFresnelMetallic, metallic );

    // Iridescence F0 approximation
    iridescenceF0 = Schlick_to_F0( iridescenceFresnel, 1.0, dotNVi );
  }`

  return iridescence
}
