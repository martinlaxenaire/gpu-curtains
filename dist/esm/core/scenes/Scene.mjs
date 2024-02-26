import { isRenderer } from '../renderers/utils.mjs';

class Scene {
  /**
   * Scene constructor
   * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link Scene}
   */
  constructor({ renderer }) {
    renderer = renderer && renderer.renderer || renderer;
    isRenderer(renderer, "Scene");
    this.renderer = renderer;
    this.computePassEntries = [];
    this.renderPassEntries = {
      /** Array of {@link RenderPassEntry} that will handle {@link PingPongPlane}. Each {@link PingPongPlane} will be added as a distinct {@link RenderPassEntry} here */
      pingPong: [],
      /** Array of {@link RenderPassEntry} that will render to a specific {@link RenderTarget}. Each {@link RenderTarget} will be added as a distinct {@link RenderPassEntry} here */
      renderTarget: [],
      /** Array of {@link RenderPassEntry} that will render directly to the screen. Our first entry will contain all the Meshes that do not have any {@link RenderTarget} assigned. Following entries will be created for every global {@link ShaderPass} */
      screen: [
        // add our basic scene entry
        {
          renderPass: this.renderer.renderPass,
          renderTexture: null,
          onBeforeRenderPass: null,
          onAfterRenderPass: null,
          element: null,
          // explicitly set to null
          stack: {
            unProjected: {
              opaque: [],
              transparent: []
            },
            projected: {
              opaque: [],
              transparent: []
            }
          }
        }
      ]
    };
  }
  /**
   * Get the number of meshes a {@link RenderPassEntry | render pass entry} should draw.
   * @param renderPassEntry - The {@link RenderPassEntry | render pass entry} to test
   */
  getRenderPassEntryLength(renderPassEntry) {
    if (!renderPassEntry) {
      return 0;
    } else {
      return renderPassEntry.element ? renderPassEntry.element.visible ? 1 : 0 : renderPassEntry.stack.unProjected.opaque.length + renderPassEntry.stack.unProjected.transparent.length + renderPassEntry.stack.projected.opaque.length + renderPassEntry.stack.projected.transparent.length;
    }
  }
  /**
   * Add a {@link ComputePass} to our scene {@link computePassEntries} array
   * @param computePass - {@link ComputePass} to add
   */
  addComputePass(computePass) {
    this.computePassEntries.push(computePass);
    this.computePassEntries.sort((a, b) => {
      if (a.renderOrder !== b.renderOrder) {
        return a.renderOrder - b.renderOrder;
      } else {
        return a.index - b.index;
      }
    });
  }
  /**
   * Remove a {@link ComputePass} from our scene {@link computePassEntries} array
   * @param computePass - {@link ComputePass} to remove
   */
  removeComputePass(computePass) {
    this.computePassEntries = this.computePassEntries.filter((cP) => cP.uuid !== computePass.uuid);
  }
  /**
   * Add a {@link RenderTarget} to our scene {@link renderPassEntries} outputTarget array.
   * Every Meshes later added to this {@link RenderTarget} will be rendered to the {@link RenderTarget#renderTexture | RenderTarget RenderTexture} using the {@link RenderTarget#renderPass.descriptor | RenderTarget RenderPass descriptor}
   * @param renderTarget - {@link RenderTarget} to add
   */
  addRenderTarget(renderTarget) {
    if (!this.renderPassEntries.renderTarget.find((entry) => entry.renderPass.uuid === renderTarget.renderPass.uuid))
      this.renderPassEntries.renderTarget.push({
        renderPass: renderTarget.renderPass,
        renderTexture: renderTarget.renderTexture,
        onBeforeRenderPass: null,
        onAfterRenderPass: null,
        element: null,
        // explicitly set to null
        stack: {
          unProjected: {
            opaque: [],
            transparent: []
          },
          projected: {
            opaque: [],
            transparent: []
          }
        }
      });
  }
  /**
   * Remove a {@link RenderTarget} from our scene {@link renderPassEntries} outputTarget array.
   * @param renderTarget - {@link RenderTarget} to add
   */
  removeRenderTarget(renderTarget) {
    this.renderPassEntries.renderTarget = this.renderPassEntries.renderTarget.filter(
      (entry) => entry.renderPass.uuid !== renderTarget.renderPass.uuid
    );
  }
  /**
   * Get the correct {@link renderPassEntries | render pass entry} (either {@link renderPassEntries} outputTarget or {@link renderPassEntries} screen) {@link Stack} onto which this Mesh should be added, depending on whether it's projected or not
   * @param mesh - Mesh to check
   * @returns - the corresponding render pass entry {@link Stack}
   */
  getMeshProjectionStack(mesh) {
    const renderPassEntry = mesh.outputTarget ? this.renderPassEntries.renderTarget.find(
      (passEntry) => passEntry.renderPass.uuid === mesh.outputTarget.renderPass.uuid
    ) : this.renderPassEntries.screen[0];
    const { stack } = renderPassEntry;
    return mesh.material.options.rendering.useProjection ? stack.projected : stack.unProjected;
  }
  /**
   * Add a Mesh to the correct {@link renderPassEntries | render pass entry} {@link Stack} array.
   * Meshes are then ordered by their {@link core/meshes/mixins/MeshBaseMixin.MeshBaseClass#index | indexes (order of creation]}, position along the Z axis in case they are transparent and then {@link core/meshes/mixins/MeshBaseMixin.MeshBaseClass#renderOrder | renderOrder}
   * @param mesh - Mesh to add
   */
  addMesh(mesh) {
    const projectionStack = this.getMeshProjectionStack(mesh);
    const similarMeshes = mesh.transparent ? [...projectionStack.transparent] : [...projectionStack.opaque];
    let siblingMeshIndex = -1;
    for (let i = similarMeshes.length - 1; i >= 0; i--) {
      if (similarMeshes[i].material.pipelineEntry.index === mesh.material.pipelineEntry.index) {
        siblingMeshIndex = i + 1;
        break;
      }
    }
    siblingMeshIndex = Math.max(0, siblingMeshIndex);
    similarMeshes.splice(siblingMeshIndex, 0, mesh);
    similarMeshes.sort((a, b) => a.index - b.index);
    if ((mesh.type === "DOMMesh" || mesh.type === "Plane") && mesh.transparent) {
      similarMeshes.sort(
        (a, b) => b.documentPosition.z - a.documentPosition.z
      );
    }
    similarMeshes.sort((a, b) => a.renderOrder - b.renderOrder);
    mesh.transparent ? projectionStack.transparent = similarMeshes : projectionStack.opaque = similarMeshes;
  }
  /**
   * Remove a Mesh from our {@link Scene}
   * @param mesh - Mesh to remove
   */
  removeMesh(mesh) {
    const projectionStack = this.getMeshProjectionStack(mesh);
    if (mesh.transparent) {
      projectionStack.transparent = projectionStack.transparent.filter((m) => m.uuid !== mesh.uuid);
    } else {
      projectionStack.opaque = projectionStack.opaque.filter((m) => m.uuid !== mesh.uuid);
    }
  }
  /**
   * Add a {@link ShaderPass} to our scene {@link renderPassEntries} screen array.
   * Before rendering the {@link ShaderPass}, we will copy the correct input texture into its {@link ShaderPass#renderTexture | renderTexture}
   * This also handles the {@link renderPassEntries} screen array entries order: We will first draw selective passes, then our main screen pass and finally global post processing passes.
   * @see {@link https://codesandbox.io/p/sandbox/webgpu-render-to-2-textures-without-texture-copy-c4sx4s?file=%2Fsrc%2Findex.js%3A10%2C4 | minimal code example}
   * @param shaderPass - {@link ShaderPass} to add
   */
  addShaderPass(shaderPass) {
    const onBeforeRenderPass = shaderPass.inputTarget || shaderPass.outputTarget ? null : (commandEncoder, swapChainTexture) => {
      if (shaderPass.renderTexture && swapChainTexture) {
        commandEncoder.copyTextureToTexture(
          {
            texture: swapChainTexture
          },
          {
            texture: shaderPass.renderTexture.texture
          },
          [shaderPass.renderTexture.size.width, shaderPass.renderTexture.size.height]
        );
      }
      this.renderer.postProcessingPass.setLoadOp("clear");
    };
    const onAfterRenderPass = !shaderPass.outputTarget && shaderPass.options.copyOutputToRenderTexture ? (commandEncoder, swapChainTexture) => {
      if (shaderPass.renderTexture && swapChainTexture) {
        commandEncoder.copyTextureToTexture(
          {
            texture: swapChainTexture
          },
          {
            texture: shaderPass.renderTexture.texture
          },
          [shaderPass.renderTexture.size.width, shaderPass.renderTexture.size.height]
        );
      }
    } : null;
    const shaderPassEntry = {
      // use output target or postprocessing render pass
      renderPass: shaderPass.outputTarget ? shaderPass.outputTarget.renderPass : this.renderer.postProcessingPass,
      // render to output target renderTexture or directly to screen
      renderTexture: shaderPass.outputTarget ? shaderPass.outputTarget.renderTexture : null,
      onBeforeRenderPass,
      onAfterRenderPass,
      element: shaderPass,
      stack: null
      // explicitly set to null
    };
    this.renderPassEntries.screen.push(shaderPassEntry);
    this.renderPassEntries.screen.sort((a, b) => {
      const isPostProA = a.element && !a.element.outputTarget;
      const renderOrderA = a.element ? a.element.renderOrder : 0;
      const indexA = a.element ? a.element.index : 0;
      const isPostProB = b.element && !b.element.outputTarget;
      const renderOrderB = b.element ? b.element.renderOrder : 0;
      const indexB = b.element ? b.element.index : 0;
      if (isPostProA && !isPostProB) {
        return 1;
      } else if (!isPostProA && isPostProB) {
        return -1;
      } else if (renderOrderA !== renderOrderB) {
        return renderOrderA - renderOrderB;
      } else {
        return indexA - indexB;
      }
    });
  }
  /**
   * Remove a {@link ShaderPass} from our scene {@link renderPassEntries} screen array
   * @param shaderPass - {@link ShaderPass} to remove
   */
  removeShaderPass(shaderPass) {
    this.renderPassEntries.screen = this.renderPassEntries.screen.filter(
      (entry) => !entry.element || entry.element.uuid !== shaderPass.uuid
    );
  }
  /**
   * Add a {@link PingPongPlane} to our scene {@link renderPassEntries} pingPong array.
   * After rendering the {@link PingPongPlane}, we will copy the context current texture into its {@link PingPongPlane#renderTexture | renderTexture} so we'll be able to use it as an input for the next pass
   * @see {@link https://codesandbox.io/p/sandbox/webgpu-render-ping-pong-to-texture-use-in-quad-gwjx9p | minimal code example}
   * @param pingPongPlane
   */
  addPingPongPlane(pingPongPlane) {
    this.renderPassEntries.pingPong.push({
      renderPass: pingPongPlane.outputTarget.renderPass,
      renderTexture: pingPongPlane.outputTarget.renderTexture,
      onBeforeRenderPass: null,
      onAfterRenderPass: (commandEncoder, swapChainTexture) => {
        commandEncoder.copyTextureToTexture(
          {
            texture: swapChainTexture
          },
          {
            texture: pingPongPlane.renderTexture.texture
          },
          [pingPongPlane.renderTexture.size.width, pingPongPlane.renderTexture.size.height]
        );
      },
      element: pingPongPlane,
      stack: null
      // explicitly set to null
    });
    this.renderPassEntries.pingPong.sort((a, b) => a.element.renderOrder - b.element.renderOrder);
  }
  /**
   * Remove a {@link PingPongPlane} from our scene {@link renderPassEntries} pingPong array.
   * @param pingPongPlane - {@link PingPongPlane} to remove
   */
  removePingPongPlane(pingPongPlane) {
    this.renderPassEntries.pingPong = this.renderPassEntries.pingPong.filter(
      (entry) => entry.element.uuid !== pingPongPlane.uuid
    );
  }
  /**
   * Get any rendered object or {@link RenderTarget} {@link RenderPassEntry}. Useful to override a {@link RenderPassEntry#onBeforeRenderPass | RenderPassEntry onBeforeRenderPass} or {@link RenderPassEntry#onAfterRenderPass | RenderPassEntry onAfterRenderPass} default behavior.
   * @param object - The object from which we want to get the parentMesh {@link RenderPassEntry}
   * @returns - the {@link RenderPassEntry} if found
   */
  getObjectRenderPassEntry(object) {
    if (object.type === "RenderTarget") {
      return this.renderPassEntries.renderTarget.find(
        (entry) => entry.renderPass.uuid === object.renderPass.uuid
      );
    } else if (object.type === "PingPongPlane") {
      return this.renderPassEntries.pingPong.find((entry) => entry.element.uuid === object.uuid);
    } else if (object.type === "ShaderPass") {
      return this.renderPassEntries.screen.find((entry) => entry.element?.uuid === object.uuid);
    } else {
      const entryType = object.outputTarget ? "renderTarget" : "screen";
      return this.renderPassEntries[entryType].find((entry) => {
        return [
          ...entry.stack.unProjected.opaque,
          ...entry.stack.unProjected.transparent,
          ...entry.stack.projected.opaque,
          ...entry.stack.projected.transparent
        ].some((mesh) => mesh.uuid === object.uuid);
      });
    }
  }
  /**
   * Here we render a {@link RenderPassEntry}:
   * - Set its {@link RenderPass#descriptor | renderPass descriptor} view or resolveTarget and get it at as swap chain texture
   * - Execute {@link RenderPassEntry#onBeforeRenderPass | onBeforeRenderPass} callback if specified
   * - Begin the {@link GPURenderPassEncoder | GPU render pass encoder} using our {@link RenderPass#descriptor | renderPass descriptor}
   * - Render the single element if specified or the render pass entry {@link Stack}: draw unprojected opaque / transparent meshes first, then set the {@link CameraRenderer#cameraBindGroup | camera bind group} and draw projected opaque / transparent meshes
   * - End the {@link GPURenderPassEncoder | GPU render pass encoder}
   * - Execute {@link RenderPassEntry#onAfterRenderPass | onAfterRenderPass} callback if specified
   * - Reset {@link core/pipelines/PipelineManager.PipelineManager#currentPipelineIndex | pipeline manager current pipeline}
   * @param commandEncoder - current {@link GPUCommandEncoder}
   * @param renderPassEntry - {@link RenderPassEntry} to render
   */
  renderSinglePassEntry(commandEncoder, renderPassEntry) {
    const swapChainTexture = renderPassEntry.renderPass.updateView(renderPassEntry.renderTexture?.texture);
    renderPassEntry.onBeforeRenderPass && renderPassEntry.onBeforeRenderPass(commandEncoder, swapChainTexture);
    const pass = commandEncoder.beginRenderPass(renderPassEntry.renderPass.descriptor);
    !this.renderer.production && pass.pushDebugGroup(
      renderPassEntry.element ? `${renderPassEntry.element.options.label} render pass using ${renderPassEntry.renderPass.options.label} descriptor` : `Render stack pass using ${renderPassEntry.renderPass.options.label}${renderPassEntry.renderTexture ? " onto " + renderPassEntry.renderTexture.options.label : ""}`
    );
    if (renderPassEntry.element) {
      renderPassEntry.element.render(pass);
    } else if (renderPassEntry.stack) {
      renderPassEntry.stack.unProjected.opaque.forEach((mesh) => mesh.render(pass));
      renderPassEntry.stack.unProjected.transparent.forEach((mesh) => mesh.render(pass));
      if (renderPassEntry.stack.projected.opaque.length || renderPassEntry.stack.projected.transparent.length) {
        if (this.renderer.cameraBindGroup) {
          pass.setBindGroup(
            this.renderer.cameraBindGroup.index,
            this.renderer.cameraBindGroup.bindGroup
          );
        }
        renderPassEntry.stack.projected.opaque.forEach((mesh) => mesh.render(pass));
        renderPassEntry.stack.projected.transparent.forEach((mesh) => mesh.render(pass));
      }
    }
    !this.renderer.production && pass.popDebugGroup();
    pass.end();
    renderPassEntry.onAfterRenderPass && renderPassEntry.onAfterRenderPass(commandEncoder, swapChainTexture);
    this.renderer.pipelineManager.resetCurrentPipeline();
  }
  /**
   * Render our {@link Scene}
   * - Render {@link computePassEntries} first
   * - Then our {@link renderPassEntries}
   * @param commandEncoder - current {@link GPUCommandEncoder}
   */
  render(commandEncoder) {
    this.computePassEntries.forEach((computePass) => {
      const pass = commandEncoder.beginComputePass();
      computePass.render(pass);
      pass.end();
      computePass.copyBufferToResult(commandEncoder);
      this.renderer.pipelineManager.resetCurrentPipeline();
    });
    for (const renderPassEntryType in this.renderPassEntries) {
      let passDrawnCount = 0;
      this.renderPassEntries[renderPassEntryType].forEach((renderPassEntry) => {
        if (!this.getRenderPassEntryLength(renderPassEntry))
          return;
        renderPassEntry.renderPass.setLoadOp(
          renderPassEntryType === "screen" && passDrawnCount !== 0 ? "load" : "clear"
        );
        passDrawnCount++;
        this.renderSinglePassEntry(commandEncoder, renderPassEntry);
      });
    }
  }
}

export { Scene };
