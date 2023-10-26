import { throwError } from './utils'
import { GPURenderer } from '../core/renderers/GPURenderer'
import { GPUCameraRenderer } from '../core/renderers/GPUCameraRenderer'
import { GPUCurtainsRenderer } from '../curtains/renderers/GPUCurtainsRenderer'

export type Renderer = GPUCurtainsRenderer | GPUCameraRenderer | GPURenderer
export type CameraRenderer = GPUCurtainsRenderer | GPUCameraRenderer

const formatRendererError = (renderer: Renderer, rendererType = 'GPURenderer', type: string | null): void => {
  const error = type
    ? `Unable to create ${type} because the ${rendererType} is not defined: ${renderer}`
    : `The ${rendererType} is not defined: ${renderer}`
  throwError(error)
}

export const isRenderer = (renderer: Renderer | undefined, type: string | null): boolean => {
  const isRenderer =
    renderer &&
    (renderer.type === 'GPURenderer' ||
      renderer.type === 'GPUCameraRenderer' ||
      renderer.type === 'GPUCurtainsRenderer')

  if (!isRenderer) {
    formatRendererError(renderer, 'GPURenderer', type)
  }

  return isRenderer
}

export const isCameraRenderer = (renderer: CameraRenderer | undefined, type: string | null): boolean => {
  const isCameraRenderer =
    renderer && (renderer.type === 'GPUCameraRenderer' || renderer.type === 'GPUCurtainsRenderer')

  if (!isCameraRenderer) {
    formatRendererError(renderer, 'GPUCameraRenderer', type)
  }

  return isCameraRenderer
}

export const isCurtainsRenderer = (renderer: GPUCurtainsRenderer | undefined, type: string | null): boolean => {
  const isCurtainsRenderer = renderer && renderer.type === 'GPUCurtainsRenderer'

  if (!isCurtainsRenderer) {
    formatRendererError(renderer, 'GPUCurtainsRenderer', type)
  }

  return isCurtainsRenderer
}

export const generateMips = ((device, texture) => {
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
              var pos = array<vec2f, 6>(

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
      })
    }

    if (!pipelineByFormat[texture.format]) {
      pipelineByFormat[texture.format] = device.createRenderPipeline({
        label: 'mip level generator pipeline',
        layout: 'auto',
        vertex: {
          module,
          entryPoint: 'vs',
        },
        fragment: {
          module,
          entryPoint: 'fs',
          targets: [{ format: texture.format }],
        },
      })
    }
    const pipeline = pipelineByFormat[texture.format]

    const encoder = device.createCommandEncoder({
      label: 'mip gen encoder',
    })

    let width = texture.width
    let height = texture.height
    let baseMipLevel = 0
    while (width > 1 || height > 1) {
      width = Math.max(1, (width / 2) | 0)
      height = Math.max(1, (height / 2) | 0)

      const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: sampler },
          {
            binding: 1,
            resource: texture.createView({
              baseMipLevel,
              mipLevelCount: 1,
            }),
          },
        ],
      })

      ++baseMipLevel

      const renderPassDescriptor = {
        label: 'our basic canvas renderPass',
        colorAttachments: [
          {
            view: texture.createView({ baseMipLevel, mipLevelCount: 1 }),
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

    const commandBuffer = encoder.finish()
    device.queue.submit([commandBuffer])
  }
})()
