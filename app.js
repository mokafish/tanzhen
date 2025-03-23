import log4js from 'log4js';
import TanTou from './tantou.js';

const config = {
    "addr": [
        "file:///var/www/html/system-stats.json",
        "log:///var/log/system-stats/?d=0.0007&n=30",
        "https://example.com/api/handle"
    ],
    "debug": true,
    "option": {
        "name": "cool-server",
        "id": "12345678-1234-1234-1234-123456789012",
        "cpu": true,
        "men": true,
        "disk": true,
        "io": true,
        "net": true,
        "time": true,
    }
}
// log4js

log4js.addLayout("json", function (config) {
    return function (logEvent) {
        return JSON.stringify(logEvent);
    };
});

log4js.addLayout("payload", function (config) {
    return function (logEvent) {
        let ts = logEvent.startTime.getTime();
        return JSON.stringify({ ts, data: logEvent.data[0] })
    };
});

log4js.configure({
    appenders: {
        everything: {
            type: "multiFile",
            base: "logs/",
            property: "categoryName",
            extension: ".log",
            layout: { type: "json" },
        },
        out: { type: "stdout" },
        error: {
            type: "file",
            filename: "logs/error.log",
            maxLogSize: 10240,
            backups: 5
        },
        /********************/
        stat_single: {
            type: "file",
            filename: "logs/stat_single.json",
            maxLogSize: 2,
            backups: 0,
            layout: { type: "payload" },
        },
        stat_history: {
            type: "dateFile",
            filename: "logs/stat_history.log",
            pattern: "yyyyMMdd.hhmm",
            // maxLogSize: 10240,
            numBackups: 5,
            layout: { type: "payload" },
        },

        network: {
            type: "tcp",
            host: "192.168.31.31",
            port: 2123,
            endMsg: "\n",
            layout: { type: "payload" },
        },
    },
    categories: {
        default: {
            appenders: ["everything"],
            level: "debug"
        },
        app: {
            appenders: ["out", "everything"],
            level: "info"
        },
        stat: {
            appenders: ["network", 'stat_single', 'stat_history'],
            level: "info"
        },
    },
});

const logger = log4js.getLogger('app');
const sander = log4js.getLogger('stat');

logger.info('Hello again distributed logs', { 'a': 1, 'b': 2 });
const tt = new TanTou(sander, config.option);
tt.initialize()
    .then(() => tt.start())
    .catch(console.error);

