import { Router, Request, Response, NextFunction } from 'express';
import * as multer from 'multer';
import * as sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as crypto from 'crypto';
import * as moment from 'moment';
import * as db from '../../../db';
import * as ImageModel from '../../../db/entity/Image';
import bs58 from '../../../lib/bs58';
import config from '../../../config';
import Grid from '../../../lib/grid';

const router = Router();
const imageDir = path.join(process.cwd(), config.image.dir);
const tempDir = path.join(process.cwd(), config.node.tempFilesDir);
fs.mkdirsSync(imageDir);
fs.mkdirsSync(tempDir);

router.get('/list', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const grid = new Grid(req.query)
      .setSortOptions(['id', 'sha256HashHex', 'createdAt'])
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
          sha256HashHex: row.sha256HashHex,
          width: row.meta.width,
          height: row.meta.height,
          size: row.meta.size,
          createdAt: row.createdAt,
        };
      }),
      totalRows: rowsCount,
    });
  } catch (error) {
    next(error);
  }
});

const imageUploader = multer({
  limits: {
    fileSize: 1024 * 1024 * 2, // 4MB
  },
});
router.post(
  '/upload',
  imageUploader.single('imageFile'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (
        req.file &&
        ['png', 'jpeg', 'webp'].indexOf(
          req.file.mimetype.replace(/^image\/(.*)$/, '$1')
        ) !== -1
      ) {
        const imageFile = req.file;
        const image = await sharp(imageFile.buffer).metadata();
        let format = image.format;
        if (format === 'jpeg') {
          format = 'jpg';
        }
        if (!format) {
          return res.status(400).send();
        }

        const newUuid = bs58.uuid();
        const tempFile = path.join(tempDir, newUuid + '.' + format);
        await fs.writeFile(tempFile, imageFile.buffer);
        const imageSha256 = <string>await new Promise((resolve) => {
          const rs = fs.createReadStream(tempFile);
          const sha256 = crypto.createHash('sha256');
          rs.on('data', (data) => {
            sha256.update(data);
          });
          rs.on('end', () => {
            resolve(sha256.digest('hex'));
          });
        });
        const imageRow = await db.models.Image.getRepository().findOne({
          where: {
            sha256HashHex: imageSha256,
          },
        });
        if (imageRow) {
          await fs.remove(tempFile);
          return res.status(208).json({
            uuid: imageRow.uuid,
            meta: imageRow.meta,
          });
        }

        const localDest = path.join(moment().format('YYYY/MM/DD'), newUuid);
        const dest = path.join(imageDir, localDest);
        await fs.mkdirs(dest);
        const originalImageFile = path.join(dest, 'original.' + format);
        await fs.move(tempFile, originalImageFile);
        const meta = <ImageModel.IImageMeta>{
          format: format,
          width: image.width,
          height: image.height,
          size: image.size,
          thumbs: [],
        };

        let thumbLog2 = config.image.minPrevieLogSize;
        let thumbWidth = Math.pow(2, thumbLog2);
        while (image.width >= thumbWidth) {
          let newThumbImageFile = path.join(
            imageDir,
            localDest,
            thumbWidth + '.jpg'
          );
          let image = await sharp(originalImageFile);
          await image
            .resize(thumbWidth)
            .jpeg({ quality: 75 })
            .toFile(newThumbImageFile);
          meta.thumbs.push(thumbWidth);

          thumbLog2++;
          thumbWidth = Math.pow(2, thumbLog2);
        }

        const newImage = db.models.Image.getRepository().create();
        newImage.uuid = newUuid;
        newImage.sha256HashHex = imageSha256;
        newImage.location = db.models.Image.ImageLocation.Local;
        newImage.path = localDest;
        newImage.meta = meta;
        ImageModel.getRepository().save(newImage);

        res.status(201).json({
          uuid: newImage.uuid,
          meta: newImage.meta,
        });
      } else {
        res.status(400).send();
      }
    } catch (error) {
      next(error);
    }
  }
);

export default router;
