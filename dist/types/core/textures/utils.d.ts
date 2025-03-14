/// <reference types="@webgpu/types" />
import { TextureBindingType } from '../bindings/Binding';
/**  Defines all kinds of allowed texture usages as camel case strings. */
export type TextureUsageKeys = 'copySrc' | 'copyDst' | 'renderAttachment' | 'storageBinding' | 'textureBinding';
/**
 * Get the corresponding {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUTexture/usage#value | GPUTextureUsageFlags} based on an array of {@link TextureUsageKeys | texture usage names}.
 * @param usages - array of {@link TextureUsageKeys | texture usage names}.
 * @returns - corresponding {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUTexture/usage#value | GPUTextureUsageFlags}.
 */
export declare const getTextureUsages: (usages?: TextureUsageKeys[]) => GPUTextureUsageFlags;
/**
 * Get the corresponding {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUTexture/usage#value | GPUTextureUsageFlags} based on an array of {@link TextureUsageKeys | texture usage names} if specified. If not, will try to fall back to a usage based on the {@link TextureBindingType | texture type}.
 * @param usages - array of {@link TextureUsageKeys | texture usage names}.
 * @param textureType - the {@link TextureBindingType | texture type}.
 * @returns - corresponding {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUTexture/usage#value | GPUTextureUsageFlags}.
 */
export declare const getDefaultTextureUsage: (usages: TextureUsageKeys[], textureType: TextureBindingType) => number;
/**
 * Get the corresponding {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUTexture/usage#value | GPUTextureUsageFlags} based on an array of {@link TextureUsageKeys | texture usage names} if specified.
 * @param usages - array of {@link TextureUsageKeys | texture usage names}.
 * @returns - corresponding {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUTexture/usage#value | GPUTextureUsageFlags}.
 */
export declare const getDefaultMediaTextureUsage: (usages?: TextureUsageKeys[]) => number;
/**
 * Get the number of mip levels create based on {@link types/Textures.TextureSize | size}
 * @param sizes - Array containing our texture width, height and depth
 * @returns - number of mip levels
 */
export declare const getNumMipLevels: (...sizes: number[]) => number;
