import { Request, Response } from 'express';
import * as cp from 'child_process';
import * as db from '@/models';
import * as os from 'os';

export interface SystemInfo {
  diskTotal: string,
  diskUsage: string,

  imagesCount: number,

  ramTotal: string,
  ramUsage: string,
  ramFree: string,
}

const prisma = db.getPrisma();

async function getDiscInfo(mountedon): Promise<{
  usedSize: number,
  totalSize: number
}> {
  return new Promise((resolve, reject) => {
    let ps = cp.spawn("df", ["-BK", mountedon]);
    let _ret = "";

    ps.stdout.on("data", function (data) {
      _ret = data.toString();
    });

    ps.on('error', function (err) {
      reject(err)
    });

    ps.on('close', function () {
      let storageDeviceInfo;
      if (_ret.split('\n')[1]) {
        let arr = _ret.split('\n')[1].split(/[\s,]+/);
        storageDeviceInfo = {};
        storageDeviceInfo.usedSize = parseInt(arr[2].replace("K", "")) * 1024;    // exp "300K" => 300
        storageDeviceInfo.totalSize = parseInt(arr[3].replace("K", "")) * 1024 + storageDeviceInfo.usedSize;
      }
      resolve(storageDeviceInfo);
    });
  });
};

export async function getSystemInfo(req: Request, res: Response) {
  const imagesCount = await prisma.image.count();

  const freeMem = os.freemem();
  const totalMem = os.totalmem();
  const usageMem = totalMem - freeMem;

  const sizeRoot = await getDiscInfo('/');

  const result = {
    diskTotal: (sizeRoot.totalSize / 1024 / 1024 / 1024).toFixed(2) + ' GB',
    diskUsage: (sizeRoot.usedSize / 1024 / 1024 / 1024).toFixed(2) + ' GB',

    imagesCount: imagesCount,

    ramTotal: (totalMem / 1024 / 1024).toFixed(2) + ' MB',
    ramUsage: (usageMem / 1024 / 1024).toFixed(2) + ' MB',
    ramFree: (freeMem / 1024 / 1024).toFixed(2) + ' MB',
  } as SystemInfo;

  res.json(result);
}
