import { Request, Response } from 'express';
import * as db from '@/models';

export async function change (req: Request, res: Response) {
  const pageName = req.body.name;
  const pageData = req.body.data;
  await db.models.Page.setPage(pageName, pageData);
  res.send('done');
}
