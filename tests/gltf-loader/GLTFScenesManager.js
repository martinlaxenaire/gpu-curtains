import { Box3, Geometry, IndexedGeometry, Object3D, Vec3, Mat4, Mesh } from '../../dist/esm/index.mjs'
import { buildShaders } from './utils.js'

// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Constants
// To make it easier to reference the WebGL enums that glTF uses.
const GL = WebGLRenderingContext

// one normal matrix to handle them all
const _normalMatrix = new Mat4()

export class GLTFScenesManager {
  constructor(renderer, gltf) {
    this.renderer = renderer
    this.gltf = gltf

    this.sceneManager = {
      node: new Object3D(),
      boundingBox: new Box3(),
      scenes: [],
      meshes: [], // TODO
      meshesDescriptors: [],
    }

    this.sceneManager.getScenesNodes = () => {
      return this.sceneManager.scenes
        .map((scene) => {
          return [
            scene.node,
            ...scene.children
              .map((child) => {
                return [
                  child.node,
                  ...child.children.map((subChild) => {
                    return subChild.node
                  }),
                ]
              })
              .flat(),
          ]
        })
        .flat()
    }

    // this.sceneManager.getScenesMeshes = () => {
    //   return this.sceneManager.scenes
    //     .map((scene) => {
    //       return [
    //         ...scene.children
    //           .map((child) => {
    //             return [
    //               ...child.meshes?.map((mesh) => {
    //                 return mesh
    //               }),
    //               ...child.children.map((subChild) => {
    //                 return subChild.meshes?.map((mesh) => {
    //                   return mesh
    //                 })
    //               }),
    //             ].flat()
    //           })
    //           .flat(),
    //       ]
    //     })
    //     .flat()
    // }

    this.createScenes()
  }

  static getVertexAttributeParamsFromType(type) {
    switch (type) {
      case 'VEC2':
        return {
          type: 'vec2f',
          bufferFormat: 'float32x2',
          size: 2,
        }
      case 'VEC3':
        return {
          type: 'vec3f',
          bufferFormat: 'float32x3',
          size: 3,
        }
      case 'VEC4':
        return {
          type: 'vec4f',
          bufferFormat: 'float32x4',
          size: 4,
        }
      case 'SCALAR':
      default: // treat default as f32
        return {
          type: 'f32',
          bufferFormat: 'float32',
          size: 1,
        }
    }
  }

  static getTypedArrayConstructorFromComponentType(componentType) {
    switch (componentType) {
      case GL.BYTE: // GL.BYTE
        return Int8Array
      case GL.UNSIGNED_BYTE: // GL.UNSIGNED_BYTE
        return Uint8Array
      case GL.SHORT: // GL.SHORT
        return Int16Array
      case GL.UNSIGNED_SHORT: // GL.UNSIGNED_SHORT
        return Uint16Array
      case GL.UNSIGNED_INT: // GL.UNSIGNED_INT
        return Uint32Array
      case GL.FLOAT: // GL.FLOAT
      default:
        return Float32Array
    }
  }

  static gpuPrimitiveTopologyForMode(mode) {
    switch (mode) {
      case GL.TRIANGLES: // GL.TRIANGLES
        return 'triangle-list'
      case GL.TRIANGLE_STRIP: // GL.TRIANGLE_STRIP
        return 'triangle-strip'
      case GL.LINES: // GL.LINES
        return 'line-list'
      case GL.LINE_STRIP: // GL.LINE_STRIP
        return 'line-strip'
      case GL.POINTS: // GL.POINTS
        return 'point-list'
    }
  }

  static gpuAddressModeForWrap(wrap) {
    switch (wrap) {
      case GL.CLAMP_TO_EDGE:
        return 'clamp-to-edge'
      case GL.MIRRORED_REPEAT:
        return 'mirror-repeat'
      default:
        return 'repeat'
    }
  }

