import { BufferBindings, BufferBindingsParams } from './BufferBindings'

export interface WorkBufferBindingsParams extends BufferBindingsParams {
  dispatchSize?: number | number[]
  shouldCopyResult?: boolean
}

/**
 * WorkBufferBindings class:
 * Used to create a BufferBindings object that can hold read/write storage bindings.
 * @extends BufferBindings
 */
export class WorkBufferBindings extends BufferBindings {
  dispatchSize: number[]
  shouldCopyResult: boolean
  result: Float32Array

  /**
   * WorkBufferBindings constructor
   * @param {WorkBufferBindingsParams} parameters - parameters used to create our WorkBufferBindings
   * @param {string=} parameters.label - binding label
   * @param {string=} parameters.name - binding name
   * @param {BindingType=} parameters.bindingType - binding type
   * @param {number=} parameters.bindIndex - bind index inside the bind group
   * @param {MaterialShadersType=} parameters.visibility - shader visibility
   * @param {boolean=} parameters.useStruct - whether to use structured WGSL variables
   * @param {Object.<string, Input>} parameters.bindings - bindings inputs
   * @param {(number|number[])=} parameters.dispatchSize - work group dispatch size
   * @param {boolean=} parameters.shouldCopyResult - whether we should copy the buffer result at each render call
   */
  constructor({
    label = 'Work',
    name = 'work',
    bindingType,
    bindIndex = 0,
    useStruct = true,
    bindings = {},
    visibility,
    dispatchSize,
    shouldCopyResult = false,
  }: WorkBufferBindingsParams) {
    bindingType = 'storageWrite'
    visibility = 'compute'

    super({ label, name, bindIndex, bindingType, useStruct, bindings, visibility })

    if (!dispatchSize) {
      dispatchSize = [1, 1, 1]
    } else if (Array.isArray(dispatchSize)) {
      dispatchSize[0] = Math.ceil(dispatchSize[0] ?? 1)
      dispatchSize[1] = Math.ceil(dispatchSize[1] ?? 1)
      dispatchSize[2] = Math.ceil(dispatchSize[2] ?? 1)
    } else if (!isNaN(dispatchSize)) {
      dispatchSize = [Math.ceil(dispatchSize), 1, 1]
    }

    this.dispatchSize = dispatchSize as number[]
    this.shouldCopyResult = shouldCopyResult

    this.result = new Float32Array(this.value.slice())
  }
}
