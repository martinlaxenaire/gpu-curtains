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
      vsOutput.uv = getUVCover(attributes.uv, meshTextureMatrix);
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
        placeholderColor: Math.random() > 0.5 ? [255, 0, 255, 1] : [0, 255, 255, 1],
        generateMips: true,
      },
    })

    const updateCubeScaleAndPosition = () => {
      // scale our cube along the Z axis based on its height (Y axis)
      cubeMesh.scale.z = cubeMesh.worldScale.y

      // move our cube along the Z axis so the front face lies at (0, 0, 0) instead of the cube's center
      cubeMesh.position.z = -1 * cubeGeometry.boundingBox.max.z * cubeMesh.scale.z
    }

    cubeMesh
      .onRender(() => {
        cubeMesh.rotation.x += 0.01
      })
      .onAfterResize(() => {
        updateCubeScaleAndPosition()
      })

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

    console.log(sphereMesh)

    const updateSphereScale = () => {
      // scale our sphere along the Z axis based on its height (Y axis)
      sphereMesh.scale.z = sphereMesh.worldScale.y
    }

    sphereMesh
      .onRender(() => {
        sphereMesh.rotation.y += 0.01
      })
      .onAfterResize(updateSphereScale)

    updateSphereScale()
  })
})
