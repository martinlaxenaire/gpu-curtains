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
    bindings = {},
    visibility,
  }) {
    bindingType = bindingType ?? 'uniform'

    super({ label, name, bindIndex, bindingType, visibility })

    this.size = 0

    this.shouldUpdate = false
    this.useStruct = useStruct

    this.bindingElements = []
    this.bindings = {}

    Object.keys(bindings).forEach((bindingKey) => {
      const binding = {}

      for (const key in bindings[bindingKey]) {
        if (key !== 'value') {
          binding[key] = bindings[bindingKey][key]
        }
      }

      Object.defineProperty(binding, 'value', {
        get() {
          return binding._value
        },
        set(v) {
          binding._value = v
          binding.shouldUpdate = true
        },
      })

      binding.value = bindings[bindingKey].value

      if (binding.value instanceof Vec2 || binding.value instanceof Vec3) {
        binding.value.onChange(() => (binding.shouldUpdate = true))
      }

      this.bindings[bindingKey] = binding
    })

    this.setBufferGroup()
    this.setWGSLFragment()
  }

  setBufferGroup() {
    Object.keys(this.bindings).forEach((bindingKey) => {
      const binding = this.bindings[bindingKey]

      const bufferLayout =
        binding.type && binding.type.indexOf('array') === -1
          ? getBufferLayout(binding.type)
          : {
              numElements: binding.value.length,
              align: 16,
              size: binding.value.byteLength,
              type: 'f32',
              View: Float32Array,
            }

      this.bindingElements.push({
        name: toCamelCase(binding.name ?? bindingKey),
        type: binding.type ?? 'array<f32>',
        key: bindingKey,
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

        // if it's just a float an int or a vec2, check if we have enough space on current alignment row
        if (align <= bytesPerElement * 2) {
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
        } else if (ArrayBuffer.isView(value)) {
          bindingElement.array.set(value.slice())
        } else if (Array.isArray(value)) {
          for (let i = 0; i < bindingElement.array.length; i++) {
            bindingElement.array[i] = value[i] ? value[i] : 0
          }
        }
      }
    })

    this.shouldUpdate = this.size > 0
  }

  setWGSLFragment() {
    if (this.useStruct) {
      this.wgslStructFragment = `struct ${toKebabCase(this.label)} {\n\t${this.bindingElements
        .map((binding) => binding.name + ': ' + binding.type)
        .join(',\n\t')}
};`

      const varType = this.bindingType === 'storage' ? 'var<storage, read>' : 'var<uniform>'
      this.wgslGroupFragment = `${varType} ${this.name}: ${toKebabCase(this.label)};\n`
    } else {
      this.wgslStructFragment = ''
      this.wgslGroupFragment = `${this.bindingElements
        .map((binding, index) => {
          const varType = this.bindingType === 'storage' ? 'var<storage, read>' : 'var<uniform>'
          return `${varType} ${binding.name}: ${binding.type};\n`
        })
        .join(',\n\t')}`
    }
  }

  shouldUpdateBinding(bindingName = '') {
    const bindingKey = Object.keys(this.bindings).find((bindingKey) => this.bindings[bindingKey].name === bindingName)

    if (bindingKey) this.bindings[bindingKey].shouldUpdate = true
  }

  onBeforeRender() {
    Object.keys(this.bindings).forEach((bindingKey) => {
      const binding = this.bindings[bindingKey]
      const bindingElement = this.bindingElements.find((bindingEl) => bindingEl.key === bindingKey)

      if (binding.shouldUpdate && bindingElement) {
        binding.onBeforeUpdate && binding.onBeforeUpdate()
        bindingElement.update(binding.value)
        this.value.set(bindingElement.array, bindingElement.startOffset)

        this.shouldUpdate = true
        binding.shouldUpdate = false
      }
    })
  }
}
