import { PBRFragmentShaderInputParams } from '../../../full/fragment/get-fragment-shader-code'

export const getClearcoatIndirectSpecular = ({
  extensionsUsed = [],
}: {
  extensionsUsed?: PBRFragmentShaderInputParams['extensionsUsed']
} = {}): string => {
  let clearcoatIndirect = ''

  if (extensionsUsed.includes('KHR_materials_clearcoat')) {
    clearcoatIndirect += /* wgsl */ `
  clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( clearcoatNormal, viewDirection, clearcoatF0, clearcoatF90, clearcoatRoughness );`
  }

  return clearcoatIndirect
}
