import { RenderMaterialRenderingOptions } from '../../types/Materials';
/**
 * Compare two sets of {@link RenderMaterialRenderingOptions | rendering options} and returns an array of different options keys if any.
 * @param newOptions - Rendering new options to compare.
 * @param baseOptions - Rendering options to compare with.
 * @returns - An array with the options keys that differ, if any.
 */
export declare const compareRenderingOptions: (newOptions?: Partial<RenderMaterialRenderingOptions>, baseOptions?: Partial<RenderMaterialRenderingOptions>) => Array<keyof RenderMaterialRenderingOptions>;
