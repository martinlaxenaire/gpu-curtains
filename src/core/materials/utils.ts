import { RenderMaterialRenderingOptions } from '../../types/Materials'

/**
 * Compare two sets of {@link RenderMaterialRenderingOptions | rendering options} and returns an array of different options keys if any.
 * @param newOptions - Rendering new options to compare.
 * @param baseOptions - Rendering options to compare with.
 * @returns - An array with the options keys that differ, if any.
 */
export const compareRenderingOptions = (
  newOptions: Partial<RenderMaterialRenderingOptions> = {},
  baseOptions: Partial<RenderMaterialRenderingOptions> = {}
): Array<keyof RenderMaterialRenderingOptions> => {
  const renderingOptions = [
    'useProjection',
    'transparent',
    'depth',
    'depthWriteEnabled',
    'depthCompare',
    'depthFormat',
    'cullMode',
    'sampleCount',
    'targets',
    'stencil',
    'verticesOrder',
    'topology',
  ] as Array<keyof RenderMaterialRenderingOptions>

  return renderingOptions
    .map((key) => {
      if (
        (newOptions[key] !== undefined && baseOptions[key] === undefined) ||
        (baseOptions[key] !== undefined && newOptions[key] === undefined)
      ) {
        return key
      } else if (Array.isArray(newOptions[key]) || typeof newOptions[key] === 'object') {
        // 'targets', 'stencil' properties...
        return JSON.stringify(newOptions[key]) !== JSON.stringify(baseOptions[key]) ? key : false
      } else {
        return newOptions[key] !== baseOptions[key] ? key : false
      }
    })
    .filter(Boolean) as Array<keyof RenderMaterialRenderingOptions>
}
