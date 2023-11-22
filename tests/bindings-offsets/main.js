window.addEventListener('DOMContentLoaded', async () => {
  // set up our WebGL context and append the canvas to our wrapper
  const gpuCurtains = new GPUCurtains.GPUCurtains({
    container: 'canvas',
    watchScroll: false, // no need to listen for the scroll in this example
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
  })

  await gpuCurtains.setRendererContext()

  const debugBindings = []
  //debugBindings.push(gpuCurtains.renderer.cameraBufferBinding)

  // ref: https://webgpufundamentals.org/webgpu/lessons/resources/wgsl-offset-computer.html#x=5d00000100f901000000000000003d8888623728a306fc320e1a9ba57547078694a9be9f86fca01fc2b96183b8019b42979f89b724d75b16a7d0ba5f05e1688c08377f9adcadac8b118c715ae49684657cbf39131e36661070f3c12b655a42f158e5add7714dbd4729a3973fef2edfb03e8759dabdeb5279ff2f0b45d47fb70575af8b3a734abecbf3ecdca99f3367a2d772ceb3b4659a28504ff11321f7227e9e5358ffdbc75a65573125707e74c84e6410a1b32e84d64e7b89923cf185c66e31f16e5489b838fb930f42f15dbbeeca544be7372401b7e7efb8288be7dc18cc48ba6edd18f2e1cc64d805f7862962ad3cd91a5a7b13ca157c51e17f8dcfe8c87398a0eabf62e1f623c49ec6ec8e7e598dc6b6d5a3ffbe2396d3

  const binding1 = new GPUCurtains.BufferBinding({
    label: 'Test1',
    name: 'test1',
    bindingType: 'uniform',
    bindings: {
      pointerSize: {
        type: 'f32',
        value: 0.85, // 1 is full plane
      },
      pointerPosition: {
        type: 'vec2f',
        value: new GPUCurtains.Vec2(Infinity),
      },
      pointerVelocity: {
        type: 'vec2f',
        value: new GPUCurtains.Vec2(0), // pointer velocity divided by plane size
      },
      pointerStrength: {
        type: 'f32',
        value: 250,
      },
      wind: {
        type: 'vec3f',
        value: new GPUCurtains.Vec3(0, 0, 0),
      },
    },
  })

  debugBindings.push(binding1)

  const binding2 = new GPUCurtains.BufferBinding({
    label: 'Test2',
    name: 'test2',
    bindingType: 'uniform',
    bindings: {
      deltaTime: {
        type: 'f32',
        value: 0,
      },
      gravity: {
        type: 'vec3f',
        value: new GPUCurtains.Vec3(),
      },
      mass: {
        type: 'f32',
        value: 0,
      },
      dampingConstant: {
        type: 'f32',
        value: 0,
      },
      hop: {
        type: 'f16',
        value: 0,
      },
      test: {
        type: 'f32',
        value: 0,
      },

      otherVec3f: {
        type: 'vec3f',
        value: new GPUCurtains.Vec3(),
      },
    },
  })

  debugBindings.push(binding2)

  const arrayTest = new GPUCurtains.BufferBinding({
    label: 'Array test',
    name: 'arrayTest',
    bindingType: 'uniform',
    bindings: {
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

  debugBindings.push(arrayTest)

  const binding3 = new GPUCurtains.BufferBinding({
    label: 'Simple interleaved array buffer',
    name: 'simpleInterleavedArrayBuffer',
    bindingType: 'uniform',
    bindings: {
      position: {
        type: 'array<vec3f>',
        value: new Float32Array(3 * 5),
      },
      normal: {
        type: 'array<vec4f>',
        value: new Float32Array(4 * 5),
      },
    },
  })

  debugBindings.push(binding3)

  const binding4 = new GPUCurtains.BufferBinding({
    label: 'Complex interleaved array buffer',
    name: 'complexInterleavedArrayBuffer',
    bindingType: 'uniform',
    bindings: {
      testFloat: {
        type: 'f32',
        value: 0,
      },
      position: {
        type: 'array<vec3f>',
        value: new Float32Array(3 * 5),
      },
      normal: {
        type: 'array<vec4f>',
        value: new Float32Array(4 * 5),
      },
    },
  })

  debugBindings.push(binding4)

  const buildBindingDebugTable = (binding) => {
    let innerHTML = `<div class='binding'>`
    innerHTML += `<h2>${binding.label}</h2>`
    innerHTML += `<div class='binding-declaration'>`

    // BEGINNING OF TABLE
    innerHTML += `<div class='byte-diagram'>`

    let previousEndOffset = 0

    const regularBufferElements = binding.bufferElements.filter((bufferElement) => !bufferElement.interleavedAlignment)

    regularBufferElements.forEach((bindingElement, index) => {
      const { startOffset, entries } = bindingElement.alignment
      const { numElements, size } = bindingElement.bufferLayout

      for (let i = 0; i < entries.length; i++) {
        const entryStartOffset =
          i > 0
            ? entries[i].row.start * 4 + // slots per row
              entries[i].slot.start / 4 // bytes per slots
            : startOffset

        // add empty padded slots before entry if needed
        if (previousEndOffset < entryStartOffset * 4) {
          const offsetDiff = entryStartOffset * 4 - previousEndOffset
          for (let j = 0; j < offsetDiff; j += 4) {
            innerHTML += `<div class='binding-element pad-type col-span-${offsetDiff < 4 ? offsetDiff : 4} color-pad'>`
            innerHTML += `<div class='binding-element-type'>pad</div>`

            innerHTML += `<div class='binding-element-slots'>`
            for (let k = 0; k < (offsetDiff < 4 ? offsetDiff : 4); k++) {
              innerHTML += `<div class='binding-element-slot-item'></div>`
            }
            innerHTML += `</div>`

            innerHTML += `</div>`
          }
        }

        for (let j = 0; j < numElements; j++) {
          innerHTML += `<div class='binding-element ${bindingElement.bufferLayout.type}-type col-span-${
            size < 4 ? size : 4
          } color-${index % 8}'>`

          const arrayIndex = entries.length === 1 ? '' : `[${i}]`

          innerHTML += `<div class='binding-element-type'>${bindingElement.name}${arrayIndex}: ${bindingElement.type}</div>`

          innerHTML += `<div class='binding-element-slots'>`
          for (let k = 0; k < size / numElements; k++) {
            innerHTML += `<div class='binding-element-slot-item'>${bindingElement.bufferLayout.type}</div>`
          }
          innerHTML += `</div>`

          innerHTML += `</div>`
        }

        previousEndOffset = entryStartOffset * 4 + size
      }

      //previousEndOffset = startOffset * 4 + size * entries.length
    })

    const interleavedBufferElements = binding.bufferElements.filter(
      (bufferElement) => !!bufferElement.interleavedAlignment
    )

    if (interleavedBufferElements.length) {
      const interleavedEntries = []
      for (let i = 0; i < interleavedBufferElements[0].interleavedAlignment.entries.length; i++) {
        interleavedBufferElements.forEach((interleavedBufferElement, index) => {
          interleavedEntries.push({
            name: interleavedBufferElement.name,
            type: interleavedBufferElement.bufferLayout.type,
            size: interleavedBufferElement.bufferLayout.size,
            numElements: interleavedBufferElement.bufferLayout.numElements,
            entries: [interleavedBufferElement.interleavedAlignment.entries[i]],
            index: regularBufferElements.length + index,
            loopIndex: i,
          })
        })
      }

      console.log(interleavedEntries)

      interleavedEntries.forEach((interleavedEntry) => {
        const entryStartOffset =
          interleavedEntry.entries[0].row.start * 4 + // slots per row
          interleavedEntry.entries[0].slot.start / 4 // bytes per slots

        // add empty padded slots before entry if needed
        if (previousEndOffset < entryStartOffset * 4) {
          const offsetDiff = entryStartOffset * 4 - previousEndOffset
          for (let j = 0; j < offsetDiff; j += 4) {
            innerHTML += `<div class='binding-element pad-type col-span-${offsetDiff < 4 ? offsetDiff : 4} color-pad'>`
            innerHTML += `<div class='binding-element-type'>pad</div>`

            innerHTML += `<div class='binding-element-slots'>`
            for (let k = 0; k < (offsetDiff < 4 ? offsetDiff : 4); k++) {
              innerHTML += `<div class='binding-element-slot-item'></div>`
            }
            innerHTML += `</div>`

            innerHTML += `</div>`
          }
        }

        for (let j = 0; j < interleavedEntry.numElements; j++) {
          innerHTML += `<div class='binding-element ${interleavedEntry.type}-type col-span-${
            interleavedEntry.size < 4 ? interleavedEntry.size : 4
          } color-${interleavedEntry.index % 8}'>`

          innerHTML += `<div class='binding-element-type'>${interleavedEntry.name}[${
            interleavedEntry.loopIndex * interleavedEntry.numElements + j
          }]: ${interleavedEntry.type}</div>`

          innerHTML += `<div class='binding-element-slots'>`
          for (let k = 0; k < interleavedEntry.size / interleavedEntry.numElements; k++) {
            innerHTML += `<div class='binding-element-slot-item'>${interleavedEntry.type}</div>`
          }
          innerHTML += `</div>`

          innerHTML += `</div>`
        }

        previousEndOffset = entryStartOffset * 4 + interleavedEntry.size
      })
    }

    const endPad = binding.arrayBufferSize - previousEndOffset

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

    document.querySelector('#page').insertAdjacentHTML('beforeend', innerHTML)
  }

  // const buildBindingDebugTable = (binding) => {
  //   let innerHTML = `<div class='binding'>`
  //   innerHTML += `<h2>${binding.label}</h2>`
  //   innerHTML += `<div class='binding-declaration'>`
  //
  //   innerHTML += `<div class='byte-diagram'>`
  //
  //   const useInterleavedArray = !Object.keys(binding.bindings).find(
  //     (bindingKey) => binding.bindings[bindingKey].type.indexOf('array') === -1
  //   )
  //
  //   if (useInterleavedArray) {
  //     const arraySize = binding.bindingElements[0].array.length / 4 // 4 slots per row
  //     for (let i = 0; i < arraySize; i++) {
  //       binding.bindingElements.forEach((bindingElement, index) => {
  //         const { size, numElements } = bindingElement.alignment
  //
  //         innerHTML += `<div class='binding-element ${bindingElement.bufferLayout.type}-type col-span-${
  //           size > 16 ? 16 : size
  //         } color-${index % 4} col-start-${bindingElement.alignment.slot.start + 1}'>
  //       <div class='binding-element-type'>${bindingElement.name}: ${
  //           bindingElement.type
  //         }</div><div class='binding-element-slots'>`
  //
  //         for (let j = 0; j < numElements / arraySize; j++) {
  //           const newRow = j % 4 === 0 && j !== 0
  //           if (newRow) {
  //             innerHTML += '</div>'
  //             innerHTML += '</div>'
  //             innerHTML += `<div class='binding-element ${bindingElement.bufferLayout.type}-type col-span-16 color-${
  //               index % 4
  //             } col-start-${bindingElement.alignment.slot.start + 1}'>
  //       <div class='binding-element-type'>${bindingElement.name}: ${
  //               bindingElement.type
  //             }</div><div class='binding-element-slots'>`
  //           }
  //
  //           innerHTML += `<div class='binding-element-slot'>${bindingElement.bufferLayout.type}</div>`
  //         }
  //
  //         innerHTML += '</div>'
  //         innerHTML += '</div>'
  //       })
  //     }
  //   } else {
  //     binding.bindingElements.forEach((bindingElement, index) => {
  //       const { size, numElements } = bindingElement.alignment
  //
  //       innerHTML += `<div class='binding-element ${bindingElement.bufferLayout.type}-type col-span-${
  //         size > 16 ? 16 : size
  //       } color-${index % 4} col-start-${bindingElement.alignment.slot.start + 1}'>
  //       <div class='binding-element-type'>${bindingElement.name}: ${
  //         bindingElement.type
  //       }</div><div class='binding-element-slots'>`
  //
  //       for (let j = 0; j < numElements; j++) {
  //         const newRow = j % 4 === 0 && j !== 0
  //         if (newRow) {
  //           innerHTML += '</div>'
  //           innerHTML += '</div>'
  //           innerHTML += `<div class='binding-element ${bindingElement.bufferLayout.type}-type col-span-16 color-${
  //             index % 4
  //           } col-start-${bindingElement.alignment.slot.start + 1}'>
  //       <div class='binding-element-type'>${bindingElement.name}: ${
  //             bindingElement.type
  //           }</div><div class='binding-element-slots'>`
  //         }
  //
  //         innerHTML += `<div class='binding-element-slot'>${bindingElement.bufferLayout.type}</div>`
  //       }
  //
  //       innerHTML += '</div>'
  //       innerHTML += '</div>'
  //     })
  //   }
  //
  //   innerHTML += `</div>`
  //
  //   innerHTML += `<div class='wgsl-declaration'>`
  //   innerHTML += `<div class='wgsl-declaration-struct'><code><pre>${
  //     binding.wgslStructFragment
  //   }</pre></code></div><div class='wgsl-declaration-var'><code><pre>${binding.wgslGroupFragment
  //     .map((fragment) => {
  //       return fragment.replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  //     })
  //     .join('\n')}</pre></code></div></div>`
  //
  //   innerHTML += `</div>`
  //   innerHTML += `</div>`
  //
  //   document.querySelector('#page').insertAdjacentHTML('beforeend', innerHTML)
  // }

  console.log(debugBindings)

  debugBindings.forEach((binding) => {
    buildBindingDebugTable(binding)
  })
})
