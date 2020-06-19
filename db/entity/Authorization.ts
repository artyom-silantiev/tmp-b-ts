import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
  BeforeUpdate,
  BeforeInsert,
  OneToOne,
  ManyToOne,
  JoinColumn,
  EntityRepository,
  Repository,
  getCustomRepository,
} from 'typeorm';
import { User } from './User';

@Entity({
  name: 'authorizations',
})
@Unique(['token'])
@Index(['expirationAt'])
export class Authorization {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column()
  token: string;

  @Column('bigint')
  userId: string;
  @ManyToOne((type) => User)
  @JoinColumn()
  user: User;

  @Column({ type: 'timestamptz' })
  expirationAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

@EntityRepository(Authorization)
export class AuthorizationRepository extends Repository<Authorization> {}

export function getRepository() {
  return getCustomRepository(AuthorizationRepository);
}
