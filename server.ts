import * as dotenv from 'dotenv';
dotenv.config();
import env, { SendEmailType } from '@/env';

import * as express from 'express';
import { redisBase } from '@/lib/redis/base';
import AppRouter from '@/routes/index';
import { sendEmailTaskWork } from '@/lib/mailer';
import { sleep } from '@/lib/utils';

async function serverStart() {
  const redisClient = redisBase.getClient();

  const keys = await redisClient.keys('*');
  for (let key of keys) {
    await redisClient.del(key);
  }

  const app = express();
  app.use(AppRouter);

  // Serve the application at the given port
  app.listen(env.NODE_PORT, () => {
    // Success callback
    console.log(`Listening at http://localhost:${env.NODE_PORT}/`);
  });

  if (env.MAILER_SEND_EMAIL_TYPE === SendEmailType.task) {
    (async function () {
      while (true) {
        await sendEmailTaskWork();
        await sleep(env.MAILER_TASK_DELAY);
      }
    })();
  }
}

serverStart();
