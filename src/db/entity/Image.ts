import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
  EntityRepository,
  Repository,
  getCustomRepository,
  OneToMany,
  JoinColumn
} from 'typeorm';

import * as moment from 'moment';
import * as sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs-extra';
import bs58 from '@/lib/bs58';
import config from '@/config';
import * as utils from '@/lib/utils';
import StandardResult from '@/lib/classes/standard_result';

const imageDir = path.join(process.cwd(), config.image.dir);
const tempDir = path.join(process.cwd(), config.node.tempFilesDir);
fs.mkdirsSync(imageDir);
fs.mkdirsSync(tempDir);

export enum ImageLocation {
  Local = 'local',
}

export interface ImageMeta {
  format: string;
  width: number;
  height: number;
  size: number;
  thumbs: number[];
}

@Entity({
  name: 'images',
})
@Index(['uuid'])
@Index(['sha256'])
export class Image {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 24 })
  uuid: string;

  @Column({ type: 'varchar', length: 64 })
  sha256: string;

  @Column({
    type: 'enum',
    enumName: 'images_image_location_enum',
    enum: ImageLocation,
    default: ImageLocation.Local,
  })
  location: ImageLocation;

  @Column()
  path: string;

  @Column({ type: 'jsonb' })
  meta: ImageMeta;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  public getPublicPath () {
    if (this.location === ImageLocation.Local) {
      return '/image/' + this.uuid;
    }
  }
}

@EntityRepository(Image)
export class ImageRepository extends Repository<Image> {
  public async putImageAndGetRefInfo (imageFileOrBuf: string | Buffer):
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
    const tempFile = path.join(tempDir, newUuid + '.' + format);
    await fs.writeFile(tempFile, imageFileOrBuf);
    const imageSha256 = await utils.sha256File(tempFile);
    const imageRow = await this.findOne({
      where: {
        sha256: imageSha256,
      },
    });
    if (imageRow) {
      await fs.remove(tempFile);
      return standardResult.setCode(208).setData(imageRow);
    }

    const localDest = path.join(moment().format('YYYY/MM/DD'), newUuid);
    const dest = path.join(imageDir, localDest);
    await fs.mkdirs(dest);
    const originalImageFile = path.join(dest, 'original.' + format);
    await fs.move(tempFile, originalImageFile);
    const meta = <ImageMeta>{
      format: format,
      width: imageMeta.width,
      height: imageMeta.height,
      size: imageMeta.size,
      thumbs: [],
    };

    let thumbLog2 = config.image.minPreviewLogSize;
    let thumbWidth = Math.pow(2, thumbLog2);
    while (imageMeta.width >= thumbWidth) {
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

    const newImage = this.create();
    newImage.uuid = newUuid;
    newImage.sha256 = imageSha256;
    newImage.location = ImageLocation.Local;
    newImage.path = localDest;
    newImage.meta = meta;
    await this.save(newImage);

    return standardResult.setCode(201).setData(newImage);
  }
}

export function getRepository() {
  return getCustomRepository(ImageRepository);
}
