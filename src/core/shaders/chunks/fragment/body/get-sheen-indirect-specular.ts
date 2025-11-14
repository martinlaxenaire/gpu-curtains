import { PBRFragmentShaderInputParams } from '../../../full/fragment/get-fragment-shader-code'

export const getSheenIndirectSpecular = ({
  extensionsUsed = [],
}: {
  extensionsUsed?: PBRFragmentShaderInputParams['extensionsUsed']
} = {}): string => {
  let sheenIndirect = ''

  if (extensionsUsed.includes('KHR_materials_sheen')) {
    sheenIndirect += /* wgsl */ `
  sheenSpecularIndirect += getIBLSheenSpecularIndirect(normal, viewDirection, iblIrradiance, sheenColor, sheenRoughness);`
  }

  return sheenIndirect
}
