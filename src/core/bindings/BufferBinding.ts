import { Binding, BindingParams, BufferBindingMemoryAccessType, BufferBindingType } from './Binding'
import { getBindGroupLayoutBindingType, getBindingWGSLVarType, getBufferLayout, TypedArray } from './utils'
import { throwWarning, toCamelCase, toKebabCase } from '../../utils/utils'
import { Vec2 } from '../../math/Vec2'
import { Vec3 } from '../../math/Vec3'
import { Input, InputBase, InputValue } from '../../types/BindGroups'
import { BufferElement } from './bufferElements/BufferElement'
import { BufferArrayElement } from './bufferElements/BufferArrayElement'
import { BufferInterleavedArrayElement } from './bufferElements/BufferInterleavedArrayElement'
import { Buffer, BufferParams } from '../buffers/Buffer'

/**
 * Defines a {@link BufferBinding} input object that can set a value and run a callback function when this happens
 */
export interface BufferBindingInput extends InputBase {
  /** Original {@link InputValue | input value} */
  _value: InputValue

  /** Get the {@link InputValue | input value} */
  get value(): InputValue

  /** Set the {@link InputValue | input value} */
  set value(value: InputValue)

  /** Whether the {@link InputValue | input value} has changed and we should update the {@link BufferBinding#arrayBuffer | buffer binding array} */
  shouldUpdate: boolean

  /** {@link BufferBindingInput} name */
  name: string
}

/**
 * Base parameters used to create a {@link BufferBinding}
 */
export interface BufferBindingBaseParams {
  /** Whether this {@link BufferBinding} should use structured WGSL variables */
  useStruct?: boolean
  /** {@link BufferBinding} memory access types (read only or read/write) */
  access?: BufferBindingMemoryAccessType
  /** Object containing one or multiple {@link Input | inputs} describing the structure of the {@link BufferBinding} */
  struct?: Record<string, Input>
  /** Allowed usages for the {@link BufferBinding#buffer} as an array of {@link core/buffers/utils.BufferUsageKeys | buffer usages names} */
  usage?: BufferParams['usage']
}

/**
 * Parameters used to create a {@link BufferBinding}
 */
export interface BufferBindingParams extends BindingParams, BufferBindingBaseParams {
  /** The binding type of the {@link BufferBinding} */
  bindingType?: BufferBindingType
}

/** All allowed {@link BufferElement | buffer elements} */
export type AllowedBufferElement = BufferElement | BufferArrayElement | BufferInterleavedArrayElement

/**
 * Used to format {@link BufferBindingParams#struct | uniforms or storages struct inputs} and create a single typed array that will hold all those inputs values. The array needs to be correctly padded depending on every value type, so it can be safely used as a GPUBuffer input.<br>
 * It will also create WGSL Structs and variables according to the BufferBindings inputs parameters.<br>
 * The WGSL structs and variables declaration may vary based on the input types, especially if there's one or more arrays involved (i.e. `array<f32>`, `array<vec3f>` etc.).
 *
 * @example
 * ```javascript
 * // create a GPU buffer binding
 * const bufferBinding = new BufferBinding({
 *   name: 'params', // name of the WGSL object
 *   bindingType: 'uniform', // should be 'storage' for large arrays
 *   struct: {
 *     opacity: {
 *       type: 'f32',
 *       value: 1,
 *     },
 *     mousePosition: {
 *       type: 'vec2f',
 *       value: new Vec2(),
 *     },
 *   },
 * })
 * ```
 */
export class BufferBinding extends Binding {
  /** The binding type of the {@link BufferBinding} */
  bindingType: BufferBindingType
  /** Flag to indicate whether this {@link BufferBinding} {@link bufferElements | buffer elements} should be packed in a single structured object or if each one of them should be a separate binding. */
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
  /** Data view of our {@link arrayBuffer | array buffer} */
  arrayView: DataView

  /** The {@link Buffer} holding the {@link GPUBuffer}  */
  buffer: Buffer

  /** A string to append to our shaders code describing the WGSL structure representing this {@link BufferBinding} */
  wgslStructFragment: string
  /** An array of strings to append to our shaders code declaring all the WGSL variables representing this {@link BufferBinding} */
  wgslGroupFragment: string[]
  /** Options used to create this {@link BufferBinding} */
  options: BufferBindingParams

