import { Binding, BindingParams, BufferBindingMemoryAccessType } from './Binding'
import { getBindGroupLayoutBindingType, getBindingWGSLVarType, getBufferLayout, TypedArray } from './utils'
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
  /** Object containing one or multiple [inputs]{@link Input} describing the structure of the {@link BufferBinding} */
  struct?: Record<string, Input>
}

/**
 * Parameters used to create a {@link BufferBinding}
 */
export interface BufferBindingParams extends BindingParams, BufferBindingBaseParams {}

/** All allowed [buffer elements]{@link BufferElement} */
export type AllowedBufferElement = BufferElement | BufferArrayElement | BufferInterleavedArrayElement

/**
 * BufferBinding class:
 * Used to format inputs struct and create a single typed array that will hold all those inputs values. The array needs to be correctly padded depending on every value type, so it can be safely used as a GPUBuffer input.
 * It will also create WGSL Structs and variables according to the BufferBindings inputs parameters.
 * The WGSL structs and variables declaration may vary based on the input types, especially if there's one or more arrays involved (i.e. "array<f32>", "array<vec3f>" etc.)
 * @extends Binding
 */
export class BufferBinding extends Binding {
  /** Flag to indicate whether this {@link BufferBinding} [elements]{@link bufferElements} should be packed in a single structured object or if each one of them should be a separate binding. */
  useStruct: boolean
  /** All the {@link BufferBinding} data inputs */
  inputs: Record<string, BufferBindingInput>

  /** Flag to indicate whether one of the {@link inputs} value has changed and we need to update the GPUBuffer linked to the {@link arrayBuffer} array */
  shouldUpdate: boolean

