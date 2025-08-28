import { Binding, BindingParams, BufferBindingMemoryAccessType, BufferBindingType } from './Binding'
import {
  getBindGroupLayoutBindingType,
  getBindingWGSLVarType,
  getBufferLayout,
  TypedArray,
  TypedArrayConstructor,
} from './utils'
import { throwWarning, toCamelCase, toKebabCase } from '../../utils/utils'
import { Vec2 } from '../../math/Vec2'
import { Vec3 } from '../../math/Vec3'
import { Input, InputBase, InputValue } from '../../types/BindGroups'
import { BufferElement, bytesPerRow } from './bufferElements/BufferElement'
import { BufferArrayElement } from './bufferElements/BufferArrayElement'
import { BufferInterleavedArrayElement } from './bufferElements/BufferInterleavedArrayElement'
import { Buffer, BufferParams } from '../buffers/Buffer'
import { WritableBufferBinding, WritableBufferBindingParams } from './WritableBufferBinding'
import { Mat3 } from '../../math/Mat3'
import { Mat4 } from '../../math/Mat4'
import { Quat } from '../../math/Quat'

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

/** Define a {@link BufferBinding} children binding entry parameters. Used to build complex WGSL `Struct` containing `Struct` children. */
export interface BufferBindingChildrenBinding {
  /** The {@link BufferBinding} to use. */
  binding: BufferBinding
  /** The number of times to use this {@link binding}. If it is greater than `1`, the {@link binding} will be cloned with new arrays to use for values. */
  count?: number
  /** Whether to force this `Struct` element to be defined as an array, even if {@link count} is lower or equal to `1`. Useful when a `Struct` element absolutely needs to be iterable. */
  forceArray?: boolean
}

/**
 * Parameters used to create a {@link BufferBinding}
 */
export interface BufferBindingParams extends BindingParams, BufferBindingBaseParams {
  /** The binding type of the {@link BufferBinding} */
  bindingType?: BufferBindingType

  /** Optional array of {@link BufferBindingChildrenBinding} to add to this {@link BufferBinding} to create complex `Struct` objects containing `Struct` {@link BufferBinding} children. */
  childrenBindings?: BufferBindingChildrenBinding[]

  /** The minimum {@link GPUDevice} buffer offset alignment. */
  minOffset?: number
  /** Optional offset of the {@link BufferBinding} in the {@link BufferBinding#parent | parent BufferBinding} (as an index - not in bytes). */
  offset?: number

  /** The optional parent {@link BufferBinding} that will actually handle the {@link GPUBuffer}. */
  parent?: BufferBinding

  /** Optional already existing {@link Buffer} to use instead of creating a new one. Allow to reuse an already created {@link Buffer} but with different read or visibility values, or with a different WGSL struct. */
  buffer?: Buffer
}

/** All allowed {@link BufferElement | buffer elements} */
export type AllowedBufferElement = BufferElement | BufferArrayElement | BufferInterleavedArrayElement

/** Possible data view set function to use with a {@link DataView} based on the data type. */
export type DataViewSetFunction =
  | DataView['setInt32']
  | DataView['setUint16']
  | DataView['setUint32']
  | DataView['setFloat32']