  createNode(parent, node, primitiveInstances) {
    const child = {
      name: node.name,
      node: new Object3D(),
      meshes: [],
      children: [],
    }

    parent.children.push(child)

    child.node.parent = parent.node

    if (node.matrix) {
      child.node.modelMatrix.setFromArray(new Float32Array(node.matrix))
      // avoid overriding the matrix with empty position/scale/rotation
      child.node.matrices.model.shouldUpdate = false
    } else {
      if (node.translation) child.node.position.set(node.translation[0], node.translation[1], node.translation[2])
      if (node.scale) child.node.scale.set(node.scale[0], node.scale[1], node.scale[2])
      if (node.rotation) child.node.quaternion.setFromArray(new Float32Array(node.rotation))
    }

    const mesh = this.gltf.meshes[node.mesh]

    if (node.children) {
      node.children.forEach((childNodeIndex) => {
        const childNode = this.gltf.nodes[childNodeIndex]
        this.createNode(child, childNode, primitiveInstances)
      })
    }

    if (mesh) {
      // each primitive is in fact a mesh
      mesh.primitives.forEach((primitive, index) => {
        const meshDescriptor = {
          parent: child.node,
          attributes: [],
          textures: [],
          parameters: {
            label: mesh.name ? mesh.name + ' ' + index : 'glTF mesh ' + index,
          },
        }

        child.meshes.push(meshDescriptor)

        let instancesDescriptor = primitiveInstances.get(primitive)
        if (!instancesDescriptor) {
          instancesDescriptor = {
            instances: [], // instances
            nodes: [], // node transform
            meshDescriptor,
          }
          primitiveInstances.set(primitive, instancesDescriptor)
        }

        instancesDescriptor.instances.push(node)
        instancesDescriptor.nodes.push(child.node)
      })
    }
  }

