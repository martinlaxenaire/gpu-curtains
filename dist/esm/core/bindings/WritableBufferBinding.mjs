import { BufferBinding } from './BufferBinding.mjs';

class WritableBufferBinding extends BufferBinding {
  /**
   * WritableBufferBinding constructor
   * @param parameters - {@link WritableBufferBindingParams | parameters} used to create our {@link WritableBufferBinding}
   */
  constructor({
    label = "Work",
    name = "work",
    bindingType,
    useStruct = true,
    struct = {},
    visibility,
    access = "read_write",
    shouldCopyResult = false
  }) {
    bindingType = "storage";
    visibility = "compute";
    super({ label, name, bindingType, useStruct, struct, visibility, access });
    this.options = {
      ...this.options,
      shouldCopyResult
    };
    this.shouldCopyResult = shouldCopyResult;
    this.resultBuffer = null;
  }
}

export { WritableBufferBinding };
