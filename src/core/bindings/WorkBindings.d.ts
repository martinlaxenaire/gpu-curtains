import { Bindings, BindingsParams } from './Bindings'

interface WorkBindingsParams extends BindingsParams {
  type: string
  value: Float32Array
}

export class WorkBindings extends Bindings {
  type: string
  result: Float32Array

  constructor(parameters: WorkBindingsParams)

  setWGSLFragment()
}
