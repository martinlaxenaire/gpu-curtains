import { Mat4 } from '../math/Mat4'

export class UniformBinding {
  constructor({ label = 'Uniform', name = 'uniform', groupIndex = 0, bindIndex = 0, useStruct = true, uniforms = {} }) {
    this.label = label
    this.name = name
    this.groupIndex = groupIndex
    this.bindIndex = bindIndex
    this.size = 0

    this.isActive = true
    this.shouldUpdate = false
    this.useStruct = useStruct

    this.bindingElements = []
    this.uniforms = {}

    Object.keys(uniforms).forEach((uniformKey) => {
      const uniform = {}

      for (const key in uniforms[uniformKey]) {
        if (key !== 'value') {
          uniform[key] = uniforms[uniformKey][key]
        }
      }

      Object.defineProperty(uniform, 'value', {
        get() {
          return uniform._value
        },
        set(v) {
          uniform._value = v
          uniform.shouldUpdate = true
        },
      })

      uniform.value = uniforms[uniformKey].value

      this.uniforms[uniformKey] = uniform
    })

    this.setGroup()
    this.setWGSLFragment()
  }

  setGroup() {
    Object.keys(this.uniforms).forEach((uniformKey) => {
      const uniform = this.uniforms[uniformKey]

      const uniformSize = (() => {
        switch (uniform.type) {
          case 'mat4x4f':
            return 16
          case 'mat3x3f':
            return 9
          case 'vec3f':
            return 3
          case 'vec2f':
            return 2
          case 'f32':
            return 1
          default:
            console.warn('Uniform type is mandatory', uniform)
            break
        }
      })()

      const uniformBufferSize = (() => {
        switch (uniform.type) {
          case 'mat4x4f':
            return 16
          case 'mat3x3f':
            return 16
          case 'vec3f':
            return 12
          case 'vec2f':
            return 8
          case 'f32':
            return 1
          default:
            console.warn('Uniform type is mandatory', uniform)
            break
        }
      })()

      this.size += uniformBufferSize

      this.bindingElements.push({
        name: uniform.name ?? uniformKey,
        type: uniform.type,
        key: uniformKey,
        size: uniformSize,
        bufferSize: uniformBufferSize,
      })
    })

    this.value = new Float32Array(this.size)

    this.bindingElements.forEach((bindingElement, index) => {
      bindingElement.offset = index > 0 ? this.bindingElements[index - 1].totalLength : 0
      bindingElement.totalLength = bindingElement.size + bindingElement.offset

      bindingElement.bufferOffset = index > 0 ? this.bindingElements[index - 1].bufferSize : 0
      bindingElement.bufferLength = bindingElement.size + bindingElement.bufferOffset

      // console.log('old', bindingElement.size, bindingElement.offset, bindingElement.totalLength)
      // console.log('new', bindingElement.size, bindingElement.bufferOffset, bindingElement.bufferLength)

      bindingElement.array = new Float32Array(this.value.subarray(bindingElement.offset, bindingElement.totalLength))

      bindingElement.update = (value) => {
        if (bindingElement.type === 'f32') {
          bindingElement.array[0] = value
        } else if (bindingElement.type === 'vec2f') {
          bindingElement.array[0] = value.x
          bindingElement.array[1] = value.y
        } else if (bindingElement.type === 'vec3f') {
          bindingElement.array[0] = value.x
          bindingElement.array[1] = value.y
          bindingElement.array[2] = value.z
        } else {
          bindingElement.array = value.elements
        }
      }
    })

    this.shouldUpdate = this.size > 0
  }

  setWGSLFragment() {
    if (this.useStruct) {
      this.wgslStructFragment = `
  struct ${this.label} {
    ${this.bindingElements.map((uniform) => uniform.name + ': ' + uniform.type).join(',\n\t')}
  };\n`

      this.wgslGroupFragment = `
  var<uniform> ${this.name}: ${this.label};`
    } else {
      this.wgslStructFragment = ''
      this.wgslGroupFragment = `${this.bindingElements
        .map((uniform, index) => {
          return `var<uniform> ${uniform.name}: ${uniform.type};\n`
        })
        .join(',\n\t')}`
    }
  }

  shouldUpdateUniform(uniformName = '') {
    const uniformKey = Object.keys(this.uniforms).find((uniformKey) => this.uniforms[uniformKey].name === uniformName)

    if (uniformKey) this.uniforms[uniformKey].shouldUpdate = true
  }

  onBeforeRender() {
    Object.keys(this.uniforms).forEach((uniformKey) => {
      const uniform = this.uniforms[uniformKey]
      const bindingElement = this.bindingElements.find((bindingEl) => bindingEl.key === uniformKey)

      if (uniform.shouldUpdate && bindingElement) {
        uniform.onBeforeUpdate && uniform.onBeforeUpdate()
        bindingElement.update(uniform.value)

        this.value.set(bindingElement.array, bindingElement.offset)
        this.shouldUpdate = true

        uniform.shouldUpdate = false
      }
    })
  }
}
