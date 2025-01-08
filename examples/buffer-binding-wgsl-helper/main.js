import * as monaco from 'https://cdn.jsdelivr.net/npm/monaco-editor@0.39.0/+esm'
import { BufferBinding, Vec2, Vec3, Mat3, Mat4, Quat } from '../../dist/esm/index.mjs'

window.addEventListener('load', () => {
  const defaultValue = `// a very basic binding
// you can see from the memory layout
// that you could gain some buffer space
// by inverting 'opacity' and 'position'
const binding = new BufferBinding({
  label: 'Basic binding',
  name: 'basicBinding',
  bindingType: 'uniform',
  struct: {
    opacity: {
      type: 'f32',
      value: 1,
    },
    position: {
      type: 'vec3f',
      value: new Vec3(),
    },
  },
})

// reuse the previous binding so we can have
// an array of WGSL struct as a struct member
const nestedBinding = new BufferBinding({
  label: 'Nested binding',
  name: 'nestedBinding',
  bindingType: 'uniform',
  struct: {
    count: {
      type: 'i32',
      value: 2,
    },
  },
  childrenBindings: [
    {
      binding: binding,
      count: 2,
    }
  ],
})

// a binding with an array
const bindingWithArray = new BufferBinding({
  label: 'Binding with array',
  name: 'bindingWithArray',
  bindingType: 'uniform',
  struct: {
    arrayTest: {
      type: 'array<vec3f>',
      value: new Float32Array(3 * 4),
    },
    floatValue: {
      type: 'f32',
      value: 0,
    },
  },
})

// a binding with interleaved arrays
const interleavedArrayBinding = new BufferBinding({
  label: 'Interleaved array buffer',
  name: 'interleavedArrayBuffer',
  bindingType: 'storage',
  access: 'read_write',
  struct: {
    count: {
      type: 'i32',
      value: 3,
    },
    position: {
      type: 'array<vec3f>',
      value: new Float32Array(3 * 3),
    },
    color: {
      type: 'array<vec4f>',
      value: new Float32Array(4 * 3),
    },
  },
})`

  const frame = document.querySelector('#sandboxed')
  const resultInner = document.querySelector('#result-inner')
  const processButton = document.querySelector('#process-button')

  const editor = monaco.editor.create(document.querySelector('#editor'), {
    value: defaultValue,
    language: 'javascript',
    theme: 'vs-dark',
    automaticLayout: true,
    disableTranslate3d: true,
    scrollBeyondLastLine: false,
    minimap: { enabled: false },
  })

  const processCode = (code) => {
    const regexp = new RegExp(/const\s+(\w+)\s*=\s*new BufferBinding\(\s*\{([\s\S]*?)\}\s*\)(?!\s*,)/, 'g')
    const bindingsMatch = [...code.matchAll(regexp)]

    const debugBindings = []

    window.addEventListener('message', function (e) {
      // Sandboxed iframes which lack the 'allow-same-origin'
      // header have "null" rather than a valid origin. This means you still
      // have to be careful about accepting data via the messaging API you
      // create. Check that source, and validate those inputs!
      if (e.origin === 'null' && e.data.source === 'editor' && e.source === frame.contentWindow) {
        debugBindings.push(JSON.parse(e.data.result))

        resultInner.innerHTML = ''
        debugBindings.forEach((binding) => {
          buildBindingDebugTable(binding)
        })
      }
    })

    for (const matches of bindingsMatch) {
      if (matches.length >= 3) {
        const varName = matches[1]

        const bindingArgs = matches[2]

        // Note that we're sending the message to "*", rather than some specific
        // origin. Sandboxed iframes which lack the 'allow-same-origin' header
        // don't have an origin which you can target: you'll have to send to any
        // origin, which might alow some esoteric attacks. Validate your output!
        frame.contentWindow.postMessage({ source: 'editor', name: varName, content: bindingArgs }, '*')
      }
    }
  }

  processButton.addEventListener('click', () => {
    processCode(editor.getValue())
  })

  const buildBindingDebugTable = (binding) => {
    let innerHTML = `<div class='binding'>`
    innerHTML += `<h2>${binding.label}</h2>`
    innerHTML += `<div class='binding-declaration'>`
    innerHTML += `<h3 class='byte-title'>GPU buffer memory layout</h3>`

    // BEGINNING OF TABLE
    innerHTML += `<div class='byte-diagram'>`

    let previousEndOffset = 0

    const buildRegularBufferElements = (bufferElements, baseIndex = 0) => {
      bufferElements.forEach((bindingElement, index) => {
        const { startOffset } = bindingElement
        const { numElements, size } = bindingElement.bufferLayout

        // padding before
        // now the elements themselves
        const totalNumElements = bindingElement.numElements ?? 1
        for (let i = 0; i < totalNumElements; i++) {
          const arrayStride = bindingElement.arrayStride ?? 0
          let newStartOffset = startOffset + i * arrayStride

          if (previousEndOffset < newStartOffset) {
            const offsetDiff = newStartOffset - previousEndOffset - 1
            for (let j = 0; j < offsetDiff; j += 4) {
              innerHTML += `<div class='binding-element pad-type col-span-${
                offsetDiff < 4 ? offsetDiff : 4
              } color-pad'>`
              innerHTML += `<div class='binding-element-type'>pad</div>`

              innerHTML += `<div class='binding-element-slots'>`
              for (let k = 0; k < (offsetDiff < 4 ? offsetDiff : 4); k++) {
                innerHTML += `<div class='binding-element-slot-item'></div>`
              }
              innerHTML += `</div>`

              innerHTML += `</div>`
            }
          }

          // internal pad
          let pad = 0

          for (let j = 0; j < numElements; j++) {
            if (bindingElement.bufferLayout.pad && pad >= bindingElement.bufferLayout.pad[0]) {
              innerHTML += `<div class='binding-element pad-type col-span-4 color-pad'>`
              innerHTML += `<div class='binding-element-type'>pad</div>`

              innerHTML += `<div class='binding-element-slots'>`
              for (let k = 0; k < 4; k++) {
                innerHTML += `<div class='binding-element-slot-item'></div>`
              }

              innerHTML += `</div>`

              innerHTML += `</div>`

              pad = 0
              continue
            }

            pad++

            innerHTML += `<div class='binding-element ${bindingElement.bufferLayout.type}-type col-span-${
              size < 4 ? size : 4
            } color-${(baseIndex + index) % 8}'>`

            const arrayIndex = bindingElement.numElements ? `[${i}]` : ''

            innerHTML += `<div class='binding-element-type'>${bindingElement.name}${arrayIndex}: ${bindingElement.type
              .replace('array', '')
              .replace('<', '')
              .replace('>', '')}</div>`

            innerHTML += `<div class='binding-element-slots'>`
            for (let k = 0; k < size / numElements; k++) {
              innerHTML += `<div class='binding-element-slot-item'>${bindingElement.bufferLayout.type}</div>`
            }
            innerHTML += `</div>`

            innerHTML += `</div>`
          }

          previousEndOffset = newStartOffset + (size - 1)
        }
      })
    }

    const buildInterleavedBufferElements = (interleavedBufferElements, baseIndex = 0) => {
      if (interleavedBufferElements.length) {
        const interleavedEntries = []
        for (let i = 0; i < interleavedBufferElements[0].numElements; i++) {
          interleavedBufferElements.forEach((interleavedBufferElement, index) => {
            interleavedEntries.push({
              name: interleavedBufferElement.name,
              type: interleavedBufferElement.bufferLayout.type,
              size: interleavedBufferElement.bufferLayout.size,
              numElements: interleavedBufferElement.bufferLayout.numElements,
              pad: interleavedBufferElement.bufferLayout.pad,
              startOffset: interleavedBufferElement.startOffset,
              arrayStride: interleavedBufferElement.arrayStride,
              index: baseIndex + regularBufferElements.length + index,
              loopIndex: i,
            })
          })
        }

        //console.log(interleavedEntries)

        interleavedEntries.forEach((interleavedEntry) => {
          const newStartOffset =
            interleavedEntry.startOffset + interleavedEntry.loopIndex * interleavedEntry.arrayStride

          // add empty padded slots before entry if needed
          if (previousEndOffset < newStartOffset) {
            const offsetDiff = newStartOffset - previousEndOffset - 1
            for (let j = 0; j < offsetDiff; j += 4) {
              innerHTML += `<div class='binding-element pad-type col-span-${
                offsetDiff < 4 ? offsetDiff : 4
              } color-pad'>`
              innerHTML += `<div class='binding-element-type'>pad</div>`

              innerHTML += `<div class='binding-element-slots'>`
              for (let k = 0; k < (offsetDiff < 4 ? offsetDiff : 4); k++) {
                innerHTML += `<div class='binding-element-slot-item'></div>`
              }
              innerHTML += `</div>`

              innerHTML += `</div>`
            }
          }

          let pad = 0

          for (let j = 0; j < interleavedEntry.numElements; j++) {
            if (interleavedEntry.pad && pad >= interleavedEntry.pad[0]) {
              innerHTML += `<div class='binding-element pad-type col-span-4 color-pad'>`
              innerHTML += `<div class='binding-element-type'>pad</div>`

              innerHTML += `<div class='binding-element-slots'>`
              for (let k = 0; k < 4; k++) {
                innerHTML += `<div class='binding-element-slot-item'></div>`
              }

              innerHTML += `</div>`

              innerHTML += `</div>`

              pad = 0
              continue
            }

            pad++

            innerHTML += `<div class='binding-element ${interleavedEntry.type}-type col-span-${
              interleavedEntry.size < 4 ? interleavedEntry.size : 4
            } color-${interleavedEntry.index % 8}'>`

            innerHTML += `<div class='binding-element-type'>${interleavedEntry.name}[${
              interleavedEntry.loopIndex + Math.floor(j / interleavedEntry.numElements)
            }]: ${interleavedEntry.type}</div>`

            innerHTML += `<div class='binding-element-slots'>`
            for (let k = 0; k < interleavedEntry.size / interleavedEntry.numElements; k++) {
              innerHTML += `<div class='binding-element-slot-item'>${interleavedEntry.type}</div>`
            }
            innerHTML += `</div>`

            innerHTML += `</div>`
          }

          previousEndOffset = newStartOffset + interleavedEntry.size - 1
        })
      }
    }

    const regularBufferElements = binding.bufferElements.filter((bufferElement) => !bufferElement.viewSetFunction)
    buildRegularBufferElements(regularBufferElements)

    const interleavedBufferElements = binding.bufferElements.filter((bufferElement) => !!bufferElement.viewSetFunction)
    buildInterleavedBufferElements(interleavedBufferElements)

    // now the children
    binding.childrenBindings.forEach((childBinding) => {
      const regularChildBufferElements = childBinding.bufferElements.filter(
        (bufferElement) => !bufferElement.viewSetFunction
      )

      buildRegularBufferElements(regularChildBufferElements, binding.bufferElements.length)

      const interleavedChildBufferElements = childBinding.bufferElements.filter(
        (bufferElement) => !!bufferElement.viewSetFunction
      )
      buildInterleavedBufferElements(interleavedChildBufferElements, binding.bufferElements.length)
    })

    const endPad = binding.arrayBufferSize - (previousEndOffset + 1)
    //console.log(binding.name, endPad, binding.arrayBufferSize, previousEndOffset)

    // TODO what if end pad start with a size 2? i.e. endPad % 4 !== 0
    for (let i = 0; i < endPad; i += 4) {
      innerHTML += `<div class='binding-element pad-type col-span-${endPad < 4 ? endPad : 4} color-pad'>`
      innerHTML += `<div class='binding-element-type'>pad</div>`

      innerHTML += `<div class='binding-element-slots'>`
      for (let j = 0; j < 4; j++) {
        innerHTML += `<div class='binding-element-slot-item'></div>`
      }
      innerHTML += `</div>`

      innerHTML += `</div>`
    }
    //}

    // END OF TABLE
    innerHTML += `</div>`

    // WGSL CODE PRODUCED
    innerHTML += `<div class='wgsl'>`
    innerHTML += `<h3 class='wgsl-title'>WGSL code produced</h3>`
    innerHTML += `<div class='wgsl-declaration'>`
    innerHTML += `<div class='wgsl-declaration-struct'><code><pre>${binding.wgslStructFragment
      .replaceAll('<', '&lt;')
      .replaceAll(
        '>',
        '&gt;'
      )}</pre></code></div><div class='wgsl-declaration-var'><code><pre>${binding.wgslGroupFragment
      .map((fragment) => {
        return fragment.replaceAll('<', '&lt;').replaceAll('>', '&gt;')
      })
      .join('\n')}</pre></code></div></div>`

    innerHTML += `</div>`
    innerHTML += `</div>`
    innerHTML += `</div>`

    resultInner.insertAdjacentHTML('beforeend', innerHTML)
  }

  processCode(editor.getValue())
})
