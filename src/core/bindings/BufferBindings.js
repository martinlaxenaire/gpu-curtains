import { Bindings } from './Bindings'
import { getBindingWgslVarType, getBufferArrayStride, getBufferLayout } from '../../utils/buffers-utils'
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
        this.alignmentRows += Math.max(1, Math.ceil(numElements / bytesPerElement))
      } else {
        // our next space available
        let nextSpaceAvailable =
          this.bindingElements[index - 1].startOffset + this.bindingElements[index - 1].bufferLayout.numElements

        // if it's just a float an int or a vec2, check if we have enough space on current alignment row
        if (align <= bytesPerElement * 2) {
          if (numElements === 2 && nextSpaceAvailable % 2 === 1) {
            nextSpaceAvailable = nextSpaceAvailable + 1
          }

          if (nextSpaceAvailable + numElements <= this.alignmentRows * bytesPerElement) {
            // if it's a vec2 following a float, start at index 2
            // if not, just fill next space available
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
            //this.alignmentRows++
            this.alignmentRows += Math.ceil(numElements / bytesPerElement)
          } else {
            bindingElement.startOffset = nextSpaceAvailable
            this.alignmentRows += Math.ceil(numElements / bytesPerElement)
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
          bindingElement.array[0] = value.x ?? value[0] ?? 0
          bindingElement.array[1] = value.y ?? value[1] ?? 0
        } else if (bindingElement.type === 'vec3f') {
          bindingElement.array[0] = value.x ?? value[0] ?? 0
          bindingElement.array[1] = value.y ?? value[1] ?? 0
          bindingElement.array[2] = value.z ?? value[2] ?? 0
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
      const notAllArrays = Object.keys(this.bindings).find(
        (bindingKey) => this.bindings[bindingKey].type.indexOf('array') === -1
      )

      if (!notAllArrays) {
        const kebabCaseLabel = toKebabCase(this.label)
        const camelCaseLabel = toCamelCase(this.label)

        this.wgslStructFragment = `struct ${kebabCaseLabel} {\n\t${this.bindingElements
          .map((binding) => binding.name + ': ' + binding.type.replace('array', '').replace('<', '').replace('>', ''))
          .join(',\n\t')}
};`

        //this.wgslStructFragment += `struct ${kebabCaseLabel}Array {\n\tdata: array<${kebabCaseLabel}>\n};`

        const varType = getBindingWgslVarType(this.bindingType)
        //this.wgslGroupFragment = [`${varType} ${this.name}: ${kebabCaseLabel}Array;`]
        this.wgslGroupFragment = [`${varType} ${this.name}: array<${kebabCaseLabel}>;`]
      } else {
        this.wgslStructFragment = `struct ${toKebabCase(this.label)} {\n\t${this.bindingElements
          .map((binding) => binding.name + ': ' + binding.type)
          .join(',\n\t')}
};`

        const varType = getBindingWgslVarType(this.bindingType)
        this.wgslGroupFragment = [`${varType} ${this.name}: ${toKebabCase(this.label)};`]
      }
    } else {
      this.wgslStructFragment = ''
      this.wgslGroupFragment = this.bindingElements.map((binding) => {
        const varType = getBindingWgslVarType(this.bindingType)
        return `${varType} ${binding.name}: ${binding.type};`
      })
    }
  }

  shouldUpdateBinding(bindingName = '') {
    const bindingKey = Object.keys(this.bindings).find((bindingKey) => this.bindings[bindingKey].name === bindingName)

    if (bindingKey) this.bindings[bindingKey].shouldUpdate = true
  }

  onBeforeRender() {
    Object.keys(this.bindings).forEach((bindingKey, bindingIndex) => {
      const binding = this.bindings[bindingKey]
      const bindingElement = this.bindingElements.find((bindingEl) => bindingEl.key === bindingKey)

      if (binding.shouldUpdate && bindingElement) {
        binding.onBeforeUpdate && binding.onBeforeUpdate()
        bindingElement.update(binding.value)

        const notAllArrays = Object.keys(this.bindings).find(
          (bindingKey) => this.bindings[bindingKey].type.indexOf('array') === -1
        )

        if (notAllArrays) {
          this.value.set(bindingElement.array, bindingElement.startOffset)
        } else {
          // now this is tricky cause we need to reorder value by strides
          const arrayStride = getBufferArrayStride(bindingElement)

          let totalArrayStride = 0
          let startIndex = 0
          this.bindingElements.forEach((bindingEl, index) => {
            totalArrayStride += getBufferArrayStride(bindingEl)
            if (index < bindingIndex) {
              startIndex += getBufferArrayStride(bindingEl)
            }
          })

          for (let i = 0, j = 0; j < bindingElement.array.length; i++, j += arrayStride) {
            // fill portion of value array with portion of binding element array
            this.value.set(bindingElement.array.subarray(j, j + arrayStride), i * totalArrayStride + startIndex)
          }
        }

        this.shouldUpdate = true
        binding.shouldUpdate = false
      }
    })
  }
}
