import { generateUUID } from '../../utils/utils'
import { isCameraRenderer } from '../../utils/renderer-utils'
import { DOMFrustum } from '../frustum/DOMFrustum'
import { Material } from '../materials/Material'
import { Texture } from '../textures/Texture'
import { BufferBindings } from '../bindings/BufferBindings'
import { Geometry } from '../geometries/Geometry'

let meshIndex = 0

const defaultMeshBaseParams = {
  label: 'Mesh',
  // geometry
  geometry: new Geometry(),
  // material
  shaders: {},
  bindings: [],
  cullMode: 'back',
  depthWriteEnabled: true,
  depthCompare: 'less',
  transparent: false,
  visible: true,
  renderOrder: 0,
  // callbacks / events
  onReady: () => {
    /* allow empty callback */
  },
  onRender: () => {
    /* allow empty callback */
  },
  onAfterRender: () => {
    /* allow empty callback */
  },
  onAfterResize: () => {
    /* allow empty callback */
  },
}

const MeshBaseMixin = (superclass) =>
  class extends superclass {
    constructor(renderer, element, parameters) {
      parameters = { ...defaultMeshBaseParams, ...parameters }

      super(renderer, element, parameters)

      this.type = 'MeshObject'

      this.uuid = generateUUID()
      Object.defineProperty(this, 'index', { value: meshIndex++ })

      // we could pass our curtains object OR our curtains renderer object
      renderer = (renderer && renderer.renderer) || renderer

      if (!isCameraRenderer(renderer, this.type)) {
        console.warn('MeshBaseMixin fail')
        return
      }

      this.renderer = renderer

      this.textures = []

      const {
        label,
        shaders,
        geometry,
        visible,
        renderOrder,
        onReady,
        onRender,
        onAfterRender,
        onAfterResize,
        ...meshParameters
      } = parameters

      this.options = {
        label,
        shaders,
        ...(this.options ?? {}), // merge possible lower options?
      }

      this.geometry = geometry

      this.onReady = onReady
      this.onRender = onRender
      this.onAfterRender = onAfterRender
      this.onAfterResize = onAfterResize

      this.visible = visible
      this.renderOrder = renderOrder
      this.ready = false

      this.setMeshMaterial(meshParameters)
    }

    setMeshMaterial(meshParameters) {
      const { bindings, ...materialOptions } = meshParameters

      this.transparent = materialOptions.transparent

      this.setUniformBindings(bindings)

      this.setMaterial({
        label: this.options.label,
        shaders: this.options.shaders,
        ...materialOptions,
        uniformsBindings: this.uniformsBindings,
        geometry: this.geometry,
      })

      this.uniforms = this.material.uniforms

      //this.renderer.meshes.push(this)
      //this.renderer.scene.addMesh(this)
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

    /*** UNIFORMS ***/

    setUniformBindings(bindings) {
      this.uniformsBindings = [
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

      this.onAfterResize && this.onAfterResize()
    }

    /**
     *
     * @param pass
     */
    onBeforeRenderPass() {
      if (this.material && this.material.ready && !this.ready) {
        this.ready = true
        this.onReady()
      }

      this.textures.forEach((texture) => {
        texture.textureMatrix.onBeforeRender()
      })

      this.uniformsBindings.forEach((uniformBinding) => {
        uniformBinding.onBeforeRender()
      })
    }

    onRenderPass(pass) {
      this.onRender()

      this.material.render(pass)
    }

    onAfterRenderPass() {
      this.onAfterRender()
    }

    render(pass) {
      // no point to render if the WebGPU device is not ready
      // TODO shoud a mesh with visible set to false still update its uniforms?
      if (!this.renderer.ready || !this.visible) return

      if (super.render) super.render()

      this.onBeforeRenderPass()

      this.onRenderPass(pass)

      this.onAfterRenderPass()
    }

    destroy() {
      // TODO destroy anything else?
      this.material?.destroy()
    }
  }

export default MeshBaseMixin
