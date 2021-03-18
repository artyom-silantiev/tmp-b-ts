import * as fs from 'fs-extra';
import * as path from 'path';
import * as db from '@/db';

export default async function (argv) {
  await db.init();
  const data = await db.models.Seed.getRepository().find();
  const seeds = data.map((row: any) => row.name);

  const options = {
    one: argv.one || false,
    list: argv.list || false,
    help: argv.help || false,
  };

  if (options.help) {
    console.log('--one - Do not run next seeds');
    console.log('--list - Show seeds file list (without execution)');
    console.log('--help - Show this message');
    process.exit(0);
  }

  const cwd = process.cwd();
  const seedsDir = path.join(cwd, 'src', 'db', 'seeds');

  if (!fs.existsSync(seedsDir)) {
    await fs.mkdirs(seedsDir);
  }

  let seedsFiles = fs
    .readdirSync(seedsDir)
    // filter TS files
    .filter((file) => {
      return file.indexOf('.') !== 0 && file.slice(-3) === '.ts';
    })
    // sort by revision
    .sort((a, b) => {
      let revA = parseInt(path.basename(a).split('-', 2)[0]),
        revB = parseInt(path.basename(b).split('-', 2)[0]);
      if (revA < revB) return -1;
      if (revA > revB) return 1;
      return 0;
    })
    // remove is used seeds
    .filter((file) => {
      let name = file.replace(/^(.*)\.ts$/, '$1');
      return seeds.indexOf(name) === -1;
    });

  if (seedsFiles.length === 0) {
    console.log('Not found seeds to execute');
    process.exit(0);
  }

  console.log('Seeds to execute:');
  seedsFiles.forEach((file) => {
    console.log('\t' + file);
  });

  if (options.list) {
    process.exit(0);
  }

  const executeSeed = async function (filename) {
    let seed = require(filename);

    if (!seed) {
      console.log("Can't require file " + filename);
      return;
    }

    await seed.up();
  };

  for (let file of seedsFiles) {
    try {
      console.log('Execute seed from file: ' + file);
      await executeSeed(path.join(seedsDir, file));
      if (options.one) {
        console.log('Stoped');
      }
      await db.models.Seed.getRepository().insert([
        {
          name: file.replace(/^(.*)\.ts$/, '$1'),
        },
      ]);
    } catch (error) {
      console.error(error);
      process.exit(0);
    }
  }
}
