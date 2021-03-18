import {
  getConnectionManager,
  ConnectionManager,
  Connection,
  MoreThan,
  MoreThanOrEqual,
  LessThan,
  LessThanOrEqual,
  Not,
  Equal,
  In,
  Any,
  Raw,
  IsNull,
  Like,
  Between,
} from 'typeorm';

import * as Seed from './entity/Seed';
import * as User from './entity/User';
import * as Authorization from './entity/Authorization';
import * as Image from './entity/Image';
import * as News from './entity/News';
import * as Page from './entity/Page';
import * as Task from './entity/Task';
import * as Setting from './entity/Setting';

let isInit = false;
export async function init() {
  if (isInit) {
    return;
  }
  isInit = true;

  const ormconfig = require('../../ormconfig.json');
  const connectionManager = getConnectionManager();
  const connection = connectionManager.create(ormconfig);
  await connection.connect();
}

export const models = {
  Seed,
  User,
  Authorization,
  Image,
  News,
  Page,
  Task,
  Setting,
};

export const operators = {
  MoreThan,
  MoreThanOrEqual,
  LessThan,
  LessThanOrEqual,
  Not,
  Equal,
  In,
  Any,
  Raw,
  IsNull,
  Like,
  Between,
};

export const Op = operators;
