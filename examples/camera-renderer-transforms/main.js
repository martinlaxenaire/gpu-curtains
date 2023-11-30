window.addEventListener('DOMContentLoaded', async () => {
  // here is an example of how we can use a simple GPUCameraRenderer instead of the whole GPUCurtains package
  // this shows us how to use gpu-curtains as a basic genuine 3D engine, not specifically related to DOM objects
  const systemSize = 10

  // so, let's start by creating a camera renderer
  const gpuCameraRenderer = new GPUCurtains.GPUCameraRenderer({
    container: document.querySelector('#canvas'),
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
    camera: {
      near: systemSize,
      far: systemSize * 6,
    },
  })

  // set the renderer context
  await gpuCameraRenderer.setContext()

  // get the camera
  const { camera } = gpuCameraRenderer

  // set the camera initial position and transform origin, so we can rotate around our scene center
  camera.position.z = systemSize * 4
  camera.transformOrigin.z = -camera.position.z

  // render our scene manually
  const animate = () => {
    camera.rotation.y += 0.01

    gpuCameraRenderer.render()

    requestAnimationFrame(animate)
  }

  animate()

  // now add objects to our scene
  const cubeGeometry = new GPUCurtains.BoxGeometry()
  const sphereGeometry = new GPUCurtains.SphereGeometry()

  for (let i = 0; i < 50; i++) {
    const mesh = new GPUCurtains.Mesh(gpuCameraRenderer, {
      geometry: Math.random() > 0.5 ? cubeGeometry : sphereGeometry,
    })

    mesh.position.x = Math.random() * systemSize * 2 - systemSize
    mesh.position.y = Math.random() * systemSize * 2 - systemSize
    mesh.position.z = Math.random() * systemSize * 2 - systemSize

    const rotationSpeed = Math.random() * 0.025

    mesh.onRender(() => {
      mesh.rotation.y += rotationSpeed
      mesh.rotation.z += rotationSpeed
    })
  }
})
