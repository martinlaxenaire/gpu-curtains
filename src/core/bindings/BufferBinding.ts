import { Binding, BindingParams, BufferBindingMemoryAccessType } from './Binding'
import {
  BufferLayout,
  getBindGroupLayoutBindingType,
  getBindingWGSLVarType,
  getBufferLayout,
  TypedArray,
  WGSLVariableType,
} from './utils'
import { throwWarning, toCamelCase, toKebabCase } from '../../utils/utils'
import { Vec2 } from '../../math/Vec2'
import { Vec3 } from '../../math/Vec3'
import { Input, InputBase, InputValue } from '../../types/BindGroups'
import { BufferElement } from './bufferElements/BufferElement'
import { BufferArrayElement } from './bufferElements/BufferArrayElement'
import { BufferInterleavedArrayElement } from './bufferElements/BufferInterleavedArrayElement'

/**
 * Defines a {@link BufferBinding} input object that can set a value and run a callback function when this happens
 */
export interface BufferBindingInput extends InputBase {
  /** Original [input value]{@link InputValue} */
  _value: InputValue

  /**
   * Get/set the [input value]{@link InputValue}
   * @readonly
   */
  get value(): InputValue
  set value(value: InputValue)

  /** Whether the [input value]{@link InputValue} has changed and we should update the [buffer binding array]{@link BufferBinding#value} */
  shouldUpdate: boolean
}

/**
 * Base parameters used to create a {@link BufferBinding}
 */
export interface BufferBindingBaseParams {
  /** Whether this {@link BufferBinding} should use structured WGSL variables */
  useStruct?: boolean
  /** {@link BufferBinding} memory access types (read only or read/write) */
  access?: BufferBindingMemoryAccessType
  /** Object containing one or multiple [input bindings]{@link Input} */
  bindings?: Record<string, Input>
  /** Whether to compute the buffer element offset/alignment. Could be set to false to improve performance if you are dealing with very large buffers and don't need to actually pass the values from the CPU to the GPU (i.e. directly compute buffer values in a compute shader) */
  computeAlignment?: boolean
}

/**
 * Parameters used to create a {@link BufferBinding}
 */
export interface BufferBindingParams extends BindingParams, BufferBindingBaseParams {}

/**
 * BufferBinding class:
 * Used to format inputs bindings and create a single typed array that will hold all those inputs values. The array needs to be correctly padded depending on every value type, so it can be safely used as a GPUBuffer input.
 * It will also create WGSL Structs and variables according to the BufferBindings inputs parameters.
 * @extends Binding
 */
export class BufferBinding extends Binding {
  /** Flag to indicate whether these {@link BufferBinding} should use structured data */
  useStruct: boolean
  /** All the {@link BufferBinding} data inputs */
  bindings: Record<string, BufferBindingInput>

  /** Flag to indicate whether one of the {@link bindings} value has changed and we need to update the GPUBuffer linked to the {@link value} array */
  shouldUpdate: boolean

  /** An array describing how each corresponding {@link bindings} should be inserted into our {@link arrayView} array */
  bufferElements: Array<BufferElement | BufferArrayElement | BufferInterleavedArrayElement>

  /** Total size of our {@link arrayBuffer} array in bytes */
  arrayBufferSize: number
  /** Array buffer that will be sent to the {@link GPUBuffer} */
  arrayBuffer: ArrayBuffer
  /** Data view of our [array buffer]{@link arrayBuffer} */
  arrayView: DataView

  /** The GPUBuffer */
  buffer: GPUBuffer | null

  /** A string to append to our shaders code describing the WGSL structure representing this {@link BufferBinding} */
  wgslStructFragment: string
  /** An array of strings to append to our shaders code declaring all the WGSL variables representing this {@link BufferBinding} */
  wgslGroupFragment: string[]
  /** Options used to create this {@link BufferBinding} */
  options: BufferBindingParams

  /**
   * BufferBinding constructor
   * @param parameters - parameters used to create our BufferBindings
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
    computeAlignment = true,
    access = 'read',
    bindings = {},
  }: BufferBindingParams) {
    bindingType = bindingType ?? 'uniform'

    super({ label, name, bindIndex, bindingType, visibility })

    this.options = {
      ...this.options,
      useStruct,
      access,
      bindings,
      computeAlignment,
    }

    this.arrayBufferSize = 0

    this.shouldUpdate = false
    this.useStruct = useStruct

    this.bufferElements = []
    this.bindings = {}
    this.buffer = null

    this.setBindings(bindings)
    this.setBufferAttributes()
    this.setWGSLFragment()
  }

  /**
   * Get [bind group layout entry resource]{@link GPUBindGroupLayoutEntry#buffer}
   */
  get resourceLayout(): { buffer: GPUBufferBindingLayout } {
    return {
      buffer: {
        type: getBindGroupLayoutBindingType(this),
      },
    }
  }

