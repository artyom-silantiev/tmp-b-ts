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
import { redisBase } from '../../lib/redis/base';

@Entity({
  name: 'pages',
})
@Unique(['name'])
export class Page {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column()
  name: string;

  @Column({ type: 'jsonb', default: {} })
  data: any;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

@EntityRepository(Page)
export class PageRepository extends Repository<Page> {
  public async getPage(name: string) {
    const redisClient = redisBase.getClient();
    let result = null;
    let pageData = await redisClient.hgetall('db:pages:' + name);

    if (!pageData) {
      const pageRow = await this.findOne({
        where: {
          name,
        },
      });

      if (pageRow) {
        result = {
          id: pageRow.id,
          name: pageRow.name,
          data: pageRow.data,
        };
        await redisClient.hmset(
          'db:pages:' + name,
          ['id', pageRow.id + ''],
          ['name', pageRow.name],
          ['data', JSON.stringify(result.data)]
        );
      }
    } else {
      pageData.data = JSON.parse(pageData.data);
      result = pageData;
    }

    return result;
  }

  public async setPage(name: string, data: any) {
    const redisClient = redisBase.getClient();

    let page = await await this.findOne({
      where: {
        name,
      },
    });

    if (!page) {
      page = await this.create({
        name,
      });
    }

    page.data = data;
    this.save(page);
    await redisClient.del('db:pages:' + name);
  }
}

export function getRepository() {
  return getCustomRepository(PageRepository);
}
