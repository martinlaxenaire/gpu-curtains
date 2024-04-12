// Goal of this test is to help debug any issue due to scroll or resize
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const { BoxGeometry, DOMMesh, GPUCurtains, Sampler, SphereGeometry } = await import(/* @vite-ignore */ path)

  // set our main GPUCurtains instance it will handle everything we need
  // a WebGPU device and a renderer with its scene, requestAnimationFrame, resize and scroll events...
  const gpuCurtains = new GPUCurtains({
    container: '#canvas',
    camera: {
      fov: 35,
    },
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
  })

  await gpuCurtains.setDevice()

  gpuCurtains.onError(() => {
    // display original images
    document.body.classList.add('no-curtains')
  })

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
        // display a redish color while textures are loading
        placeholderColor: [238, 101, 87, 255],
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
      .onBeforeRender(() => {
        //cubeMesh.rotation.x += 0.01
      })
      .onAfterResize(() => {
        updateCubeScaleAndPosition()
      })

    // do it right away
    updateCubeScaleAndPosition()
  })
})
