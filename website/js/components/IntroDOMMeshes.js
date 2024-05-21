import { BoxGeometry, DOMMesh, SphereGeometry } from '../../../dist/esm/index.mjs'
import normalsOpacityFs from '../shaders/normals-opacity-fs.wgsl.js'

export class IntroDOMMeshes {
  constructor({ gpuCurtains, scrollObserver }) {
    this.gpuCurtains = gpuCurtains
    this.scrollObserver = scrollObserver

    this.init()
  }

  init() {
    this.createCubes()
    this.createSpheres()
  }

  createCubes() {
    this.cubeMeshes = []

    const cubeEls = document.querySelectorAll('.intro-cube-mesh')
    cubeEls.forEach((cubeEl, cubeIndex) => {
      const cubeMesh = new DOMMesh(this.gpuCurtains, cubeEl, {
        geometry: new BoxGeometry(),
        shaders: {
          fragment: {
            code: normalsOpacityFs,
          },
        },
        transparent: true,
        uniforms: {
          global: {
            struct: {
              opacity: {
                type: 'f32',
                value: 0,
              },
            },
          },
        },
      })

      this.cubeMeshes.push(cubeMesh)

      const updateCubeScaleAndPosition = () => {
        // move our cube along the Z axis so the front face lies at (0, 0, 0) instead of the cube's center
        cubeMesh.position.z = -1 * cubeMesh.worldScale.z
      }

      updateCubeScaleAndPosition()

      cubeMesh.rotation.x = -(cubeIndex * Math.PI) / 12

      cubeMesh.userData.shown = false

      cubeMesh
        .onBeforeRender(() => {
          cubeMesh.rotation.x += 0.015
        })
        .onAfterResize(updateCubeScaleAndPosition)
    })

    this.cubeTween = gsap.timeline({
      paused: true,
    })

    this.cubeMeshes.forEach((cubeMesh, cubeIndex) => {
      this.cubeTween.to(
        cubeMesh.uniforms.global.opacity,
        {
          value: 1,
          duration: 0.25,
        },
        cubeIndex * 0.025
      )
    })

    const parentContainer = document.querySelector('.intro-cube-mesh').closest('.intro-dom-meshes-grid')

    this.cubeTween.call(() => parentContainer.classList.add('is-visible'), null, 0.25)

    this.scrollObserver.observe({
      element: parentContainer,
      onElVisible: () => {
        this.cubeTween.play()
      },
    })
  }

  createSpheres() {
    this.sphereMeshes = []

    const sphereEls = document.querySelectorAll('.intro-sphere-mesh')
    sphereEls.forEach((sphereEl, sphereIndex) => {
      const sphereMesh = new DOMMesh(this.gpuCurtains, sphereEl, {
        geometry: new SphereGeometry(),
        shaders: {
          fragment: {
            code: normalsOpacityFs,
          },
        },
        transparent: true,
        uniforms: {
          global: {
            struct: {
              opacity: {
                type: 'f32',
                value: 0,
              },
            },
          },
        },
      })

      this.sphereMeshes.push(sphereMesh)

      sphereMesh.rotation.y = (sphereIndex * Math.PI) / 12
      sphereMesh.userData.scaleFactor = 0

      sphereMesh.userData.shown = false

      sphereMesh.userData.scaleTween = gsap.timeline({ yoyo: true, repeat: -1 }).fromTo(
        sphereMesh.userData,
        {
          scaleFactor: -1,
        },
        {
          scaleFactor: 1,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => {
            const scale = 1 + sphereMesh.userData.scaleFactor * 0.2
            sphereMesh.scale.set(scale)
          },
        }
      )

      sphereMesh.userData.scaleTween.progress(1 - (sphereIndex * Math.PI) / 24)
    })

    this.sphereTween = gsap.timeline({
      paused: true,
    })

    this.sphereMeshes.forEach((sphereMesh, sphereIndex) => {
      this.sphereTween.to(
        sphereMesh.uniforms.global.opacity,
        {
          value: 1,
          duration: 0.5,
        },
        sphereIndex * 0.025
      )
    })

    const parentContainer = document.querySelector('.intro-sphere-mesh').closest('.intro-dom-meshes-grid')

    this.sphereTween.call(() => parentContainer.classList.add('is-visible'), null, 0.25)

    this.scrollObserver.observe({
      element: parentContainer,
      onElVisible: () => {
        this.sphereTween.play()
      },
    })
  }

  destroy() {
    this.cubeTween?.kill()
    this.sphereTween?.kill()

    this.cubeMeshes.forEach((cubeMesh) => {
      cubeMesh.userData.showTween?.kill()
      cubeMesh.remove()
    })

    this.sphereMeshes.forEach((sphereMesh) => {
      sphereMesh.userData.scaleTween?.kill()
      sphereMesh.remove()
    })
  }
}
