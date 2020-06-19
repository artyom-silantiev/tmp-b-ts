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
  name: 'seeds',
})
export class Seed {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column()
  name: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}

@EntityRepository(Seed)
export class SeedRepository extends Repository<Seed> {}

export function getRepository() {
  return getCustomRepository(SeedRepository);
}