  /**
   * Get [bind group resource]{@link GPUBindGroupEntry#resource}
   */
  get resource(): { buffer: GPUBuffer | null } {
    return { buffer: this.buffer }
  }

  /**
   * Format input bindings and set our {@link bindings}
   * @param bindings - bindings inputs
   */
  setBindings(bindings: Record<string, Input>) {
    Object.keys(bindings).forEach((bindingKey) => {
      const binding = {} as BufferBindingInput

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
   * Takes all the {@link bindings} and adds them to the {@link bufferElements} array with the correct start and end offsets (padded), then fill our {@link value} typed array accordingly.
   */
  setBufferAttributes() {
    // early on, check if there's at least one array binding
    // If there's one and only one, put it at the end of the binding elements array, treat it as a single entry of the type, but loop on it by array.length / size to fill the alignment
    // If there's more than one, create buffer interleaved elements.

    // if length === 0, OK
    // if length === 1, put it at the end of our bindings
    // if length > 1, create a buffer interleaved elements
    const arrayBindings = Object.keys(this.bindings).filter(
      (bindingKey) => this.bindings[bindingKey].type.indexOf('array') !== -1
    )

    // put the array bindings at the end
    let orderedBindings = Object.keys(this.bindings).sort((bindingKeyA, bindingKeyB) => {
      // 0 if it's an array, -1 else
      const isBindingAArray = Math.min(0, this.bindings[bindingKeyA].type.indexOf('array'))
      const isBindingBArray = Math.min(0, this.bindings[bindingKeyB].type.indexOf('array'))

      return isBindingAArray - isBindingBArray
    })

    if (arrayBindings.length > 1) {
      // remove interleaved arrays from the ordered bindings key array
      orderedBindings = orderedBindings.filter((bindingKey) => !arrayBindings.includes(bindingKey))
    }

    // handle buffer (non interleaved) elements
    orderedBindings.forEach((bindingKey) => {
      const binding = this.bindings[bindingKey]

      const bufferElementOptions = {
        name: toCamelCase(binding.name ?? bindingKey),
        key: bindingKey,
        type: binding.type,
      }

      const isArray =
        binding.type.indexOf('array') !== -1 && (Array.isArray(binding.value) || ArrayBuffer.isView(binding.value))

      this.bufferElements.push(
        isArray
          ? new BufferArrayElement({
              ...bufferElementOptions,
              arrayLength: (binding.value as number[]).length,
            })
          : new BufferElement(bufferElementOptions)
      )
    })

    // set their alignments
    this.bufferElements.forEach((bufferElement, index) => {
      const startOffset = index === 0 ? 0 : this.bufferElements[index - 1].endOffset + 1

      bufferElement.setAlignment(startOffset)
    })

    // now create our interleaved buffer elements
    if (arrayBindings.length > 1) {
      // first get the sizes of the arrays
      const arraySizes = arrayBindings.map((bindingKey) => {
        const binding = this.bindings[bindingKey]
        const bufferLayout = getBufferLayout(binding.type.replace('array', '').replace('<', '').replace('>', ''))

        return (binding.value as number[] | TypedArray).length / bufferLayout.numElements
      })

      // are they all of the same size?
      const equalSize = arraySizes.every((size, i, array) => size === array[0])

      if (equalSize) {
        // this will hold our interleaved buffer elements
        const interleavedBufferElements = arrayBindings.map((bindingKey) => {
          const binding = this.bindings[bindingKey]
          return new BufferInterleavedArrayElement({
            name: toCamelCase(binding.name ?? bindingKey),
            key: bindingKey,
            type: binding.type,
            arrayLength: (binding.value as number[]).length,
          })
        })

        // now create temp buffer elements that we'll use to fill the interleaved buffer elements alignments
        const tempBufferElements = arrayBindings.map((bindingKey) => {
          const binding = this.bindings[bindingKey]
          return new BufferElement({
            name: toCamelCase(binding.name ?? bindingKey),
            key: bindingKey,
            type: binding.type.replace('array', '').replace('<', '').replace('>', ''),
          })
        })

        // set temp buffer alignments as if it was regular buffer elements
        tempBufferElements.forEach((bufferElement, index) => {
          const startOffset =
            index === 0
              ? this.bufferElements.length
                ? this.bufferElements[this.bufferElements.length - 1].endOffset + 1
                : 0
              : tempBufferElements[index - 1].endOffset + 1

          bufferElement.setAlignment(startOffset)
        })

        // now use last temp buffer end offset as our interleaved stride
        const totalStride =
          tempBufferElements[tempBufferElements.length - 1].endOffset + 1 - tempBufferElements[0].startOffset

        // finally, set interleaved buffer elements alignment
        interleavedBufferElements.forEach((bufferElement, index) => {
          // const startOffset =
          //   index === 0
          //     ? this.bufferElements.length
          //       ? this.bufferElements[this.bufferElements.length - 1].endOffset + 1
          //       : 0
          //     : tempBufferElements[index - 1].endOffset + 1
          const startOffset = tempBufferElements[index].startOffset

          bufferElement.setAlignment(startOffset, totalStride)
        })

        // add to our buffer elements array
        this.bufferElements = [...this.bufferElements, ...interleavedBufferElements]
      } else {
        // TODO better warning?
        throwWarning(
          `BufferBinding: "${
            this.label
          }" contains multiple array inputs that should use an interleaved array, but their size does not match. These inputs cannot be added to the BufferBinding: "${arrayBindings.join(
            ', '
          )}"`
        )
      }
    }

    this.arrayBufferSize = this.bufferElements.length
      ? this.bufferElements[this.bufferElements.length - 1].paddedByteCount
      : 0

    this.arrayBuffer = new ArrayBuffer(this.arrayBufferSize)
    this.arrayView = new DataView(this.arrayBuffer, 0, this.arrayBuffer.byteLength)

    this.bufferElements.forEach((bufferElement) => {
      bufferElement.setView(this.arrayBuffer, this.arrayView)
    })

    this.shouldUpdate = this.arrayBufferSize > 0
  }

  /**
   * Set the WGSL code snippet to append to the shaders code. It consists of variable (and Struct structures if needed) declarations.
   */
  setWGSLFragment() {
    const kebabCaseLabel = toKebabCase(this.label)

    if (this.useStruct) {
      const bufferElements = this.bufferElements.filter(
        (bufferElement) => !(bufferElement instanceof BufferInterleavedArrayElement)
      )
      const interleavedBufferElements = this.bufferElements.filter(
        (bufferElement) => bufferElement instanceof BufferInterleavedArrayElement
      )

      if (interleavedBufferElements.length) {
        if (bufferElements.length) {
          // TODO we have regular AND interleaved buffer elements
          this.wgslStructFragment = `struct ${kebabCaseLabel}Element {\n\t${interleavedBufferElements
            .map((binding) => binding.name + ': ' + binding.type.replace('array', '').replace('<', '').replace('>', ''))
            .join(',\n\t')}
};\n\n`

          const interleavedBufferStructDeclaration = `${this.name}Element: array<${kebabCaseLabel}Element>,`

          this.wgslStructFragment += `struct ${kebabCaseLabel} {\n\t${bufferElements
            .map((bufferElement) => bufferElement.name + ': ' + bufferElement.type)
            .join(',\n\t')}
\t${interleavedBufferStructDeclaration}
};`

          const varType = getBindingWGSLVarType(this)
          this.wgslGroupFragment = [`${varType} ${this.name}: ${kebabCaseLabel};`]
        } else {
          this.wgslStructFragment = `struct ${kebabCaseLabel} {\n\t${this.bufferElements
            .map((binding) => binding.name + ': ' + binding.type.replace('array', '').replace('<', '').replace('>', ''))
            .join(',\n\t')}
};`

          const varType = getBindingWGSLVarType(this)
          this.wgslGroupFragment = [`${varType} ${this.name}: array<${kebabCaseLabel}>;`]
        }
      } else {
        this.wgslStructFragment = `struct ${kebabCaseLabel} {\n\t${this.bufferElements
          .map((binding) => binding.name + ': ' + binding.type)
          .join(',\n\t')}
};`

        const varType = getBindingWGSLVarType(this)
        this.wgslGroupFragment = [`${varType} ${this.name}: ${kebabCaseLabel};`]
      }
    } else {
      this.wgslStructFragment = ''
      this.wgslGroupFragment = this.bufferElements.map((binding) => {
        const varType = getBindingWGSLVarType(this)
        return `${varType} ${binding.name}: ${binding.type};`
      })
    }
  }

  /**
   * Set a binding shouldUpdate flag to true to update our {@link value} array during next render.
   * @param bindingName - the binding name/key to update
   */
  shouldUpdateBinding(bindingName = '') {
    const bindingKey = Object.keys(this.bindings).find((bindingKey) => this.bindings[bindingKey].name === bindingName)

    if (bindingKey) this.bindings[bindingKey].shouldUpdate = true
  }

  /**
   * Executed at the beginning of a Material render call.
   * If any of the {@link bindings} has changed, run its onBeforeUpdate callback then updates our {@link value} array.
   * Also sets the {@link shouldUpdate} property to true so the {@link BindGroup} knows it will need to update the {@link GPUBuffer}.
   */
  update() {
    Object.keys(this.bindings).forEach((bindingKey, bindingIndex) => {
      const binding = this.bindings[bindingKey]
      const bufferElement = this.bufferElements.find((bufferEl) => bufferEl.key === bindingKey)

      if (binding.shouldUpdate && bufferElement) {
        binding.onBeforeUpdate && binding.onBeforeUpdate()
        // we're going to directly update the arrayBuffer from the buffer element update method
        bufferElement.update(binding.value)

        this.shouldUpdate = true
        binding.shouldUpdate = false
      }
    })
  }
}
