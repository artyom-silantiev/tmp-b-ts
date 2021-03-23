import { Request, Response } from 'express';
import * as path from 'path';
import * as _ from 'lodash';
import * as sharp from 'sharp';
import * as db from '@/models';
import { Image } from '@prisma/client';
import { redisBase } from '@/lib/redis/base';
import { ImageMeta } from '@/models/Image';
import env from '@/env';

const prisma = db.getPrisma();
const waitPreviewImagePromises = {};

const redisSub = redisBase.getClientSubscribe();
redisSub.subscribe('create_image_preview_task', 'create_image_preview_done');
redisSub.redis.on('message', async (channel, taskKey) => {
  if (
    channel === 'create_image_preview_task' &&
    env.IMAGE_ENABLED_CREATE_IMAGE_TASK
  ) {
    await createImagePreview(taskKey);
  } else if (channel === 'create_image_preview_done') {
    if (
      waitPreviewImagePromises[taskKey] &&
      waitPreviewImagePromises[taskKey].length
    ) {
      for (let done of waitPreviewImagePromises[taskKey]) {
        done();
      }
      delete waitPreviewImagePromises[taskKey];
    }
  }
});

async function createImagePreview(taskKey) {
  try {
    const redisClient = redisBase.getClient();
    let taskStr = await redisClient.get(taskKey);
    if (taskStr !== 'idle') {
      let task = JSON.parse(taskStr);
      let imageRow = await prisma.image.findFirst({
        where: {
          uuid: task.uuid,
        },
      }) as Image & {
        meta: ImageMeta
      };

      let originalImageFile = path.join(
        env.DIR_IMAGES,
        imageRow.path,
        'original.' + imageRow.meta.format
      );
      let newThumbImageFile = path.join(
        env.DIR_IMAGES,
        imageRow.path,
        task.thumbsSize + '.jpg'
      );
      let image = await sharp(originalImageFile);
      await image
        .resize(task.thumbsSize)
        .jpeg({ quality: 75 })
        .toFile(newThumbImageFile);
      
      imageRow.meta.thumbs.push(task.thumbsSize);
      await prisma.image.update({
        where: {
          id: imageRow.id
        },
        data: {
          meta: _.clone(imageRow.meta)
        }
      })

      await redisClient.del('db:image:uuid:' + imageRow.uuid);
      await redisClient.del(taskKey);
      await redisClient.publish('create_image_preview_done', taskKey);
    }
  } catch (error) {
    console.log(error);
  }
}

async function waitPreviewImage(taskKey, timeout = 2000): Promise<boolean> {
  if (!waitPreviewImagePromises[taskKey]) {
    waitPreviewImagePromises[taskKey] = [];
  }
  return await new Promise((resolve) => {
    let timer = setTimeout(() => {
      resolve(false);
    }, timeout);
    waitPreviewImagePromises[taskKey].push(() => {
      clearTimeout(timer);
      resolve(true);
    });
  });
}

/**
   * @method get
   * @scheme /:uuid
   */
export async function getImageByUuid (req: Request, res: Response) {
  const uuidParam = req.params['uuid'];
  const redisClient = redisBase.getClient();

  if (typeof uuidParam !== 'string') {
    res.status(400).send();
    return;
  }

  const parts = uuidParam.split(':');
  const uuid = parts[0];
  let thumbsSize = null;
  let resImageFile = '';
  let resData = {
    path: '',
    location: '',
    meta: null,
  };
  let imageRow;

  if (parts.length === 2 && /^\d+$/.test(parts[1])) {
    thumbsSize = parts[1];
  }

  let cachedImage = await redisClient.hgetall('db:image:uuid:' + uuid);

  if (cachedImage) {
    resData.path = cachedImage.path;
    resData.location = cachedImage.location;
    resData.meta = JSON.parse(cachedImage.meta);
  } else {
    imageRow = await prisma.image.findFirst({
      where: {
        uuid
      }
    }) as Image & {
      meta: ImageMeta
    };

    if (!imageRow) {
      res.status(404).send();
      return;
    }

    await redisClient.hmset(
      'db:image:uuid' + uuid,
      ['path', imageRow.path],
      ['location', imageRow.location],
      ['meta', JSON.stringify(imageRow.meta)]
    );
    await redisClient.expire('db:image:uuid:' + uuid, 3600);
    resData.path = imageRow.path;
    resData.location = imageRow.location;
    resData.meta = _.clone(imageRow.meta);
  }

  if (thumbsSize) {
    thumbsSize = parseInt(thumbsSize);
    if (thumbsSize > resData.meta.width) {
      thumbsSize = resData.meta.width;
    }
    let sizeLog2 = Math.max(
      env.IMAGE_MIN_PREVEIW_LOG_SIZE,
      Math.floor(Math.log2(thumbsSize))
    );
    thumbsSize = Math.pow(2, sizeLog2);

    if (resData.meta.thumbs.indexOf(thumbsSize) === -1) {
      const taskKey = 'task:create_image_preview:' + uuid + ':' + thumbsSize;
      const taskExists = await redisClient.exists(taskKey);

      if (!taskExists) {
        await redisClient.set(taskKey, 'idle');

        imageRow = imageRow ||
          (await await prisma.image.findFirst({
            where: {
              uuid
            }
          }) as Image & {
            meta: ImageMeta
          });
        
        let taskBody = {
          uuid: uuid,
          thumbsSize,
        };
        await redisClient.set(taskKey, JSON.stringify(taskBody));
        await redisClient.publish('create_image_preview_task', taskKey);
      }
      
      const waitResult = await waitPreviewImage(taskKey);
      if (waitResult) {
        resImageFile = path.join(
          env.DIR_IMAGES,
          resData.path,
          thumbsSize + '.jpg'
        );
      } else {
        resImageFile = path.join(
          env.DIR_IMAGES,
          resData.path,
          'original.' + resData.meta.format
        );
      }
    } else {
      resImageFile = path.join(
        env.DIR_IMAGES,
        resData.path,
        thumbsSize + '.jpg'
      );
    }
  } else {
    resImageFile = path.join(
      env.DIR_IMAGES,
      resData.path,
      'original.' + resData.meta.format
    );
  }

  res.sendFile(resImageFile);
}
