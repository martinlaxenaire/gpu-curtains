import { isRenderer } from '../renderers/utils.mjs';
import { generateUUID, throwWarning } from '../../utils/utils.mjs';
import { BufferBinding } from '../bindings/BufferBinding.mjs';

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
var __privateMethod = (obj, member, method) => {
  __accessCheck(obj, member, "access private method");
  return method;
};
var _useProjection, _ready, _setBinding, setBinding_fn, _patchBindingOffset, patchBindingOffset_fn, _onSizeChanged, onSizeChanged_fn, _setDescriptor, setDescriptor_fn, _encodeRenderCommands, encodeRenderCommands_fn;
let bundleIndex = 0;
class RenderBundle {
  /**
   * RenderBundle constructor
   * @param renderer - {@link Renderer} class object used to create this {@link RenderBundle}.
   * @param parameters - {@link RenderBundleParams | parameters} use to create this {@link RenderBundle}.
   */
  constructor(renderer, {
    label = "",
    renderPass = null,
    renderOrder = 0,
    transparent = null,
    visible = true,
    size = 0,
    useBuffer = false
  } = {}) {
    /**
     * Set the {@link binding} and patches its array and buffer size if needed.
     * @private
     */
    __privateAdd(this, _setBinding);
    /**
     * Path the {@link binding} array and buffer size with the minimum {@link Renderer#device | device} buffer offset alignment.
     * @param size - new {@link binding} size to use.
     * @private
     */
    __privateAdd(this, _patchBindingOffset);
    /**
     * Called each time the {@link RenderBundle} size has actually changed.
     * @param newSize - new {@link RenderBundle} size to set.
     * @private
     */
    __privateAdd(this, _onSizeChanged);
    /**
     * Set the {@link descriptor} based on the {@link RenderBundleOptions#renderPass | render pass}.
     * @private
     */
    __privateAdd(this, _setDescriptor);
    /**
     * Create the {@link encoder} and {@link bundle} used by this {@link RenderBundle}.
     * @private
     */
    __privateAdd(this, _encodeRenderCommands);
    /** @ignore */
    // whether this render bundle should be added to the 'projected' or 'unProjected' Scene stacks.
    __privateAdd(this, _useProjection, void 0);
    /** @ignore */
    __privateAdd(this, _ready, void 0);
    this.type = "RenderBundle";
    renderer = isRenderer(renderer, this.type);
    this.renderer = renderer;
    this.uuid = generateUUID();
    Object.defineProperty(this, "index", { value: bundleIndex++ });
    this.renderOrder = renderOrder;
    this.renderer.renderBundles.push(this);
    this.transparent = transparent;
    this.visible = visible;
    this.options = {
      label,
      renderPass,
      useBuffer,
      size
    };
    if (renderPass) {
      __privateMethod(this, _setDescriptor, setDescriptor_fn).call(this);
    }
    this.meshes = /* @__PURE__ */ new Map();
    this.encoder = null;
    this.bundle = null;
    __privateSet(this, _ready, false);
    this.binding = null;
    if (this.options.useBuffer) {
      __privateSet(this, _useProjection, true);
      if (this.options.size !== 0) {
        __privateMethod(this, _setBinding, setBinding_fn).call(this);
      } else {
        this.options.useBuffer = false;
        if (!this.renderer.production) {
          throwWarning(
            `${this.options.label} (${this.type}): Cannot use a single transformation buffer if the size parameter has not been set upon creation.`
          );
        }
      }
    }
  }
  /**
   * Get whether our {@link RenderBundle} handles {@link core/renderers/GPURenderer.ProjectedMesh | projected meshes} or not (useful to know in which {@link core/scenes/Scene.Scene | Scene} stack it has been added.
   * @readonly
   * @returns - Whether our {@link RenderBundle} handles {@link core/renderers/GPURenderer.ProjectedMesh | projected meshes} or not.
   */
  get useProjection() {
    return __privateGet(this, _useProjection);
  }
  /**
   * Set whether our {@link RenderBundle} handles {@link core/renderers/GPURenderer.ProjectedMesh | projected meshes} or not.
   * @param value - New projection value.
   */
  set useProjection(value) {
    __privateSet(this, _useProjection, value);
  }
  /**
   * Set the new {@link RenderBundle} size.
   * @param value - New size to set.
   */
  set size(value) {
    if (value !== this.options.size) {
      if (this.ready && !this.renderer.production) {
        throwWarning(
          `${this.options.label} (${this.type}): The content of a render bundle is meant to be static. You should not change its size after it has been created.`
        );
      }
      __privateMethod(this, _onSizeChanged, onSizeChanged_fn).call(this, value);
      this.options.size = value;
    }
  }
  /**
   * Get whether our {@link RenderBundle} is ready.
   * @readonly
   * @returns - Whether our {@link RenderBundle} is ready.
   */
  get ready() {
    return __privateGet(this, _ready);
  }
  /**
   * Set whether our {@link RenderBundle} is ready and encode it if needed.
   * @param value - New ready state.
   */
  set ready(value) {
    if (value && !this.ready) {
      __privateMethod(this, _encodeRenderCommands, encodeRenderCommands_fn).call(this);
    } else if (!value && this.ready) {
      this.bundle = null;
    }
    __privateSet(this, _ready, value);
  }
  /**
   * Add a {@link RenderedMesh | mesh} to this {@link RenderBundle}. Can set the {@link RenderBundleOptions#renderPass | render pass} if needed. If the {@link RenderBundleOptions#renderPass | render pass} is already set and the {@link mesh} output {@link RenderPass} does not match, it won't be added.
   * @param mesh - {@link RenderedMesh | Mesh} to eventually add.
   * @param outputPass - The mesh output {@link RenderPass}.
   */
  addMesh(mesh, outputPass) {
    if (!this.options.renderPass) {
      this.options.renderPass = outputPass;
      __privateMethod(this, _setDescriptor, setDescriptor_fn).call(this);
    } else if (outputPass.uuid !== this.options.renderPass.uuid) {
      throwWarning(
        `${this.options.label} (${this.type}): Cannot add Mesh ${mesh.options.label} to this render bundle because the output render passes do not match.`
      );
      mesh.renderBundle = null;
      return;
    }
    if (this.ready && !this.renderer.production) {
      throwWarning(
        `${this.options.label} (${this.type}): The content of a render bundle is meant to be static. You should not add meshes to it after it has been created (mesh added: ${mesh.options.label}).`
      );
    }
    this.ready = false;
    this.meshes.set(mesh.uuid, mesh);
    this.size = this.meshes.size;
  }
  /**
   * Remove a {@link mesh} from this {@link RenderBundle}.
   * @param mesh - {@link RenderedMesh | Mesh} to remove.
   * @param keepMesh - Whether to preserve the {@link mesh} in order to render it normally again. Default to `true`.
   */
  removeMesh(mesh, keepMesh = true) {
    if (this.ready && !this.renderer.production) {
      throwWarning(
        `${this.options.label} (${this.type}): The content of a render bundle is meant to be static. You should not remove meshes from it after it has been created (mesh removed: ${mesh.options.label}).`
      );
    }
    this.ready = false;
    this.meshes.delete(mesh.uuid);
    mesh.setRenderBundle(null, false);
    this.size = this.meshes.size;
    if (this.meshes.size === 0) {
      this.options.renderPass = null;
      this.descriptor = null;
    }
    if (keepMesh) {
      if (mesh.type === "ShaderPass") {
        this.renderer.scene.addShaderPass(mesh);
      } else if (mesh.type === "PingPongPlane") {
        this.renderer.scene.addPingPongPlane(mesh);
      } else {
        this.renderer.scene.addMesh(mesh);
      }
    }
  }
  /**
   * Update the {@link binding} buffer if needed.
   */
  updateBinding() {
    if (this.binding && this.binding.shouldUpdate && this.binding.buffer.GPUBuffer) {
      this.renderer.queueWriteBuffer(this.binding.buffer.GPUBuffer, 0, this.binding.arrayBuffer);
      this.binding.shouldUpdate = false;
    }
  }
  /**
   * Render the {@link RenderBundle}.
   *
   * If it is ready, execute each {@link RenderedMesh#onBeforeRenderPass | mesh onBeforeRenderPass method}, {@link updateBinding | update the binding} if needed, execute the {@link bundle} and finally execute each {@link RenderedMesh#onAfterRenderPass | mesh onAfterRenderPass method}.
   *
   * If not, just render its {@link meshes} as usual and check whether they are all ready and if we can therefore encode our {@link RenderBundle}.
   * @param pass - {@link GPURenderPassEncoder} to use.
   */
  render(pass) {
    if (this.ready && this.bundle && this.visible) {
      this.meshes.forEach((mesh) => {
        mesh.onBeforeRenderPass();
      });
      this.updateBinding();
      this.renderer.pipelineManager.resetCurrentPipeline();
      pass.executeBundles([this.bundle]);
      this.renderer.pipelineManager.resetCurrentPipeline();
      this.meshes.forEach((mesh) => {
        mesh.onAfterRenderPass();
      });
    }
    if (!this.ready) {
      let isReady = true;
      for (const [_key, mesh] of this.meshes) {
        mesh.render(pass);
        if (!mesh.ready) {
          isReady = false;
        }
      }
      this.ready = isReady;
    }
  }
  /**
   * Called when the {@link Renderer#device | WebGPU device} has been lost.
   * Just set the {@link ready} flag to `false` to eventually invalidate the {@link bundle}.
   */
  loseContext() {
    this.ready = false;
  }
  /**
   * Destroy the {@link RenderBundle} but preserve the {@link meshes} and render them normally again.
   */
  remove() {
    this.destroy(true);
  }
  /**
   * Remove the {@link RenderBundle} from our {@link core/scenes/Scene.Scene | Scene} and eventually destroy the {@link binding}. Can also reset all the {@link meshes} so they can be drawn normally again.
   * @param keepMeshes - Whether to preserve the {@link meshes} in order to render them normally again.
   */
  destroy(keepMeshes = false) {
    this.ready = false;
    this.renderer.scene.removeRenderBundle(this);
    this.meshes.forEach((mesh) => {
      this.meshes.delete(mesh.uuid);
      mesh.setRenderBundle(null, false);
      if (keepMeshes) {
        this.renderer.scene.addMesh(mesh);
      }
    });
    if (this.binding) {
      this.binding.buffer.destroy();
    }
  }
}
_useProjection = new WeakMap();
_ready = new WeakMap();
_setBinding = new WeakSet();
setBinding_fn = function() {
  this.binding = new BufferBinding({
    label: this.options.label + " matrices",
    name: "matrices",
    struct: {
      model: {
        type: "array<mat4x4f>",
        value: new Float32Array(16 * this.options.size)
      },
      modelView: {
        type: "array<mat4x4f>",
        value: new Float32Array(16 * this.options.size)
      },
      normal: {
        type: "array<mat3x3f>",
        value: new Float32Array(12 * this.options.size)
      }
    }
  });
  __privateMethod(this, _patchBindingOffset, patchBindingOffset_fn).call(this, this.options.size);
};
_patchBindingOffset = new WeakSet();
patchBindingOffset_fn = function(size) {
  const minOffset = this.renderer.device.limits.minUniformBufferOffsetAlignment;
  if (this.binding.arrayBufferSize < size * minOffset) {
    this.binding.arrayBufferSize = size * minOffset;
    this.binding.arrayBuffer = new ArrayBuffer(this.binding.arrayBufferSize);
    this.binding.buffer.size = this.binding.arrayBuffer.byteLength;
  }
};
_onSizeChanged = new WeakSet();
onSizeChanged_fn = function(newSize) {
  if (newSize > this.options.size && this.binding) {
    __privateMethod(this, _patchBindingOffset, patchBindingOffset_fn).call(this, newSize);
    if (this.binding.buffer.GPUBuffer) {
      this.binding.buffer.GPUBuffer.destroy();
      this.binding.buffer.createBuffer(this.renderer, {
        label: this.binding.options.label,
        usage: [
          ...["copySrc", "copyDst", this.binding.bindingType],
          ...this.binding.options.usage
        ]
      });
      let offset = 0;
      this.meshes.forEach((mesh) => {
        mesh.patchRenderBundleBinding(offset);
        offset++;
      });
      this.binding.shouldUpdate = true;
    }
  }
};
_setDescriptor = new WeakSet();
setDescriptor_fn = function() {
  this.descriptor = {
    ...this.options.renderPass.options.colorAttachments && {
      colorFormats: this.options.renderPass.options.colorAttachments.map(
        (colorAttachment) => colorAttachment.targetFormat
      )
    },
    ...this.options.renderPass.options.useDepth && {
      depthStencilFormat: this.options.renderPass.options.depthFormat
    },
    sampleCount: this.options.renderPass.options.sampleCount
  };
};
_encodeRenderCommands = new WeakSet();
encodeRenderCommands_fn = function() {
  this.renderer.pipelineManager.resetCurrentPipeline();
  this.encoder = this.renderer.device.createRenderBundleEncoder({
    ...this.descriptor,
    label: this.options.label + " (encoder)"
  });
  this.meshes.forEach((mesh) => {
    mesh.material.render(this.encoder);
    mesh.geometry.render(this.encoder);
  });
  this.bundle = this.encoder.finish({ label: this.options.label + " (bundle)" });
  this.renderer.pipelineManager.resetCurrentPipeline();
};

export { RenderBundle };
