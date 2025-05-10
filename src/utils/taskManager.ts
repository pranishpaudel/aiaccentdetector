import { v4 as uuidv4 } from 'uuid';

export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Task {
  id: string;
  status: TaskStatus;
  progress: number;  // 0-100 percentage
  created: Date;
  updated: Date;
  result?: any;
  error?: string;
}

class TaskManager {
  private tasks: Map<string, Task> = new Map();

  // Create a new task and return its ID
  createTask(): string {
    const taskId = uuidv4();
    const task: Task = {
      id: taskId,
      status: 'pending',
      progress: 0,
      created: new Date(),
      updated: new Date()
    };
    
    this.tasks.set(taskId, task);
    return taskId;
  }

  // Get task by ID
  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  // Update task status
  updateTaskStatus(taskId: string, status: TaskStatus): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = status;
      task.updated = new Date();
      this.tasks.set(taskId, task);
    }
  }

  // Update task progress
  updateTaskProgress(taskId: string, progress: number): void {
    const task = this.tasks.get(taskId);
    if (task) {
      // Ensure progress is between 0-100
      task.progress = Math.max(0, Math.min(100, progress));
      task.updated = new Date();
      this.tasks.set(taskId, task);
    }
  }

  // Set task result
  setTaskResult(taskId: string, result: any): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.result = result;
      task.status = 'completed';
      task.progress = 100; 
      task.updated = new Date();
      this.tasks.set(taskId, task);
    }
  }

  // Set task error
  setTaskError(taskId: string, error: string): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.error = error;
      task.status = 'failed';
      // Dont update for failed task
      task.updated = new Date();
      this.tasks.set(taskId, task);
    }
  }

  // Clean up old tasks
  cleanupOldTasks(maxAgeHours: number = 24): void {
    const now = new Date();
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
    
    for (const [taskId, task] of this.tasks.entries()) {
      const taskAge = now.getTime() - task.updated.getTime();
      if (taskAge > maxAgeMs && (task.status === 'completed' || task.status === 'failed')) {
        this.tasks.delete(taskId);
      }
    }
  }
}

// Export a singleton instance
export const taskManager = new TaskManager();