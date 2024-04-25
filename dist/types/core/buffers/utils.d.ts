/// <reference types="dist" />
import { BufferBindingType } from '../bindings/Binding';
/**  Defines all kinds of allowed buffer usages as camel case strings. */
export type BufferUsageKeys = 'copySrc' | 'copyDst' | 'index' | 'indirect' | 'mapRead' | 'mapWrite' | 'queryResolve' | 'vertex' | BufferBindingType;
/**
 * Get the corresponding {@link GPUBufferUsageFlags | buffer usage bitwise flags} based on an array of {@link BufferUsageKeys | buffer usage names}.
 * @param usages - array of {@link BufferUsageKeys | buffer usage names}.
 * @returns - corresponding {@link GPUBufferUsageFlags | buffer usage bitwise flags}.
 */
export declare const getBufferUsages: (usages?: BufferUsageKeys[]) => GPUBufferUsageFlags;
