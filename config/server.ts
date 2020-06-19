import * as _ from 'lodash';

import config from '../env.server.default';

let localEnv;

try {
  localEnv = require('../env.server');
  localEnv = localEnv.default;
} catch (error) {
  localEnv = {};
}

_.merge(config, localEnv);

export default config;
