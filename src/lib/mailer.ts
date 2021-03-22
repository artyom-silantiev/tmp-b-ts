import * as Nodemailer from 'nodemailer';
import * as ejs from 'ejs';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as htmlToText from 'html-to-text';
import * as db from '../models';
import { TaskType, Task } from '@prisma/client';

export enum SendEmailType {
  Sync = 'sync',
  Task = 'task'
};

const prisma = db.getPrisma();

const MAILER_SMTP_HOST = process.env.MAILER_SMTP_HOST as string;
const MAILER_SMTP_PORT = parseInt(process.env.MAILER_SMTP_PORT);
const MAILER_SMTP_IS_SECURE = !!parseInt(process.env.MAILER_SMTP_IS_SECURE);
const MAILER_SMTP_AUTH_USER = process.env.MAILER_SMTP_AUTH_USER;
const MAILER_SMTP_AUTH_PASS = process.env.MAILER_SMTP_AUTH_PASS;

const mailerTransport = Nodemailer.createTransport({
  host: MAILER_SMTP_HOST,
  port: MAILER_SMTP_PORT,
  secure: MAILER_SMTP_IS_SECURE,
  auth: {
    user: MAILER_SMTP_AUTH_USER,
    pass: MAILER_SMTP_AUTH_PASS
  }
});
const MAILER_SEND_EMAIL_TYPE = process.env.MAILER_SEND_EMAIL_TYPE as SendEmailType;
const MAILER_DEFAULT_FROM_EMAIL = process.env.MAILER_DEFAULT_FROM_EMAIL;
const MAILER_DEFAULT_FROM_NAME = process.env.MAILER_DEFAULT_FROM_NAME;

interface MailTemplateData {
  [key: string]: any;
}

interface SendEmailOptions {
  from?: string;
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
}

async function generateSendEmailParams(
  templateName: string,
  templateData: MailTemplateData,
  options: SendEmailOptions
) {
  const templateFile = path.join(
    __dirname,
    '..',
    'views',
    'mails',
    templateName
  );
  if (fs.pathExists(templateFile)) {
    options.from =
      options.from ||
      `"${MAILER_DEFAULT_FROM_NAME} ${MAILER_DEFAULT_FROM_EMAIL}"`;

    const templateText = (await fs.readFile(templateFile)).toString();
    const template = ejs.compile(templateText);
    const html = template(templateData);
    const text = htmlToText.fromString(html, {
      wordwrap: 130,
    });
    const sendEmailParams = Object.assign(
      {
        html,
        text,
      },
      options
    );

    return sendEmailParams;
  } else {
    throw new Error('template file not found');
  }
}

async function sendEmailNow(
  templateName: string,
  templateData: MailTemplateData,
  options: SendEmailOptions
) {
  const sendEmailParams = await generateSendEmailParams(
    templateName,
    templateData,
    options
  );
  try {
    await mailerTransport.sendMail(sendEmailParams);
  } catch (error) {
    console.error(error);
  }
}

async function sendEmailTask(
  templateName: string,
  templateData: MailTemplateData,
  options: SendEmailOptions
) {
  const sendEmailParams = await generateSendEmailParams(
    templateName,
    templateData,
    options
  ) as any;

  await prisma.task.create({
    data: {
      type: TaskType.SEND_EMAIL,
      data: sendEmailParams
    }
  });
}

export async function sendEmail(
  templateName: string,
  templateData: MailTemplateData,
  options: SendEmailOptions
) {
  if (MAILER_SEND_EMAIL_TYPE === SendEmailType.Sync) {
    await sendEmailNow(templateName, templateData, options);
  } else if (MAILER_SEND_EMAIL_TYPE === SendEmailType.Task) {
    await sendEmailTask(templateName, templateData, options);
  }
}

const MAX_SEND_EMAIL_ATTEMPTS = 3;
export async function sendEmailTaskWork() {
  if (MAILER_SEND_EMAIL_TYPE !== SendEmailType.Task) {
    return;
  }

  const sendEmailTask = await prisma.task.findFirst({
    where: {
      type: TaskType.SEND_EMAIL,
      attempts: {
        lt: MAX_SEND_EMAIL_ATTEMPTS
      }
    },
    orderBy: {
      createdAt: 'asc',
    }
  }) as Task & {
    data: any
  };

  if (sendEmailTask) {
    try {
      await mailerTransport.sendMail(sendEmailTask.data);
      await prisma.task.delete({
        where: {
          id: sendEmailTask.id
        }
      });
    } catch (error) {
      await prisma.task.update({
        where: {
          id: sendEmailTask.id
        }, 
        data: {
          attempts: sendEmailTask.attempts + 1
        }
      })
    }
  }
}
