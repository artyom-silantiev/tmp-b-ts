import * as Nodemailer from 'nodemailer';
import config from '../config';
import { SendEmailType } from '../env.types';
import * as ejs from 'ejs';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as htmlToText from 'html-to-text';
import * as db from '../db';

const mailerTransport = Nodemailer.createTransport(config.mailer.nodemailer);

interface IMailTemplateData {
  [key: string]: any;
}

interface ISendEmailOptions {
  from?: string;
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
}

async function generateSendEmailParams(
  templateName: string,
  templateData: IMailTemplateData,
  options: ISendEmailOptions
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
      `"${config.mailer.defaultFromName} ${config.mailer.defaultFromEmail}"`;

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
  templateData: IMailTemplateData,
  options: ISendEmailOptions
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
  templateData: IMailTemplateData,
  options: ISendEmailOptions
) {
  const sendEmailParams = await generateSendEmailParams(
    templateName,
    templateData,
    options
  );

  const task = db.models.Task.getRepository().create();
  task.type = db.models.Task.TaskType.SendEmail;
  task.data = sendEmailParams;
  db.models.Task.getRepository().save(task);
}

export async function sendEmail(
  templateName: string,
  templateData: IMailTemplateData,
  options: ISendEmailOptions
) {
  if (config.mailer.sendEmailType === SendEmailType.Now) {
    await sendEmailNow(templateName, templateData, options);
  } else if (config.mailer.sendEmailType === SendEmailType.Task) {
    await sendEmailTask(templateName, templateData, options);
  }
}

const MAX_SEND_EMAIL_ATTEMPTS = 3;
export async function sendEmailTaskWork() {
  if (config.mailer.sendEmailType !== SendEmailType.Task) {
    return;
  }

  const sendEmailTask = await db.models.Task.getRepository().findOne({
    where: {
      type: db.models.Task.TaskType.SendEmail,
      attempts: db.operators.LessThan(MAX_SEND_EMAIL_ATTEMPTS),
    },
    order: {
      createdAt: 'ASC',
    },
  });

  if (sendEmailTask) {
    try {
      await mailerTransport.sendMail(sendEmailTask.data);
      await db.models.Task.getRepository().remove(sendEmailTask);
    } catch (error) {
      sendEmailTask.attempts++;
      await db.models.Task.getRepository().remove(sendEmailTask);
    }
  }
}
