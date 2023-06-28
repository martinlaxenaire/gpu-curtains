import { Bindings } from './Bindings'
import { getBufferLayout } from '../../utils/buffers-utils'
import { Vec2 } from '../../math/Vec2'
import { Vec3 } from '../../math/Vec3'
import { toCamelCase, toKebabCase } from '../../utils/utils'

export class BufferBindings extends Bindings {
  constructor({
    label = 'Uniform',
    name = 'uniform',
    bindingType,
    bindIndex = 0,
    useStruct = true,
    uniforms = {},
    visibility,
  }) {
    bindingType = bindingType ?? 'uniform'

    super({ label, name, bindIndex, bindingType, visibility })

    this.label = toKebabCase(label)
    this.name = toCamelCase(name)
    this.bindingType = bindingType
    this.bindIndex = bindIndex
    this.size = 0

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

      if (uniform.value instanceof Vec2 || uniform.value instanceof Vec3) {
        uniform.value.onChange(() => (uniform.shouldUpdate = true))
      }

      this.uniforms[uniformKey] = uniform
    })

    this.setBufferGroup()
    this.setWGSLFragment()
  }

  setBufferGroup() {
    Object.keys(this.uniforms).forEach((uniformKey) => {
      const uniform = this.uniforms[uniformKey]

      const bufferLayout = getBufferLayout(uniform.type)

      this.bindingElements.push({
        name: toCamelCase(uniform.name ?? uniformKey),
        type: uniform.type,
        key: uniformKey,
        bufferLayout,
        startOffset: 0, // will be changed later
        endOffset: 0, // will be changed later
      })
    })

    this.alignmentRows = 0
    const bytesPerElement = Float32Array.BYTES_PER_ELEMENT
    this.bindingElements.forEach((bindingElement, index) => {
      const { numElements, align } = bindingElement.bufferLayout

      // we gotta start somewhere!
      if (index === 0) {
        bindingElement.startOffset = 0

        // set first alignment row(s)
        this.alignmentRows += Math.max(1, numElements / bytesPerElement)
      } else {
        // our next space available
        const nextSpaceAvailable =
          this.bindingElements[index - 1].startOffset + this.bindingElements[index - 1].bufferLayout.numElements

        // if it's just a float or an int, check if we have enough space on current alignment row
        if (align <= bytesPerElement) {
          if (nextSpaceAvailable + numElements <= this.alignmentRows * bytesPerElement) {
            bindingElement.startOffset = nextSpaceAvailable
          } else {
            bindingElement.startOffset = this.alignmentRows * bytesPerElement
            // increment alignmentRows
            this.alignmentRows++
          }
        } else {
          // if alignment is incompatible or there's not enough space on that alignment row,
          // move to next row alignment
          if (nextSpaceAvailable % align !== 0 || (nextSpaceAvailable + numElements) % bytesPerElement !== 0) {
            bindingElement.startOffset = this.alignmentRows * bytesPerElement
            this.alignmentRows++
          } else {
            bindingElement.startOffset = nextSpaceAvailable
            this.alignmentRows += numElements / bytesPerElement
          }
        }
      }

      bindingElement.endOffset = bindingElement.startOffset + bindingElement.bufferLayout.numElements
    })

    // our array size is the number of alignmentRows * bytes per element
    this.size = this.alignmentRows * bytesPerElement
    this.value = new Float32Array(this.size)

    this.bindingElements.forEach((bindingElement, index) => {
      bindingElement.array = new bindingElement.bufferLayout.View(
        this.value.subarray(bindingElement.startOffset, bindingElement.endOffset)
      )

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
        } else if (value.elements) {
          bindingElement.array = value.elements
        }
      }
    })

    this.shouldUpdate = this.size > 0
  }

  setWGSLFragment() {
    if (this.useStruct) {
      this.wgslStructFragment = `struct ${this.label} {\n\t${this.bindingElements
        .map((uniform) => uniform.name + ': ' + uniform.type)
        .join(',\n\t')}
};`

      const varType = this.bindingType === 'storage' ? 'var<storage, read>' : 'var<uniform>'
      this.wgslGroupFragment = `${varType} ${this.name}: ${this.label};\n`
    } else {
      this.wgslStructFragment = ''
      this.wgslGroupFragment = `${this.bindingElements
        .map((uniform, index) => {
          const varType = this.bindingType === 'storage' ? 'var<storage, read>' : 'var<uniform>'
          return `${varType} ${uniform.name}: ${uniform.type};\n`
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
        this.value.set(bindingElement.array, bindingElement.startOffset)

        this.shouldUpdate = true
        uniform.shouldUpdate = false
      }
    })
  }
}
