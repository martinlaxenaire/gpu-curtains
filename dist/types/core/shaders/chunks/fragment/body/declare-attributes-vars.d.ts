import { Geometry } from '../../../../geometries/Geometry';
import { VertexShaderInputParams } from '../../../full/vertex/get-vertex-shader-code';
/**
 * Declare all the parameters coming from the fragment shader input struct. Used to declare mandatories `frontFacing` (`bool`), `normal` (`vec3f`), `worldPosition` (`vec3f`), `viewDirection` (`vec3f`) and `modelScale` (`vec3f`) passed by the vertex shader, as well as optionals `tangent` (`vec3f`), `bitangent` (`vec3f`) and UV coordinates (`vec2f`). Eventual vertex colors will be handled by the `get-base-color` chunk.
 * @param parameters - Parameters used to declare the attributes variables.
 * @param parameters.geometry - {@link Geometry} used to declare the attributes variables.
 * @param parameters.additionalVaryings - Optional additional {@link VertexShaderInputParams.additionalVaryings | varyings} passed from the vertex shader to the fragment shader to declare.
 * @returns - A string with all the attributes variables declared.
 */
export declare const declareAttributesVars: ({ geometry, additionalVaryings, }: {
    geometry?: Geometry;
    additionalVaryings?: VertexShaderInputParams['additionalVaryings'];
}) => string;
