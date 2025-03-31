import { generateUUID, throwWarning } from '../../../utils/utils.mjs';
import { isRenderer } from '../../renderers/utils.mjs';
import { RenderMaterial } from '../../materials/RenderMaterial.mjs';
import { Texture } from '../../textures/Texture.mjs';
import { getDefaultVertexShaderCode } from '../../shaders/full/vertex/get-default-vertex-shader-code.mjs';
import { getDefaultFragmentCode } from '../../shaders/full/fragment/get-default-fragment-code.mjs';
import { MediaTexture } from '../../textures/MediaTexture.mjs';

var __typeError = (msg) => {
  throw TypeError(msg);
};
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), member.set(obj, value), value);
let meshIndex = 0;
const defaultMeshBaseParams = {
  // material
  autoRender: true,
  useProjection: false,
  useAsyncPipeline: true,
  // rendering
  cullMode: "back",
  depth: true,
  depthWriteEnabled: true,
  depthCompare: "less",
  depthFormat: "depth24plus",
  transparent: false,
  visible: true,
  renderOrder: 0,
  // textures
  texturesOptions: {},
  renderBundle: null
};
function MeshBaseMixin(Base) {
  var _autoRender, _a;
  return _a = class extends Base {
    /**
     * MeshBase constructor
     *
     * @typedef MeshBaseArrayParams
     * @type {array}
     * @property {(Renderer|GPUCurtains)} 0 - our {@link Renderer} class object
     * @property {(string|HTMLElement|null)} 1 - a DOM HTML Element that can be bound to a Mesh
     * @property {MeshBaseParams} 2 - {@link MeshBaseParams | Mesh base parameters}
     *
     * @param {MeshBaseArrayParams} params - our MeshBaseMixin parameters
     */
    constructor(...params) {
      super(
        params[0],
        params[1],
        { ...defaultMeshBaseParams, ...params[2] }
      );
      /** Whether we should add this {@link MeshBase} to our {@link core/scenes/Scene.Scene | Scene} to let it handle the rendering process automatically */
      __privateAdd(this, _autoRender, true);
      // callbacks / events
      /** function assigned to the {@link onReady} callback */
      this._onReadyCallback = () => {
      };
      /** function assigned to the {@link onBeforeRender} callback */
      this._onBeforeRenderCallback = () => {
      };
      /** function assigned to the {@link onRender} callback */
      this._onRenderCallback = () => {
      };
      /** function assigned to the {@link onAfterRender} callback */
      this._onAfterRenderCallback = () => {
      };
      /** function assigned to the {@link onAfterResize} callback */
      this._onAfterResizeCallback = () => {
      };
      let renderer = params[0];
      const parameters = { ...defaultMeshBaseParams, ...params[2] };
      this.type = "MeshBase";
      this.uuid = generateUUID();
      Object.defineProperty(this, "index", { value: meshIndex++ });
      renderer = isRenderer(renderer, parameters.label ? parameters.label + " " + this.type : this.type);
      this.renderer = renderer;
      const {
        label,
        shaders,
        geometry,
        visible,
        renderOrder,
        outputTarget,
        additionalOutputTargets,
        useCustomScenePassEntry,
        renderBundle,
        texturesOptions,
        autoRender,
        ...meshParameters
      } = parameters;
      this.outputTarget = outputTarget ?? null;
      this.renderBundle = renderBundle ?? null;
      this.additionalOutputTargets = additionalOutputTargets || [];
      meshParameters.sampleCount = !!meshParameters.sampleCount ? meshParameters.sampleCount : this.outputTarget ? this.outputTarget.renderPass.options.sampleCount : this.renderer && this.renderer.renderPass ? this.renderer.renderPass.options.sampleCount : 1;
      this.options = {
        ...this.options ?? {},
        // merge possible lower options?
        label: label ?? "Mesh " + this.renderer.meshes.length,
        ...shaders !== void 0 ? { shaders } : {},
        ...outputTarget !== void 0 && { outputTarget },
        ...renderBundle !== void 0 && { renderBundle },
        texturesOptions,
        ...autoRender !== void 0 && { autoRender },
        useCustomScenePassEntry,
        ...meshParameters
      };
      if (autoRender !== void 0) {
        __privateSet(this, _autoRender, autoRender);
      }
      this.visible = visible;
      this.renderOrder = renderOrder;
      this.ready = false;
      this.userData = {};
      if (geometry) {
        this.useGeometry(geometry);
      }
      this.setMaterial({
        ...this.cleanupRenderMaterialParameters({ ...this.options }),
        ...geometry && { verticesOrder: geometry.verticesOrder, topology: geometry.topology }
      });
      this.addToScene(true);
    }
    /**
     * Get private #autoRender value
     * @readonly
     */
    get autoRender() {
      return __privateGet(this, _autoRender);
    }
    /**
     * Get/set whether a Mesh is ready or not
     * @readonly
     */
    get ready() {
      return this._ready;
    }
    set ready(value) {
      if (value && !this._ready) {
        this._onReadyCallback && this._onReadyCallback();
      }
      this._ready = value;
    }
    /* SCENE */
    /**
     * Add a Mesh to the {@link core/scenes/Scene.Scene | Scene} and optionally to the renderer. Can patch the {@link RenderMaterial} render options to match the {@link RenderPass} used to draw this Mesh.
     * @param addToRenderer - whether to add this Mesh to the {@link Renderer#meshes | Renderer meshes array}
     */
    addToScene(addToRenderer = false) {
      if (addToRenderer) {
        this.renderer.meshes.push(this);
      }
      this.setRenderingOptionsForRenderPass(this.outputTarget ? this.outputTarget.renderPass : this.renderer.renderPass);
      if (__privateGet(this, _autoRender)) {
        this.renderer.scene.addMesh(this);
        if (this.additionalOutputTargets.length) {
          this.additionalOutputTargets.forEach((renderTarget) => {
            this.renderer.scene.addMeshToRenderTargetStack(this, renderTarget);
          });
        }
      }
    }
    /**
     * Remove a Mesh from the {@link core/scenes/Scene.Scene | Scene} and optionally from the renderer as well.
     * @param removeFromRenderer - whether to remove this Mesh from the {@link Renderer#meshes | Renderer meshes array}
     */
    removeFromScene(removeFromRenderer = false) {
      if (__privateGet(this, _autoRender)) {
        this.renderer.scene.removeMesh(this);
      }
      if (removeFromRenderer) {
        this.renderer.meshes = this.renderer.meshes.filter((m) => m.uuid !== this.uuid);
      }
    }
    /**
     * Set a new {@link Renderer} for this Mesh
     * @param renderer - new {@link Renderer} to set
     */
    setRenderer(renderer) {
      renderer = renderer && renderer.renderer || renderer;
      if (!renderer || !(renderer.type === "GPURenderer" || renderer.type === "GPUCameraRenderer" || renderer.type === "GPUCurtainsRenderer")) {
        throwWarning(
          `${this.options.label}: Cannot set ${renderer} as a renderer because it is not of a valid Renderer type.`
        );
        return;
      }
      this.material?.setRenderer(renderer);
      const oldRenderer = this.renderer;
      this.removeFromScene(true);
      this.renderer = renderer;
      this.addToScene(true);
      if (!oldRenderer.meshes.length) {
        oldRenderer.onBeforeRenderScene.add(
          (commandEncoder) => {
            oldRenderer.forceClear(commandEncoder);
          },
          { once: true }
        );
      }
    }
    /**
     * Assign or remove a {@link RenderTarget} to this Mesh.
     * Since this manipulates the {@link core/scenes/Scene.Scene | Scene} stacks, it can be used to remove a {@link RenderTarget} as well.
     * @param outputTarget - the {@link RenderTarget} to assign or null if we want to remove the current {@link RenderTarget}.
     */
    setOutputTarget(outputTarget) {
      if (outputTarget && outputTarget.type !== "RenderTarget") {
        throwWarning(`${this.options.label ?? this.type}: outputTarget is not a RenderTarget: ${outputTarget.type}`);
        return;
      }
      this.removeFromScene();
      this.outputTarget = outputTarget;
      this.addToScene();
    }
    /**
     * Assign or remove a {@link RenderBundle} to this Mesh.
     * @param renderBundle - the {@link RenderBundle} to assign or null if we want to remove the current {@link RenderBundle}.
     * @param updateScene - Whether to remove and then re-add the Mesh from the {@link core/scenes/Scene.Scene | Scene} or not.
     */
    setRenderBundle(renderBundle, updateScene = true) {
      if (updateScene) {
        this.removeFromScene();
        this.renderBundle = renderBundle;
        this.addToScene();
      } else {
        this.renderBundle = renderBundle;
      }
    }
    /**
     * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been lost to prepare everything for restoration.
     * Basically set all the {@link GPUBuffer} to null so they will be reset next time we try to draw the Mesh
     */
    loseContext() {
      this.ready = false;
      this.geometry.loseContext();
      this.material.loseContext();
    }
    /**
     * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been restored
     */
    restoreContext() {
      this.geometry.restoreContext(this.renderer);
      this.material.restoreContext();
    }
    /* SHADERS */
    /**
     * Set default shaders if one or both of them are missing
     */
    setShaders() {
      const { shaders } = this.options;
      if (!shaders) {
        this.options.shaders = {
          vertex: {
            code: getDefaultVertexShaderCode,
            entryPoint: "main"
          },
          fragment: {
            code: getDefaultFragmentCode,
            entryPoint: "main"
          }
        };
      } else {
        if (!shaders.vertex || !shaders.vertex.code) {
          shaders.vertex = {
            code: getDefaultVertexShaderCode,
            entryPoint: "main"
          };
        }
        if (shaders.fragment === void 0 || shaders.fragment && !shaders.fragment.code) {
          shaders.fragment = {
            code: getDefaultFragmentCode,
            entryPoint: "main"
          };
        }
      }
    }
    /* GEOMETRY */
    /**
     * Set or update the Mesh {@link Geometry}
     * @param geometry - new {@link Geometry} to use
     */
    useGeometry(geometry) {
      if (this.geometry) {
        if (geometry.shouldCompute) {
          geometry.computeGeometry();
        }
        if (this.geometry.layoutCacheKey !== geometry.layoutCacheKey) {
          throwWarning(
            `${this.options.label} (${this.type}): the current and new geometries do not have the same vertexBuffers layout, causing a probable pipeline recompilation. This should be avoided.

Current geometry layout:

${this.geometry.wgslStructFragment}

--------

New geometry layout:

${geometry.wgslStructFragment}`
          );
          this.material.setAttributesFromGeometry(geometry);
          this.material.setPipelineEntry();
        }
        this.geometry.consumers.delete(this.uuid);
        if (this.options.renderBundle) {
          this.options.renderBundle.ready = false;
        }
      }
      this.geometry = geometry;
      this.geometry.consumers.add(this.uuid);
      this.computeGeometry();
      if (this.material) {
        const renderingOptions = {
          ...this.material.options.rendering,
          ...{ verticesOrder: geometry.verticesOrder, topology: geometry.topology }
        };
        this.material.setRenderingOptions(renderingOptions);
      }
    }
    /**
     * Compute the Mesh geometry if needed
     */
    computeGeometry() {
      if (this.geometry.shouldCompute) {
        this.geometry.computeGeometry();
      }
    }
    /**
     * Set our Mesh geometry: create buffers and add attributes to material
     */
    setGeometry() {
      if (this.geometry) {
        if (!this.geometry.ready) {
          this.geometry.createBuffers({
            renderer: this.renderer,
            label: this.options.label + " geometry"
          });
        }
        this.setMaterialGeometryAttributes();
      }
    }
    /* MATERIAL */
    /**
     * Set or update the {@link RenderMaterial} {@link types/Materials.RenderMaterialRenderingOptions | rendering options} to match the {@link RenderPass#descriptor | RenderPass descriptor} used to draw this Mesh.
     * @param renderPass - {@link RenderPass | RenderPass} used to draw this Mesh, default to the {@link core/renderers/GPURenderer.GPURenderer#renderPass | renderer renderPass}.
     */
    setRenderingOptionsForRenderPass(renderPass) {
      const renderingOptions = {
        // transparency (blend)
        transparent: this.transparent,
        // sample count
        sampleCount: renderPass.options.sampleCount,
        // color attachments
        ...renderPass.options.colorAttachments.length && {
          targets: renderPass.options.colorAttachments.map((colorAttachment, index) => {
            return {
              // patch format...
              format: colorAttachment.targetFormat,
              // ...but keep original blend values if any
              ...this.options.targets?.length && this.options.targets[index] && this.options.targets[index].blend && {
                blend: this.options.targets[index].blend
              }
            };
          })
        },
        // depth
        depth: renderPass.options.useDepth,
        ...renderPass.options.useDepth && {
          depthFormat: renderPass.options.depthFormat
        }
      };
      this.material?.setRenderingOptions({ ...this.material.options.rendering, ...renderingOptions });
    }
    /**
     * Hook used to clean up parameters before sending them to the {@link RenderMaterial}.
     * @param parameters - parameters to clean before sending them to the {@link RenderMaterial}
     * @returns - cleaned parameters
     */
    cleanupRenderMaterialParameters(parameters) {
      delete parameters.additionalOutputTargets;
      delete parameters.autoRender;
      delete parameters.outputTarget;
      delete parameters.renderBundle;
      delete parameters.texturesOptions;
      delete parameters.useCustomScenePassEntry;
      return parameters;
    }
    /**
     * Set or update the Mesh {@link RenderMaterial}
     * @param material - new {@link RenderMaterial} to use
     */
    useMaterial(material) {
      let currentCacheKey = null;
      if (this.material) {
        if (this.geometry) {
          currentCacheKey = this.material.cacheKey;
        }
        if (this.options.renderBundle) {
          this.options.renderBundle.ready = false;
        }
      }
      this.material = material;
      if (this.geometry) {
        this.material.setAttributesFromGeometry(this.geometry);
      }
      this.transparent = this.material.options.rendering.transparent;
      if (currentCacheKey && currentCacheKey !== this.material.cacheKey) {
        if (this.material.ready) {
          this.material.setPipelineEntry();
        } else {
          this.material.compileMaterial();
        }
      }
    }
    /**
     * Patch the shaders if needed, then set the Mesh material
     * @param meshParameters - {@link RenderMaterialParams | RenderMaterial parameters}
     */
    setMaterial(meshParameters) {
      this.setShaders();
      meshParameters.shaders = this.options.shaders;
      meshParameters.label = meshParameters.label + " material";
      this.useMaterial(new RenderMaterial(this.renderer, meshParameters));
    }
    /**
     * Set Mesh material attributes
     */
    setMaterialGeometryAttributes() {
      if (this.material && !this.material.attributes) {
        this.material.setAttributesFromGeometry(this.geometry);
      }
    }
    /**
     * Get the transparent property value
     */
    get transparent() {
      return this._transparent;
    }
    /**
     * Set the transparent property value. Update the {@link RenderMaterial} rendering options and {@link core/scenes/Scene.Scene | Scene} stack if needed.
     * @param value
     */
    set transparent(value) {
      const switchTransparency = this.transparent !== void 0 && value !== this.transparent;
      if (switchTransparency) {
        this.removeFromScene();
      }
      this._transparent = value;
      if (switchTransparency) {
        this.addToScene();
      }
    }
    /**
     * Get the visible property value
     */
    get visible() {
      return this._visible;
    }
    /**
     * Set the visible property value
     * @param value - new visibility value
     */
    set visible(value) {
      this._visible = value;
    }
    /* TEXTURES */
    /**
     * Get our {@link RenderMaterial#textures | RenderMaterial textures array}.
     * @readonly
     */
    get textures() {
      return this.material?.textures || [];
    }
    /**
     * Create a new {@link MediaTexture}.
     * @param options - {@link MediaTextureParams | MediaTexture parameters}.
     * @returns - newly created {@link MediaTexture}.
     */
    createMediaTexture(options) {
      if (!options.name) {
        options.name = "texture" + this.textures.length;
      }
      if (!options.label) {
        options.label = this.options.label + " " + options.name;
      }
      const texturesOptions = { ...options, ...this.options.texturesOptions };
      if (this.renderBundle) {
        texturesOptions.useExternalTextures = false;
      }
      const mediaTexture = new MediaTexture(this.renderer, texturesOptions);
      this.addTexture(mediaTexture);
      return mediaTexture;
    }
    /**
     * Create a new {@link Texture}
     * @param  options - {@link TextureParams | Texture parameters}
     * @returns - newly created {@link Texture}
     */
    createTexture(options) {
      if (!options.name) {
        options.name = "texture" + this.textures.length;
      }
      const texture = new Texture(this.renderer, options);
      this.addTexture(texture);
      return texture;
    }
    /**
     * Add a {@link Texture} or {@link MediaTexture}.
     * @param texture - {@link Texture} or {@link MediaTexture} to add.
     */
    addTexture(texture) {
      if (this.renderBundle) {
        this.renderBundle.ready = false;
      }
      this.material.addTexture(texture);
    }
    /* BINDINGS */
    /**
     * Get the current {@link RenderMaterial} uniforms
     * @readonly
     */
    get uniforms() {
      return this.material?.uniforms;
    }
    /**
     * Get the current {@link RenderMaterial} storages
     * @readonly
     */
    get storages() {
      return this.material?.storages;
    }
    /* RESIZE */
    /**
     * Resize the Mesh.
     * @param boundingRect - optional new {@link DOMElementBoundingRect} to use.
     */
    resize(boundingRect) {
      if (super.resize) {
        super.resize(boundingRect);
      }
      this.resizeTextures();
      this._onAfterResizeCallback && this._onAfterResizeCallback();
    }
    /**
     * Resize the {@link textures}.
     */
    resizeTextures() {
      this.textures?.forEach((texture) => {
        if (texture.options.fromTexture) {
          texture.copy(texture.options.fromTexture);
        }
      });
    }
    /* EVENTS */
    /**
     * Callback to execute when a Mesh is ready - i.e. its {@link material} and {@link geometry} are ready.
     * @param callback - Callback to run when {@link MeshBase} is ready.
     * @returns - Our Mesh.
     */
    onReady(callback) {
      if (callback) {
        this._onReadyCallback = callback;
      }
      return this;
    }
    /**
     * Callback to execute before updating the {@link core/scenes/Scene.Scene | Scene} matrix stack. This means it is called early and allows to update transformations values before actually setting the Mesh matrices (if any). This also means it won't be called if the Mesh has not been added to the {@link core/scenes/Scene.Scene | Scene}. The callback won't be called if the {@link Renderer} is not ready or the Mesh itself is neither {@link ready} nor {@link visible}.
     * @param callback - Callback to run just before updating the {@link core/scenes/Scene.Scene | Scene} matrix stack.
     * @returns - Our Mesh
     */
    onBeforeRender(callback) {
      if (callback) {
        this._onBeforeRenderCallback = callback;
      }
      return this;
    }
    /**
     * Callback to execute right before actually rendering the Mesh. Useful to update uniforms for example. The callback won't be called if the {@link Renderer} is not ready or the Mesh itself is neither {@link ready} nor {@link visible}.
     * @param callback - Callback to run just before rendering the {@link MeshBase}.
     * @returns - Our Mesh.
     */
    onRender(callback) {
      if (callback) {
        this._onRenderCallback = callback;
      }
      return this;
    }
    /**
     * Callback to execute just after a Mesh has been rendered. The callback won't be called if the {@link Renderer} is not ready or the Mesh itself is neither {@link ready} nor {@link visible}.
     * @param callback - Callback to run just after {@link MeshBase} has been rendered.
     * @returns - Our Mesh.
     */
    onAfterRender(callback) {
      if (callback) {
        this._onAfterRenderCallback = callback;
      }
      return this;
    }
    /**
     * Callback to execute just after a Mesh has been resized.
     * @param callback - Callback to run just after {@link MeshBase} has been resized.
     * @returns - Our Mesh.
     */
    onAfterResize(callback) {
      if (callback) {
        this._onAfterResizeCallback = callback;
      }
      return this;
    }
    /* RENDER */
    /**
     * Execute {@link onBeforeRender} callback if needed. Called by the {@link core/scenes/Scene.Scene | Scene} before updating the matrix stack.
     */
    onBeforeRenderScene() {
      if (!this.renderer.ready || !this.ready || !this.visible) return;
      this._onBeforeRenderCallback && this._onBeforeRenderCallback();
    }
    /**
     * Called before rendering the Mesh.
     * Set the geometry if needed (create buffers and add attributes to the {@link RenderMaterial}).
     * Then executes {@link RenderMaterial#onBeforeRender}: create its bind groups and pipeline if needed and eventually update its bindings.
     */
    onBeforeRenderPass() {
      if (!this.renderer.ready) return;
      this.setGeometry();
      if (this.visible && this.ready) {
        this._onRenderCallback && this._onRenderCallback();
      }
      this.material.onBeforeRender();
      this.ready = this.material && this.material.ready && this.geometry && this.geometry.ready;
    }
    /**
     * Render our {@link MeshBase} if the {@link RenderMaterial} is ready.
     * @param pass - Current render pass encoder.
     */
    onRenderPass(pass) {
      if (!this.ready) return;
      this.renderPass(pass);
    }
    /**
     * Render the {@link material} and {@link geometry}.
     * @param pass - Current render pass encoder.
     */
    renderPass(pass) {
      this.material.render(pass);
      this.geometry.render(pass);
    }
    /**
     * Called after having rendered the Mesh.
     */
    onAfterRenderPass() {
      this._onAfterRenderCallback && this._onAfterRenderCallback();
    }
    /**
     * Render our Mesh:
     * - Execute {@link onBeforeRenderPass}.
     * - Stop here if {@link Renderer} is not ready or Mesh is not {@link visible}.
     * - Execute super render call if it exists.
     * - {@link onRenderPass | render} our {@link material} and {@link geometry}.
     * - Execute {@link onAfterRenderPass}.
     * @param pass - Current render pass encoder.
     */
    render(pass) {
      this.onBeforeRenderPass();
      if (!this.renderer.ready || !this.visible) return;
      !this.renderer.production && pass.pushDebugGroup(this.options.label);
      this.onRenderPass(pass);
      !this.renderer.production && pass.popDebugGroup();
      this.onAfterRenderPass();
    }
    /* DESTROY */
    /**
     * Remove the Mesh from the {@link core/scenes/Scene.Scene | Scene} and destroy it.
     */
    remove() {
      this.removeFromScene(true);
      this.destroy();
      if (!this.renderer.meshes.length) {
        this.renderer.onBeforeRenderScene.add(
          (commandEncoder) => {
            this.renderer.forceClear(commandEncoder);
          },
          { once: true }
        );
      }
    }
    /**
     * Destroy the Mesh.
     */
    destroy() {
      if (super.destroy) {
        super.destroy();
      }
      this.material?.destroy();
      this.geometry.consumers.delete(this.uuid);
      if (!this.geometry.consumers.size) {
        this.geometry?.destroy(this.renderer);
      }
    }
  }, _autoRender = new WeakMap(), _a;
}

export { MeshBaseMixin };
