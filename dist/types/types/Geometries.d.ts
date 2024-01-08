/// <reference types="dist" />
import { WGSLVariableType } from '../core/bindings/utils';
/**
 * Parameters used to create a {@link VertexBufferAttribute}
 */
export interface VertexBufferAttributeParams {
    /** The {@link VertexBuffer} to add this [attribute]{@link VertexBufferAttribute} to */
    vertexBuffer?: VertexBuffer;
    /** The name of the [attribute]{@link VertexBufferAttribute} */
    name: string;
    /** The WGSL type of the [attribute]{@link VertexBufferAttribute}, i.e. 'f32', 'vec2f', 'vec3f', etc. */
    type?: WGSLVariableType;
    /** The buffer format of the [attribute]{@link VertexBufferAttribute}, i.e. 'float32', 'float32x2', 'float32x3', etc. */
    bufferFormat?: GPUVertexFormat;
    /** The size of the [attribute]{@link VertexBufferAttribute}. A 'f32' is of size 1, a 'vec2f' of size 2, a 'vec3f' of size 3, etc. */
    size?: number;
    /** [Attribute]{@link VertexBufferAttribute} array that will be used by the {@link VertexBuffer} */
    array: Float32Array;
    /** Use this [attribute]{@link VertexBufferAttribute} for every X vertices. Useful for vertex/face color, etc. */
    verticesStride?: number;
}
/**
 * A {@link VertexBufferAttribute} holds geometry data to be sent to the vertex shader. Most common geometry attributes are 'position' and 'uv'.
 */
export interface VertexBufferAttribute extends VertexBufferAttributeParams {
    /** The WGSL type of the [attribute]{@link VertexBufferAttribute}, i.e. 'f32', 'vec2f', 'vec3f', etc. */
    type: WGSLVariableType;
    /** The buffer format of the [attribute]{@link VertexBufferAttribute}, i.e. 'float32', 'float32x2', 'float32x3', etc. */
    bufferFormat: GPUVertexFormat;
    /** The length of the [attribute array]{@link VertexBufferAttributeParams#array} */
    bufferLength: number;
    /** The size of the [attribute]{@link VertexBufferAttribute}. A 'f32' is of size 1, a 'vec2f' of size 2, a 'vec3f' of size 3, etc. */
    size: number;
    /** Offset of the [attribute array]{@link VertexBuffer#array} inside the [vertex buffer array]{@link VertexBufferAttributeParams#array} */
    offset: number;
    /** Bytes offset of the [attribute array]{@link VertexBuffer#array} inside the [vertex buffer array]{@link VertexBufferAttributeParams#array} */
    bufferOffset: GPUSize64;
    /** Use this [attribute]{@link VertexBufferAttribute} for every X vertices. Useful for vertex/face color, etc. */
    verticesStride: number;
}
/**
 * A {@link VertexBuffer} is an object regrouping one or multiple {@link VertexBufferAttribute} into a single array and its associated {@link GPUBuffer}
 */
export interface VertexBuffer {
    /** The name of the {@link VertexBuffer} */
    name: string;
    /** Whether this {@link VertexBuffer} holds data relative to vertices or instances */
    stepMode: GPUVertexStepMode;
    /** Total [attributes size]{@link VertexBufferAttribute#size} */
    arrayStride: number;
    /** Total [attributes buffer length]{@link VertexBufferAttribute#bufferLength} */
    bufferLength: number;
    /** Array of [attributes]{@link VertexBufferAttribute} used by this {@link VertexBuffer} */
    attributes: VertexBufferAttribute[];
    /** {@link VertexBuffer} data array to be used by the {@link GPUBuffer} */
    array?: Float32Array;
    /** {@link GPUBuffer} sent to the [render pipeline]{@link core/pipelines/PipelineEntry.PipelineEntry#pipeline} */
    buffer?: GPUBuffer;
}
/**
 * Parameters used to create a {@link VertexBuffer}
 */
export interface VertexBufferParams {
    /** Whether this {@link VertexBuffer} should hold data relative to vertices or instances */
    stepMode?: GPUVertexStepMode;
    /** The name of the {@link VertexBuffer} */
    name?: string;
    /** Array of [attributes]{@link VertexBufferAttribute} to be used by this {@link VertexBuffer} */
    attributes?: VertexBufferAttributeParams[];
}
/**
 * Options used to create a geometry
 */
export interface GeometryOptions {
    /** Number of geometry instances to draw */
    instancesCount: number;
    /** Vertices order sent to the [render pipeline]{@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry#pipeline} */
    verticesOrder?: GPUFrontFace;
    /** Topology to use with this [geometry]{@link core/geometries/Geometry.Geometry}, sent to the [render pipeline]{@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry#pipeline}. Whether to draw triangles, lines or points (see https://www.w3.org/TR/webgpu/#enumdef-gpuprimitivetopology) */
    topology: GPUPrimitiveTopology;
    /** Array of {@link VertexBufferParams} used to create {@link VertexBuffer} on geometry creation */
    vertexBuffers: VertexBufferParams[];
}
/** Parameters used to create a geometry */
export type GeometryParams = Partial<GeometryOptions>;
/** Base parameters used to create a geometry */
export type GeometryBaseParams = Omit<GeometryParams, 'verticesOrder'>;
