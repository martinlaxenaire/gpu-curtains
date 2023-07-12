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
  useProjection: false,
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
        bindings,
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

      const uniformsBindings = this.createUniformsBindings(bindings)
      this.setMeshMaterial({ ...meshParameters, uniformsBindings })

      this.addToScene()
    }

    setMeshMaterial(meshParameters) {
      const { uniformsBindings, ...materialOptions } = meshParameters
      const { transparent, useProjection, depthWriteEnabled, depthCompare, cullMode, verticesOrder } = materialOptions

      this.transparent = materialOptions.transparent

      this.setMaterial({
        label: this.options.label,
        shaders: this.options.shaders,
        transparent,
        useProjection,
        depthWriteEnabled,
        depthCompare,
        cullMode,
        verticesOrder,
        uniformsBindings,
        geometry: this.geometry,
      })

      this.uniforms = this.material.uniforms
    }

    setMaterial(materialParameters) {
      this.material = new Material(this.renderer, materialParameters)
    }

    addToScene() {
      this.renderer.meshes.push(this)
      this.renderer.scene.addMesh(this)
    }

    removeFromScene() {
      this.renderer.scene.removeMesh(this)
      this.renderer.meshes = this.renderer.meshes.filter((m) => m.uuid !== this.uuid)
    }

    /** TEXTURES **/

    createTexture(options) {
      if (!options.name) {
        options.name = 'texture' + this.textures.length
      }

      const texture = new Texture(this.renderer, options)

      this.material.addTexture(texture)

      this.textures.push(texture)

      this.onTextureCreated(texture)

      return texture
    }

    onTextureCreated(texture) {
      /* will be overriden */
      texture.parent = this
    }

    /*** UNIFORMS ***/

    createUniformsBindings(bindings) {
      return [
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
      if (super.resize) super.resize(boundingRect)

      this.onAfterResize && this.onAfterResize()
    }

    /**
     *
     * @param pass
     */
    onBeforeRenderPass() {
      if (!this.renderer.ready) return

      if (this.material && this.material.ready && !this.ready) {
        this.ready = true
        this.onReady()
      }

      this.material.onBeforeRender()
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
      if (!this.renderer.ready || !this.visible) return

      if (super.render) super.render()

      this.onRenderPass(pass)

      this.onAfterRenderPass()
    }

    remove() {
      this.removeFromScene()
      this.destroy()
    }

    destroy() {
      // TODO destroy anything else?
      this.material?.destroy()
      this.textures.forEach((texture) => texture.destroy())
    }
  }

export default MeshBaseMixin
