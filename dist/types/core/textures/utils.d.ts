/// <reference types="dist" />
import { RenderTextureBindingType } from './RenderTexture';
/**  Defines all kinds of allowed texture usages as camel case strings. */
export type TextureUsageKeys = 'copySrc' | 'copyDst' | 'renderAttachment' | 'storageBinding' | 'textureBinding';
/**
 * Get the corresponding {@link GPUTextureUsageFlags | texture usage bitwise flags} based on an array of {@link TextureUsageKeys | texture usage names}.
 * @param usages - array of {@link TextureUsageKeys | texture usage names}.
 * @returns - corresponding {@link GPUTextureUsageFlags | texture usage bitwise flags}.
 */
export declare const getTextureUsages: (usages?: TextureUsageKeys[]) => GPUTextureUsageFlags;
/**
 * Get the corresponding {@link GPUTextureUsageFlags | texture usage bitwise flags} based on an array of {@link TextureUsageKeys | texture usage names} if specified. If not, will try to fall back to a usage based on the {@link RenderTextureBindingType | render texture type}.
 * @param usages - array of {@link TextureUsageKeys | texture usage names}.
 * @param textureType - the {@link RenderTextureBindingType | render texture type}.
 * @returns - corresponding {@link GPUTextureUsageFlags | texture usage bitwise flags}.
 */
export declare const getRenderTextureUsage: (usages: TextureUsageKeys[], textureType: RenderTextureBindingType) => number;
