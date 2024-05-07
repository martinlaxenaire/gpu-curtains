// buffers bitwise flags
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
  ['copySrc', GPUBufferUsage.COPY_SRC],
  ['copyDst', GPUBufferUsage.COPY_DST],
  ['index', GPUBufferUsage.INDEX],
  ['indirect', GPUBufferUsage.INDIRECT],
  ['mapRead', GPUBufferUsage.MAP_READ],
  ['mapWrite', GPUBufferUsage.MAP_WRITE],
  ['queryResolve', GPUBufferUsage.QUERY_RESOLVE],
  ['storage', GPUBufferUsage.STORAGE],
  ['uniform', GPUBufferUsage.UNIFORM],
  ['vertex', GPUBufferUsage.VERTEX],
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
