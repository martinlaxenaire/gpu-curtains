import { Plane, RenderBundle } from '../../../dist/esm/index.mjs'
import { imagePlaneFs, imagePlaneVs } from '../shaders/image-plane.wgsl.js'

export class TexturesPlanes {
  constructor({ gpuCurtains, scrollObserver }) {
    this.gpuCurtains = gpuCurtains
    this.scrollObserver = scrollObserver

    this.planes = []
    this.tween = null

    this.init()
  }

  init() {
    const planeEls = document.querySelectorAll('.textures-plane')

    this.renderBundle = new RenderBundle(this.gpuCurtains, {
      label: 'Textured planes render bundle',
      size: planeEls.length,
      useBuffer: true,
    })

    const scaleIncrease = 1.5
    const scales = {
      top: 1,
      bottom: 1,
    }

    const duration = 1

    planeEls.forEach((planeEl, index) => {
      const plane = new Plane(this.gpuCurtains, planeEl, {
        heightSegments: 20,
        renderBundle: this.renderBundle,
        transparent: true,
        shaders: {
          vertex: {
            code: imagePlaneVs,
          },
          fragment: {
            code: imagePlaneFs,
          },
        },
        uniforms: {
          deformation: {
            struct: {
              strength: {
                type: 'f32',
                value: 0,
              },
            },
          },
          global: {
            struct: {
              opacity: {
                type: 'f32',
                value: 0,
              },
            },
          },
        },
        texturesOptions: {
          generateMips: true,
          useExternalTextures: false,
          placeholderColor: Math.random() > 0.5 ? [255, 0, 255, 1] : [0, 255, 255, 1],
        },
      })

      plane.userData.index = index

      plane.transformOrigin.y = index < 3 ? 0 : 1

      plane.onLoading((texture) => {
        texture.transformOrigin.y = index < 3 ? 0 : 1
        texture.scale.set(scaleIncrease, scaleIncrease, 1)

        if (texture.isVideoSource) {
          texture.source.play()
        }
      })

      this.planes.push(plane)
    })

    this.tween = gsap
      .timeline({
        repeat: -1,
      })
      .to(scales, {
        top: 0.75,
        bottom: 1.25,
        duration,
        ease: 'power3.out',
        onUpdate: () => {
          this.planes.forEach((plane) => {
            if (plane.userData.index < 3) {
              plane.scale.y = scales.top
              plane.uniforms.deformation.strength.value = scales.top - 1
            } else {
              plane.scale.y = scales.bottom
              plane.uniforms.deformation.strength.value = scales.bottom - 1

              plane.domTextures[0].scale.set(scaleIncrease / scales.bottom, scaleIncrease / scales.bottom, 1)
            }
          })
        },
      })
      .to(scales, {
        top: 1,
        bottom: 1,
        duration,
        ease: 'power3.in',
        onUpdate: () => {
          this.planes.forEach((plane) => {
            if (plane.userData.index < 3) {
              plane.scale.y = scales.top
              plane.uniforms.deformation.strength.value = scales.top - 1
            } else {
              plane.scale.y = scales.bottom
              plane.uniforms.deformation.strength.value = scales.bottom - 1

              plane.domTextures[0].scale.set(scaleIncrease / scales.bottom, scaleIncrease / scales.bottom, 1)
            }
          })
        },
      })
      .to(scales, {
        top: 1.25,
        bottom: 0.75,
        duration,
        ease: 'power3.out',
        onUpdate: () => {
          this.planes.forEach((plane) => {
            if (plane.userData.index < 3) {
              plane.scale.y = scales.top
              plane.uniforms.deformation.strength.value = scales.top - 1

              plane.domTextures[0].scale.set(scaleIncrease / scales.top, scaleIncrease / scales.top, 1)
            } else {
              plane.scale.y = scales.bottom
              plane.uniforms.deformation.strength.value = scales.bottom - 1
            }
          })
        },
      })
      .to(scales, {
        top: 1,
        bottom: 1,
        duration,
        ease: 'power3.in',
        onUpdate: () => {
          this.planes.forEach((plane) => {
            if (plane.userData.index < 3) {
              plane.scale.y = scales.top
              plane.uniforms.deformation.strength.value = scales.top - 1

              plane.domTextures[0].scale.set(scaleIncrease / scales.top, scaleIncrease / scales.top, 1)
            } else {
              plane.scale.y = scales.bottom
              plane.uniforms.deformation.strength.value = scales.bottom - 1
            }
          })
        },
      })

    this.opacityTween = gsap.timeline({
      paused: true,
    })

    this.planes.forEach((plane, index) => {
      this.opacityTween.to(
        plane.uniforms.global.opacity,
        {
          value: 1,
          duration: 0.5,
        },
        index * 0.1
      )
    })

    this.scrollObserver.observe({
      element: document.querySelector('#textures-planes-grid'),
      keepObserving: true,
      onElVisible: () => {
        this.renderBundle.visible = true
        this.opacityTween.restart()
      },
      onElHidden: () => {
        this.planes.forEach((plane, index) => {
          plane.uniforms.global.opacity.value = 0
        })
        this.renderBundle.visible = false
      },
    })
  }

  destroy() {
    this.tween?.kill()
    this.opacityTween.kill()
    this.planes.forEach((plane) => plane.remove())
    this.renderBundle.destroy()
  }
}
