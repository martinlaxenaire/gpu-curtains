/// <reference types="dist" />
import { TypedArray, WGSLVariableType } from '../core/bindings/utils';
import { Buffer } from '../core/buffers/Buffer';
/**
 * Parameters used to create a {@link VertexBufferAttribute}
 */
export interface VertexBufferAttributeParams {
    /** The {@link VertexBuffer} to add this {@link VertexBufferAttribute} to */
    vertexBuffer?: VertexBuffer;
    /** The name of the {@link VertexBufferAttribute} */
    name: string;
    /** The WGSL type of the {@link VertexBufferAttribute}, i.e. `"f32"`, `"vec2f"`, `"vec3f"`, etc. */
    type?: WGSLVariableType;
    /** The buffer format of the {@link VertexBufferAttribute}, i.e. `"float32"`, `"float32x2"`, `"float32x3"`, etc. */
    bufferFormat?: GPUVertexFormat;
    /** The size of the {@link VertexBufferAttribute}. A `"f32"` is of size `1`, a `"vec2f"` of size `2`, a `"vec3f"` of size `3`, etc. */
    size?: number;
    /** {@link VertexBufferAttribute} array that will be used by the {@link VertexBuffer} */
    array: Float32Array;
    /** Use this {@link VertexBufferAttribute} for every X vertices. Useful for vertex/face color, etc. */
    verticesStride?: number;
}
/**
 * A {@link VertexBufferAttribute} holds geometry data to be sent to the vertex shader. Most common geometry attributes are 'position' and 'uv'.
 */
export interface VertexBufferAttribute extends VertexBufferAttributeParams {
    /** The WGSL type of the {@link VertexBufferAttribute}, i.e. `"f32"`, `"vec2f"`, `"vec3f"`, etc. */
    type: WGSLVariableType;
    /** The buffer format of the {@link VertexBufferAttribute}, i.e. `"float32"`, `"float32x2"`, `"float32x3"`, etc. */
    bufferFormat: GPUVertexFormat;
    /** The length of the {@link array} */
    bufferLength: number;
    /** The size of the {@link VertexBufferAttribute}. A `"f32"` is of size `1`, a `"vec2f"` of size `2`, a `"vec3f"` of size `3`, etc. */
    size: number;
    /** Offset of the {@link array} inside the {@link VertexBuffer#array | VertexBuffer array} */
    offset: number;
    /** Bytes offset of the {@link array} inside the {@link VertexBuffer#array | VertexBuffer array} */
    bufferOffset: GPUSize64;
    /** Use this {@link VertexBufferAttribute} for every X vertices. Useful for vertex/face color, etc. */
    verticesStride: number;
}
/**
 * Describe the base of a geometry buffer, which is made of a {@link core/buffers/Buffer.Buffer | Buffer} and a typed array.
 */
export interface GeometryBuffer {
    /** {@link VertexBuffer} data array to be used by the {@link GPUBuffer} */
    array: TypedArray;
    /** {@link GPUBuffer} sent to the {@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry#pipeline | render pipeline} */
    buffer: Buffer;
    /** Number representing the offset at which the data begins in the {@link GPUBuffer}. */
    bufferOffset: number;
    /** Size in bytes of the data contained in the {@link GPUBuffer}. */
    bufferSize: number | null;
}
/**
 * A {@link VertexBuffer} is an object regrouping one or multiple {@link VertexBufferAttribute} into a single array and its associated {@link GPUBuffer}
 */
export interface VertexBuffer extends GeometryBuffer {
    /** The name of the {@link VertexBuffer} */
    name: string;
    /** Whether this {@link VertexBuffer} holds data relative to vertices or instances */
    stepMode: GPUVertexStepMode;
    /** Total {@link VertexBufferAttribute#size | VertexBufferAttribute size} */
    arrayStride: number;
    /** Total {@link VertexBufferAttribute#bufferLength | VertexBufferAttribute buffer length} */
    bufferLength: number;
    /** Array of {@link VertexBufferAttribute} used by this {@link VertexBuffer} */
    attributes: VertexBufferAttribute[];
    /** {@link VertexBuffer} data array to be used by the {@link GPUBuffer} */
    array: null | TypedArray;
}
/**
 * Parameters used to create a {@link VertexBuffer}
 */
export interface VertexBufferParams extends Partial<GeometryBuffer> {
    /** Whether this {@link VertexBuffer} should hold data relative to vertices or instances */
    stepMode?: GPUVertexStepMode;
    /** The name of the {@link VertexBuffer} */
    name?: string;
    /** Array of {@link VertexBufferAttribute} to be used by this {@link VertexBuffer} */
    attributes?: VertexBufferAttributeParams[];
}
/**
 * Options used to create a geometry
 */
export interface GeometryOptions {
    /** Number of geometry instances to draw */
    instancesCount: number;
    /** Vertices order sent to the {@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry#pipeline | render pipeline} */
    verticesOrder?: GPUFrontFace;
    /** Topology to use with this {@link core/geometries/Geometry.Geometry | Geometry}, sent to the {@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry#pipeline | render pipeline}. Whether to draw triangles, lines or points (see https://www.w3.org/TR/webgpu/#enumdef-gpuprimitivetopology) */
    topology: GPUPrimitiveTopology;
    /** Array of {@link VertexBufferParams} used to create {@link VertexBuffer} on geometry creation */
    vertexBuffers: VertexBufferParams[];
    /** Whether to map the {@link VertexBuffer#buffer | vertex buffers} at creation. */
    mapBuffersAtCreation: boolean;
}
/** Parameters used to create a geometry */
export type GeometryParams = Partial<GeometryOptions>;
/** Base parameters used to create a geometry */
export type GeometryBaseParams = Omit<GeometryParams, 'verticesOrder'>;
