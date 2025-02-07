import { BoxGeometry, DOMMesh, GPUCurtains, Sampler, SphereGeometry } from '../../dist/esm/index.mjs'

// use 'DOMContentLoaded' so we don't wait for the images to be loaded
window.addEventListener('DOMContentLoaded', async () => {
  // set our main GPUCurtains instance it will handle everything we need
  // a WebGPU device and a renderer with its scene, requestAnimationFrame, resize and scroll events...
  const gpuCurtains = new GPUCurtains({
    container: '#canvas',
    camera: {
      fov: 35,
    },
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
  })

  gpuCurtains.onError(() => {
    // display original images
    document.body.classList.add('no-curtains')
  })

  await gpuCurtains.setDevice()

  const meshVs = /* wgsl */ `  
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
      @location(1) normal: vec3f,
    };
  
    @vertex fn main(
      attributes: Attributes,
    ) -> VSOutput {    
      var vsOutput : VSOutput;
      
      vsOutput.position = getOutputPosition(attributes.position);
      vsOutput.uv = getUVCover(attributes.uv, texturesMatrices.meshTexture.matrix);
      vsOutput.normal = attributes.normal;
      
      return vsOutput;
    }
  `

  const meshFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
      @location(1) normal: vec3f,
    };
  
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      // debug normals
      // return vec4(fsInput.normal * 0.5 + 0.5, 1.0);
      return textureSample(meshTexture, defaultSampler, fsInput.uv);
    }
  `

  // create the geometries
  const cubeGeometry = new BoxGeometry()
  const sphereGeometry = new SphereGeometry()

  // now create the meshes
  const cubeEls = document.querySelectorAll('.cube-mesh')
  cubeEls.forEach((cubeEl, index) => {
    const cubeMesh = new DOMMesh(gpuCurtains, cubeEl, {
      label: 'Cube ' + index,
      geometry: cubeGeometry,
      shaders: {
        vertex: {
          code: meshVs,
          entryPoint: 'main',
        },
        fragment: {
          code: meshFs,
          entryPoint: 'main',
        },
      },
      samplers: [
        // since the cube will be rotated, we will use anisotropy
        // we will explicitly set sampler name to 'defaultSampler'
        // so we can use the same shader for both cubes and spheres
        new Sampler(gpuCurtains, {
          label: 'Cube sampler',
          name: 'defaultSampler',
          maxAnisotropy: 16,
        }),
      ],
      texturesOptions: {
        // random placeholder color between pink and blue
        placeholderColor: Math.random() > 0.5 ? [255, 0, 255, 255] : [255, 255, 0, 255],
        generateMips: true,
      },
    })

    const updateCubeScaleAndPosition = () => {
      // adjust our cube depth scale ratio based on its height (Y axis) and Z world scale
      // in this case this is not needed because it will already have the Y scale applied to its Z scale
      // but it can still be useful to understand the concept
      cubeMesh.DOMObjectDepthScaleRatio = cubeMesh.worldScale.y / cubeMesh.size.scaledWorld.size.z

      // move our cube along the Z axis so the front face lies at (0, 0, 0) instead of the cube's center
      // since a box geometry bounding box size along Z axis equals 2
      // we could also just set it to (-1 * cubeMesh.worldScale.z)
      cubeMesh.position.z = -0.5 * cubeGeometry.boundingBox.size.z * cubeMesh.worldScale.z
    }

    cubeMesh
      .onBeforeRender(() => {
        cubeMesh.rotation.x += 0.01
      })
      .onAfterResize(updateCubeScaleAndPosition)

    // do it right away
    updateCubeScaleAndPosition()
  })

  const sphereEls = document.querySelectorAll('.sphere-mesh')
  sphereEls.forEach((sphereEl, index) => {
    const sphereMesh = new DOMMesh(gpuCurtains, sphereEl, {
      label: 'Sphere ' + index,
      geometry: sphereGeometry,
      shaders: {
        vertex: {
          code: meshVs,
          entryPoint: 'main',
        },
        fragment: {
          code: meshFs,
          entryPoint: 'main',
        },
      },
      texturesOptions: {
        // random placeholder color between pink and blue
        placeholderColor: Math.random() > 0.5 ? [255, 0, 255, 1] : [0, 255, 255, 1],
      },
    })

    const updateSphereScale = () => {
      // adjust our sphere depth scale ratio based on its height (Y axis) and Z world scale
      // in this case this is not needed because it will already have the Y scale applied to its Z scale
      // but it can still be useful to understand the concept
      sphereMesh.DOMObjectDepthScaleRatio = sphereMesh.worldScale.y / sphereMesh.size.scaledWorld.size.z
    }

    sphereMesh
      .onBeforeRender(() => {
        sphereMesh.rotation.y += 0.01
      })
      .onAfterResize(updateSphereScale)

    updateSphereScale()
  })
})
