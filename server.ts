import * as express from 'express';
import redis from './lib/redis';
import config from './config/server';
import AppRouter from './routes/index';
import { SendEmailType } from './env.types';
import { sendEmailTaskWork } from './lib/mailer';
import { sleep } from './lib/utils';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as db from './db';

async function serverStart() {
    await db.init();
    redis.init();
    const redisClient = redis.getClient();

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
    app.listen(config.node.port, () => {
        // Success callback
        console.log(`Listening at http://localhost:${config.node.port}/`);
    });

    if (config.mailer.sendEmailType === SendEmailType.Task) {
        (async function () {
            while (true) {
                await sendEmailTaskWork();
                await sleep(config.mailer.sendEmailTaskDealy);
            }
        })();
    }
}

serverStart();
