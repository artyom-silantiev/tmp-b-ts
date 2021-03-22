import * as dotenv from 'dotenv';
dotenv.config();

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

    const NODE_PORT=process.env.NODE_PORT;

    // Serve the application at the given port
    app.listen(NODE_PORT, () => {
        // Success callback
        console.log(`Listening at http://localhost:${NODE_PORT}/`);
    });

    if (process.env.MAILER_SEND_EMAIL_TYPE === 'TASK') {
        const MAILER_TASK_DELAY = parseInt(process.env.MAILER_TASK_DELAY);
        (async function () {
            while (true) {
                await sendEmailTaskWork();
                await sleep(MAILER_TASK_DELAY);
            }
        })();
    }
}

serverStart();
