import { GPURenderer } from '../core/renderers/GPURenderer'
import { GPUCameraRenderer } from '../core/renderers/GPUCameraRenderer'
import { GPUCurtainsRenderer } from '../curtains/renderer/GPUCurtainsRenderer'

export const isRenderer = (renderer, type) => {
  const isRenderer =
    renderer &&
    (renderer instanceof GPURenderer ||
      renderer instanceof GPUCameraRenderer ||
      renderer instanceof GPUCurtainsRenderer)

  if (!isRenderer && type) {
    console.error(type + ': Unable to create a ' + type + ' because the Renderer is not defined')
  }

  return (
    renderer &&
    (renderer instanceof GPURenderer ||
      renderer instanceof GPUCameraRenderer ||
      renderer instanceof GPUCurtainsRenderer)
  )
}

export const isCurtainsRenderer = (renderer, type) => {
  const isCurtainsRenderer = renderer && renderer instanceof GPUCurtainsRenderer

  if (!isCurtainsRenderer && type) {
    console.error(type + ': Unable to create a ' + type + ' because the CurtainsRenderer is not defined')
  }

  return isCurtainsRenderer
}

export const generateMips = ((device) => {
  let sampler
  let module
  const pipelineByFormat = {}

  return function generateMips(device) {
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

    if (!pipelineByFormat[this.texture.format]) {
      pipelineByFormat[this.texture.format] = device.createRenderPipeline({
        label: 'mip level generator pipeline',
        layout: 'auto',
        vertex: {
          module,
          entryPoint: 'vs',
        },
        fragment: {
          module,
          entryPoint: 'fs',
          targets: [{ format: this.texture.format }],
        },
      })
    }
    const pipeline = pipelineByFormat[this.texture.format]

    const encoder = device.createCommandEncoder({
      label: 'mip gen encoder',
    })

    let width = this.texture.width
    let height = this.texture.height
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
            resource: this.texture.createView({
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
            view: this.texture.createView({ baseMipLevel, mipLevelCount: 1 }),
            loadOp: 'clear',
            storeOp: 'store',
          },
        ],
      }

      const pass = encoder.beginRenderPass(renderPassDescriptor)
      pass.setPipeline(pipeline)
      pass.setBindGroup(0, bindGroup)
      pass.draw(6) // call our vertex shader 6 times
      pass.end()
    }

    const commandBuffer = encoder.finish()
    device.queue.submit([commandBuffer])
  }
})()
