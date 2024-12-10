var __accessCheck = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateGet = (obj, member, getter) => {
  __accessCheck(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateSet = (obj, member, value, setter) => {
  __accessCheck(obj, member, "write to private field");
  member.set(obj, value);
  return value;
};
var __privateWrapper = (obj, member, setter, getter) => ({
  set _(value) {
    __privateSet(obj, member, value);
  },
  get _() {
    return __privateGet(obj, member, getter);
  }
});
var _taskCount;
class TasksQueueManager {
  /**
   * TaskQueueManager constructor
   */
  constructor() {
    /** Private number to assign a unique id to each {@link TaskQueueItem | task queue item} */
    __privateAdd(this, _taskCount, 0);
    this.queue = [];
  }
  /**
   * Add a {@link TaskQueueItem | task queue item} to the queue
   * @param callback - callback to add to the {@link TaskQueueItem | task queue item}
   * @param parameters - {@link TaskQueueItemParams | parameters} of the {@link TaskQueueItem | task queue item} to add
   * @returns - {@link TaskQueueItem#id | id} of the new {@link TaskQueueItem | task queue item}, useful to later remove the task if needed
   */
  add(callback = (args) => {
  }, { order = this.queue.length, once = false } = {}) {
    const task = {
      callback,
      order,
      once,
      id: __privateGet(this, _taskCount)
    };
    __privateWrapper(this, _taskCount)._++;
    this.queue.push(task);
    this.queue.sort((a, b) => {
      return a.order - b.order;
    });
    return task.id;
  }
  /**
   * Remove a {@link TaskQueueItem | task queue item} from the queue
   * @param taskId - {@link TaskQueueItem#id | id} of the new {@link TaskQueueItem | task queue item} to remove
   */
  remove(taskId = 0) {
    this.queue = this.queue.filter((task) => task.id !== taskId);
  }
  /**
   * Execute the {@link TasksQueueManager#queue | tasks queue array}
   */
  execute(args) {
    this.queue.forEach((task) => {
      task.callback(args);
      if (task.once) {
        this.remove(task.id);
      }
    });
  }
}
_taskCount = new WeakMap();

export { TasksQueueManager };
