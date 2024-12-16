// buffers bitwise flags
import { WebGPUBufferUsageConstants } from '../../utils/webgpu-constants'
import { BufferBindingType } from '../bindings/Binding'

/**  Defines all kinds of allowed buffer usages as camel case strings. */
export type BufferUsageKeys =
  | 'copySrc'
  | 'copyDst'
  | 'index'
  | 'indirect'
  | 'mapRead'
  | 'mapWrite'
  | 'queryResolve'
  | 'vertex'
  | BufferBindingType

/**
 * Map {@link BufferUsageKeys | buffer usage names} with actual {@link GPUBufferUsageFlags | buffer usage bitwise flags}.
 */
const bufferUsages: Map<BufferUsageKeys, GPUBufferUsageFlags> = new Map([
  ['copySrc', WebGPUBufferUsageConstants.COPY_SRC],
  ['copyDst', WebGPUBufferUsageConstants.COPY_DST],
  ['index', WebGPUBufferUsageConstants.INDEX],
  ['indirect', WebGPUBufferUsageConstants.INDIRECT],
  ['mapRead', WebGPUBufferUsageConstants.MAP_READ],
  ['mapWrite', WebGPUBufferUsageConstants.MAP_WRITE],
  ['queryResolve', WebGPUBufferUsageConstants.QUERY_RESOLVE],
  ['storage', WebGPUBufferUsageConstants.STORAGE],
  ['uniform', WebGPUBufferUsageConstants.UNIFORM],
  ['vertex', WebGPUBufferUsageConstants.VERTEX],
])

/**
 * Get the corresponding {@link GPUBufferUsageFlags | buffer usage bitwise flags} based on an array of {@link BufferUsageKeys | buffer usage names}.
 * @param usages - array of {@link BufferUsageKeys | buffer usage names}.
 * @returns - corresponding {@link GPUBufferUsageFlags | buffer usage bitwise flags}.
 */
export const getBufferUsages = (usages: BufferUsageKeys[] = []): GPUBufferUsageFlags => {
  return usages.reduce((acc, v) => {
    return acc | bufferUsages.get(v)
  }, 0)
}
