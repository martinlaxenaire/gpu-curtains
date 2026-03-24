import { WebGPUBufferUsageConstants } from "../../utils/webgpu-constants.mjs";
//#region src/core/buffers/utils.ts
/**
* Map {@link BufferUsageKeys | buffer usage names} with actual {@link !GPUBuffer.usage | GPUBufferUsageFlags}.
*/
const bufferUsages = new Map([
	["copySrc", WebGPUBufferUsageConstants.COPY_SRC],
	["copyDst", WebGPUBufferUsageConstants.COPY_DST],
	["index", WebGPUBufferUsageConstants.INDEX],
	["indirect", WebGPUBufferUsageConstants.INDIRECT],
	["mapRead", WebGPUBufferUsageConstants.MAP_READ],
	["mapWrite", WebGPUBufferUsageConstants.MAP_WRITE],
	["queryResolve", WebGPUBufferUsageConstants.QUERY_RESOLVE],
	["storage", WebGPUBufferUsageConstants.STORAGE],
	["uniform", WebGPUBufferUsageConstants.UNIFORM],
	["vertex", WebGPUBufferUsageConstants.VERTEX]
]);
/**
* Get the corresponding {@link !GPUBuffer.usage | GPUBufferUsageFlags} based on an array of {@link BufferUsageKeys | buffer usage names}.
* @param usages - array of {@link BufferUsageKeys | buffer usage names}.
* @returns - corresponding {@link !GPUBuffer.usage | GPUBufferUsageFlags}.
*/
const getBufferUsages = (usages = []) => {
	return usages.reduce((acc, v) => {
		return acc | bufferUsages.get(v);
	}, 0);
};
//#endregion
export { getBufferUsages };
