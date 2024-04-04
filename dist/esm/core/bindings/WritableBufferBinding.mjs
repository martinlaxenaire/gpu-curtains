import { BufferBinding } from './BufferBinding.mjs';
import { Buffer } from '../buffers/Buffer.mjs';

class WritableBufferBinding extends BufferBinding {
  /**
   * WritableBufferBinding constructor
   * @param parameters - {@link WritableBufferBindingParams | parameters} used to create our {@link WritableBufferBinding}
   */
  constructor({
    label = "Work",
    name = "work",
    bindingType,
    visibility,
    useStruct = true,
    access = "read_write",
    struct = {},
    shouldCopyResult = false
  }) {
    bindingType = "storage";
    visibility = "compute";
    super({ label, name, bindingType, visibility, useStruct, access, struct });
    this.options = {
      ...this.options,
      shouldCopyResult
    };
    this.shouldCopyResult = shouldCopyResult;
    this.resultBuffer = new Buffer();
  }
}

export { WritableBufferBinding };
