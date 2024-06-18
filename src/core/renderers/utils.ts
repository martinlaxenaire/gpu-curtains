import { throwError } from '../../utils/utils'
import { GPURenderer } from './GPURenderer'
import { GPUCameraRenderer } from './GPUCameraRenderer'
import { GPUCurtainsRenderer } from '../../curtains/renderers/GPUCurtainsRenderer'
import { GPUCurtains } from '../../curtains/GPUCurtains'

/**
 * A Renderer could be either a {@link GPURenderer}, a {@link GPUCameraRenderer} or a {@link GPUCurtainsRenderer}
 * @type {Renderer}
 */
export type Renderer = GPUCurtainsRenderer | GPUCameraRenderer | GPURenderer
/**
 * A CameraRenderer could be either a {@link GPUCameraRenderer} or a {@link GPUCurtainsRenderer}
 * @type {CameraRenderer}
 */
export type CameraRenderer = GPUCurtainsRenderer | GPUCameraRenderer

/**
 * Format a renderer error based on given renderer, renderer type and object type
 * @param renderer - renderer that failed the test
 * @param rendererType - expected renderer type
 * @param type - object type
 */
const formatRendererError = (renderer: Renderer, rendererType = 'GPURenderer', type: string | null): void => {
  const error = type
    ? `Unable to create ${type} because the ${rendererType} is not defined: ${renderer}`
    : `The ${rendererType} is not defined: ${renderer}`
  throwError(error)
}

/**
 * Check if the given renderer is a {@link Renderer}
 * @param renderer - renderer to test
 * @param type - object type used to format the error if needed
 * @returns - the {@link Renderer} if correctly set
 */
export const isRenderer = (renderer: GPUCurtains | Renderer | undefined, type: string | null): Renderer => {
  renderer = ((renderer && (renderer as GPUCurtains).renderer) || renderer) as Renderer

  const isRenderer =
    renderer &&
    (renderer.type === 'GPURenderer' ||
      renderer.type === 'GPUCameraRenderer' ||
      renderer.type === 'GPUCurtainsRenderer')

  if (!isRenderer) {
    formatRendererError(renderer, 'GPURenderer', type)
  }

  return renderer
}

/**
 * Check if the given renderer is a {@link CameraRenderer}
 * @param renderer - renderer to test
 * @param type - object type used to format the error if needed
 * @returns - the {@link CameraRenderer} if correctly set
 */
export const isCameraRenderer = (
  renderer: GPUCurtains | CameraRenderer | undefined,
  type: string | null
): CameraRenderer => {
  renderer = ((renderer && (renderer as GPUCurtains).renderer) || renderer) as CameraRenderer

  const isCameraRenderer =
    renderer && (renderer.type === 'GPUCameraRenderer' || renderer.type === 'GPUCurtainsRenderer')

  if (!isCameraRenderer) {
    formatRendererError(renderer, 'GPUCameraRenderer', type)
  }

  return renderer
}

/**
 * Check if the given renderer is a {@link GPUCurtainsRenderer}
 * @param renderer - renderer to test
 * @param type - object type used to format the error if needed
 * @returns - the {@link GPUCurtainsRenderer} if correctly set
 */
export const isCurtainsRenderer = (
  renderer: GPUCurtains | GPUCurtainsRenderer | undefined,
  type: string | null
): GPUCurtainsRenderer => {
  renderer = ((renderer && (renderer as GPUCurtains).renderer) || renderer) as GPUCurtainsRenderer

  const isCurtainsRenderer = renderer && renderer.type === 'GPUCurtainsRenderer'

  if (!isCurtainsRenderer) {
    formatRendererError(renderer, 'GPUCurtainsRenderer', type)
  }

  return renderer
}

/**
 * Helper to generate mips on the GPU
 * Taken from https://webgpufundamentals.org/webgpu/lessons/webgpu-importing-textures.html
 */
export const generateMips = (() => {
  let sampler
  let module
  const pipelineByFormat = {}

  return function generateMips(device: GPUDevice, texture: GPUTexture) {
    if (!module) {
      module = device.createShaderModule({
        label: 'textured quad shaders for mip level generation',
        code: `
            struct VSOutput {
              @builtin(position) position: vec4f,
              @location(0) texcoord: vec2f,
            };

            @vertex fn vs(
              @builtin(vertex_index) vertexIndex : u32
            ) -> VSOutput {
              let pos = array(

                vec2f( 0.0,  0.0),  // center
                vec2f( 1.0,  0.0),  // right, center
                vec2f( 0.0,  1.0),  // center, top

                // 2st triangle
                vec2f( 0.0,  1.0),  // center, top
                vec2f( 1.0,  0.0),  // right, center
                vec2f( 1.0,  1.0),  // right, top
              );

              var vsOutput: VSOutput;
              let xy = pos[vertexIndex];
              vsOutput.position = vec4f(xy * 2.0 - 1.0, 0.0, 1.0);
              vsOutput.texcoord = vec2f(xy.x, 1.0 - xy.y);
              return vsOutput;
            }

            @group(0) @binding(0) var ourSampler: sampler;
            @group(0) @binding(1) var ourTexture: texture_2d<f32>;

            @fragment fn fs(fsInput: VSOutput) -> @location(0) vec4f {
              return textureSample(ourTexture, ourSampler, fsInput.texcoord);
            }
          `,
      })

      sampler = device.createSampler({
        minFilter: 'linear',
        magFilter: 'linear',
      })
    }

    if (!pipelineByFormat[texture.format]) {
      pipelineByFormat[texture.format] = device.createRenderPipeline({
        label: 'Mip level generator pipeline',
        layout: 'auto',
        vertex: {
          module,
        },
        fragment: {
          module,
          targets: [{ format: texture.format }],
        },
      })
    }
    const pipeline = pipelineByFormat[texture.format]

    const encoder = device.createCommandEncoder({
      label: 'Mip gen encoder',
    })

    let width = texture.width
    let height = texture.height
    let baseMipLevel = 0
    while (width > 1 || height > 1) {
      width = Math.max(1, (width / 2) | 0)
      height = Math.max(1, (height / 2) | 0)

      for (let layer = 0; layer < texture.depthOrArrayLayers; ++layer) {
        const bindGroup = device.createBindGroup({
          layout: pipeline.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: sampler },
            {
              binding: 1,
              resource: texture.createView({
                dimension: '2d',
                baseMipLevel,
                mipLevelCount: 1,
                baseArrayLayer: layer,
                arrayLayerCount: 1,
              }),
            },
          ],
        })

        const renderPassDescriptor = {
          label: 'Mip generation render pass',
          colorAttachments: [
            {
              view: texture.createView({
                dimension: '2d',
                baseMipLevel: baseMipLevel + 1,
                mipLevelCount: 1,
                baseArrayLayer: layer,
                arrayLayerCount: 1,
              }),
              loadOp: 'clear',
              storeOp: 'store',
            },
          ],
        }

        const pass = encoder.beginRenderPass(renderPassDescriptor as GPURenderPassDescriptor)
        pass.setPipeline(pipeline)
        pass.setBindGroup(0, bindGroup)
        pass.draw(6) // call our vertex shader 6 times
        pass.end()
      }
      ++baseMipLevel
    }

    const commandBuffer = encoder.finish()
    device.queue.submit([commandBuffer])
  }
})()