  /**
   * BufferBinding constructor
   * @param parameters - {@link BufferBindingParams | parameters} used to create our BufferBindings
   */
  constructor({
    label = 'Uniform',
    name = 'uniform',
    bindingType,
    visibility,
    useStruct = true,
    access = 'read',
    usage = [],
    struct = {},
  }: BufferBindingParams) {
    bindingType = bindingType ?? 'uniform'

    super({ label, name, bindingType, visibility })

    this.options = {
      ...this.options,
      useStruct,
      access,
      usage,
      struct,
    }

    this.cacheKey += `${useStruct},${access},`

    this.arrayBufferSize = 0

    this.shouldUpdate = false
    this.useStruct = useStruct

    this.bufferElements = []
    this.inputs = {}
    this.buffer = new Buffer()

    if (Object.keys(struct).length) {
      this.setBindings(struct)
      this.setBufferAttributes()

      this.setWGSLFragment()
    }
  }

  /**
   * Get {@link GPUBindGroupLayoutEntry#buffer | bind group layout entry resource}
   * @readonly
   */
  get resourceLayout(): {
    /** {@link GPUBindGroupLayout | bind group layout} resource */
    buffer: GPUBufferBindingLayout
  } {
    return {
      buffer: {
        type: getBindGroupLayoutBindingType(this),
      },
    }
  }

  /**
   * Get the resource cache key
   * @readonly
   */
  get resourceLayoutCacheKey(): string {
    return `buffer,${getBindGroupLayoutBindingType(this)},${this.visibility},`
  }

  /**
   * Get {@link GPUBindGroupEntry#resource | bind group resource}
   * @readonly
   */
  get resource(): {
    /** {@link GPUBindGroup | bind group} resource */
    buffer: GPUBuffer | null
  } {
    return { buffer: this.buffer.GPUBuffer }
  }

  /**
   * Clone this {@link BufferBinding} into a new one. Allows to skip buffer layout alignment computations.
   * @param params - params to use for cloning
   */
  clone(params: BufferBindingParams) {
    const { struct, ...defaultParams } = params

    const bufferBindingCopy = new (this.constructor as typeof BufferBinding)(defaultParams)
    bufferBindingCopy.setBindings(struct)
    bufferBindingCopy.options.struct = struct

    bufferBindingCopy.arrayBufferSize = this.arrayBufferSize

    bufferBindingCopy.arrayBuffer = new ArrayBuffer(bufferBindingCopy.arrayBufferSize)
    bufferBindingCopy.arrayView = new DataView(
      bufferBindingCopy.arrayBuffer,
      0,
      bufferBindingCopy.arrayBuffer.byteLength
    )

    bufferBindingCopy.buffer.size = bufferBindingCopy.arrayBuffer.byteLength

    this.bufferElements.forEach((bufferElement: BufferArrayElement) => {
      const newBufferElement = new (bufferElement.constructor as typeof BufferArrayElement)({
        name: bufferElement.name,
        key: bufferElement.key,
        type: bufferElement.type,
        ...(bufferElement.arrayLength && {
          arrayLength: bufferElement.arrayLength,
        }),
      })

      newBufferElement.alignment = bufferElement.alignment
      if (bufferElement.arrayStride) {
        newBufferElement.arrayStride = bufferElement.arrayStride
      }

      newBufferElement.setView(bufferBindingCopy.arrayBuffer, bufferBindingCopy.arrayView)
      bufferBindingCopy.bufferElements.push(newBufferElement)
    })

    if (this.name === bufferBindingCopy.name && this.label === bufferBindingCopy.label) {
      bufferBindingCopy.wgslStructFragment = this.wgslStructFragment
      bufferBindingCopy.wgslGroupFragment = this.wgslGroupFragment
    } else {
      bufferBindingCopy.setWGSLFragment()
    }

    bufferBindingCopy.shouldUpdate = bufferBindingCopy.arrayBufferSize > 0

    return bufferBindingCopy
  }

