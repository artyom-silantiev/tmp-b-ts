import { getPrisma } from './index';
import { Image, ImageLocation } from '@prisma/client';

import * as moment from 'moment';
import * as sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs-extra';
import bs58 from '@/lib/bs58';
import * as utils from '@/lib/utils';
import StandardResult from '@/lib/classes/standard_result';
import env from '@/env';

fs.mkdirsSync(env.DIR_IMAGES);
fs.mkdirsSync(env.DIR_TEMP_FILES);

const prisma = getPrisma();

export interface ImageMeta {
  format: string;
  width: number;
  height: number;
  size: number;
  thumbs: number[];
}

export function getPublicPath (image: Image) {
  if (image.location === ImageLocation.LOCAL) {
    return '/image/' + image.uuid;
  }
}

export async function putImageAndGetRefInfo (imageFileOrBuf: string | Buffer):
    Promise<StandardResult<Image>>
  {
    if (typeof imageFileOrBuf === 'string') {
      if (!await fs.pathExists(imageFileOrBuf)) {
        throw new Error('File not found');
      }
    }

    const standardResult: StandardResult<Image> = new StandardResult();

    const imageMeta = await sharp(imageFileOrBuf).metadata();
    let format = imageMeta.format;
    if (format === 'jpeg') {
      format = 'jpg';
    }
    if (!format) {
      return standardResult.setCode(400).setMessage('Bad format');
    }

    const newUuid = bs58.uuid();
    const tempFile = path.join(env.DIR_TEMP_FILES, newUuid + '.' + format);
    await fs.writeFile(tempFile, imageFileOrBuf);
    const imageSha256 = await utils.sha256File(tempFile);
    const imageRow = await prisma.image.findFirst({
      where: {
        sha256: imageSha256
      }
    });
    if (imageRow) {
      await fs.remove(tempFile);
      return standardResult.setCode(208).setData(imageRow);
    }

    const localDest = path.join(moment().format('YYYY/MM/DD'), newUuid);
    const dest = path.join(env.DIR_IMAGES, localDest);
    await fs.mkdirs(dest);
    const originalImageFile = path.join(dest, 'original.' + format);
    await fs.move(tempFile, originalImageFile);
    const meta = {
      format: format,
      width: imageMeta.width,
      height: imageMeta.height,
      size: imageMeta.size,
      thumbs: []
    }; // as ImageMeta;

    let thumbLog2 = env.IMAGE_MIN_PREVEIW_LOG_SIZE;
    let thumbWidth = Math.pow(2, thumbLog2);
    while (imageMeta.width >= thumbWidth) {
      let newThumbImageFile = path.join(
        env.DIR_IMAGES,
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

    const newImage = await prisma.image.create({
      data: {
        uuid: newUuid,
        sha256: imageSha256,
        location: ImageLocation.LOCAL,
        path: localDest,
        meta: meta
      }
    });

    return standardResult.setCode(201).setData(newImage);
  }
