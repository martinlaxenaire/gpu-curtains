import { isCameraRenderer } from '../../utils/renderer-utils'
import { Material } from '../Material'
import { Texture } from '../Texture'
import { BufferBindings } from '../bindings/BufferBindings'
import { Geometry } from '../geometries/Geometry'
import { Vec3 } from '../../math/Vec3'
import { DOMFrustum } from '../frustum/DOMFrustum'

const defaultMeshParams = {
  label: 'Mesh',
  geometry: new Geometry(),
  shaders: {},
  bindings: [],
  cullMode: 'back',
  depthWriteEnabled: true,
  depthCompare: 'less',
  transparent: false,
  visible: true,
  // callbacks / events
  onReady: () => {
    /* allow empty callback */
  },
  onRender: () => {
    /* allow empty callback */
  },
}

const MeshMixin = (superclass) =>
  class extends superclass {
    constructor(renderer, element, parameters) {
      super(renderer, element, parameters)

      this.type = 'MeshObject'

      // we could pass our curtains object OR our curtains renderer object
      renderer = (renderer && renderer.renderer) || renderer

      if (!isCameraRenderer(renderer, this.type)) {
        console.warn('MeshMixin fail')
        return
      }

      this.renderer = renderer

      const params = { ...defaultMeshParams, ...parameters }

      const { shaders, bindings, geometry, label, visible, onReady, onRender, ...materialOptions } = params

      this.options = {
        label,
        shaders,
        ...(this.options ?? {}), // merge possible lower options?
      }

      this.setMatricesUniformGroup()
      this.setUniformBindings(bindings)

      this.geometry = geometry

      this.domFrustum = new DOMFrustum({
        boundingBox: this.geometry.boundingBox,
        modelViewProjectionMatrix: this.modelViewProjectionMatrix,
        containerBoundingRect: this.renderer.domElement.boundingRect,
        onReEnterView: () => {
          // TODO
          if (this.options.label === 'Cube') {
            console.log('Cube reentered view!')
          }
        },
        onLeaveView: () => {
          // TODO
          if (this.options.label === 'Cube') {
            console.log('Cube left view!')
          }
        },
      })

      this.setMaterial({
        label,
        shaders,
        ...materialOptions,
        uniformsBindings: this.uniformsBindings,
      })

      this.material.setAttributesFromGeometry(this.geometry)

      this.uniforms = this.material.uniforms

      this.textures = []

      this.visible = visible
      this.ready = false

      this.onReady = onReady
      this.onRender = onRender

      this.renderer.meshes.push(this)
    }

    setMaterial(materialParameters) {
      this.material = new Material(this.renderer, materialParameters)
    }

    /** TEXTURES **/

    createTexture(options) {
      if (!options.name) {
        options.name = 'texture' + this.textures.length
      }

      const texture = new Texture(this.renderer, options)

      this.material.addTextureBinding(texture)

      this.textures.push(texture)

      this.onTextureCreated(texture)

      return texture
    }

    onTextureCreated(texture) {
      /* will be overriden */
      texture.parent = this
    }

    /** UNIFORMS **/

    /***
   Init our plane model view and projection matrices and set their uniform locations
   ***/
    setMatricesUniformGroup() {
      this.matrixUniformBinding = new BufferBindings({
        label: 'Matrices',
        name: 'matrices',
        uniforms: {
          model: {
            name: 'model',
            type: 'mat4x4f',
            value: this.modelMatrix,
            onBeforeUpdate: () => {
              this.matrixUniformBinding.uniforms.model.value = this.modelMatrix
            },
          },
          modelView: {
            // model view matrix (model matrix multiplied by camera view matrix)
            name: 'modelView',
            type: 'mat4x4f',
            value: this.modelViewMatrix,
            onBeforeUpdate: () => {
              this.matrixUniformBinding.uniforms.modelView.value = this.modelViewMatrix
            },
          },
          modelViewProjection: {
            name: 'modelViewProjection',
            type: 'mat4x4f',
            value: this.modelViewProjectionMatrix,
            onBeforeUpdate: () => {
              this.matrixUniformBinding.uniforms.modelViewProjection.value = this.modelViewProjectionMatrix
            },
          },
        },
      })
    }

    setUniformBindings(bindings) {
      this.uniformsBindings = [
        this.matrixUniformBinding,
        ...bindings.map((binding, index) => {
          return new BufferBindings({
            label: binding.label || 'Uniforms' + index,
            name: binding.name || 'uniforms' + index,
            bindIndex: index + 1, // bindIndex 0 is already taken by matrix uniforms
            uniforms: binding.uniforms,
            visibility: binding.visibility,
          })
        }),
      ]
    }

    resize(boundingRect = null) {
      super.resize(boundingRect)
      /* will be overridden */

      if (this.domFrustum) this.domFrustum.setContainerBoundingRect(this.renderer.domElement.boundingRect)

      // TODO onAfterResize callback?
    }

    applyScale() {
      super.applyScale()

      // resize textures on scale change!
      this.textures.forEach((texture) => texture.resize())
    }

    getProjectedToDocumentCoords() {
      if (!this.geometry) return

      const { boundingBox } = this.geometry

      const transformedBox = boundingBox.applyMat4(this.modelViewProjectionMatrix)

      // normalize [-1, 1] coords to [0, 1]
      transformedBox.min.x = (transformedBox.min.x + 1) * 0.5
      transformedBox.max.x = (transformedBox.max.x + 1) * 0.5

      transformedBox.min.y = 1 - (transformedBox.min.y + 1) * 0.5
      transformedBox.max.y = 1 - (transformedBox.max.y + 1) * 0.5

      const { width, height, top, left } = this.renderer.domElement.boundingRect

      const documentBBox = {
        left: transformedBox.min.x * width + left,
        top: transformedBox.max.y * height + top,
        //right: transformedBox.max.x * width + left,
        //bottom: transformedBox.min.y * height + top,
        width: transformedBox.max.x * width + left - (transformedBox.min.x * width + left),
        height: transformedBox.min.y * height + top - (transformedBox.max.y * height + top),
      }

      //documentBBox.width = documentBBox.right - documentBBox.left
      //documentBBox.height = documentBBox.bottom - documentBBox.top

      if (
        Math.round(documentBBox.right) <= left ||
        Math.round(documentBBox.left) >= left + width ||
        Math.round(documentBBox.bottom) <= top ||
        Math.round(documentBBox.top) >= top + height
      ) {
        console.log(this.options.label, 'IS NOT IN VIEW')
      } else {
        console.log(this.options.label, 'IS IN VIEW')
      }
    }

    updateModelMatrix() {
      super.updateModelMatrix()

      if (this.matrixUniformBinding) {
        this.matrixUniformBinding.shouldUpdateUniform('model')
        this.matrixUniformBinding.shouldUpdateUniform('modelView')
        this.matrixUniformBinding.shouldUpdateUniform('modelViewProjection')
      }

      if (this.domFrustum) this.domFrustum.shouldUpdate = true
    }

    updateProjectionMatrixStack() {
      super.updateProjectionMatrixStack()

      if (this.domFrustum) this.domFrustum.shouldUpdate = true
    }

    /** Render loop **/

    /**
     *
     * @param pass
     */
    render(pass) {
      // no point to render if the WebGPU device is not ready
      // TODO shoud a mesh with visible set to false still update its uniforms?
      if (!this.renderer.ready || !this.visible) return

      super.render()

      if (this.domFrustum.shouldUpdate) {
        this.domFrustum.computeProjectedToDocumentCoords()
        this.domFrustum.shouldUpdate = false
      }

      if (this.material && this.material.ready && !this.ready) {
        this.ready = true
        this.onReady()
      }

      this.uniformsBindings.forEach((uniformBinding) => {
        uniformBinding.onBeforeRender()
      })

      this.onRender()

      // TODO check if frustumCulled
      if (this.domFrustum.isIntersecting) {
        //console.log(this.options.label, 'IS NOT IN VIEW')
      } else {
        //console.log(this.options.label, 'IS NOT IN VIEW')
      }

      this.material.render(pass)
    }

    destroy() {
      // TODO destroy anything else?
      this.material?.destroy()
    }
  }

export default MeshMixin
