import * as fs from 'fs-extra';
import * as path from 'path';
import * as moment from 'moment';
import * as ejs from 'ejs';

export default async function (argv) {
  const options = {
    name: argv.name || 'noname',
    comment: argv.comment || '',
    help: argv.help || false,
  };

  if (options.help) {
    console.log('--name=X - Set seed name (default: "noname")');
    console.log('--comment=X - Set seed comment');
    console.log('--help - Show this message');
    process.exit(0);
  }

  const seedsDir = path.join(__dirname, '..', '..', 'db', 'seeds');

  if (!fs.existsSync(seedsDir)) {
    await fs.mkdirs(seedsDir);
  }

  let name = options.name;
  name = name.replace(' ', '_');
  let dtName = moment().format('YYYYMMDDHHmmss');
  let seedName = '' + dtName + (name != '' ? `-${name}` : '-noname') + '.ts';

  let seedFile = path.join(seedsDir, seedName);
  let seedBody = await ejs.renderFile(
    path.join(__dirname, 'lib', 'seedtmp.ejs'),
    {
      name: seedName,
      comment: options.comment,
    }
  );
  await fs.writeFile(seedFile, seedBody);

  console.log('create seed file:', seedFile);
}