  createScenes() {
    this.sceneManager.node.parent = this.renderer.scene

    const primitiveInstances = new Map()

    this.gltf.scenes.forEach((childScene) => {
      const sceneDescriptor = {
        name: childScene.name,
        children: [],
        node: new Object3D(),
      }

      sceneDescriptor.node.parent = this.sceneManager.node

      this.sceneManager.scenes.push(sceneDescriptor)

      childScene.nodes.forEach((nodeIndex) => {
        const node = this.gltf.nodes[nodeIndex]
        this.createNode(sceneDescriptor, node, primitiveInstances)
      })
    })

    // now that we created all our nodes, update all the matrices
    this.sceneManager.scenes.forEach((childScene) => {
      childScene.node.shouldUpdateModelMatrix()
      childScene.node.updateMatrixStack()
    })

    for (const [primitive, primitiveInstance] of primitiveInstances) {
      const { instances, nodes, meshDescriptor } = primitiveInstance

      const instancesCount = instances.length

      meshDescriptor.nodes = nodes

      this.sceneManager.meshesDescriptors.push(meshDescriptor)

      // ------------------------------------
      // GEOMETRY
      // ------------------------------------

      const geometryBBox = new Box3()

      // TODO should we pass an already created buffer to the geometry main vertex and index buffers if possible?
      // and use bufferOffset and bufferSize parameters
      // if the accessors byteOffset is large enough,
      // it means we have an array that is not interleaved (with each vertexBuffer attributes bufferOffset = 0)
      // but we can deal with the actual offset in the geometry setVertexBuffer call!
      // see https://toji.dev/webgpu-gltf-case-study/#handling-large-attribute-offsets

      const defaultAttributes = []

      // check whether the buffer view is already interleaved
      let interleavedArray = null
      let interleavedBufferView = null
      let maxByteOffset = 0

      // prepare default attributes
      for (const [attribName, accessorIndex] of Object.entries(primitive.attributes)) {
        const accessor = this.gltf.accessors[accessorIndex]

        const constructor = GLTFScenesManager.getTypedArrayConstructorFromComponentType(accessor.componentType)

        const bufferView = this.gltf.bufferViews[accessor.bufferView]

        // clean attributes names
        const name =
          attribName === 'TEXCOORD_0' ? 'uv' : attribName.replace('_', '').replace('TEXCOORD', 'uv').toLowerCase()

        const byteStride = bufferView.byteStride || 0
        const accessorByteOffset = accessor.byteOffset || 0
        if (byteStride && accessorByteOffset && accessorByteOffset < byteStride) {
          maxByteOffset = Math.max(accessorByteOffset, maxByteOffset)
        } else {
          maxByteOffset = 0
        }

        // custom bbox
        // glTF specs says: "vertex position attribute accessors MUST have accessor.min and accessor.max defined"
        if (name === 'position') {
          geometryBBox.min.min(new Vec3(accessor.min[0], accessor.min[1], accessor.min[2]))
          geometryBBox.max.max(new Vec3(accessor.max[0], accessor.max[1], accessor.max[2]))

          interleavedBufferView = bufferView
        }

        const attributeParams = GLTFScenesManager.getVertexAttributeParamsFromType(accessor.type)

        const attribute = {
          name,
          ...attributeParams,
          array: new constructor(
            this.gltf.buffers[bufferView.buffer],
            accessor.byteOffset + bufferView.byteOffset,
            accessor.count * attributeParams.size
          ),
        }

        defaultAttributes.push(attribute)
        meshDescriptor.attributes.push({
          name: attribute.name,
          type: attribute.type,
        })
      }

      if (maxByteOffset > 0) {
        // check they are all really interleaved
        const accessorsBufferViews = Object.values(primitive.attributes).map(
          (accessorIndex) => this.gltf.accessors[accessorIndex].bufferView
        )

        if (!accessorsBufferViews.every((val) => val === accessorsBufferViews[0])) {
          // we're not that lucky since we have interleaved values coming from different positions of our main buffer
          // we'll have to rebuild an interleaved array ourselves
          let totalStride = 0
          const mainBufferStrides = {}
          const arrayLength = Object.values(primitive.attributes).reduce((acc, accessorIndex) => {
            const accessor = this.gltf.accessors[accessorIndex]

            const attrSize = GLTFScenesManager.getVertexAttributeParamsFromType(accessor.type).size

            if (!mainBufferStrides[accessor.bufferView]) {
              mainBufferStrides[accessor.bufferView] = 0
            }

            mainBufferStrides[accessor.bufferView] = Math.max(
              mainBufferStrides[accessor.bufferView],
              accessor.byteOffset + attrSize * Float32Array.BYTES_PER_ELEMENT
            )

            totalStride += attrSize * Float32Array.BYTES_PER_ELEMENT

            return acc + accessor.count * attrSize
          }, 0)

          interleavedArray = new Float32Array(Math.ceil(arrayLength / 4) * 4)

          Object.values(primitive.attributes).forEach((accessorIndex) => {
            const accessor = this.gltf.accessors[accessorIndex]
            const bufferView = this.gltf.bufferViews[accessor.bufferView]

            const attrSize = GLTFScenesManager.getVertexAttributeParamsFromType(accessor.type).size

            for (let i = 0; i < accessor.count; i++) {
              const startOffset =
                accessor.byteOffset / Float32Array.BYTES_PER_ELEMENT +
                (i * totalStride) / Float32Array.BYTES_PER_ELEMENT

              interleavedArray
                .subarray(startOffset, startOffset + attrSize)
                .set(
                  new Float32Array(
                    this.gltf.buffers[bufferView.buffer],
                    bufferView.byteOffset + accessor.byteOffset + i * mainBufferStrides[accessor.bufferView],
                    attrSize
                  )
                )
            }
          })
        } else {
          // we're lucky to have an interleaved array!
          // we won't have to compute our geometry!
          interleavedArray = new Float32Array(
            this.gltf.buffers[interleavedBufferView.buffer],
            interleavedBufferView.byteOffset,
            (Math.ceil(interleavedBufferView.byteLength / 4) * 4) / Float32Array.BYTES_PER_ELEMENT
          )
        }
      } else {
        // not interleaved?
        // let's try to reorder the attributes so we might benefit from pipeline cache
        const attribOrder = ['position', 'uv', 'normal']

        defaultAttributes.sort((a, b) => {
          let aIndex = attribOrder.findIndex((attrName) => attrName === a.name)
          aIndex = aIndex === -1 ? Infinity : aIndex

          let bIndex = attribOrder.findIndex((attrName) => attrName === b.name)
          bIndex = bIndex === -1 ? Infinity : bIndex

          return aIndex - bIndex
        })
      }

      const geometryAttributes = {
        instancesCount,
        topology: GLTFScenesManager.gpuPrimitiveTopologyForMode(primitive.mode),
        vertexBuffers: [
          {
            name: 'attributes',
            stepMode: 'vertex', // explicitly set the stepMode even if not mandatory
            attributes: defaultAttributes,
            ...(interleavedArray && { array: interleavedArray }), // interleaved array!
          },
        ],
      }

      const isIndexedGeometry = 'indices' in primitive
      const GeometryConstructor = isIndexedGeometry ? IndexedGeometry : Geometry

      meshDescriptor.parameters.geometry = new GeometryConstructor(geometryAttributes)
      //meshDescriptor.parameters.geometry.boundingBox.copy(geometryBBox)
      meshDescriptor.parameters.geometry.boundingBox = geometryBBox

      if (isIndexedGeometry) {
        const accessor = this.gltf.accessors[primitive.indices]
        const bufferView = this.gltf.bufferViews[accessor.bufferView]

        const constructor = GLTFScenesManager.getTypedArrayConstructorFromComponentType(accessor.componentType)

        const arrayOffset = accessor.byteOffset + bufferView.byteOffset
        const arrayBuffer = this.gltf.buffers[bufferView.buffer]
        const arrayLength = Math.min(
          (arrayBuffer.byteLength - arrayOffset) / constructor.BYTES_PER_ELEMENT,
          Math.ceil(accessor.count / 4) * 4
        )

        meshDescriptor.parameters.geometry.setIndexBuffer({
          bufferFormat: constructor.name === 'Uint32Array' ? 'uint32' : 'uint16',
          array: new constructor(arrayBuffer, arrayOffset, arrayLength),
        })
      }

      // ------------------------------------
      // MATERIAL
      // ------------------------------------

      const materialTextures = this.gltf.materialsTextures[primitive.material]

      meshDescriptor.parameters.samplers = []
      meshDescriptor.parameters.textures = []

      materialTextures?.textures.forEach((t) => {
        meshDescriptor.textures.push({
          texture: t.texture.options.name,
          sampler: t.sampler.name,
        })

        const samplerExists = meshDescriptor.parameters.samplers.find((s) => s.uuid === t.sampler.uuid)

        if (!samplerExists) {
          meshDescriptor.parameters.samplers.push(t.sampler)
        }

        meshDescriptor.parameters.textures.push(t.texture)
      })

      const material = (this.gltf.materials && this.gltf.materials[primitive.material]) || {}

      meshDescriptor.parameters.cullMode = material.doubleSided ? 'none' : 'back'

      // transparency
      if (material.alphaMode === 'BLEND' || (material.extensions && material.extensions.KHR_materials_transmission)) {
        meshDescriptor.parameters.transparent = true
        meshDescriptor.parameters.targets = [
          {
            blend: {
              color: {
                srcFactor: 'src-alpha',
                dstFactor: 'one-minus-src-alpha',
              },
              alpha: {
                // This just prevents the canvas from having alpha "holes" in it.
                srcFactor: 'one',
                dstFactor: 'one',
              },
            },
          },
        ]
      }

      // uniforms
      const materialUniformStruct = {
        baseColorFactor: {
          type: 'vec4f',
          value: material.pbrMetallicRoughness?.baseColorFactor || [1, 1, 1, 1],
        },
        alphaCutoff: {
          type: 'f32',
          value: material.alphaCutoff !== undefined ? material.alphaCutoff : material.alphaMode === 'MASK' ? 0.5 : 0,
        },
        metallicFactor: {
          type: 'f32',
          value: material.pbrMetallicRoughness?.metallicFactor || 0,
        },
        roughnessFactor: {
          type: 'f32',
          value: material.pbrMetallicRoughness?.roughnessFactor || 1,
        },
        occlusionStrength: {
          type: 'f32',
          value: material.occlusionTexture?.strength || 1,
        },
        emissiveFactor: {
          type: 'vec3f',
          value: material.emissiveFactor !== undefined ? material.emissiveFactor : [1, 1, 1],
        },
      }

      console.log(materialUniformStruct)

      if (Object.keys(materialUniformStruct).length) {
        meshDescriptor.parameters.uniforms = {
          material: {
            visibility: ['vertex', 'fragment'],
            struct: materialUniformStruct,
          },
        }
      }

      // instances matrices storage
      if (instancesCount > 1) {
        const worldMatrices = new Float32Array(instancesCount * 16)
        const normalMatrices = new Float32Array(instancesCount * 16)

        for (let i = 0; i < instancesCount; ++i) {
          worldMatrices.set(nodes[i].worldMatrix.elements, i * 16)

          _normalMatrix.copy(nodes[i].worldMatrix).invert().transpose()
          normalMatrices.set(_normalMatrix.elements, i * 16)
        }

        meshDescriptor.parameters.storages = {
          instances: {
            visibility: ['vertex', 'fragment'],
            struct: {
              modelMatrix: {
                type: 'array<mat4x4f>',
                value: worldMatrices,
              },
              normalMatrix: {
                type: 'array<mat4x4f>',
                value: normalMatrices,
              },
            },
          },
        }
      }

      // computed transformed bbox
      for (let i = 0; i < nodes.length; i++) {
        // let transformedBbox = meshDescriptor.parameters.geometry.boundingBox.clone()
        // transformedBbox = transformedBbox.applyMat4(meshDescriptor.nodes[i].worldMatrix)
        const tempBbox = geometryBBox.clone()
        const transformedBbox = tempBbox.applyMat4(meshDescriptor.nodes[i].worldMatrix)

        this.sceneManager.boundingBox.min.min(transformedBbox.min)
        this.sceneManager.boundingBox.max.max(transformedBbox.max)
      }
    }
  }

