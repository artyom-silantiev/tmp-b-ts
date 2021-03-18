import { Request, Response } from 'express';
import * as multer from 'multer';
import * as db from '@/db';
import * as ImageModel from '@/db/entity/Image';
import Grid, { IGridParams } from '@/lib/grid';

export async function getList (req: Request, res: Response) {
  const grid = new Grid(req.query as IGridParams)
    .setSortOptions(['id', 'sha256', 'createdAt'])
    .init();

  let rowsQuery = db.models.Image.getRepository()
    .createQueryBuilder('row')
    .select()
    .skip(grid.skip)
    .take(grid.take);
  let totalCountQuery = db.models.Image.getRepository()
    .createQueryBuilder('row')
    .select();

  if (grid.sortBy) {
    rowsQuery['order'] = [[grid.sortBy, grid.sortDesc ? 'DESC' : 'ASC']];
  }

  const rows = await rowsQuery.getMany();
  const rowsCount = await totalCountQuery.getCount();

  res.json({
    page: grid.page,
    pageSize: grid.pageSize,
    rows: rows.map((row) => {
      return {
        id: row.id,
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
    const putImageRes = await ImageModel.getRepository().putImageAndGetRefInfo(imageFile.buffer);
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
