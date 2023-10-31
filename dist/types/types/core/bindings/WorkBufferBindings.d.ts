import { BufferBindingsParams } from '../../../core/bindings/BufferBindings';
export interface WorkBufferBindingsParams extends BufferBindingsParams {
    dispatchSize?: number | number[];
    shouldCopyResult?: boolean;
}
