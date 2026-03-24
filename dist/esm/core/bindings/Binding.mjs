import { toCamelCase } from "../../utils/utils.mjs";
import { getBindingVisibility } from "./utils.mjs";
//#region src/core/bindings/Binding.ts
/**
* Used as a shell to build actual bindings upon, like {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}, {@link core/bindings/WritableBufferBinding.WritableBufferBinding | WritableBufferBinding}, {@link TextureBinding} and {@link SamplerBinding}.
*
* Ultimately the goal of a {@link Binding} element is to provide correct resources for {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createBindGroupLayout#entries | GPUBindGroupLayoutEntry} and {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createBindGroup#entries | GPUBindGroupEntry}.
*
* ## WGSL
*
* Each {@link Binding} creates its own WGSL code snippet variable declaration, using structured types or not.
*/
var Binding = class {
	/**
	* Binding constructor
	* @param parameters - {@link BindingParams | parameters} used to create our {@link Binding}.
	*/
	constructor({ label = "Uniform", name = "uniform", bindingType = "uniform", visibility = [
		"vertex",
		"fragment",
		"compute"
	] }) {
		this.label = label;
		this.name = toCamelCase(name);
		this.bindingType = bindingType;
		this.visibility = getBindingVisibility(visibility);
		this.options = {
			label,
			name,
			bindingType,
			visibility
		};
		this.shouldResetBindGroup = false;
		this.shouldResetBindGroupLayout = false;
		this.cacheKey = `${bindingType},${this.visibility},`;
	}
};
//#endregion
export { Binding };
