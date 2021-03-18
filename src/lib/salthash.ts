import * as crypto from 'crypto';
import config from '../config';

export function generateSaltHash(stringText: string, stringSalt?: string) {
  stringSalt = stringSalt || config.node.passwordSalt;
  const hash = crypto
    .createHash('sha256')
    .update(stringText + '' + stringSalt)
    .digest('hex')
    .toString();
  const randomHex = crypto.randomBytes(2).toString('hex');
  let timeStampHex = Date.now().toString(16);
  timeStampHex =
    timeStampHex.length % 2 !== 0 ? '0' + timeStampHex : timeStampHex;
  const saltHash = timeStampHex + ':' + randomHex + ':' + hash;
  return saltHash;
}

export function compare(
  stringText: string,
  saltHash: string,
  stringSalt?: string
) {
  try {
    stringSalt = stringSalt || config.node.passwordSalt;
    const parts = saltHash.split(':');
    const hash = crypto
      .createHash('sha256')
      .update(stringText + '' + stringSalt)
      .digest('hex')
      .toString();
    if (parts.length === 3 && parts[2] === hash) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
}
