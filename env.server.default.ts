import {
    SendEmailType
} from './src/env.types';

export default {
    env: 'production', // development or production
    node: {
        port: 3000,
        host: 'localhost:3000',
        protocol: 'http:',
        passwordSalt: 'passwordSalt',
        jwtSecret: 'jwtSecret',
        tempFilesDir: '/data/temp'
    },
    redis: {
        host: 'localhost',
        port: 6379,
        database: 0
    },
    mailer: {
        sendEmailType: SendEmailType.Now,
        sendEmailTaskDealy: 5000,
        defaultFromEmail: 'noreply@example.com',
        defaultFromName: 'Project Tmp X2',
        nodemailer: {
            host: 'smtp.example.com',
            port: 587,
            secure: true,
            auth: {
                user: 'noreply@example.com',
                pass: 'password'
            }
        }
    },
    googleRecaptcha: {
        secretKey: 'XXXXXXXXXXXXXXXXXx'
    },
    image: {
        dir: './data/images',
        minPreviewLogSize: 5,
        enableCreatePreviewImageTask: true
    }
};
