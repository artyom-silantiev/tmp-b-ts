import { Request, Response } from 'express';
import * as db from '@/models';

export async function getByName (req: Request, res: Response) {
  const pageName = req.params['name'] || null;
  if (pageName) {
    const pageData = await db.models.Page.getPage(pageName);
    if (!pageData) {
      return res.status(404).send();
    }
    res.send(pageData);
  }
  return res.status(400).send();
}
