import * as dotenv from 'dotenv';
dotenv.config();
import env, { SendEmailType } from '@/env';

console.log(env);

import * as express from 'express';
import { redisBase } from '@/lib/redis/base';
import AppRouter from '@/routes/index';
import { sendEmailTaskWork } from '@/lib/mailer';
import { sleep } from '@/lib/utils';
import * as fs from 'fs-extra';
import * as path from 'path';

async function serverStart() {
  const redisClient = redisBase.getClient();

  const keys = await redisClient.keys('*');
  for (let key of keys) {
    await redisClient.del(key);
  }

  // mkdirs ./public/images/users_avatars
  const usersAvatarsDir = path.join(process.cwd(), 'public', 'images', 'users_avatars');
  if (!(await fs.pathExists(usersAvatarsDir))) {
    await fs.mkdirs(usersAvatarsDir);
  }

  const app = express();
  app.use(AppRouter);

  // Serve the application at the given port
  app.listen(env.NODE_PORT, () => {
    // Success callback
    console.log(`Listening at http://localhost:${env.NODE_PORT}/`);
  });

  if (env.MAILER_SEND_EMAIL_TYPE === SendEmailType.Task) {
    (async function () {
      while (true) {
        await sendEmailTaskWork();
        await sleep(env.MAILER_TASK_DELAY);
      }
    })();
  }
}

serverStart();
