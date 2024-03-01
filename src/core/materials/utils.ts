import { RenderMaterialRenderingOptions } from '../../types/Materials'

/**
 * Compare two sets of {@link RenderMaterialRenderingOptions | rendering options} and returns an array of different options keys if any.
 * @param newOptions - rendering new options to compare
 * @param baseOptions - rendering options to compare with
 * @returns - an array with the options keys that differ, if any.
 */
export const compareRenderingOptions = (
  newOptions: Partial<RenderMaterialRenderingOptions> = {},
  baseOptions: Partial<RenderMaterialRenderingOptions> = {}
): Array<keyof RenderMaterialRenderingOptions> => {
  return Object.keys(newOptions).filter((key) => {
    if (Array.isArray(newOptions[key])) {
      // 'targets' property
      return JSON.stringify(newOptions[key]) !== JSON.stringify(baseOptions[key])
    } else {
      return newOptions[key] !== baseOptions[key]
    }
  }) as Array<keyof RenderMaterialRenderingOptions>
}
