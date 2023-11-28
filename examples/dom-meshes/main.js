window.addEventListener('DOMContentLoaded', async () => {
  // set up our WebGL context and append the canvas to our wrapper
  const gpuCurtains = new GPUCurtains.GPUCurtains({
    container: 'canvas',
    camera: {
      fov: 35,
    },
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
  })

  await gpuCurtains.setRendererContext()

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
      
      vsOutput.position = getOutputPosition(camera, matrices, attributes.position);
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
  const cubeGeometry = new GPUCurtains.BoxGeometry()
  const sphereGeometry = new GPUCurtains.SphereGeometry()

  // now create the meshes
  const cubeEls = document.querySelectorAll('.cube-mesh')
  cubeEls.forEach((cubeEl, index) => {
    const cubeMesh = new GPUCurtains.DOMMesh(gpuCurtains, cubeEl, {
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
        new GPUCurtains.Sampler(gpuCurtains, {
          label: 'Cube sampler',
          name: 'defaultSampler',
          maxAnisotropy: 16,
        }),
      ],
      texturesOptions: {
        // display a redish color while textures are loading
        placeholderColor: [238, 101, 87, 255],
      },
    })

    console.log(cubeMesh)

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
    const sphereMesh = new GPUCurtains.DOMMesh(gpuCurtains, sphereEl, {
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
    })

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
