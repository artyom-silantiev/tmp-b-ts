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
} from 'typeorm';

export enum ImageLocation {
  Local = 'local',
}

export interface IImageMeta {
  format: string;
  width: number;
  height: number;
  size: number;
  thumbs: number[];
}

@Entity({
  name: 'images',
})
export class Image {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 24 })
  uuid: string;

  @Column({ type: 'varchar', length: 64 })
  sha256HashHex: string;

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
  meta: IImageMeta;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

@EntityRepository(Image)
export class ImageRepository extends Repository<Image> {}

export function getRepository() {
  return getCustomRepository(ImageRepository);
}
