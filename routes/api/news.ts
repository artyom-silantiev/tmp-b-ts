import { Router, Request, Response, NextFunction } from 'express';
import * as db from '../../db';
import Grid from '../../lib/grid';

const router = Router();

router.get('/list', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const grid = new Grid(req.query).init();

    const currentDateTime = new Date();
    const rowsQuery = {
      where: {
        status: db.models.News.NewsStatus.Publish,
        publishAt: db.operators.LessThanOrEqual(currentDateTime),
      },
      skip: grid.skip,
      take: grid.take,
    };
    rowsQuery['order'] = {
      id: 'DESC',
    };

    const totalCountQuery = {
      where: {
        status: db.models.News.NewsStatus.Publish,
        publishAt: db.operators.LessThanOrEqual(currentDateTime),
      },
    };
    const rows = await db.models.News.getRepository().find(rowsQuery);
    const rowsCount = await db.models.News.getRepository().count(
      totalCountQuery
    );

    res.json({
      page: grid.page,
      pageSize: grid.pageSize,
      rows: rows.map((row) => {
        return {
          id: row.id,
          status: row.status,
          header: row.header,
          annotation: row.annotation,
          publishAt: row.publishAt,
        };
      }),
      totalRows: rowsCount,
    });
  } catch (error) {
    next(error);
  }
});

router.get(
  '/by_id/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params['id']);
      if (!id || typeof id !== 'number' || !Number.isInteger(id) || id <= 0) {
        return res.status(400).send();
      }

      const currentDateTime = new Date();
      const newsRow = await db.models.News.getRepository().findOne({
        where: {
          id,
          status: db.models.News.NewsStatus.Publish,
          publishAt: db.Op.LessThanOrEqual(currentDateTime),
        },
      });

      if (!newsRow) {
        return res.status(404).send('not found');
      }

      res.json({
        id: newsRow.id,
        status: newsRow.status,
        header: newsRow.header,
        annotation: newsRow.annotation,
        content: newsRow.content,
        publishAt: newsRow.publishAt,
      });
    } catch (error) {}
  }
);

export default router;
