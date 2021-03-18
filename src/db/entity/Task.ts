import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
  EntityRepository,
  Repository,
  getCustomRepository,
} from 'typeorm';

export enum TaskType {
  SendEmail = 'send_email',
}

@Entity({
  name: 'tasks',
})
export class Task {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column('enum', {
    enumName: 'tasks_task_type_enum',
    enum: TaskType,
    default: TaskType.SendEmail,
  })
  type: TaskType;

  @Column('jsonb')
  data: any;

  @Column('smallint', { default: 0 })
  attempts: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

@EntityRepository(Task)
export class TaskRepository extends Repository<Task> {}

export function getRepository() {
  return getCustomRepository(TaskRepository);
}
