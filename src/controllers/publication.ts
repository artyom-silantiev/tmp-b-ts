import { Request, Response } from 'express';
import * as db from '@/models';
import Grid from '@/lib/grid';
import { PublicationStatus } from '@prisma/client';

const prisma = db.getPrisma();

export async function getFetchList (req: Request, res: Response) {
  const grid = new Grid(req.query).init();
  const currentDateTime = new Date();

  const rows = await prisma.publication.findMany({
    where: {
      status: PublicationStatus.PUBLISH,
      publishAt: {
        lte: currentDateTime
      }
    },
    skip: grid.skip,
    take: grid.take,
    orderBy: {
      publishAt: 'desc'
    }
  });
  const rowsCount = await prisma.publication.count({
    where: {
      status: PublicationStatus.PUBLISH,
      publishAt: {
        lte: currentDateTime
      }
    },
  });

  res.json({
    page: grid.page,
    pageSize: grid.pageSize,
    rows: rows.map((row) => {
      return {
        id: row.id.toString(),
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
  const newsRow = await prisma.publication.findFirst({
    where: {
      id: BigInt(id),
      status: PublicationStatus.PUBLISH,
      publishAt: {
        lte: currentDateTime
      }
    },
  });

  if (!newsRow) {
    return res.status(404).send('not found');
  }

  res.json({
    id: newsRow.id.toString(),
    status: newsRow.status,
    header: newsRow.header,
    annotation: newsRow.annotation,
    content: newsRow.content,
    publishAt: newsRow.publishAt,
  });
}