/**
 * Used to format {@link BufferBindingParams#struct | uniforms or storages struct inputs} and create a single typed array that will hold all those inputs values. The array needs to be correctly padded depending on every value type, so it can be safely used as a GPUBuffer input.
 *
 * It will also create WGSL Structs and variables according to the {@link BufferBinding} inputs parameters.
 *
 * The WGSL structs and variables declaration may vary based on the input types, especially if there's one or more arrays involved (i.e. `array<f32>`, `array<vec3f>` etc.).
 *
 * It is possible to create complex WGSL structs with children structs by using the {@link BufferBindingParams#childrenBindings | childrenBindings} parameter.
 *
 * There's a helper tool to help you understand and debug your {@link BufferBinding} WGSL declaration: [BufferBinding WGSL generation helper](https://martinlaxenaire.github.io/gpu-curtains/examples/buffer-binding-wgsl-helper/)
 *
 * A {@link BufferBinding} can also have a {@link parent | parent BufferBinding}, in which case it won't create a GPUBuffer but use its parent GPUBuffer at the right offset. Useful to create a unique {@link BufferBinding} with a single GPUBuffer to handle multiple {@link BufferBinding} and update them with a single `writeBuffer` call.
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

  /** Array of children {@link BufferBinding} used as struct children. */
  childrenBindings: BufferBinding[]

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

  /** @ignore */
  #parent: BufferBinding | null

  /** {@link DataView} inside the {@link arrayBuffer | parent arrayBuffer} if set. */
  parentView: DataView | null

  /** Array of {@link AllowedBufferElement | bufferElements} and according {@link DataViewSetFunction | view set functions} to use if the {@link parent} is set. */
  parentViewSetBufferEls: Array<{
    /** Corresponding {@link AllowedBufferElement | bufferElement}. */
    bufferElement: AllowedBufferElement
    /** Corresponding {@link DataViewSetFunction | view set function}. */
    viewSetFunction: DataViewSetFunction
  }> | null

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
    childrenBindings = [],
    buffer = null,
    parent = null,
    minOffset = 256,
    offset = 0,
  }: BufferBindingParams) {
    bindingType = bindingType ?? 'uniform'

    super({ label, name, bindingType, visibility })

    this.options = {
      ...this.options,
      useStruct,
      access,
      usage,
      struct,
      childrenBindings,
      buffer,
      parent,
      minOffset,
      offset,
    }

    this.cacheKey += `${useStruct},${access},`

    this.arrayBufferSize = 0

    this.shouldUpdate = false
    this.useStruct = useStruct

    this.bufferElements = []
    this.inputs = {}

    this.buffer = this.options.buffer ?? new Buffer()

    if (Object.keys(struct).length) {
      this.setBindings(struct)
      this.setInputsAlignment()
    }

    this.setChildrenBindings(childrenBindings)

    if (Object.keys(struct).length || this.childrenBindings.length) {
      this.setBufferAttributes()
      this.setWGSLFragment()
    }

    // parent
    this.parent = parent
  }

  /**
   * Clone a {@link BufferBindingParams#struct | struct object} width new default values.
   * @param struct - New cloned struct object.
   */
  static cloneStruct(struct: Record<string, Input>): Record<string, Input> {
    return Object.keys(struct).reduce((acc, bindingKey) => {
      const binding = struct[bindingKey]

      let value: InputValue

      if (Array.isArray(binding.value) || ArrayBuffer.isView(binding.value)) {
        value = new (<ArrayConstructor | TypedArrayConstructor>binding.value.constructor)(binding.value.length)
      } else if (typeof binding.value === 'number') {
        value = 0
      } else {
        value = new (<typeof Vec2 | typeof Vec3 | typeof Mat3 | typeof Mat4 | typeof Quat>binding.value.constructor)()
      }

      return {
        ...acc,
        [bindingKey]: {
          type: binding.type,
          value,
        },
      }
    }, {})
  }

  /**
   * Get the {@link BufferBinding} parent if any.
   * @readonly
   * @returns - The {@link BufferBinding} parent if any.
   */
  get parent(): BufferBinding {
    return this.#parent
  }

  /**
   * Set the new {@link BufferBinding} parent.
   * @param value - New {@link BufferBinding} parent to set if any.
   */
  set parent(value: BufferBinding | null) {
    if (!!value) {
      this.parentView = new DataView(value.arrayBuffer, this.offset, this.getMinOffsetSize(this.arrayBufferSize))

      // get all buffer elements recursively
      const getAllBufferElements = (binding) => {
        const getBufferElements = (binding) => {
          return binding.bufferElements
        }

        return [
          ...getBufferElements(binding),
          binding.childrenBindings.map((child) => getAllBufferElements(child)).flat(),
        ].flat()
      }

      const bufferElements = getAllBufferElements(this)

      this.parentViewSetBufferEls = bufferElements.map((bufferElement) => {
        switch (bufferElement.bufferLayout.View) {
          case Int32Array:
            return {
              bufferElement,
              viewSetFunction: this.parentView.setInt32.bind(this.parentView) as DataView['setInt32'],
            }
          case Uint16Array:
            return {
              bufferElement,
              viewSetFunction: this.parentView.setUint16.bind(this.parentView) as DataView['setUint16'],
            }
          case Uint32Array:
            return {
              bufferElement,
              viewSetFunction: this.parentView.setUint32.bind(this.parentView) as DataView['setUint32'],
            }
          case Float32Array:
          default:
            return {
              bufferElement,
              viewSetFunction: this.parentView.setFloat32.bind(this.parentView) as DataView['setFloat32'],
            }
        }
      })

      if (!this.parent && this.buffer.GPUBuffer && !this.options.buffer) {
        // if it has a GPU Buffer but no parent yet, destroy the buffer
        this.buffer.destroy()
      }
    } else {
      this.parentView = null
      this.parentViewSetBufferEls = null
    }

    this.#parent = value
  }

  /**
   * Round the given size value to the nearest minimum {@link GPUDevice} buffer offset alignment.
   * @param value - Size to round.
   */
  getMinOffsetSize(value: number): number {
    return Math.ceil(value / this.options.minOffset) * this.options.minOffset
  }

  /**
   * Get this {@link BufferBinding} offset in bytes inside the {@link arrayBuffer | parent arrayBuffer}.
   * @readonly
   * @returns - The offset in bytes inside the {@link arrayBuffer | parent arrayBuffer}
   */
  get offset(): number {
    return this.getMinOffsetSize(this.options.offset * this.getMinOffsetSize(this.arrayBufferSize))
  }

  /**
   * Get {@link GPUDevice.createBindGroupLayout().descriptor.entries.resource | GPUBindGroupLayout entry resource}.
   * @readonly
   */
  get resourceLayout(): {
    /** {@link GPUBindGroupLayout | bind group layout} resource */
    buffer: GPUBufferBindingLayout
    /** Offset in bytes in the {@link parent} buffer if set. */
    offset?: number
    /** Size in bytes in the {@link parent} buffer if set. */
    size?: number
  } {
    return {
      buffer: {
        type: getBindGroupLayoutBindingType(this),
      },
      ...(this.parent && { offset: this.offset, size: this.arrayBufferSize }),
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
   * Get {@link GPUDevice.createBindGroup().descriptor.entries.resource | GPUBindGroup entry resource}.
   * @readonly
   */
  get resource(): {
    /** {@link GPUBindGroup | bind group} resource */
    buffer: GPUBuffer | null
    /** Offset in bytes in the {@link parent} buffer if set. */
    offset?: number
    /** Size in bytes in the {@link parent} buffer if set. */
    size?: number
  } {
    return {
      buffer: this.parent ? this.parent.buffer.GPUBuffer : this.buffer.GPUBuffer,
      ...(this.parent && { offset: this.offset, size: this.arrayBufferSize }),
    }
  }

  /**
   * Clone this {@link BufferBinding} into a new one. Allows to skip buffer layout alignment computations.
   * @param params - params to use for cloning
   */
  clone(params = {} as BufferBindingParams | WritableBufferBindingParams): BufferBinding | WritableBufferBinding {
    let { struct, childrenBindings, parent, ...defaultParams } = params

    // patch default params with this buffer bindings options
    const { label, name, bindingType, visibility, useStruct, access, usage } = this.options
    defaultParams = { ...{ label, name, bindingType, visibility, useStruct, access, usage }, ...defaultParams }

    // create an empty shell
    const bufferBindingCopy = new (<typeof BufferBinding | typeof WritableBufferBinding>this.constructor)(defaultParams)

    // create the reactive structs
    struct = struct || BufferBinding.cloneStruct(this.options.struct)
    bufferBindingCopy.options.struct = struct
    bufferBindingCopy.setBindings(struct)

    // set the array buffer, view and buffer sizes
    bufferBindingCopy.arrayBufferSize = this.arrayBufferSize

    bufferBindingCopy.arrayBuffer = new ArrayBuffer(bufferBindingCopy.arrayBufferSize)
    bufferBindingCopy.arrayView = new DataView(
      bufferBindingCopy.arrayBuffer,
      0,
      bufferBindingCopy.arrayBuffer.byteLength
    )

    if (!bufferBindingCopy.options.buffer) {
      bufferBindingCopy.buffer.size = bufferBindingCopy.arrayBuffer.byteLength
    }

    // now set the buffer elements alignment from this buffer binding
    this.bufferElements.forEach((bufferElement: BufferArrayElement) => {
      const newBufferElement = new (<typeof BufferArrayElement>bufferElement.constructor)({
        name: bufferElement.name,
        key: bufferElement.key,
        type: bufferElement.type,
        ...(bufferElement.arrayLength && {
          arrayLength: bufferElement.arrayLength,
        }),
      })

      newBufferElement.alignment = JSON.parse(JSON.stringify(bufferElement.alignment))
      if (bufferElement.arrayStride) {
        newBufferElement.arrayStride = bufferElement.arrayStride
      }

      newBufferElement.setView(bufferBindingCopy.arrayBuffer, bufferBindingCopy.arrayView)
      bufferBindingCopy.bufferElements.push(newBufferElement)
    })

    // children bindings
    if (this.options.childrenBindings) {
      bufferBindingCopy.options.childrenBindings = this.options.childrenBindings

      // cache key
      bufferBindingCopy.options.childrenBindings.forEach((child) => {
        const count = child.count ? Math.max(1, child.count) : 1
        bufferBindingCopy.cacheKey += `child(count:${count}):${child.binding.cacheKey}`
      })

      // clone children bindings structs
      bufferBindingCopy.options.childrenBindings.forEach((child) => {
        bufferBindingCopy.childrenBindings = [
          ...bufferBindingCopy.childrenBindings,
          Array.from(Array(Math.max(1, child.count || 1)).keys()).map((i) => {
            return child.binding.clone({
              ...child.binding.options,
              // clone struct with new arrays
              struct: BufferBinding.cloneStruct(child.binding.options.struct),
            })
          }),
        ].flat()
      })

      // set children bindings alignments and data views
      bufferBindingCopy.childrenBindings.forEach((binding, index) => {
        let offset = this.arrayView.byteLength

        for (let i = 0; i < index; i++) {
          offset += this.childrenBindings[i].arrayBuffer.byteLength
        }

        binding.bufferElements.forEach((bufferElement, i) => {
          bufferElement.alignment.start.row = this.childrenBindings[index].bufferElements[i].alignment.start.row
          bufferElement.alignment.end.row = this.childrenBindings[index].bufferElements[i].alignment.end.row
        })

        binding.arrayView = new DataView(bufferBindingCopy.arrayBuffer, offset, binding.arrayBuffer.byteLength)

        for (const bufferElement of binding.bufferElements) {
          bufferElement.setView(bufferBindingCopy.arrayBuffer, binding.arrayView)
        }
      })
    }

    // create WGSL fragment
    bufferBindingCopy.setWGSLFragment()

    if (parent) {
      bufferBindingCopy.parent = parent
    }

    // update
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
   * Set this {@link BufferBinding} optional {@link BufferBinding.childrenBindings | childrenBindings}.
   * @param childrenBindings - Array of {@link BufferBindingChildrenBinding} to use as {@link BufferBinding.childrenBindings | childrenBindings}.
   */
  setChildrenBindings(childrenBindings: BufferBindingChildrenBinding[]) {
    this.childrenBindings = []

    if (childrenBindings && childrenBindings.length) {
      const childrenArray = []
      childrenBindings
        .sort((a, b) => {
          // put the children bindings array in the end
          const countA = a.count ? Math.max(a.count) : a.forceArray ? 1 : 0
          const countB = b.count ? Math.max(b.count) : b.forceArray ? 1 : 0
          return countA - countB
        })
        .forEach((child) => {
          if ((child.count && child.count > 1) || child.forceArray) {
            childrenArray.push(child.binding)
          }
        })

      if (childrenArray.length > 1) {
        // remove first array element because we are going to keep it
        childrenArray.shift()

        throwWarning(
          `BufferBinding: "${
            this.label
          }" contains multiple children bindings arrays. These children bindings cannot be added to the BufferBinding: "${childrenArray
            .map((child) => child.label)
            .join(', ')}"`
        )

        childrenArray.forEach((removedChildBinding) => {
          childrenBindings = childrenBindings.filter((child) => child.binding.name !== removedChildBinding.name)
        })
      }

      // update options
      this.options.childrenBindings = childrenBindings

      childrenBindings.forEach((child) => {
        const count = child.count ? Math.max(1, child.count) : 1

        this.cacheKey += `child(count:${count}):${child.binding.cacheKey}`

        // clone them with fresh arrays
        this.childrenBindings = [
          ...this.childrenBindings,
          Array.from(Array(count).keys()).map((i) => {
            return child.binding.clone({
              ...child.binding.options,
              // clone struct with new arrays
              struct: BufferBinding.cloneStruct(child.binding.options.struct),
            })
          }),
        ].flat()
      })
    }
  }

  /**
   * Set the buffer alignments from {@link inputs}.
   */
  setInputsAlignment() {
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

        const bufferLayout = getBufferLayout(BufferElement.getBaseType(binding.type))

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
            type: BufferElement.getType(binding.type),
          })
        })

        // set temp buffer alignments as if it was regular buffer elements
        tempBufferElements.forEach((bufferElement, index) => {
          if (index === 0) {
            if (this.bufferElements.length) {
              // if we already have buffer elements
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
          bufferElement.setAlignment(
            tempBufferElements[index].startOffset,
            Math.ceil(totalStride / bytesPerRow) * bytesPerRow
          )
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
  }

  /**
   * Set our buffer attributes:
   * Takes all the {@link inputs} and adds them to the {@link bufferElements} array with the correct start and end offsets (padded), then fill our {@link arrayBuffer} typed array accordingly.
   */
  setBufferAttributes() {
    const bufferElementsArrayBufferSize = this.bufferElements.length
      ? this.bufferElements[this.bufferElements.length - 1].paddedByteCount
      : 0

    this.arrayBufferSize = bufferElementsArrayBufferSize

    this.childrenBindings.forEach((binding) => {
      this.arrayBufferSize += binding.arrayBufferSize
    })

    this.arrayBuffer = new ArrayBuffer(this.arrayBufferSize)
    this.arrayView = new DataView(this.arrayBuffer, 0, bufferElementsArrayBufferSize)

    this.childrenBindings.forEach((binding, index) => {
      let offset = bufferElementsArrayBufferSize

      for (let i = 0; i < index; i++) {
        offset += this.childrenBindings[i].arrayBuffer.byteLength
      }

      const bufferElLastRow = this.bufferElements.length
        ? this.bufferElements[this.bufferElements.length - 1].alignment.end.row + 1
        : 0

      const bindingLastRow =
        index > 0
          ? this.childrenBindings[index - 1].bufferElements.length
            ? this.childrenBindings[index - 1].bufferElements[
                this.childrenBindings[index - 1].bufferElements.length - 1
              ].alignment.end.row + 1
            : 0
          : 0

      binding.bufferElements.forEach((bufferElement) => {
        const rowOffset = index === 0 ? bufferElLastRow + bindingLastRow : bindingLastRow
        bufferElement.alignment.start.row += rowOffset
        bufferElement.alignment.end.row += rowOffset
      })

      binding.arrayView = new DataView(this.arrayBuffer, offset, binding.arrayBuffer.byteLength)

      for (const bufferElement of binding.bufferElements) {
        bufferElement.setView(this.arrayBuffer, binding.arrayView)
      }
    })

    if (!this.options.buffer) {
      this.buffer.size = this.arrayBuffer.byteLength
    }

    for (const bufferElement of this.bufferElements) {
      bufferElement.setView(this.arrayBuffer, this.arrayView)
    }

    this.shouldUpdate = this.arrayBufferSize > 0
  }

  /**
   * Set the WGSL code snippet to append to the shaders code. It consists of variable (and Struct structures if needed) declarations.
   */
  setWGSLFragment() {
    if (!this.bufferElements.length && !this.childrenBindings.length) return

    const kebabCaseLabel = toKebabCase(this.label)

    if (this.useStruct) {
      const structs = {}

      structs[kebabCaseLabel] = {}

      const bufferElements = this.bufferElements.filter(
        (bufferElement) => !(bufferElement instanceof BufferInterleavedArrayElement)
      )
      const interleavedBufferElements = this.bufferElements.filter(
        (bufferElement) => bufferElement instanceof BufferInterleavedArrayElement
      ) as BufferInterleavedArrayElement[]

      if (interleavedBufferElements.length) {
        const arrayLength = this.bindingType === 'uniform' ? `, ${interleavedBufferElements[0].numElements}` : ''

        if (bufferElements.length) {
          structs[`${kebabCaseLabel}Element`] = {}

          interleavedBufferElements.forEach((binding) => {
            structs[`${kebabCaseLabel}Element`][binding.name] = BufferElement.getType(binding.type)
          })

          bufferElements.forEach((binding) => {
            structs[kebabCaseLabel][binding.name] = binding.type
          })

          const interleavedBufferName = this.bufferElements.find((bufferElement) => bufferElement.name === 'elements')
            ? `${this.name}Elements`
            : 'elements'

          structs[kebabCaseLabel][interleavedBufferName] = `array<${kebabCaseLabel}Element${arrayLength}>`

          const varType = getBindingWGSLVarType(this)
          this.wgslGroupFragment = [`${varType} ${this.name}: ${kebabCaseLabel};`]
        } else {
          this.bufferElements.forEach((binding) => {
            structs[kebabCaseLabel][binding.name] = BufferElement.getType(binding.type)
          })

          const varType = getBindingWGSLVarType(this)
          this.wgslGroupFragment = [`${varType} ${this.name}: array<${kebabCaseLabel}${arrayLength}>;`]
        }
      } else {
        bufferElements.forEach((binding) => {
          const bindingType =
            this.bindingType === 'uniform' && 'numElements' in binding
              ? `array<${BufferElement.getType(binding.type)}, ${binding.numElements}>`
              : binding.type

          structs[kebabCaseLabel][binding.name] = bindingType
        })

        const varType = getBindingWGSLVarType(this)
        this.wgslGroupFragment = [`${varType} ${this.name}: ${kebabCaseLabel};`]
      }

      if (this.childrenBindings.length) {
        this.options.childrenBindings.forEach((child) => {
          structs[kebabCaseLabel][child.binding.name] =
            (child.count && child.count > 1) || child.forceArray
              ? this.bindingType === 'uniform' && child.binding.bindingType === 'uniform'
                ? `array<${toKebabCase(child.binding.label)}, ${child.count}>`
                : `array<${toKebabCase(child.binding.label)}>`
              : toKebabCase(child.binding.label)
        })
      }

      const additionalBindings = this.childrenBindings.length
        ? this.options.childrenBindings.map((child) => child.binding.wgslStructFragment).join('\n\n') + '\n\n'
        : ''

      this.wgslStructFragment =
        additionalBindings +
        Object.keys(structs)
          .reverse()
          .map((struct) => {
            return `struct ${struct} {\n  ${Object.keys(structs[struct])
              .map((binding) => `${binding}: ${structs[struct][binding]}`)
              .join(',\n  ')}\n};`
          })
          .join('\n\n')
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
   * If any of the {@link inputs} has changed, run its `onBeforeUpdate` callback then updates our {@link arrayBuffer} array.
   * Also sets the {@link shouldUpdate} property to true so the {@link core/bindGroups/BindGroup.BindGroup | BindGroup} knows it will need to update the {@link GPUBuffer}.
   */
  update() {
    // if we're using an external buffer, bail
    // because we don't want to update it
    if (this.options.buffer) {
      this.shouldUpdate = false
      return
    }

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

    this.childrenBindings.forEach((binding) => {
      binding.update()
      if (binding.shouldUpdate) {
        this.shouldUpdate = true
      }

      binding.shouldUpdate = false
    })

    if (this.shouldUpdate && this.parent && this.parentViewSetBufferEls) {
      let index = 0

      this.parentViewSetBufferEls.forEach((viewSetBuffer, i) => {
        const { bufferElement, viewSetFunction } = viewSetBuffer
        bufferElement.view.forEach((value) => {
          viewSetFunction(index * bufferElement.view.BYTES_PER_ELEMENT, value, true)
          index++
        })
      })

      this.parent.shouldUpdate = true

      // reset the should update flag
      // this binding GPU buffer is not going to be used anyway
      this.shouldUpdate = false
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
