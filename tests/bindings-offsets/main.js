// Goal of this test is to help debug and visualize buffer binding alignments
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const { BufferBinding, GPUCurtains, Vec2, Vec3 } = await import(/* @vite-ignore */ path)

  // set our main GPUCurtains instance it will handle everything we need
  // a WebGPU device and a renderer with its scene, requestAnimationFrame, resize and scroll events...
  const gpuCurtains = new GPUCurtains({
    container: '#canvas',
    watchScroll: false, // no need to listen for the scroll in this example
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
  })

  await gpuCurtains.setDevice()

  const debugBindings = []
  //debugBindings.push(gpuCurtains.renderer.cameraBufferBinding)

  // ref: https://webgpufundamentals.org/webgpu/lessons/resources/wgsl-offset-computer.html#x=5d00000100f901000000000000003d8888623728a306fc320e1a9ba57547078694a9be9f86fca01fc2b96183b8019b42979f89b724d75b16a7d0ba5f05e1688c08377f9adcadac8b118c715ae49684657cbf39131e36661070f3c12b655a42f158e5add7714dbd4729a3973fef2edfb03e8759dabdeb5279ff2f0b45d47fb70575af8b3a734abecbf3ecdca99f3367a2d772ceb3b4659a28504ff11321f7227e9e5358ffdbc75a65573125707e74c84e6410a1b32e84d64e7b89923cf185c66e31f16e5489b838fb930f42f15dbbeeca544be7372401b7e7efb8288be7dc18cc48ba6edd18f2e1cc64d805f7862962ad3cd91a5a7b13ca157c51e17f8dcfe8c87398a0eabf62e1f623c49ec6ec8e7e598dc6b6d5a3ffbe2396d3

  const binding1 = new BufferBinding({
    label: 'Test1',
    name: 'test1',
    bindingType: 'uniform',
    struct: {
      pointerSize: {
        type: 'f32',
        value: 0.85, // 1 is full plane
      },
      pointerPosition: {
        type: 'vec2f',
        value: new Vec2(Infinity),
      },
      pointerVelocity: {
        type: 'vec2f',
        value: new Vec2(0), // pointer velocity divided by plane size
      },
      pointerStrength: {
        type: 'f32',
        value: 250,
      },
      wind: {
        type: 'vec3f',
        value: new Vec3(0, 0, 0),
      },
    },
  })

  debugBindings.push(binding1)

  const binding2 = new BufferBinding({
    label: 'Test2',
    name: 'test2',
    bindingType: 'uniform',
    struct: {
      deltaTime: {
        type: 'f32',
        value: 0,
      },
      gravity: {
        type: 'vec3f',
        value: new Vec3(),
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
        value: new Vec3(),
      },
    },
  })

  debugBindings.push(binding2)

  const otherBinding = new BufferBinding({
    label: 'Other binding',
    name: 'otherBinding',
    bindingType: 'uniform',
    struct: {
      systemSize: {
        type: 'vec3f',
        value: new Vec3(),
      },
      time: {
        type: 'f32',
        value: 0,
      },
      frequency: {
        type: 'f32',
        value: 0.01,
      },
      amplitude: {
        type: 'f32',
        value: 0.5,
      },
    },
  })

  debugBindings.push(otherBinding)

  const arrayTestValue = new Float32Array(3 * 4)
  for (let i = 0; i < arrayTestValue.length; i++) {
    arrayTestValue[i] = 99
  }

  const arrayTest = new BufferBinding({
    label: 'Array test',
    name: 'arrayTest',
    bindingType: 'uniform',
    struct: {
      arrayTest: {
        type: 'array<vec3f>',
        value: arrayTestValue,
      },
      floatValue: {
        type: 'f32',
        value: 0,
      },
    },
  })

  arrayTest.update()

  debugBindings.push(arrayTest)

  const computePassExample = new BufferBinding({
    label: 'interleaved vec2 arrays',
    name: 'interleavedVec2Arrays',
    bindingType: 'uniform',
    struct: {
      position: {
        type: 'array<vec2f>',
        value: new Float32Array(2 * 5),
      },
      velocity: {
        type: 'array<vec2f>',
        value: new Float32Array(2 * 5),
      },
    },
  })

  debugBindings.push(computePassExample)

  const binding3 = new BufferBinding({
    label: 'Simple interleaved array buffer',
    name: 'simpleInterleavedArrayBuffer',
    bindingType: 'uniform',
    struct: {
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

  const binding4 = new BufferBinding({
    label: 'Complex interleaved array buffer',
    name: 'complexInterleavedArrayBuffer',
    bindingType: 'uniform',
    struct: {
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

  // PADDED BINDINGS

  // simple mat3x3f
  const normalMatrixBinding = new BufferBinding({
    label: 'Normal matrix',
    name: 'normalMatrix',
    bindingType: 'uniform',
    struct: {
      matrix: {
        type: 'mat3x3f',
        value: new Float32Array(3 * 3),
      },
    },
  })

  const normalMatrix = new Float32Array(3 * 3)
  for (let i = 0; i < normalMatrix.length; i++) {
    normalMatrix[i] = i
  }

  //console.log('normal matrix', normalMatrix)

  debugBindings.push(normalMatrixBinding)
  normalMatrixBinding.bufferElements[0].update(normalMatrix)

  // mat3x3f array
  const normalMatrixArrayBinding = new BufferBinding({
    label: 'Normal matrix array',
    name: 'normalMatrixArray',
    bindingType: 'uniform',
    struct: {
      matrix: {
        type: 'array<mat3x3f>',
        value: new Float32Array(3 * 3 * 3),
      },
    },
  })

  const normalMatrixArray = new Float32Array(3 * 3 * 3)
  for (let i = 0; i < normalMatrixArray.length; i++) {
    normalMatrixArray[i] = i
  }

  debugBindings.push(normalMatrixArrayBinding)
  normalMatrixArrayBinding.bufferElements[0].update(normalMatrixArray)

  //console.log('normal matrix array', normalMatrixArray, normalMatrixArrayBinding)

  // mat3x3f interleaved array
  const normalsInterleavedArray = new Float32Array(3 * 3)
  for (let i = 0; i < normalsInterleavedArray.length; i++) {
    normalsInterleavedArray[i] = 99
  }

  const normalMatrixInterleavedArray = new Float32Array(3 * 3 * 3)
  for (let i = 0; i < normalMatrixInterleavedArray.length; i++) {
    normalMatrixInterleavedArray[i] = i
  }

  const normalMatrixInterleavedArrayBinding = new BufferBinding({
    label: 'Normal matrix interleaved array',
    name: 'normalMatrixInterleavedArray',
    bindingType: 'uniform',
    struct: {
      normal: {
        type: 'array<vec3f>',
        value: normalsInterleavedArray,
      },
      matrix: {
        type: 'array<mat3x3f>',
        value: normalMatrixInterleavedArray,
      },
    },
  })

  debugBindings.push(normalMatrixInterleavedArrayBinding)
  normalMatrixInterleavedArrayBinding.update()

  // ----------
  // NOW OUTPUT THE BINDINGS
  // ----------

  const buildBindingDebugTable = (binding) => {
    let innerHTML = `<div class='binding'>`
    innerHTML += `<h2>${binding.label}</h2>`
    innerHTML += `<div class='binding-declaration'>`

    // BEGINNING OF TABLE
    innerHTML += `<div class='byte-diagram'>`

    let previousEndOffset = 0

    const regularBufferElements = binding.bufferElements.filter((bufferElement) => !bufferElement.viewSetFunction)

    regularBufferElements.forEach((bindingElement, index) => {
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
          } color-${index % 8}'>`

          const arrayIndex = bindingElement.numElements ? `[${i}]` : ''
          //const arrayIndex = bindingElement.numElements ? `[${0}]` : ''

          innerHTML += `<div class='binding-element-type'>${bindingElement.name}${arrayIndex}: ${bindingElement.type}</div>`

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

    const interleavedBufferElements = binding.bufferElements.filter((bufferElement) => !!bufferElement.viewSetFunction)

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
            //entries: [interleavedBufferElement.interleavedAlignment.entries[i]],
            index: regularBufferElements.length + index,
            loopIndex: i,
          })
        })
      }

      //console.log(interleavedEntries)

      interleavedEntries.forEach((interleavedEntry) => {
        const newStartOffset = interleavedEntry.startOffset + interleavedEntry.loopIndex * interleavedEntry.arrayStride

        // add empty padded slots before entry if needed
        if (previousEndOffset < newStartOffset) {
          const offsetDiff = newStartOffset - previousEndOffset - 1
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
            interleavedEntry.loopIndex * interleavedEntry.numElements + j
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

  console.log(debugBindings)

  debugBindings.forEach((binding) => {
    buildBindingDebugTable(binding)
  })
})
