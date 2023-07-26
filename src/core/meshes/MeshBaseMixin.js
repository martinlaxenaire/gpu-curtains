import { generateUUID } from '../../utils/utils'
import { isCameraRenderer } from '../../utils/renderer-utils'
import { Material } from '../materials/Material'
import { Texture } from '../textures/Texture'
import { BufferBindings } from '../bindings/BufferBindings'
import { Geometry } from '../geometries/Geometry'
import { RenderTexture } from '../textures/RenderTexture'

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
  texturesOptions: {
    texture: {},
    sampler: {},
  },
}

const MeshBaseMixin = (superclass) =>
  class extends superclass {
    // callbacks / events
    _onReadyCallback = () => {
      /* allow empty callback */
    }
    _onRenderCallback = () => {
      /* allow empty callback */
    }
    _onAfterRenderCallback = () => {
      /* allow empty callback */
    }
    _onAfterResizeCallback = () => {
      /* allow empty callback */
    }

    constructor(renderer, element, parameters) {
      parameters = { ...defaultMeshBaseParams, ...parameters }

      super(renderer, element, parameters)

      this.type = 'MeshBase'

      this.uuid = generateUUID()
      Object.defineProperty(this, 'index', { value: meshIndex++ })

      // we could pass our curtains object OR our curtains renderer object
      renderer = (renderer && renderer.renderer) || renderer

      isCameraRenderer(renderer, parameters.label ? parameters.label + ' ' + this.type : this.type)

      this.renderer = renderer

      this.textures = []
      this.renderTextures = []

      const { label, shaders, geometry, bindings, visible, renderOrder, texturesOptions, ...meshParameters } =
        parameters

      this.options = {
        label,
        shaders,
        texturesOptions,
        ...(this.options ?? {}), // merge possible lower options?
      }

      this.geometry = geometry

      this.visible = visible
      this.renderOrder = renderOrder
      this.ready = false

      const uniformsBindings = this.createUniformsBindings(bindings)
      this.setMeshMaterial({ ...meshParameters, uniformsBindings })

      this.addToScene()
    }

    get ready() {
      return this._ready
    }

    set ready(value) {
      if (value) {
        this._onReadyCallback && this._onReadyCallback()
      }
      this._ready = value
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

      if (!options.label) {
        options.label = this.options.label + ' ' + options.name
      }

      const texture = new Texture(this.renderer, { ...options, ...this.options.texturesOptions })

      this.material.addTexture(texture)

      this.textures.push(texture)

      this.onTextureCreated(texture)

      return texture
    }

    onTextureCreated(texture) {
      /* will be overriden */
      texture.parent = this
    }

    createRenderTexture(options) {
      if (!options.name) {
        options.name = 'texture' + this.textures.length
      }

      const renderTexture = new RenderTexture(this.renderer, options)

      this.material.addTexture(renderTexture)
      this.renderTextures.push(renderTexture)

      return renderTexture
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
      // resize render textures first
      this.renderTextures?.forEach((renderTexture) => renderTexture.resize())

      if (super.resize) super.resize(boundingRect)

      // resize textures
      this.textures?.forEach((texture) => {
        texture.resize()
      })

      this._onAfterResizeCallback && this._onAfterResizeCallback()
    }

    /** EVENTS **/

    onReady(callback) {
      if (callback) {
        this._onReadyCallback = callback
      }

      return this
    }

    onRender(callback) {
      if (callback) {
        this._onRenderCallback = callback
      }

      return this
    }

    onAfterRender(callback) {
      if (callback) {
        this._onAfterRenderCallback = callback
      }

      return this
    }

    onAfterResize(callback) {
      if (callback) {
        this._onAfterResizeCallback = callback
      }

      return this
    }

    /**
     */
    onBeforeRenderPass() {
      if (!this.renderer.ready) return

      if (this.material && this.material.ready && !this.ready) {
        this.ready = true
      }

      this.material.onBeforeRender()
    }

    onRenderPass(pass) {
      this._onRenderCallback && this._onRenderCallback()

      this.material.render(pass)
    }

    onAfterRenderPass() {
      this._onAfterRenderCallback && this._onAfterRenderCallback()
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
      if (super.destroy) super.destroy()

      // TODO destroy anything else?
      this.material?.destroy()
      this.textures.forEach((texture) => texture.destroy())
    }
  }

export default MeshBaseMixin
