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

export enum NewsStatus {
  Draft = 'draft',
  Publish = 'publish',
}

@Entity({
  name: 'news',
})
@Index(['status'])
export class News {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({
    type: 'enum',
    enumName: 'news_news_status_enum',
    enum: NewsStatus,
    default: NewsStatus.Draft,
  })
  status: NewsStatus;

  @Column()
  header: string;

  @Column()
  annotation: string;

  @Column()
  content: string;

  @Column({ type: 'timestamptz' })
  publishAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

@EntityRepository(News)
export class NewsRepository extends Repository<News> {}

export function getRepository() {
  return getCustomRepository(NewsRepository);
}
