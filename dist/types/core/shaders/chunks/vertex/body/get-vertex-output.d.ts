import { Geometry } from '../../../../geometries/Geometry';
/**
 * Assign all the necessaries' vertex shader output variables.
 * @param parameters - Parameters used to assign the vertex shader output variables.
 * @param parameters.geometry - {@link Geometry} used to assign the vertex shader output variables.
 * @returns - A string with all the vertex shader output variables assigned.
 */
export declare const getVertexOutput: ({ geometry }: {
    geometry: Geometry;
}) => string;
