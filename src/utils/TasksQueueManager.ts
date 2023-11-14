/** Defines a task queue item */
export interface TaskQueueItem {
  /** Unique id of the task queue item */
  id: number
  /** Priority order in the [tasks queue list]{@link TasksQueueManager#queue} */
  order: number
  /** Callback to execute */
  callback: (args?: any) => void
  /** Whether to execute the task only once and them automatically remove it from the [tasks queue list]{@link TasksQueueManager#queue} */
  once: boolean
}

/** Parameters used to add a task to the [tasks queue list]{@link TasksQueueManager#queue} */
export type TaskQueueItemParams = Partial<Omit<TaskQueueItem, 'id' | 'callback'>>

/**
 * TaskQueueManager class:
 * Used to keep track of a bunch of callbacks and execute them in the right order when needed
 */
export class TasksQueueManager {
  /** Array of [task queue items]{@link TaskQueueItem} to execute */
  queue: TaskQueueItem[]
  /** Private number to assign a unique id to each [task queue item]{@link TaskQueueItem} */
  #taskCount = 0

  /**
   * TaskQueueManager constructor
   */
  constructor() {
    this.queue = []
  }

  /**
   * Add a [task item]{@link TaskQueueItem} to the queue
   * @param callback - callback to add to the [task queue item]{@link TaskQueueItem}
   * @param parameters - [parameters]{@link TaskQueueItemParams} of the [task queue item]{@link TaskQueueItem} to add
   * @returns - [ID]{@link TaskQueueItem#id} of the new [task queue item]{@link TaskQueueItem}, useful to later the remove the task id needed
   */
  add(
    callback: TaskQueueItem['callback'] = (args?: any) => {
      /* allow empty callbacks */
    },
    { order = this.queue.length, once = false } = {} as TaskQueueItemParams
  ): TaskQueueItem['id'] {
    const task = {
      callback,
      order,
      once,
      id: this.#taskCount,
    }

    // increment id
    this.#taskCount++

    this.queue.push(task)
    this.queue.sort((a, b) => {
      return a.order - b.order
    })

    return task.id
  }

  /**
   * Remove a [task item]{@link TaskQueueItem} from the queue
   * @param taskId
   */
  remove(taskId = 0) {
    this.queue = this.queue.filter((task) => task.id !== taskId)
  }

  /**
   * Execute the [tasks queue]{@link TasksQueueManager#queue}
   */
  execute(args?: any) {
    this.queue.forEach((task) => {
      task.callback(args)

      // if it was a one time callback, remove it
      if (task.once) {
        this.remove(task.id)
      }
    })
  }
}
