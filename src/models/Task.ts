import { getPrisma } from './index';
import { Task } from '@prisma/client';

export default class TaskModel {
  model: Task;

  constructor (model: Task) {
    this.model = model;
  }

  static wrap (model: Task) {
    return new TaskModel(model);
  }
}
