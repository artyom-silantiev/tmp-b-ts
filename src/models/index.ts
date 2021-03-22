export { getPrisma } from './prisma';
import * as User from './User';
import * as Task from './Task';
import * as Setting from './Setting';
import * as Page from './Page';
import * as News from './News';
import * as Image from './Image';
import * as Authorization from './Authorization';

export const models = {
  User,
  Task,
  Setting,
  Page,
  News,
  Image,
  Authorization
};
