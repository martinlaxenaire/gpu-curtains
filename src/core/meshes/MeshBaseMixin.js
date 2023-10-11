import { generateUUID, throwWarning } from '../../utils/utils'
import { isCameraRenderer } from '../../utils/renderer-utils'
import { RenderMaterial } from '../materials/RenderMaterial'
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
    _onBeforeRenderCallback = () => {
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

      const {
        label,
        shaders,
        geometry,
        uniforms,
        storages,
        visible,
        renderOrder,
        renderTarget,
        texturesOptions,
        ...meshParameters
      } = parameters

      this.options = {
        label,
        shaders,
        renderTarget,
        texturesOptions,
        ...(this.options ?? {}), // merge possible lower options?
      }

      this.renderTarget = renderTarget ?? null

      this.geometry = geometry

      this.visible = visible
      this.renderOrder = renderOrder
      this.ready = false

      const inputBindings = this.createBindings({
        uniforms: uniforms ?? [],
        storages: storages ?? [],
      })

      this.setMeshMaterial({ ...meshParameters, ...inputBindings })

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
      const { uniforms, storages, ...materialOptions } = meshParameters
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
        uniforms,
        storages,
        geometry: this.geometry,
      })
    }

    setMaterial(materialParameters) {
      this.material = new RenderMaterial(this.renderer, materialParameters)
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
        options.name = 'renderTexture' + this.renderTextures.length
      }

      const renderTexture = new RenderTexture(this.renderer, options)

      this.material.addTexture(renderTexture)
      this.renderTextures.push(renderTexture)

      return renderTexture
    }

    setRenderTarget(renderTarget) {
      if (renderTarget && renderTarget.type !== 'RenderTarget') {
        throwWarning(`${this.options.label ?? this.type}: renderTarget is not a RenderTarget: ${renderTarget}`)
        return
      }

      // ensure the mesh is in the correct scene stack
      this.removeFromScene()
      this.renderTarget = renderTarget
      this.addToScene()
    }

    /*** BINDINGS ***/

    createBindings({ uniforms = [], storages = [] }) {
      const uniformsBindings = [
        ...uniforms.map((binding, index) => {
          const bindingParams = {
            label: binding.label || 'Uniform' + index,
            name: binding.name || 'uniform' + index,
            bindIndex: index + 1,
            bindingType: 'uniform',
            useStruct: true,
            bindings: binding.bindings,
            visibility: binding.visibility,
          }

          return binding.useStruct !== false
            ? new BufferBindings(bindingParams)
            : Object.keys(binding.bindings).map((bindingKey) => {
                bindingParams.label = binding.label + bindingKey || 'Uniform' + bindingKey + index
                bindingParams.name = binding.name + bindingKey || 'uniform' + bindingKey + index
                bindingParams.useStruct = false
                bindingParams.bindings = { [bindingKey]: binding.bindings[bindingKey] }

                return new BufferBindings(bindingParams)
              })
        }),
      ].flat()

      const storagesBindings = [
        ...storages.map((binding, index) => {
          const bindingParams = {
            label: binding.label || 'Storage' + index,
            name: binding.name || 'storage' + index,
            bindIndex: index + 1, // bindIndex 0 is already taken by matrix uniforms
            bindingType: 'storage',
            useStruct: true,
            bindings: binding.bindings,
            visibility: binding.visibility,
          }

          return binding.useStruct !== false
            ? new BufferBindings(bindingParams)
            : Object.keys(binding.bindings).map((bindingKey) => {
                bindingParams.label = binding.label + bindingKey || 'Storage' + bindingKey + index
                bindingParams.name = binding.name + bindingKey || 'storage' + bindingKey + index
                bindingParams.useStruct = false
                bindingParams.bindings = { [bindingKey]: binding.bindings[bindingKey] }

                return new BufferBindings(bindingParams)
              })
        }),
      ].flat()

      return {
        uniforms: uniformsBindings,
        storages: storagesBindings,
      }
    }

    get uniforms() {
      return this.material?.uniforms
    }

    get storages() {
      return this.material?.storages
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

    onBeforeRender(callback) {
      if (callback) {
        this._onBeforeRenderCallback = callback
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

      this._onBeforeRenderCallback && this._onBeforeRenderCallback()

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
      this.onBeforeRenderPass()

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
      this.geometry = null

      this.renderTextures = []
      this.textures = []
    }
  }

export default MeshBaseMixin
