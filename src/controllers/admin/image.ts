import { Request, Response } from 'express';
import * as multer from 'multer';
import * as db from '@/models';
import Grid, { IGridParams } from '@/lib/grid';
import * as _ from 'lodash';
import { Image } from '.prisma/client';
import { ImageMeta } from '@/models/Image';

const prisma = db.getPrisma();

export async function getList (req: Request, res: Response) {
  const grid = new Grid(req.query as IGridParams)
    .setSortOptions(['id', 'sha256', 'createdAt'])
    .init();

  const rowsQueryParts = [{
    skip: grid.skip,
    take: grid.take
  }] as any[];
  let totalCountQueryParts = [{}] as any[];

  if (grid.sortBy) {
    rowsQueryParts.push({
      orderBy: {
        [grid.sortBy]: grid.sortDesc ? 'desc' : 'asc'
      }
    });
  }

  const rows = await prisma.image.findMany(_.merge(rowsQueryParts));
  const rowsCount = await prisma.image.count(_.merge(totalCountQueryParts));

  res.json({
    page: grid.page,
    pageSize: grid.pageSize,
    rows: rows.map((row: Image & { meta: ImageMeta }) => {
      return {
        id: row.id.toString(),
        uuid: row.uuid,
        sha256: row.sha256,
        width: row.meta.width,
        height: row.meta.height,
        size: row.meta.size,
        createdAt: row.createdAt,
      };
    }),
    totalRows: rowsCount,
  });
}

export function uploadMiddleware () {
  return multer({
    limits: {
      fileSize: 1024 * 1024 * 4, // 4MB
    },
  }).any();
}
  
/**
 * @method post
 */
export async function upload (req: Request, res: Response) {
  let file: Express.Multer.File;
  if (Array.isArray(req.files)) {
    file = req.files[0];
  } else {
    res.status(400).send();
    return;
  }

  if (
    file &&
    ['png', 'jpeg', 'webp'].indexOf(
      file.mimetype.replace(/^image\/(.*)$/, '$1')
    ) !== -1
  ) {
    const imageFile = file;
    const putImageRes = await db.models.Image.putImageAndGetRefInfo(imageFile.buffer);
    if (putImageRes.isGood()) {
      res.status(putImageRes.code).json({
        id: putImageRes.data,
        uuid: putImageRes.data.uuid,
        meta: putImageRes.data.meta
      });
    } else {
      res.status(putImageRes.code).send();
    }
  } else {
    res.status(400).send();
  }
}
