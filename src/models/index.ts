export { getPrisma } from './prisma';
import User from './User';
import Task from './Task';
import Setting from './Setting';
import Page from './Page';
import Publication from './Publication';
import Image from './Image';
import Authorization from './Authorization';

export const models = {
  User,
  Task,
  Setting,
  Page,
  Publication,
  Image,
  Authorization
};
