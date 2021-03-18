import { Request, Response } from 'express';
import * as PageModel from '@/db/entity/Page';

export async function change (req: Request, res: Response) {
  const pageName = req.body.name;
  const pageData = req.body.data;
  await PageModel.getRepository().setPage(pageName, pageData);
  res.send('done');
}