  /** An array describing how each corresponding {@link inputs} should be inserted into our {@link arrayView} array */
  bufferElements: AllowedBufferElement[]

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
   * @param parameters - [parameters]{@link BufferBindingParams} used to create our BufferBindings
   */
  constructor({
    label = 'Uniform',
    name = 'uniform',
    bindingType,
    visibility,
    useStruct = true,
    access = 'read',
    struct = {},
  }: BufferBindingParams) {
    bindingType = bindingType ?? 'uniform'

    super({ label, name, bindingType, visibility })

    this.options = {
      ...this.options,
      useStruct,
      access,
      struct: struct,
    }

    this.arrayBufferSize = 0

    this.shouldUpdate = false
    this.useStruct = useStruct

    this.bufferElements = []
    this.inputs = {}
    this.buffer = null

    this.setBindings(struct)
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
   * Format input struct and set our {@link inputs}
   * @param bindings - struct inputs
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

      this.inputs[bindingKey] = binding
    })
  }

  /**
   * Set our buffer attributes:
   * Takes all the {@link inputs} and adds them to the {@link bufferElements} array with the correct start and end offsets (padded), then fill our {@link arrayBuffer} typed array accordingly.
   */
  setBufferAttributes() {
    // early on, check if there's at least one array binding
    // If there's one and only one, put it at the end of the binding elements array, treat it as a single entry of the type, but loop on it by array.length / size to fill the alignment
    // If there's more than one, create buffer interleaved elements.

    // if length === 0, OK
    // if length === 1, put it at the end of our struct
    // if length > 1, create a buffer interleaved elements
    const arrayBindings = Object.keys(this.inputs).filter(
      (bindingKey) => this.inputs[bindingKey].type.indexOf('array') !== -1
    )

    // put the array struct at the end
    let orderedBindings = Object.keys(this.inputs).sort((bindingKeyA, bindingKeyB) => {
      // 0 if it's an array, -1 else
      const isBindingAArray = Math.min(0, this.inputs[bindingKeyA].type.indexOf('array'))
      const isBindingBArray = Math.min(0, this.inputs[bindingKeyB].type.indexOf('array'))

      return isBindingAArray - isBindingBArray
    })

    if (arrayBindings.length > 1) {
      // remove interleaved arrays from the ordered struct key array
      orderedBindings = orderedBindings.filter((bindingKey) => !arrayBindings.includes(bindingKey))
    }

    // handle buffer (non interleaved) elements
    orderedBindings.forEach((bindingKey) => {
      const binding = this.inputs[bindingKey]

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
        const binding = this.inputs[bindingKey]
        const bufferLayout = getBufferLayout(binding.type.replace('array', '').replace('<', '').replace('>', ''))

        return (binding.value as number[] | TypedArray).length / bufferLayout.numElements
      })

      // are they all of the same size?
      const equalSize = arraySizes.every((size, i, array) => size === array[0])

      if (equalSize) {
        // this will hold our interleaved buffer elements
        const interleavedBufferElements = arrayBindings.map((bindingKey) => {
          const binding = this.inputs[bindingKey]
          return new BufferInterleavedArrayElement({
            name: toCamelCase(binding.name ?? bindingKey),
            key: bindingKey,
            type: binding.type,
            arrayLength: (binding.value as number[]).length,
          })
        })

        // now create temp buffer elements that we'll use to fill the interleaved buffer elements alignments
        const tempBufferElements = arrayBindings.map((bindingKey) => {
          const binding = this.inputs[bindingKey]
          return new BufferElement({
            name: toCamelCase(binding.name ?? bindingKey),
            key: bindingKey,
            type: binding.type.replace('array', '').replace('<', '').replace('>', ''),
          })
        })

        // set temp buffer alignments as if it was regular buffer elements
        tempBufferElements.forEach((bufferElement, index) => {
          if (index === 0) {
            if (this.bufferElements.length) {
              // if there are already buffer elements
              // get last one end row, and start at the next row
              bufferElement.setAlignmentFromPosition({
                row: this.bufferElements[this.bufferElements.length - 1].alignment.end.row + 1,
                byte: 0,
              })
            } else {
              bufferElement.setAlignment(0)
            }
          } else {
            bufferElement.setAlignment(tempBufferElements[index - 1].endOffset + 1)
          }
        })

        // now use last temp buffer end offset as our interleaved arrayStride
        const totalStride =
          tempBufferElements[tempBufferElements.length - 1].endOffset + 1 - tempBufferElements[0].startOffset

        // finally, set interleaved buffer elements alignment
        interleavedBufferElements.forEach((bufferElement, index) => {
          bufferElement.setAlignment(tempBufferElements[index].startOffset, totalStride)
        })

        // add to our buffer elements array
        this.bufferElements = [...this.bufferElements, ...interleavedBufferElements]
      } else {
        throwWarning(
          `BufferBinding: "${
            this.label
          }" contains multiple array inputs that should use an interleaved array, but their sizes do not match. These inputs cannot be added to the BufferBinding: "${arrayBindings.join(
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
      ) as BufferInterleavedArrayElement[]

      if (interleavedBufferElements.length) {
        const arrayLength = this.bindingType === 'uniform' ? `, ${interleavedBufferElements[0].numElements}` : ''

        if (bufferElements.length) {
          this.wgslStructFragment = `struct ${kebabCaseLabel}Element {\n\t${interleavedBufferElements
            .map((binding) => binding.name + ': ' + binding.type.replace('array', '').replace('<', '').replace('>', ''))
            .join(',\n\t')}
};\n\n`

          const interleavedBufferStructDeclaration = `${this.name}Element: array<${kebabCaseLabel}Element${arrayLength}>,`

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
          this.wgslGroupFragment = [`${varType} ${this.name}: array<${kebabCaseLabel}${arrayLength}>;`]
        }
      } else {
        this.wgslStructFragment = `struct ${kebabCaseLabel} {\n\t${this.bufferElements
          .map((binding) => {
            // now add array length if needed
            const bindingType =
              this.bindingType === 'uniform' && 'numElements' in binding
                ? `array<${binding.type.replace('array', '').replace('<', '').replace('>', '')}, ${
                    binding.numElements
                  }>`
                : binding.type
            return binding.name + ': ' + bindingType
          })
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
   * Set a binding shouldUpdate flag to true to update our {@link arrayBuffer} array during next render.
   * @param bindingName - the binding name/key to update
   */
  shouldUpdateBinding(bindingName = '') {
    const bindingKey = Object.keys(this.inputs).find((bindingKey) => this.inputs[bindingKey].name === bindingName)

    if (bindingKey) this.inputs[bindingKey].shouldUpdate = true
  }

  /**
   * Executed at the beginning of a Material render call.
   * If any of the {@link inputs} has changed, run its onBeforeUpdate callback then updates our {@link arrayBuffer} array.
   * Also sets the {@link shouldUpdate} property to true so the {@link BindGroup} knows it will need to update the {@link GPUBuffer}.
   */
  update() {
    Object.keys(this.inputs).forEach((bindingKey) => {
      const binding = this.inputs[bindingKey]
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

  /**
   * Extract the data corresponding to a specific {@link BufferElement} from a {@link Float32Array} holding the [buffer]{@link BufferBinding#buffer} data of this {@link BufferBinding}
   * @param parameters - parameters used to extract the data
   * @param parameters.result - {@link Float32Array} holding {@link GPUBuffer} data
   * @param parameters.bufferElementName - name of the {@link BufferElement} to use to extract the data
   * @returns - extracted data from the {@link Float32Array}
   */
  extractBufferElementDataFromBufferResult({
    result,
    bufferElementName,
  }: {
    result: Float32Array
    bufferElementName: BufferElement['name']
  }): Float32Array {
    const bufferElement = this.bufferElements.find((bufferElement) => bufferElement.name === bufferElementName)
    if (bufferElement) {
      return bufferElement.extractDataFromBufferResult(result)
    } else {
      return result
    }
  }
}
