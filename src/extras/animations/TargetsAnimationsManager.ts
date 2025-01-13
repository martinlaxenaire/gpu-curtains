import { KeyframesAnimation } from './KeyframesAnimation'
import { Object3D } from '../../core/objects3D/Object3D'

export interface Target {
  object: Object3D
  animations: KeyframesAnimation[]
}

export class TargetsAnimationsManager {
  targets: Target[]
  //animations: KeyframesAnimation[]

  duration: number

  constructor({ targets = [] } = {}) {
    //this.target = target
    //this.animations = []
    this.targets = []
    this.duration = 0

    if (targets && targets.length) {
      this.addTargets(targets)
    }
  }

  addTarget(object: Object3D) {
    const target = {
      object,
      animations: [],
    }
    this.targets.push(target)

    // now patch target update matrix method
    const _updateMatrixStack = target.object.updateMatrixStack.bind(target.object)

    target.object.updateMatrixStack = () => {
      target.animations.forEach((animation) => animation.update(target.object))

      _updateMatrixStack()
    }
  }

  addTargets(objects: Object3D[]) {
    objects.forEach((object) => this.addTarget(object))
  }

  addTargetAnimation(object: Object3D, animation: KeyframesAnimation) {
    this.duration = Math.max(this.duration, animation.duration)

    const target = this.getTargetByObject3D(object)
    if (target) {
      target.animations.push(animation)
    }

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

  playAll() {
    this.targets.forEach((target) => target.animations.forEach((animation) => animation.play()))
  }

  pauseAll() {
    this.targets.forEach((target) => target.animations.forEach((animation) => animation.pause()))
  }

  stopAll() {
    this.targets.forEach((target) => target.animations.forEach((animation) => animation.stop()))
  }
}
