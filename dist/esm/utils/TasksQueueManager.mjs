//#region src/utils/TasksQueueManager.ts
/**
* Used to keep track of a bunch of callbacks and execute them in the right order when needed
*/
var TasksQueueManager = class {
	/** Private number to assign a unique id to each {@link TaskQueueItem | task queue item} */
	#taskCount = 0;
	/**
	* TaskQueueManager constructor
	*/
	constructor() {
		this.queue = [];
	}
	/**
	* Add a {@link TaskQueueItem | task queue item} to the queue
	* @param callback - callback to add to the {@link TaskQueueItem | task queue item}
	* @param parameters - {@link TaskQueueItemParams | parameters} of the {@link TaskQueueItem | task queue item} to add
	* @returns - {@link TaskQueueItem#id | id} of the new {@link TaskQueueItem | task queue item}, useful to later remove the task if needed
	*/
	add(callback = (args) => {}, { order = this.queue.length, once = false } = {}) {
		const task = {
			callback,
			order,
			once,
			id: this.#taskCount
		};
		this.#taskCount++;
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
			if (task.once) this.remove(task.id);
		});
	}
};
//#endregion
export { TasksQueueManager };
