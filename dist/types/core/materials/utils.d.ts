import { RenderMaterialRenderingOptions } from '../../types/Materials';
/**
 * Compare two sets of {@link RenderMaterialRenderingOptions | rendering options} and returns an array of different options if any.
 * @param newOptions - rendering new options to compare
 * @param baseOptions - rendering options to compare with
 * @returns - an array with the options that differ, if any.
 */
export declare const compareRenderingOptions: (newOptions?: Partial<RenderMaterialRenderingOptions>, baseOptions?: Partial<RenderMaterialRenderingOptions>) => Array<keyof RenderMaterialRenderingOptions>;
