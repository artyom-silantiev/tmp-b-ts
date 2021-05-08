import * as crypto from 'crypto';
import * as fs from 'fs-extra';

export function getRandomString(len?) {
  let str = '';
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  len = len || 8;

  for (let i = 0; i < len; i++) {
    str += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return str;
}

export function getUid() {
  return Date.now().toString(36) + '.' + this.getRandomString();
}

export async function sleep(ms) {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function sha256File(filePath): Promise<string> {
  return new Promise((resolve) => {
    const rs = fs.createReadStream(filePath);
    const sha256 = crypto.createHash('sha256');
    rs.on('data', (data) => {
      sha256.update(data);
    });
    rs.on('end', () => {
      resolve(sha256.digest('hex'));
    });
  });
}

export function shuffle(array: Array<any>) {
  let currentIndex = array.length,
    temporaryValue,
    randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

/*
import * as ffmpeg from 'fluent-ffmpeg';
export async function probe (file) {
  return <ffmpeg.FfprobeData> await new Promise((resolve, reject) => {
    ffmpeg.ffprobe(file, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}
*/

export function durationFormat (value: number | string) {
  value = typeof value === 'string' ? parseFloat(value) : value;
  value = value * 1000;
  const days = Math.floor(value / 86400000);
  value = value % 86400000;
  const hours = Math.floor(value / 3600000);
  value = value % 3600000;
  const minutes = Math.floor(value / 60000);
  value = value % 60000;
  const seconds = Math.floor(value / 1000);

  function pnx (val: number) {
    if ((val + '').length == 1) {
      return '0' + val;
    } else {
      return val + '';
    }
  }

  const unitsFormat = (days ? days + 'd ' : '') +
    (hours ? hours + 'h ' : '') +
    (minutes ? minutes + 'm ' : '') +
    (seconds ? seconds + 's' : '') +
    (!days && !hours && !minutes && !seconds ? 0 : '');

  const timeFormat = (days ? days + ':' : '') +
    (hours ? pnx(hours) + ':' : '') +
    (minutes ? pnx(minutes) + ':' : '00:') +
    (seconds ? pnx(seconds) : '00') +
    (!days && !hours && !minutes && !seconds ? '00' : '');

  return {
    unitsFormat, timeFormat
  }
}
