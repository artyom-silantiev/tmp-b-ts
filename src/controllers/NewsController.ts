import { Request, Response } from 'express';
import * as db from '../db';
import Grid from '../lib/grid';

export async function getList (req: Request, res: Response) {
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
}

export async function getById (req: Request, res: Response) {
  const id = req.params.id;

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
}
