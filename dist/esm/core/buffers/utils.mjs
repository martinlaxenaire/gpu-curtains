import { WebGPUBufferUsageConstants } from '../../utils/webgpu-constants.mjs';

const bufferUsages = /* @__PURE__ */ new Map([
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
const getBufferUsages = (usages = []) => {
  return usages.reduce((acc, v) => {
    return acc | bufferUsages.get(v);
  }, 0);
};

export { getBufferUsages };
