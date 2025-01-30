import { Geometry } from '../../../../geometries/Geometry';
/**
 * Get the vertex shader WGSL output struct content from the given {@link Geometry}. Pass all {@link Geometry} attributes, plus eventual `bitangent` (`vec3f`) if `tangent` attribute is defined, and `viewDirection` (`vec3f`), `worldPosition` (`vec3f`) and `modelScale` (`vec3f`).
 * @param parameters - Parameters used to generate the vertex shader WGSL output struct content.
 * @param parameters.geometry - {@link Geometry} used to generate the struct content from its attributes.
 * @returns - String with the vertex shader WGSL output struct content.
 */
export declare const getVertexOutputStructContent: ({ geometry }: {
    geometry: Geometry;
}) => string;
