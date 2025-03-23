import log4js from 'log4js';
import TanTou from './tantou.js';


const logger = log4js.getLogger('app');
const sander = log4js.getLogger('stat');

logger.info('Hello again distributed logs', { 'a': 1, 'b': 2 });
const tt = new TanTou(sander, config.option);
tt.initialize()
    .then(() => tt.start())
    .catch(console.error);

