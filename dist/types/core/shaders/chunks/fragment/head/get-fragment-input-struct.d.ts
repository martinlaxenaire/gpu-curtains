import { Geometry } from '../../../../geometries/Geometry';
/**
 * Get the fragment shader WGSL input struct using {@link getVertexOutputStructContent}.
 * @param parameters - Parameters used to generate the fragment shader WGSL input struct.
 * @param parameters.geometry - {@link Geometry} used to generate the struct from its attributes.
 * @returns - String with the fragment shader WGSL input struct.
 */
export declare const getFragmentInputStruct: ({ geometry }: {
    geometry: Geometry;
}) => string;
