import argv from './lib/argv';

(async () => {
    let cmd = argv._[0];

    if (cmd) {
        const cmdMethod = require('./cmd/' + cmd).default;
        if (typeof cmdMethod === 'function') {
            await cmdMethod(argv);
        }
        process.exit();
    }
})();
