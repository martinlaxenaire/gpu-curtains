import { Bindings, BindingsParams } from './Bindings'
import {
  BufferBindingsElement,
  getBindingWgslVarType,
  getBufferArrayStride,
  getBufferLayout,
} from '../../utils/buffers-utils'
import { toCamelCase, toKebabCase } from '../../utils/utils'
import { Vec2 } from '../../math/Vec2'
import { Vec3 } from '../../math/Vec3'
import { Mat4 } from '../../math/Mat4'
import { Quat } from '../../math/Quat'
import { Input, InputBase, InputValue } from '../../types/BindGroups'

export interface BufferBindingsUniform extends InputBase {
  _value: InputValue
  get value(): InputValue
  set value(value: InputValue)
  shouldUpdate: boolean
}

/**
 * An object defining all possible {@link BufferBindings} class instancing parameters
 */
export interface BufferBindingsParams extends BindingsParams {
  /** Whether this {@link BufferBindings} should use structured WGSL variables */
  useStruct?: boolean
  /** Object containing one or multiple [input bindings]{@link Input} */
  bindings?: Record<string, Input>
}

/**
 * BufferBindings class:
 * Used to format inputs bindings and create a single typed array that will hold all those inputs values. The array needs to be correctly padded depending on every value type, so it can be safely used as a GPUBuffer input.
 * It will also create WGSL Structs and variables according to the BufferBindings inputs parameters.
 * @extends Bindings
 */
export class BufferBindings extends Bindings {
  /** Flag to indicate whether these {@link BufferBindings} should use structured data */
  useStruct: boolean
  /** All the {@link BufferBindings} data inputs */
  bindings: Record<string, BufferBindingsUniform>

  /** Number of rows (each row has a byteLength of 16) used to build our padded {@link value} array */
  alignmentRows: number
  /** Total size of our {@link value} array in bytes, so {@link alignmentRows} * 16 */
  size: number
  /** Flag to indicate whether one of the {@link bindings} value has changed and we need to update the GPUBuffer linked to the {@link value} array */
  shouldUpdate: boolean
  /** An array describing how each corresponding {@link bindings} should be inserted into our {@link value} array
   * @type {BufferBindingsElement[]} */
  bindingElements: BufferBindingsElement[]

  /** The padded value array that will be sent to the GPUBuffer */
  value: Float32Array
  /** The GPUBuffer */
  // TODO!!
  buffer: GPUBuffer | null

  /** A string to append to our shaders code describing the WGSL structure representing this {@link BufferBindings} */
  wgslStructFragment: string
  /** An array of strings to append to our shaders code declaring all the WGSL variables representing this {@link BufferBindings} */
  wgslGroupFragment: string[]

  /**
   * BufferBindings constructor
   * @param {BufferBindingsParams} parameters - parameters used to create our BufferBindings
   * @param {string=} parameters.label - binding label
   * @param {string=} parameters.name - binding name
   * @param {BindingType="uniform"} parameters.bindingType - binding type
   * @param {number=} parameters.bindIndex - bind index inside the bind group
   * @param {MaterialShadersType=} parameters.visibility - shader visibility
   * @param {boolean=} parameters.useStruct - whether to use structured WGSL variables
   * @param {Object.<string, Input>} parameters.bindings - bindings inputs
   */
  constructor({
    label = 'Uniform',
    name = 'uniform',
    bindingType,
    bindIndex = 0,
    visibility,
    useStruct = true,
    bindings = {},
  }: BufferBindingsParams) {
    bindingType = bindingType ?? 'uniform'

    super({ label, name, bindIndex, bindingType, visibility })

    this.size = 0

    this.shouldUpdate = false
    this.useStruct = useStruct

    this.bindingElements = []
    this.bindings = {}
    this.buffer = null // TODO

    this.setBindings(bindings)
    this.setBufferAttributes()
    this.setWGSLFragment()
  }