  addMeshes({
    patchMeshParameters = (parameters) => {},
    setCustomMeshShaders = (meshDescriptor, { ambientContribution, lightContribution } = null) =>
      buildShaders(meshDescriptor, { ambientContribution, lightContribution }),
  } = {}) {
    this.sceneManager.meshesDescriptors.forEach((meshDescriptor) => {
      if (meshDescriptor.parameters.geometry) {
        // console.warn('>>> Create mesh. Those can help you write the correct shaders:', {
        //   meshDescriptor,
        // })

        patchMeshParameters(meshDescriptor.parameters)

        // now generate the shaders
        const shaders = setCustomMeshShaders(meshDescriptor)

        const mesh = new Mesh(this.renderer, {
          ...meshDescriptor.parameters,
          ...shaders,
        })

        if (meshDescriptor.nodes.length > 1) {
          // if we're dealing with instances
          // we must patch the mesh updateWorldMatrix method
          // in order to update the instanceMatrix binding each time the mesh world matrix change

          const _updateWorldMatrix = mesh.updateWorldMatrix.bind(mesh)
          mesh.updateWorldMatrix = () => {
            _updateWorldMatrix()

            meshDescriptor.nodes.forEach((node, i) => {
              mesh.storages.instances.modelMatrix.value.set(node.worldMatrix.elements, i * 16)

              _normalMatrix.copy(node.worldMatrix).invert().transpose()
              mesh.storages.instances.normalMatrix.value.set(_normalMatrix.elements, i * 16)
            })

            mesh.storages.instances.modelMatrix.shouldUpdate = true
            mesh.storages.instances.normalMatrix.shouldUpdate = true
          }
        }

        mesh.parent = meshDescriptor.parent

        meshDescriptor.mesh = mesh
        this.sceneManager.meshes.push(mesh)
      }
    })

    console.log(this)
  }

  destroy() {
    this.sceneManager.meshes.forEach((mesh) => mesh.remove())
    this.sceneManager.meshes = []

    const nodes = this.sceneManager.getScenesNodes()
    nodes.forEach((node) => {
      node.destroy()
    })
  }
}
