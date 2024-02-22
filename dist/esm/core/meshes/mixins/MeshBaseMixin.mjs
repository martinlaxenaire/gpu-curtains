import { generateUUID, throwWarning } from '../../../utils/utils.mjs';
import { isRenderer } from '../../renderers/utils.mjs';
import { RenderMaterial } from '../../materials/RenderMaterial.mjs';
import { Texture } from '../../textures/Texture.mjs';
import { Geometry } from '../../geometries/Geometry.mjs';
import { RenderTexture } from '../../textures/RenderTexture.mjs';
import default_vsWgsl from '../../shaders/chunks/default_vs.wgsl.mjs';
import default_fsWgsl from '../../shaders/chunks/default_fs.wgsl.mjs';

var __accessCheck = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateGet = (obj, member, getter) => {
  __accessCheck(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateSet = (obj, member, value, setter) => {
  __accessCheck(obj, member, "write to private field");
  setter ? setter.call(obj, value) : member.set(obj, value);
  return value;
};
let meshIndex = 0;
const defaultMeshBaseParams = {
  // geometry
  geometry: new Geometry(),
  // material
  shaders: {},
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
  texturesOptions: {}
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
      renderer = renderer && renderer.renderer || renderer;
      isRenderer(renderer, parameters.label ? parameters.label + " " + this.type : this.type);
      this.renderer = renderer;
      const {
        label,
        shaders,
        geometry,
        visible,
        renderOrder,
        outputTarget,
        texturesOptions,
        autoRender,
        ...meshParameters
      } = parameters;
      this.outputTarget = outputTarget ?? null;
      meshParameters.sampleCount = !!meshParameters.sampleCount ? meshParameters.sampleCount : this.outputTarget ? this.outputTarget.renderPass.options.sampleCount : this.renderer && this.renderer.renderPass ? this.renderer.renderPass.options.sampleCount : 1;
      this.options = {
        ...this.options ?? {},
        // merge possible lower options?
        label: label ?? "Mesh " + this.renderer.meshes.length,
        shaders,
        texturesOptions,
        ...outputTarget !== void 0 && { outputTarget },
        ...autoRender !== void 0 && { autoRender },
        ...meshParameters
      };
      this.geometry = geometry;
      if (autoRender !== void 0) {
        __privateSet(this, _autoRender, autoRender);
      }
      this.visible = visible;
      this.renderOrder = renderOrder;
      this.ready = false;
      this.userData = {};
      this.computeGeometry();
      this.setMaterial({
        ...this.cleanupRenderMaterialParameters({ ...this.options }),
        verticesOrder: geometry.verticesOrder,
        topology: geometry.topology
      });
      this.addToScene();
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
      if (value) {
        this._onReadyCallback && this._onReadyCallback();
      }
      this._ready = value;
    }
    /* SCENE */
    /**
     * Add a Mesh to the renderer and the {@link core/scenes/Scene.Scene | Scene}. Can patch the {@link RenderMaterial} render options to match the {@link RenderPass} used to draw this Mesh.
     */
    addToScene() {
      this.renderer.meshes.push(this);
      this.setRenderingOptionsForRenderPass(this.outputTarget ? this.outputTarget.renderPass : this.renderer.renderPass);
      if (__privateGet(this, _autoRender)) {
        this.renderer.scene.addMesh(this);
      }
    }
    /**
     * Remove a Mesh from the renderer and the {@link core/scenes/Scene.Scene | Scene}
     */
    removeFromScene() {
      if (__privateGet(this, _autoRender)) {
        this.renderer.scene.removeMesh(this);
      }
      this.renderer.meshes = this.renderer.meshes.filter((m) => m.uuid !== this.uuid);
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
      const oldRenderer = this.renderer;
      this.removeFromScene();
      this.renderer = renderer;
      this.addToScene();
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
     * Assign or remove a {@link RenderTarget} to this Mesh
     * Since this manipulates the {@link core/scenes/Scene.Scene | Scene} stacks, it can be used to remove a RenderTarget as well.
     * @param outputTarget - the RenderTarget to assign or null if we want to remove the current RenderTarget
     */
    setOutputTarget(outputTarget) {
      if (outputTarget && outputTarget.type !== "RenderTarget") {
        throwWarning(`${this.options.label ?? this.type}: outputTarget is not a RenderTarget: ${outputTarget}`);
        return;
      }
      this.removeFromScene();
      this.outputTarget = outputTarget;
      this.addToScene();
    }
    /**
     * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been lost to prepare everything for restoration.
     * Basically set all the {@link GPUBuffer} to null so they will be reset next time we try to draw the Mesh
     */
    loseContext() {
      this.geometry.vertexBuffers.forEach((vertexBuffer) => {
        vertexBuffer.buffer = null;
      });
      if ("indexBuffer" in this.geometry) {
        this.geometry.indexBuffer.buffer = null;
      }
      this.material.loseContext();
    }
    /**
     * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been restored
     */
    restoreContext() {
      this.material.restoreContext();
    }
    /* SHADERS */
    /**
     * Set default shaders if one or both of them are missing
     */
    setShaders() {
      let { shaders } = this.options;
      if (!shaders) {
        shaders = {
          vertex: {
            code: default_vsWgsl,
            entryPoint: "main"
          },
          fragment: {
            code: default_fsWgsl,
            entryPoint: "main"
          }
        };
      } else {
        if (!shaders.vertex || !shaders.vertex.code) {
          shaders.vertex = {
            code: default_vsWgsl,
            entryPoint: "main"
          };
        }
        if (shaders.fragment === void 0 || shaders.fragment && !shaders.fragment.code) {
          shaders.fragment = {
            code: default_fsWgsl,
            entryPoint: "main"
          };
        }
      }
    }
    /* GEOMETRY */
    /**
     * Compute the Mesh geometry if needed
     */
    computeGeometry() {
      if (this.geometry.shouldCompute) {
        this.geometry.computeGeometry();
      }
    }
    /**
     * Create the Mesh Geometry vertex and index buffers if needed
     */
    createGeometryBuffers() {
      if (!this.geometry.ready) {
        this.geometry.vertexBuffers.forEach((vertexBuffer) => {
          if (!vertexBuffer.buffer) {
            vertexBuffer.buffer = this.renderer.createBuffer({
              label: this.options.label + " geometry: " + vertexBuffer.name + " buffer",
              size: vertexBuffer.array.byteLength,
              usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
            });
            this.renderer.queueWriteBuffer(vertexBuffer.buffer, 0, vertexBuffer.array);
          }
        });
        if ("indexBuffer" in this.geometry && this.geometry.indexBuffer && !this.geometry.indexBuffer.buffer) {
          this.geometry.indexBuffer.buffer = this.renderer.createBuffer({
            label: this.options.label + " geometry: index buffer",
            size: this.geometry.indexBuffer.array.byteLength,
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
          });
          this.renderer.queueWriteBuffer(this.geometry.indexBuffer.buffer, 0, this.geometry.indexBuffer.array);
        }
      }
    }
    /**
     * Set our Mesh geometry: create buffers and add attributes to material
     */
    setGeometry() {
      if (this.geometry && this.renderer.ready) {
        this.createGeometryBuffers();
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
        sampleCount: renderPass.options.sampleCount,
        // color attachments
        ...renderPass.options.colorAttachments.length && {
          targetFormat: renderPass.options.colorAttachments[0].targetFormat,
          // multiple render targets?
          ...renderPass.options.colorAttachments.length > 1 && {
            additionalTargets: renderPass.options.colorAttachments.filter((c, i) => i > 0).map((colorAttachment) => {
              return {
                format: colorAttachment.targetFormat
              };
            })
          }
        },
        // depth
        depth: renderPass.options.useDepth,
        ...renderPass.options.useDepth && {
          depthFormat: renderPass.options.depthFormat
        }
      };
      this.material?.setRenderingOptions(renderingOptions);
    }
    /**
     * Hook used to clean up parameters before sending them to the {@link RenderMaterial}.
     * @param parameters - parameters to clean before sending them to the {@link RenderMaterial}
     * @returns - cleaned parameters
     */
    cleanupRenderMaterialParameters(parameters) {
      delete parameters.texturesOptions;
      delete parameters.outputTarget;
      delete parameters.autoRender;
      return parameters;
    }
    /**
     * Set a Mesh transparent property, then set its material
     * @param meshParameters - {@link RenderMaterialParams | RenderMaterial parameters}
     */
    setMaterial(meshParameters) {
      this.transparent = meshParameters.transparent;
      this.setShaders();
      this.material = new RenderMaterial(this.renderer, meshParameters);
      this.material.options.textures?.filter((texture) => texture instanceof Texture).forEach((texture) => this.onTextureAdded(texture));
    }
    /**
     * Set Mesh material attributes
     */
    setMaterialGeometryAttributes() {
      if (this.material && !this.material.attributes) {
        this.material.setAttributesFromGeometry(this.geometry);
      }
    }
    /* TEXTURES */
    /**
     * Get our {@link RenderMaterial#textures | RenderMaterial textures array}
     * @readonly
     */
    get textures() {
      return this.material?.textures || [];
    }
    /**
     * Get our {@link RenderMaterial#renderTextures | RenderMaterial render textures array}
     * @readonly
     */
    get renderTextures() {
      return this.material?.renderTextures || [];
    }
    /**
     * Create a new {@link Texture}
     * @param options - {@link TextureParams | Texture parameters}
     * @returns - newly created {@link Texture}
     */
    createTexture(options) {
      if (!options.name) {
        options.name = "texture" + this.textures.length;
      }
      if (!options.label) {
        options.label = this.options.label + " " + options.name;
      }
      const texture = new Texture(this.renderer, { ...options, ...this.options.texturesOptions });
      this.addTexture(texture);
      return texture;
    }
    /**
     * Add a {@link Texture}
     * @param texture - {@link Texture} to add
     */
    addTexture(texture) {
      this.material.addTexture(texture);
      this.onTextureAdded(texture);
    }
    /**
     * Callback run when a new {@link Texture} has been added
     * @param texture - newly created Texture
     */
    onTextureAdded(texture) {
      texture.parentMesh = this;
    }
    /**
     * Create a new {@link RenderTexture}
     * @param  options - {@link RenderTextureParams | RenderTexture parameters}
     * @returns - newly created {@link RenderTexture}
     */
    createRenderTexture(options) {
      if (!options.name) {
        options.name = "renderTexture" + this.renderTextures.length;
      }
      const renderTexture = new RenderTexture(this.renderer, options);
      this.addRenderTexture(renderTexture);
      return renderTexture;
    }
    /**
     * Add a {@link RenderTexture}
     * @param renderTexture - {@link RenderTexture} to add
     */
    addRenderTexture(renderTexture) {
      this.material.addTexture(renderTexture);
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
     * Resize the Mesh's textures
     * @param boundingRect
     */
    resize(boundingRect) {
      if (super.resize) {
        super.resize(boundingRect);
      }
      this.renderTextures?.forEach((renderTexture) => {
        if (renderTexture.options.fromTexture) {
          renderTexture.copy(renderTexture.options.fromTexture);
        }
      });
      this.textures?.forEach((texture) => {
        texture.resize();
      });
      this._onAfterResizeCallback && this._onAfterResizeCallback();
    }
    /* EVENTS */
    /**
     * Assign a callback function to _onReadyCallback
     * @param callback - callback to run when {@link MeshBase} is ready
     * @returns - our Mesh
     */
    onReady(callback) {
      if (callback) {
        this._onReadyCallback = callback;
      }
      return this;
    }
    /**
     * Assign a callback function to _onBeforeRenderCallback
     * @param callback - callback to run just before {@link MeshBase} will be rendered
     * @returns - our Mesh
     */
    onBeforeRender(callback) {
      if (callback) {
        this._onBeforeRenderCallback = callback;
      }
      return this;
    }
    /**
     * Assign a callback function to _onRenderCallback
     * @param callback - callback to run when {@link MeshBase} is rendered
     * @returns - our Mesh
     */
    onRender(callback) {
      if (callback) {
        this._onRenderCallback = callback;
      }
      return this;
    }
    /**
     * Assign a callback function to _onAfterRenderCallback
     * @param callback - callback to run just after {@link MeshBase} has been rendered
     * @returns - our Mesh
     */
    onAfterRender(callback) {
      if (callback) {
        this._onAfterRenderCallback = callback;
      }
      return this;
    }
    /**
     * Assign a callback function to _onAfterResizeCallback
     * @param callback - callback to run just after {@link MeshBase} has been resized
     * @returns - our Mesh
     */
    onAfterResize(callback) {
      if (callback) {
        this._onAfterResizeCallback = callback;
      }
      return this;
    }
    /* RENDER */
    /**
     * Called before rendering the Mesh
     * Set the geometry if needed (create buffers and add attributes to the {@link RenderMaterial})
     * Then executes {@link RenderMaterial#onBeforeRender}: create its bind groups and pipeline if needed and eventually update its struct
     */
    onBeforeRenderPass() {
      if (!this.renderer.ready)
        return;
      if (this.material && this.material.ready && this.geometry && this.geometry.ready && !this.ready) {
        this.ready = true;
      }
      this.setGeometry();
      this._onBeforeRenderCallback && this._onBeforeRenderCallback();
      this.material.onBeforeRender();
    }
    /**
     * Render our {@link MeshBase} if the {@link RenderMaterial} is ready
     * @param pass - current render pass encoder
     */
    onRenderPass(pass) {
      if (!this.material.ready)
        return;
      this._onRenderCallback && this._onRenderCallback();
      this.material.render(pass);
      this.geometry.render(pass);
    }
    /**
     * Called after having rendered the Mesh
     */
    onAfterRenderPass() {
      this._onAfterRenderCallback && this._onAfterRenderCallback();
    }
    /**
     * Render our Mesh
     * - Execute {@link onBeforeRenderPass}
     * - Stop here if {@link Renderer} is not ready or Mesh is not {@link visible}
     * - Execute super render call if it exists
     * - {@link onRenderPass | render} our {@link material} and {@link geometry}
     * - Execute {@link onAfterRenderPass}
     * @param pass - current render pass encoder
     */
    render(pass) {
      this.onBeforeRenderPass();
      if (!this.renderer.ready || !this.visible)
        return;
      if (super.render) {
        super.render();
      }
      !this.renderer.production && pass.pushDebugGroup(this.options.label);
      this.onRenderPass(pass);
      !this.renderer.production && pass.popDebugGroup();
      this.onAfterRenderPass();
    }
    /* DESTROY */
    /**
     * Remove the Mesh from the {@link core/scenes/Scene.Scene | Scene} and destroy it
     */
    remove() {
      this.removeFromScene();
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
     * Destroy the Mesh
     */
    destroy() {
      if (super.destroy) {
        super.destroy();
      }
      this.material?.destroy();
      this.geometry.vertexBuffers.forEach((vertexBuffer) => {
        this.renderer.removeBuffer(
          vertexBuffer.buffer,
          this.options.label + " geometry: " + vertexBuffer.name + " buffer"
        );
      });
      if ("indexBuffer" in this.geometry) {
        this.renderer.removeBuffer(this.geometry.indexBuffer.buffer);
      }
      this.geometry?.destroy();
    }
  }, _autoRender = new WeakMap(), _a;
}

export { MeshBaseMixin };
//# sourceMappingURL=MeshBaseMixin.mjs.map
