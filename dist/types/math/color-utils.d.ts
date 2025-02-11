import { Vec3 } from './Vec3';
/**
 * Convert a color float component from sRGB to linear space.
 * @param c - color float component to convert.
 * @returns - converted color float component.
 */
export declare function sRGBToLinearFloat(c: number): number;
/**
 * Convert a color float component from linear to sRGB space.
 * @param c - color float component to convert.
 * @returns - converted color float component.
 */
export declare function linearTosRGBFloat(c: number): number;
/**
 * Convert a color {@link Vec3} from sRGB to linear space.
 * @param vector - color {@link Vec3} to convert.
 * @returns - converted color {@link Vec3}.
 */
export declare function sRGBToLinear(vector?: Vec3): Vec3;
/**
 * Convert a color {@link Vec3} from linear to sRGB space.
 * @param vector - color {@link Vec3} to convert.
 * @returns - converted color {@link Vec3}.
 */
export declare function linearTosRGB(vector?: Vec3): Vec3;
