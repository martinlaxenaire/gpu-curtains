import { WritableBufferBinding } from '../core/bindings/WritableBufferBinding'
import { Renderer } from '../core/renderers/utils'

/**
 * Logs all the main commands executed during each {@link core/scenes/Scene.Scene#render | Scene render} calls.
 */
export const logSceneCommands = (renderer: Renderer) => {
  const { scene } = renderer

  if (!scene) return

  const renderCommands = []

  scene.computePassEntries.forEach((computePass) => {
    renderCommands.push({
      command: 'Render ComputePass',
      content: computePass.options.label,
    })

    computePass.material.bindGroups.forEach((bindGroup) => {
      bindGroup.bufferBindings.forEach((binding: WritableBufferBinding) => {
        if (binding.shouldCopyResult) {
          renderCommands.push({
            command: `Copy buffer to buffer`,
            source: `${binding.name} buffer`,
            destination: `${binding.name} result buffer`,
          })
        }
      })
    })
  })

  for (const renderPassEntryType in scene.renderPassEntries) {
    let passDrawnCount = 0

    scene.renderPassEntries[renderPassEntryType].forEach((renderPassEntry) => {
      // early bail if there's nothing to draw
      if (!scene.getRenderPassEntryLength(renderPassEntry)) return

      const destination = !renderPassEntry.renderPass.options.useColorAttachments
        ? undefined
        : renderPassEntry.renderPass.options.colorAttachments.length === 0 &&
          renderPassEntry.renderPass.options.useDepth
        ? `${renderPassEntry.renderTexture.options.label} depth pass`
        : renderPassEntry.renderPass.options.colorAttachments.length > 1
        ? `${renderPassEntry.renderTexture.options.label} multiple targets`
        : renderPassEntry.renderTexture
        ? `${renderPassEntry.renderTexture.options.label}`
        : 'Context current texture'

      let descriptor = renderPassEntry.renderPass.options.label

      const operations = {
        loadOp: renderPassEntry.renderPass.options.useColorAttachments
          ? renderPassEntryType === 'screen' && passDrawnCount > 0
            ? 'load'
            : renderPassEntry.renderPass.options.loadOp
          : undefined,
        depthLoadOp: undefined,
        sampleCount: renderPassEntry.renderPass.options.sampleCount,
        ...(renderPassEntry.renderPass.options.qualityRatio !== 1 && {
          qualityRatio: renderPassEntry.renderPass.options.qualityRatio,
        }),
      }

      if (renderPassEntry.renderPass.options.useDepth) {
        operations.depthLoadOp = renderPassEntry.renderPass.options.depthLoadOp
      }

      passDrawnCount++

      if (renderPassEntry.element) {
        if (
          renderPassEntry.element.type === 'ShaderPass' &&
          !(renderPassEntry.element.inputTarget || renderPassEntry.element.outputTarget)
        ) {
          renderCommands.push({
            command: `Copy texture to texture`,
            source: destination,
            destination: `${renderPassEntry.element.options.label} renderTexture`,
          })

          operations.loadOp = 'clear'
        }

        descriptor += ' ' + JSON.stringify(operations)

        renderCommands.push({
          command: `Render ${renderPassEntry.element.type}`,
          source: renderPassEntry.element.options.label,
          destination,
          descriptor,
        })

        if (
          renderPassEntry.element.type === 'ShaderPass' &&
          !renderPassEntry.element.outputTarget &&
          renderPassEntry.element.options.copyOutputToRenderTexture
        ) {
          renderCommands.push({
            command: `Copy texture to texture`,
            source: destination,
            destination: `${renderPassEntry.element.options.label} renderTexture`,
          })
        } else if (renderPassEntry.element.type === 'PingPongPlane') {
          renderCommands.push({
            command: `Copy texture to texture`,
            source: destination,
            destination: `${renderPassEntry.element.renderTexture.options.label}`,
          })
        }
      } else if (renderPassEntry.stack) {
        descriptor += ' ' + JSON.stringify(operations)

        for (const stackType in renderPassEntry.stack) {
          for (const objectType in renderPassEntry.stack[stackType]) {
            if (renderPassEntry.stack[stackType][objectType].length) {
              renderCommands.push({
                command: `Render stack (${stackType} ${objectType} objects)`,
                source: renderPassEntry.stack[stackType][objectType],
                destination,
                descriptor,
              })
            }
          }
        }
      }
    })
  }

  console.table(renderCommands)
}
