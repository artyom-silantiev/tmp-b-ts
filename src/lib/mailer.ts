import * as Nodemailer from 'nodemailer';
import * as ejs from 'ejs';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as htmlToText from 'html-to-text';
import * as db from '../models';
import { TaskType, Task } from '@prisma/client';
import env, { SendEmailType } from '@/env';

const prisma = db.getPrisma();

const mailerTransport = Nodemailer.createTransport({
  host: env.MAILER_SMTP_HOST,
  port: env.MAILER_SMTP_PORT,
  secure: env.MAILER_SMTP_IS_SECURE,
  auth: {
    user: env.MAILER_SMTP_AUTH_USER,
    pass: env.MAILER_SMTP_AUTH_PASS
  }
});


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
      `"${env.MAILER_DEFAULT_FROM_NAME} ${env.MAILER_DEFAULT_FROM_EMAIL}"`;

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
  if (env.MAILER_SEND_EMAIL_TYPE === SendEmailType.sync) {
    await sendEmailNow(templateName, templateData, options);
  } else if (env.MAILER_SEND_EMAIL_TYPE === SendEmailType.task) {
    await sendEmailTask(templateName, templateData, options);
  }
}

const MAX_SEND_EMAIL_ATTEMPTS = 3;
export async function sendEmailTaskWork() {
  if (env.MAILER_SEND_EMAIL_TYPE !== SendEmailType.task) {
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
