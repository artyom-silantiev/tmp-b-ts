import { getPrisma } from './index';
import { redisBase } from '@/lib/redis/base';
import { Page } from '@prisma/client';

const prisma = getPrisma();

export interface PagePublicData {
  id: string;
  name: string;
  dat: any;
}

export default class PageModel {
  model: Page;

  constructor (model: Page) {
    this.model = model;
  }

  static wrap (model: Page) {
    return new PageModel(model);
  }

  static async getPage (name: string): Promise<PagePublicData | null> {
    const redisClient = redisBase.getClient();
    let result = null;
    const pageCachedData = await redisClient.hgetall('db:pages:' + name);

    if (!pageCachedData) {
      const pageRow = await prisma.page.findFirst({
        where: {
          name
        }
      });

      if (pageRow) {
        result = {
          id: pageRow.id.toString(),
          name: pageRow.name,
          data: pageRow.data
        };
        await redisClient.hmset(
          'db:pages:' + name,
          ['id', result.id],
          ['name', result.name],
          ['data', JSON.stringify(result.data)]
        );
      } else {
        return null;
      }
    } else {
      pageCachedData.data = JSON.parse(pageCachedData.data);
      result = pageCachedData;
    }

    return result;
  }

  static async setPage (name: string, data: any) {
    const redisClient = redisBase.getClient();

    let page = await prisma.page.findFirst({
      where: {
        name
      }
    });

    if (!page) {
      await prisma.page.create({
        data: {
          name,
          data
        }
      });
    } else {
      await prisma.page.update({
        where: {
          id: page.id
        },
        data: {
          data
        }
      })
    }

    await redisClient.del('db:pages:' + name);
  }
}
