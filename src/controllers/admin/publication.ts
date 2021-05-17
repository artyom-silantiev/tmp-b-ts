import { Request, Response } from 'express';
import * as db from '@/models'

const prisma = db.getPrisma();

export async function put (req: Request, res: Response) {
  const publicationId = req.body.id;
  const status = req.body.status;
  const header = req.body.header;
  const annotation = req.body.annotation;
  const content = req.body.content;
  const publishAt = req.body.publishAt;

  if (!publicationId) {
    // create
    const newPublication = await prisma.publication.create({
      data: {
        status,
        header,
        annotation,
        content,
        publishAt
      }
    });

    res.status(201).json({
      id: newPublication.id.toString()
    });
  } else {
    const publication = await prisma.publication.findFirst({
      where: {
        id: BigInt(publicationId)
      }
    });

    if (!publication) {
      res.status(404).send('not found');
    }

    await prisma.publication.update({
      where: {
        id: BigInt(publicationId)
      }, 
      data: {
        status,
        header,
        annotation,
        content,
        publishAt
      }
    });

    res.send();
  }
};


export async function deleteById (req: Request, res: Response) {
  const publicationId = req.params.id;

  const newsToDelRow = await prisma.publication.findFirst({
    where: {
      id: BigInt(publicationId)
    }
  });

  if (!newsToDelRow) {
    res.status(404).send();
  }

  await prisma.publication.delete({
    where: {
      id: BigInt(publicationId)
    }
  });

  res.send();
}
