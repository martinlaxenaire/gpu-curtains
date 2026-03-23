import { Buffer } from "../buffers/Buffer.mjs";
import { BufferBinding } from "./BufferBinding.mjs";
//#region src/core/bindings/WritableBufferBinding.ts
/**
* Used to create a {@link BufferBinding} that can hold read/write storage bindings along with a {@link WritableBufferBinding#resultBuffer | result GPU buffer} that can be used to get data back from the GPU.
*
* Note that it is automatically created by the {@link core/bindGroups/BindGroup.BindGroup | BindGroup} when a {@link types/BindGroups.BindGroupInputs#storages | storages input} has its {@link BufferBindingParams#access | access} property set to `"read_write"`.
*/
var WritableBufferBinding = class extends BufferBinding {
	/**
	* WritableBufferBinding constructor
	* @param parameters - {@link WritableBufferBindingParams | parameters} used to create our {@link WritableBufferBinding}
	*/
	constructor({ label = "Work", name = "work", bindingType, visibility, useStruct = true, access = "read_write", usage = [], struct = {}, childrenBindings = [], buffer = null, parent = null, minOffset = 256, offset = 0, shouldCopyResult = false }) {
		bindingType = "storage";
		visibility = ["compute"];
		super({
			label,
			name,
			bindingType,
			visibility,
			useStruct,
			access,
			usage,
			struct,
			childrenBindings,
			buffer,
			parent,
			minOffset,
			offset
		});
		this.options = {
			...this.options,
			shouldCopyResult
		};
		this.shouldCopyResult = shouldCopyResult;
		this.cacheKey += `${shouldCopyResult},`;
		this.resultBuffer = new Buffer();
	}
};
//#endregion
export { WritableBufferBinding };
