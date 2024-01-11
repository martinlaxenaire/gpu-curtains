import { GPUCurtains, Vec3, Geometry, Mesh } from '../../dist/gpu-curtains.js'

window.addEventListener('DOMContentLoaded', async () => {
  // set up our WebGL context and append the canvas to our wrapper
  const gpuCurtains = new GPUCurtains({
    container: '#canvas',
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance,
    camera: {
      far: 200,
    },
  })

  await gpuCurtains.setDevice()

  gpuCurtains.onError(() => {
    // display original images
    document.body.classList.add('no-curtains')
  })

  // instanced custom geometry mesh grid
  // we will basically recreate https://threejs.org/examples/?q=instanc#webgl_instancing_dynamic
  const instancesGrid = new Vec3(10, 10, 10) // nb of instances per rows / cols
  const instancesGridGap = new Vec3(3, 3, 3) // gap between instances

  const meshVs = /* wgsl */ `  
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) color: vec3f,
    };
    
    fn rotationMatrix(axis: vec3f, angle: f32) -> mat4x4f {
      var nAxis: vec3f = normalize(axis);
      var s: f32 = sin(angle);
      var c: f32 = cos(angle);
      var oc: f32 = 1.0 - c;

      return mat4x4f(
        oc * nAxis.x * nAxis.x + c, oc * nAxis.x * nAxis.y - nAxis.z * s,  oc * nAxis.z * nAxis.x + nAxis.y * s,  0.0,
        oc * nAxis.x * nAxis.y + nAxis.z * s,  oc * nAxis.y * nAxis.y + c, oc * nAxis.y * nAxis.z - nAxis.x * s,  0.0,
        oc * nAxis.z * nAxis.x - nAxis.y * s,  oc * nAxis.y * nAxis.z + nAxis.x * s,  oc * nAxis.z * nAxis.z + c, 0.0,
        0.0, 0.0, 0.0, 1.0);
    }

    @vertex fn main(
      attributes: Attributes,
    ) -> VSOutput {    
      var vsOutput : VSOutput;
      
      var instanceIndex: f32 = f32(attributes.instanceIndex);
      var instancesCount: f32 = instances.grid.x * instances.grid.y;
      
      var transformed: vec3f = attributes.position;
      
      var halfInstancesGridSize: vec3f = instances.grid * instances.gridGap * 0.5 - instances.gridGap * 0.5;
      
      var gridDistribution: vec3f = vec3(
        (instanceIndex % instances.grid.x),
        (floor(instanceIndex / instances.grid.x) % instances.grid.y),
        floor((floor(instanceIndex / instances.grid.x) / instances.grid.y) % instances.grid.z)
      );
      
      var instanceGridPosition: vec3f = gridDistribution * instances.gridGap - halfInstancesGridSize;
      
      // rotate instance first
      var angle: f32 = 3.141592 * frames.elapsed * 0.01;
      var instanceAngleFactor: f32 = pow(abs(instanceGridPosition.x / instances.grid.x), 0.5);
      
      angle = 
        sin(gridDistribution.x * 0.25 + frames.elapsed * 0.025)
        + sin(gridDistribution.y * 0.25 + frames.elapsed * 0.025)
        + sin(gridDistribution.z * 0.25 + frames.elapsed * 0.025);
      
      var rotatedTransformed: vec4f = vec4(transformed, 1.0) * rotationMatrix(vec3(0.0, 1.0, 0.0), angle);
      transformed = rotatedTransformed.xyz;
            
      // then grid position
      transformed.x += instanceGridPosition.x;
      transformed.y += instanceGridPosition.y;
      transformed.z += instanceGridPosition.z;
              
      vsOutput.position = getOutputPosition(camera, matrices, transformed);
      vsOutput.color = attributes.color;
      
      return vsOutput;
    }
  `

  const meshFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) color: vec3f,
    };
  
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      // use our color attribute
      return vec4(fsInput.color, 1.0);
    }
  `

  // prettier-ignore
  const vertices = new Float32Array([
    // front face
    1, -1, 1,
    0, 1, 0,
    -1, -1, 1,

    // right face
    1, -1, -1,
    0, 1, 0,
    1, -1, 1,

    // back face
    -1, -1, -1,
    0, 1, 0,
    1, -1, -1,

    // left face
    -1, -1, 1,
    0, 1, 0,
    -1, -1, -1,

    // bottom first
    -1, -1, -1,
    1, -1, -1,
    -1, -1, 1,
    // bottom second
    1, -1, 1,
    -1, -1, 1,
    1, -1, -1,
  ])

  // prettier-ignore
  const colors = [
    26, 200, 237, // front face color
    175, 117, 149, // right face color
    140, 33, 85, // back face color
    92, 26, 27, // left face color
    174, 212, 23, // bottom face color
    174, 212, 23, // bottom face color
  ]

  const verticesColors = new Float32Array(colors.map((value) => value / 255))

  const geometry = new Geometry({
    instancesCount: instancesGrid.x * instancesGrid.y * instancesGrid.z,
  })

  geometry.setAttribute({
    name: 'position',
    type: 'vec3f',
    bufferFormat: 'float32x3',
    size: 3,
    array: vertices,
  })

  geometry.setAttribute({
    name: 'color',
    type: 'vec3f',
    bufferFormat: 'float32x3',
    size: 3,
    array: verticesColors,
    verticesStride: 3, // insert one face color for every 3 vertices
  })

  const params = {
    geometry,
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
    uniforms: {
      frames: {
        label: 'Frames',
        struct: {
          elapsed: {
            type: 'f32',
            value: 0,
          },
        },
      },
      instances: {
        label: 'Instances',
        struct: {
          grid: {
            type: 'vec3f',
            value: instancesGrid,
          },
          gridGap: {
            type: 'vec3f',
            value: instancesGridGap,
          },
        },
      },
    },
  }

  const mesh = new Mesh(gpuCurtains, params)

  console.log(geometry.getVertexBufferByName('attributes'), mesh)

  // move camera back
  gpuCurtains.camera.position.z = 50

  mesh.onRender(() => {
    mesh.uniforms.frames.elapsed.value++
    const time = mesh.uniforms.frames.elapsed.value * 0.025

    // rotate the whole system
    mesh.rotation.x = Math.sin(time * 0.25) * 0.75
    mesh.rotation.y = Math.sin(time * 0.5) * 0.75
  })
})
