import { Bindings } from './Bindings'

export class WorkBindings extends Bindings {
  constructor({
    label = 'Work',
    name = 'work',
    bindingType = 'storage',
    bindIndex = 0,
    visibility = 'compute',
    type,
    value = [],
  }) {
    bindingType = 'storage'
    super({ label, name, bindIndex, bindingType, visibility })

    this.type = type ?? 'array<f32>'
    this.value = new Float32Array(value.slice())
    this.result = new Float32Array(value.slice())

    // TODO useStruct?

    this.setWGSLFragment()
  }

  setWGSLFragment() {
    this.wgslStructFragment = ''
    // this.wgslGroupFragment = `${this.bindingElements
    //   .map((uniform, index) => {
    //     const varType = this.bindingType === 'storage' ? 'var<storage, read>' : 'var<uniform>'
    //     return `${varType} ${uniform.name}: ${uniform.type};\n`
    //   })
    //   .join(',\n\t')}`

    this.wgslGroupFragment = `${this.bindingType === 'storage' ? 'var<storage, read_write>' : 'var<uniform>'} ${
      this.name
    }: ${this.type};`
  }
}
