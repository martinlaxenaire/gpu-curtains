import {
  GPUCurtains,
  EnvironmentMap,
  Plane,
  Sampler,
  RenderBundle,
  LitMesh,
  Vec3,
  Vec2,
  SphereGeometry,
} from '../../dist/esm/index.mjs'

// use 'DOMContentLoaded' so we don't wait for the images to be loaded
window.addEventListener('DOMContentLoaded', async () => {
  // set our main GPUCurtains instance it will handle everything we need
  // a WebGPU device and a renderer with its scene, requestAnimationFrame, resize and scroll events...
  const gpuCurtains = new GPUCurtains({
    container: '#canvas',
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
    adapterOptions: {
      featureLevel: 'compatibility',
    },
  })

  gpuCurtains.onError(() => {
    // display original images
    document.body.classList.add('no-curtains')
  })

  await gpuCurtains.setDevice()

  // give some room to the bubbles
  gpuCurtains.renderer.camera.position.z = 15

  // environment map
  const environmentMap = new EnvironmentMap(gpuCurtains, {
    diffuseIntensity: 0.5,
  })

  environmentMap.loadAndComputeFromHDR('../../website/assets/hdr/Colorful_Studio.hdr')

  // DOM synced planes
  const vertexShader = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };
    
    @vertex fn main(
      attributes: Attributes,
    ) -> VSOutput {
      var vsOutput: VSOutput;

      vsOutput.position = getOutputPosition(attributes.position);
      vsOutput.uv = getUVCover(attributes.uv, texturesMatrices.planeTexture.matrix);
    
      return vsOutput;
    }
  `

  const fragmentShader = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };
    
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {   
      var color: vec4f = textureSample(planeTexture, mipmapNearestSampler, fsInput.uv);
      
      return color;
    }
  `

  const params = {
    shaders: {
      vertex: {
        code: vertexShader,
        entryPoint: 'main',
      },
      fragment: {
        code: fragmentShader,
        entryPoint: 'main',
      },
    },
    samplers: [
      // Use mipmap nearest filter
      new Sampler(gpuCurtains, {
        label: 'Nearest sampler',
        name: 'mipmapNearestSampler',
        mipmapFilter: 'nearest',
      }),
    ],
    texturesOptions: {
      generateMips: true,
    },
  }

  // get our planes elements
  let planeElements = document.querySelectorAll('.plane')

  // add our planes and handle them
  planeElements.forEach((planeEl, planeIndex) => {
    params.label = 'Plane' + planeIndex
    const plane = new Plane(gpuCurtains, planeEl, params)
  })

  // transmissive bubbles
  const nbBubbles = 8

  const transmissiveBundle = new RenderBundle(gpuCurtains, {
    label: 'Transmissive bubbles render bundle',
    size: nbBubbles,
    useBuffer: true,
  })

  for (let i = 0; i < nbBubbles; i++) {
    const bubble = new LitMesh(gpuCurtains, {
      label: 'Transmissive bubble ' + i,
      geometry: new SphereGeometry(),
      transmissive: true,
      renderBundle: transmissiveBundle,
      material: {
        shading: 'PBR',
        toneMapping: 'Khronos',
        transmissiveInputColorSpace: 'linear', // planes are drawn in linear color space
        transmissiveInputToneMapping: false, // planes are not tone mapped
        metallic: 0.01, // if we'd set it to 0, we'd lose specular on transparent background
        roughness: 0,
        specularColor: new Vec3(0.1),
        transmission: 1,
        thickness: 0.25,
        dispersion: 5,
        ior: 1.33,
        environmentMap,
      },
    })

    bubble.scale.set(Math.random() + 1)

    bubble.userData = {
      depthPosition: Math.random() * 2 + 2,
      availableSize: null,
      speed: new Vec2(Math.random() * 0.005 + 0.0025, Math.random() * 0.015 + 0.005),
      initialPosition: new Vec3(),
      time: Math.random() * Math.PI * 1000,
    }

    bubble.position.z = bubble.userData.depthPosition

    const setBubblesInitialPosition = () => {
      bubble.userData.availableSize = gpuCurtains.renderer.camera.getVisibleSizeAtDepth(bubble.userData.depthPosition)

      bubble.userData.initialPosition.set(
        (Math.random() - 0.5) * bubble.userData.availableSize.width,
        (Math.random() - 0.5) * bubble.userData.availableSize.height,
        bubble.userData.depthPosition
      )

      bubble.position.y = bubble.userData.initialPosition.y
    }

    setBubblesInitialPosition()

    bubble.onAfterResize(setBubblesInitialPosition).onBeforeRender(() => {
      bubble.position.y += bubble.userData.speed.y
      bubble.userData.time++

      bubble.position.x =
        bubble.userData.initialPosition.x + Math.cos(bubble.userData.time * bubble.userData.speed.x) * 1.25

      if (bubble.position.y >= bubble.userData.availableSize.height * 0.5 + bubble.scale.y * 1.5) {
        // reset the bubble
        bubble.scale.set(Math.random() + 1)
        bubble.position.y = bubble.userData.availableSize.height * -0.5 - bubble.scale.y * 1.5
        bubble.userData.initialPosition.x = (Math.random() - 0.5) * bubble.userData.availableSize.width
      }
    })
  }
})
