import { Vec3 } from "./Vec3.mjs";
//#region src/math/color-utils.ts
/**
* Convert a color float component from sRGB to linear space.
* @param c - color float component to convert.
* @returns - converted color float component.
*/
function sRGBToLinearFloat(c) {
	return c < .04045 ? c * .0773993808 : Math.pow(c * .9478672986 + .0521327014, 2.4);
}
/**
* Convert a color float component from linear to sRGB space.
* @param c - color float component to convert.
* @returns - converted color float component.
*/
function linearTosRGBFloat(c) {
	return c < .0031308 ? c * 12.92 : 1.055 * Math.pow(c, .41666) - .055;
}
/**
* Convert a color {@link Vec3} from sRGB to linear space.
* @param vector - color {@link Vec3} to convert.
* @returns - converted color {@link Vec3}.
*/
function sRGBToLinear(vector = new Vec3()) {
	vector.x = sRGBToLinearFloat(vector.x);
	vector.y = sRGBToLinearFloat(vector.y);
	vector.z = sRGBToLinearFloat(vector.z);
	return vector;
}
/**
* Convert a color {@link Vec3} from linear to sRGB space.
* @param vector - color {@link Vec3} to convert.
* @returns - converted color {@link Vec3}.
*/
function linearTosRGB(vector = new Vec3()) {
	vector.x = linearTosRGBFloat(vector.x);
	vector.y = linearTosRGBFloat(vector.y);
	vector.z = linearTosRGBFloat(vector.z);
	return vector;
}
//#endregion
export { linearTosRGB, linearTosRGBFloat, sRGBToLinear, sRGBToLinearFloat };