  /**
   * Format bindings struct and set our {@link inputs}
   * @param bindings - bindings inputs
   */
  setBindings(bindings: Record<string, Input>) {
    for (const bindingKey of Object.keys(bindings)) {
      const binding = {} as BufferBindingInput

      for (const key in bindings[bindingKey]) {
        if (key !== 'value') {
          binding[key] = bindings[bindingKey][key]
        }
      }

      // binding name is the key
      binding.name = bindingKey

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
        // add binding update to _onChangeCallback
        const _onChangeCallback = binding.value._onChangeCallback

        binding.value._onChangeCallback = () => {
          if (_onChangeCallback) {
            _onChangeCallback()
          }

          binding.shouldUpdate = true
        }
      }

      this.inputs[bindingKey] = binding

      this.cacheKey += `${bindingKey},${bindings[bindingKey].type},`
    }
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
    let orderedBindings = Object.keys(this.inputs)

    const arrayBindings = orderedBindings.filter((bindingKey) => {
      return this.inputs[bindingKey].type.includes('array')
    })

    // put the array struct at the end
    if (arrayBindings.length) {
      orderedBindings.sort((bindingKeyA, bindingKeyB) => {
        // 0 if it's an array, -1 else
        const isBindingAArray = Math.min(0, this.inputs[bindingKeyA].type.indexOf('array'))
        const isBindingBArray = Math.min(0, this.inputs[bindingKeyB].type.indexOf('array'))

        return isBindingAArray - isBindingBArray
      })

      if (arrayBindings.length > 1) {
        // remove interleaved arrays from the ordered struct key array
        orderedBindings = orderedBindings.filter((bindingKey) => !arrayBindings.includes(bindingKey))
      }
    }

    // handle buffer (non interleaved) elements
    for (const bindingKey of orderedBindings) {
      const binding = this.inputs[bindingKey]

      const bufferElementOptions = {
        name: toCamelCase(binding.name ?? bindingKey),
        key: bindingKey,
        type: binding.type,
      }

      const isArray =
        binding.type.includes('array') && (Array.isArray(binding.value) || ArrayBuffer.isView(binding.value))

      this.bufferElements.push(
        isArray
          ? new BufferArrayElement({
              ...bufferElementOptions,
              arrayLength: (binding.value as number[]).length,
            })
          : new BufferElement(bufferElementOptions)
      )
    }

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

        return Math.ceil((binding.value as number[] | TypedArray).length / bufferLayout.numElements)
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

    this.buffer.size = this.arrayBuffer.byteLength

    for (const bufferElement of this.bufferElements) {
      bufferElement.setView(this.arrayBuffer, this.arrayView)
    }

    this.shouldUpdate = this.arrayBufferSize > 0
  }

  /**
   * Set the WGSL code snippet to append to the shaders code. It consists of variable (and Struct structures if needed) declarations.
   */
  setWGSLFragment() {
    if (!this.bufferElements.length) return

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
   * Set a {@link BufferBinding#shouldUpdate | binding shouldUpdate} flag to `true` to update our {@link arrayBuffer} array during next render.
   * @param bindingName - the binding name/key to update
   */
  shouldUpdateBinding(bindingName = '') {
    if (this.inputs[bindingName]) {
      this.inputs[bindingName].shouldUpdate = true
    }
  }

  /**
   * Executed at the beginning of a Material render call.
   * If any of the {@link inputs} has changed, run its onBeforeUpdate callback then updates our {@link arrayBuffer} array.
   * Also sets the {@link shouldUpdate} property to true so the {@link core/bindGroups/BindGroup.BindGroup | BindGroup} knows it will need to update the {@link GPUBuffer}.
   */
  update() {
    const inputs = Object.values(this.inputs)
    for (const binding of inputs) {
      const bufferElement = this.bufferElements.find((bufferEl) => bufferEl.key === binding.name)

      if (binding.shouldUpdate && bufferElement) {
        binding.onBeforeUpdate && binding.onBeforeUpdate()
        // we're going to directly update the arrayBuffer from the buffer element update method
        bufferElement.update(binding.value)

        this.shouldUpdate = true
        binding.shouldUpdate = false
      }
    }
  }

  /**
   * Extract the data corresponding to a specific {@link BufferElement} from a {@link Float32Array} holding the {@link BufferBinding#buffer | GPU buffer} data of this {@link BufferBinding}
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
