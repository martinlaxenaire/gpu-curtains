/** Defines a task queue item */
export interface TaskQueueItem {
    /** Unique id of the task queue item */
    id: number;
    /** Priority order in the {@link TasksQueueManager#queue | tasks queue array} */
    order: number;
    /** Callback to execute */
    callback: (args?: any) => void;
    /** Whether to execute the task only once and them automatically remove it from the {@link TasksQueueManager#queue | tasks queue array} */
    once: boolean;
}
/** Parameters used to add a task to the {@link TasksQueueManager#queue | tasks queue array} */
export type TaskQueueItemParams = Partial<Omit<TaskQueueItem, 'id' | 'callback'>>;
/**
 * Used to keep track of a bunch of callbacks and execute them in the right order when needed
 */
export declare class TasksQueueManager {
    #private;
    /** Array of {@link TaskQueueItem | task queue item} to execute */
    queue: TaskQueueItem[];
    /**
     * TaskQueueManager constructor
     */
    constructor();
    /**
     * Add a {@link TaskQueueItem | task queue item} to the queue
     * @param callback - callback to add to the {@link TaskQueueItem | task queue item}
     * @param parameters - {@link TaskQueueItemParams | parameters} of the {@link TaskQueueItem | task queue item} to add
     * @returns - {@link TaskQueueItem#id | id} of the new {@link TaskQueueItem | task queue item}, useful to later remove the task if needed
     */
    add(callback?: TaskQueueItem['callback'], { order, once }?: Partial<Omit<TaskQueueItem, "id" | "callback">>): TaskQueueItem['id'];
    /**
     * Remove a {@link TaskQueueItem | task queue item} from the queue
     * @param taskId - {@link TaskQueueItem#id | id} of the new {@link TaskQueueItem | task queue item} to remove
     */
    remove(taskId?: number): void;
    /**
     * Execute the {@link TasksQueueManager#queue | tasks queue array}
     */
    execute(args?: any): void;
}
