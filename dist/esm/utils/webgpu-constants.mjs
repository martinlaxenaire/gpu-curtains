//#region src/utils/webgpu-constants.ts
/**
* GPUShaderStage constants with fallbacks.
*/
const WebGPUShaderStageConstants = typeof GPUShaderStage !== "undefined" ? GPUShaderStage : {
	VERTEX: 1,
	FRAGMENT: 2,
	COMPUTE: 4
};
/**
* GPUBufferUsage constants with fallbacks.
*/
const WebGPUBufferUsageConstants = typeof GPUBufferUsage !== "undefined" ? GPUBufferUsage : {
	MAP_READ: 1,
	MAP_WRITE: 2,
	COPY_SRC: 4,
	COPY_DST: 8,
	INDEX: 16,
	VERTEX: 32,
	UNIFORM: 64,
	STORAGE: 128,
	INDIRECT: 256,
	QUERY_RESOLVE: 512
};
/**
* GPUTextureUsage constants with fallbacks.
*/
const WebGPUTextureUsageConstants = typeof GPUTextureUsage !== "undefined" ? GPUTextureUsage : {
	COPY_SRC: 1,
	COPY_DST: 2,
	TEXTURE_BINDING: 4,
	STORAGE_BINDING: 8,
	RENDER_ATTACHMENT: 16,
	TRANSIENT_ATTACHMENT: 32
};
//#endregion
export { WebGPUBufferUsageConstants, WebGPUShaderStageConstants, WebGPUTextureUsageConstants };
