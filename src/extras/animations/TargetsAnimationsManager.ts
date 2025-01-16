import { KeyframesAnimation } from './KeyframesAnimation'
import { Object3D } from '../../core/objects3D/Object3D'

export interface Target {
  object: Object3D
  animations: KeyframesAnimation[]
}

export class TargetsAnimationsManager {
  name: string
  targets: Target[]

  startTime: number
  currentTime: number
  duration: number

  constructor({ name = '', targets = [] } = {}) {
    this.name = name
    this.targets = []
    this.duration = 0

    if (targets && targets.length) {
      this.addTargets(targets)
    }
  }

  addTarget(object: Object3D): Target {
    const target = {
      object,
      animations: [],
    }

    this.targets.push(target)

    return target
  }

  addTargets(objects: Object3D[]) {
    objects.forEach((object) => this.addTarget(object))
  }

  addTargetAnimation(object: Object3D, animation: KeyframesAnimation) {
    this.duration = Math.max(this.duration, animation.duration)

    let target = this.getTargetByObject3D(object)

    if (!target) {
      target = this.addTarget(object)
    }

    target.animations.push(animation)
    object.animations = [...object.animations, animation]

    this.targets.forEach((target) => {
      target.animations.forEach((animation) => (animation.duration = this.duration))
    })
  }

  getTargetByObject3D(object: Object3D) {
    return this.targets.find((target) => target.object.object3DIndex === object.object3DIndex)
  }

  getAnimationsByObject3DAndPath(object: Object3D, path: KeyframesAnimation['path']): KeyframesAnimation | null {
    const target = this.getTargetByObject3D(object)

    if (target) {
      return target.animations.find((animation) => animation.path === path)
    } else {
      return null
    }
  }

  reset() {
    this.startTime = 0
    this.currentTime = 0
  }

  playAll() {
    this.startTime = performance.now()
    this.targets.forEach((target) => target.animations.forEach((animation) => animation.play()))
  }

  pauseAll() {
    this.targets.forEach((target) => target.animations.forEach((animation) => animation.pause()))
  }

  stopAll() {
    this.targets.forEach((target) => target.animations.forEach((animation) => animation.stop()))
    this.reset()
  }
}
