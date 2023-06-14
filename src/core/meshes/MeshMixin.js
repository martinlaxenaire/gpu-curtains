import { isCameraRenderer } from '../../utils/renderer-utils'
import { Material } from '../Material'
import { Texture } from '../Texture'
import { BindGroupBufferBindings } from '../bindGroupBindings/BindGroupBufferBindings'
import { Geometry } from '../geometries/Geometry'

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
  onRender: () => {
    /* allow empty callback */
  },
}

const MeshMixin = (superclass) =>
  class extends superclass {
    constructor(renderer, element, parameters) {
      super(renderer, element)

      this.type = 'MeshObject'

      // we could pass our curtains object OR our curtains renderer object
      renderer = (renderer && renderer.renderer) || renderer

      if (!isCameraRenderer(renderer, this.type)) {
        console.warn('MeshMixin fail')
        return
      }

      this.renderer = renderer

      const params = { ...defaultMeshParams, ...parameters }

      const { shaders, bindings, geometry, label, visible, onRender, ...materialOptions } = params

      this.options = {
        label,
        shaders,
      }

      this.setMatricesUniformGroup()
      this.setUniformBindings(bindings)

      this.geometry = geometry

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

    onTextureCreated(texture) {}

    /** UNIFORMS **/

    /***
   Init our plane model view and projection matrices and set their uniform locations
   ***/
    setMatricesUniformGroup() {
      this.matrixUniformBinding = new BindGroupBufferBindings({
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
          // view: {
          //   // camera view matrix
          //   name: 'view',
          //   type: 'mat4x4f',
          //   value: this.viewMatrix,
          //   onBeforeUpdate: () => {
          //     this.matrixUniformBinding.uniforms.view.value = this.viewMatrix
          //   },
          // },
          // projection: {
          //   // camera projection matrix
          //   name: 'projection',
          //   type: 'mat4x4f',
          //   value: this.projectionMatrix,
          //   onBeforeUpdate: () => {
          //     this.matrixUniformBinding.uniforms.projection.value = this.projectionMatrix
          //   },
          // },
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
          return new BindGroupBufferBindings({
            label: binding.label || 'Uniforms' + index,
            name: binding.name || 'uniforms' + index,
            bindIndex: index + 1, // bindIndex 0 is already taken by matrix uniforms
            uniforms: binding.uniforms,
            visibility: binding.visibility,
          })
        }),
      ]
    }

    resize() {
      super.resize()
      /* will be overridden */
    }

    applyScale() {
      super.applyScale()

      // resize textures on scale change!
      this.textures.forEach((texture) => texture.resize())
    }

    updateModelMatrix() {
      super.updateModelMatrix()

      if (this.matrixUniformBinding) {
        this.matrixUniformBinding.shouldUpdateUniform('model')
        this.matrixUniformBinding.shouldUpdateUniform('modelView')
        this.matrixUniformBinding.shouldUpdateUniform('modelViewProjection')
      }
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

      this.uniformsBindings.forEach((uniformBinding) => {
        uniformBinding.onBeforeRender()
      })

      this.onRender()

      this.material.render(pass)
    }

    destroy() {
      // TODO destroy anything else?
      this.material?.destroy()
    }
  }

export default MeshMixin
