import { BufferBinding } from '../../../bindings/BufferBinding';
import { Geometry } from '../../../geometries/Geometry';
/** Defines the parameters used to create the vertex shader. */
export interface VertexShaderInputParams {
    /** Array of {@link BufferBinding} used to create the vertex shader. Typical {@link BufferBinding} used are `instances`, and the ones that include `morphTarget` or `skin` in their `name` properties. */
    bindings?: BufferBinding[];
    /** {@link Geometry} used to create the vertex shader. Will use the {@link Geometry#vertexBuffers | vertexBuffers} and {@link Geometry#instancesCount | instancesCount} properties. */
    geometry: Geometry;
}
export declare const getVertexCode: ({ bindings, geometry }: VertexShaderInputParams) => string;
