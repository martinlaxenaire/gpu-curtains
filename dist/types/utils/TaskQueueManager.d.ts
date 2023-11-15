/** Defines a task queue item */
export interface TaskQueueItem {
    /** Unique id of the task queue item */
    id: number;
    /** Priority order in the [tasks queue list]{@link TaskQueueManager#queue} */
    order: number;
    /** Callback to execute */
    callback: (args: any) => void;
    /** Whether to execute the task only once and them automatically remove it from the [tasks queue list]{@link TaskQueueManager#queue} */
    once: boolean;
}
/** Parameters used to add a task to the [tasks queue list]{@link TaskQueueManager#queue} */
export type TaskQueueItemParams = Partial<Omit<TaskQueueItem, 'id' | 'callback'>>;
/**
 * TaskQueueManager class:
 * Used to keep track of a bunch of callbacks and execute them in the right order when needed
 */
export declare class TaskQueueManager {
    #private;
    /** Array of [task queue items]{@link TaskQueueItem} to execute */
    queue: TaskQueueItem[];
    /**
     * TaskQueueManager constructor
     */
    constructor();
    /**
     * Add a [task item]{@link TaskQueueItem} to the queue
     * @param callback - callback to add to the [task queue item]{@link TaskQueueItem}
     * @param parameters - [parameters]{@link TaskQueueItemParams} of the [task queue item]{@link TaskQueueItem} to add
     * @returns - [ID]{@link TaskQueueItem#id} of the new [task queue item]{@link TaskQueueItem}, useful to later the remove the task id needed
     */
    add(callback?: TaskQueueItem['callback'], { order, once }?: Partial<Omit<TaskQueueItem, "id" | "callback">>): TaskQueueItem['id'];
    /**
     * Remove a [task item]{@link TaskQueueItem} from the queue
     * @param taskId
     */
    remove(taskId?: number): void;
    /**
     * Execute the [tasks queue]{@link TaskQueueManager#queue}
     */
    execute(args: any): void;
}