  /**
   * Format input bindings and set our {@link bindings}
   * @param {Object.<string, Input>} bindings - bindings inputs
   */
  setBindings(bindings: Record<string, Input>) {
    Object.keys(bindings).forEach((bindingKey) => {
      const binding = {} as BufferBindingsUniform

      for (const key in bindings[bindingKey]) {
        if (key !== 'value') {
          binding[key] = bindings[bindingKey][key]
        }
      }

      // define a "value" getter/setter so we can now when to update the buffer binding
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
  }

  /**
   * Set our buffer attributes:
   * Takes all the {@link bindings} and adds them to the {@link bindingElements} array with the correct start and end offsets (padded), then fill our {@link value} typed array accordingly.
   */
  setBufferAttributes() {
    Object.keys(this.bindings).forEach((bindingKey) => {
      const binding = this.bindings[bindingKey]

      const bufferLayout =
        binding.type && binding.type.indexOf('array') !== -1 && binding.value instanceof Float32Array
          ? {
              numElements: binding.value.length,
              align: 16,
              size: binding.value.byteLength,
              type: 'f32',
              View: Float32Array,
            }
          : getBufferLayout(binding.type)

      this.bindingElements.push({
        name: toCamelCase(binding.name ?? bindingKey),
        type: binding.type ?? 'array<f32>',
        key: bindingKey,
        bufferLayout,
        startOffset: 0, // will be changed later
        endOffset: 0, // will be changed later
      } as BufferBindingsElement)
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

    this.bindingElements.forEach((bindingElement) => {
      bindingElement.array = new bindingElement.bufferLayout.View(
        this.value.subarray(bindingElement.startOffset, bindingElement.endOffset)
      )

      bindingElement.update = (value) => {
        if (bindingElement.type === 'f32') {
          bindingElement.array[0] = value as number
        } else if (bindingElement.type === 'vec2f') {
          bindingElement.array[0] = (value as Vec2).x ?? value[0] ?? 0
          bindingElement.array[1] = (value as Vec2).y ?? value[1] ?? 0
        } else if (bindingElement.type === 'vec3f') {
          bindingElement.array[0] = (value as Vec3).x ?? value[0] ?? 0
          bindingElement.array[1] = (value as Vec3).y ?? value[1] ?? 0
          bindingElement.array[2] = (value as Vec3).z ?? value[2] ?? 0
        } else if ((value as Quat | Mat4).elements) {
          bindingElement.array = (value as Quat | Mat4).elements
        } else if (value instanceof Float32Array) {
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

  /**
   * Set the WGSL code snippet to append to the shaders code. It consists of variable (and Struct structures if needed) declarations.
   */
  setWGSLFragment() {
    if (this.useStruct) {
      const notAllArrays = Object.keys(this.bindings).find(
        (bindingKey) => this.bindings[bindingKey].type.indexOf('array') === -1
      )

      if (!notAllArrays) {
        const kebabCaseLabel = toKebabCase(this.label)

        this.wgslStructFragment = `struct ${kebabCaseLabel} {\n\t${this.bindingElements
          .map((binding) => binding.name + ': ' + binding.type.replace('array', '').replace('<', '').replace('>', ''))
          .join(',\n\t')}
};`

        const varType = getBindingWgslVarType(this.bindingType)
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

  /**
   * Set a binding shouldUpdate flag to true to update our {@link value} array during next render.
   * @param {string} bindingName - the binding name/key to update
   */
  shouldUpdateBinding(bindingName = '') {
    const bindingKey = Object.keys(this.bindings).find((bindingKey) => this.bindings[bindingKey].name === bindingName)

    if (bindingKey) this.bindings[bindingKey].shouldUpdate = true
  }

  /**
   * Executed at the beginning of a Material render call.
   * If any of the {@link bindings} has changed, run its onBeforeUpdate callback then updates our {@link value} array.
   * Also sets the {@link shouldUpdate} property to true so the {@link BindGroup} knows it will need to update the GPUBuffer.
   */
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
