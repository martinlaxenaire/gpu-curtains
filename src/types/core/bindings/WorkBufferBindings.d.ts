import { BufferBindingsParams } from './BufferBindings'

export interface WorkBufferBindingsParams extends BufferBindingsParams {
  dispatchSize?: number | number[]
  shouldCopyResult?: boolean
}
