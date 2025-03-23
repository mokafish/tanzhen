import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'


/**
 * @typedef {Object} TanTouConfig
 * @property {string[]} addr - post address
 * @property {boolean} debug - debug mode
 * @property {{
 *   cpu: boolean,
 *   mem: boolean,
 *   disk: boolean,
 *   io: boolean,
 *   net: boolean,
 *   time: boolean
 * }} option - option
 * @property {{
 *   base: string,
 *   level: string
 * }} [log] - log
 *  
 */

/**
 * @type {TanTouConfig}
 * @example
 */
const example_config = {
    "addr": [
        "file:///var/www/html/system-stats.json?_NOTE=single-item-example",
        "file:///var/www/html/history.txt/?size=3M&files=5&_NOTE=history-example",
        "file:///var/www/html/history.txt/?date=yyyy-MM-dd_hhmm&files=5&_NOTE=time-history-example",
        "file://./logs/relative-path-allowed.log",
        "redis://localhost:6379/0",
        "tcp://example.com:2123",
        "udp://example.com:2123",
        "https://example.com/api/handle",
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
    },
    "log": {
        "base": "logs/",
        "level": "debug",
    }
}

const DEFAULT_CONFIG_FILE = path.join(os.homedir(), '.config', 'tantou.json')
/**
 * @param {string} config_file
 * @returns {TanTouConfig}
 */
export function loadConfig(config_file = DEFAULT_CONFIG_FILE) {
    try {
        let text = fs.readFileSync(config_file, { encoding: 'utf-8' })
        return JSON.parse(text)
    } catch (e) {
        console.error(e)
    }
}

/**
 * @param {TanTouConfig} config
 * @returns {void}
 */
export function applyConfig(config = null) {
    let log4js_appenders = {}
    if (config == null) {
        config = loadConfig()
    }

    // log for console debug
    log4js_appenders.out = {
        type: "stdout",
        layout: {
            type: "pattern",
            pattern: "%[%d{hh:mm:ss.SSS} %p%] %c: %x{msg}%n",
            tokens: {
                msg: function (logEvent) {
                    return logEvent.data.map((d) => {
                        if (logEvent.categoryName == 'stat') {
                            // let ts = logEvent.startTime.getTime();
                            // TODO: format readable stats
                        }
                        if (typeof d === 'object') {
                            return inspect(d, { depth: null, colors: true, compact: true, breakLength: Infinity });
                        }
                        return d;
                    }).join('  ');
                },
            },
        },
    }

    if (config.log) { // log for app
        log4js_appenders.everything = {
            type: "multiFile",
            base: config.log.base,
            property: "categoryName",
            extension: ".log",
            maxLogSize: 10485760,
            backups: 3,
            compress: true,
            layout: {
                type: "pattern",
                pattern: "%d %p %c: %x{msg}%n",
                tokens: {
                    msg: function (logEvent) {
                        return logEvent.data.map((d) => {
                            if (typeof d === 'object') {
                                return inspect(d, { depth: null, compact: true, breakLength: Infinity });
                            }
                            logEvent.ca
                            return d;
                        }).join('  ');
                    },
                },
            },
        }
    }

   // log for stat data by user config
   for(let i in config.addr){
        let name  = 'addr'+i
        log4js_appenders[name] = createLog4jsAppenders(config.addr[i])
   }
}

export function createLog4jsAppenders(url) {
    const {
        protocol,
        username,
        password,
        hostname,
        port,
        pathname,
        searchParams,
        hash,
        // search,
        // href,
        // origin,
        // toString,
    } = new URL(url);



}

let log4js_configure = ({
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


export function log4js_init() {
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
}







/**
 * @deprecated use applyConfig instead
 * @param {string} urllike
 * @returns {(text: string) => void}
 */
function createHandle(urllike) {
    let url = new URL(urllike)
    switch (url.protocol) {
        case 'file:':
            return async text => fs.writeFileSync(url, text, { encoding: 'utf-8' })
        case 'log:':
            let break_nday = parseFloat(url.searchParams.get('d') || 1)
            let chunk_nmax = parseFloat(url.searchParams.get('n') || 30)
            let path = url.pathname
            if (path.endsWith('/')) {
                fs.mkdirSync(path, { recursive: true })
            }
            let n = Math.floor(new Date().getTime() / (break_nday * 86400000)) % chunk_nmax
            let fd = fs.openSync(path + n, 'a')
            return async text => {
                console.log('write:', path + n, fd);

                fs.writeSync(fd, text + '\n')
                // fs.writeSync(fd, '\n')

                // check break
                let _n = Math.floor(new Date().getTime() / (break_nday * 86400000)) % chunk_nmax
                if (_n != n) {
                    fs.closeSync(fd)
                    n = _n
                    fd = fs.openSync(path + n, 'w')
                    fs.writeSync(fd, '')
                    fs.closeSync(fd)
                    fd = fs.openSync(path + n, 'a')
                }
            }
        case 'redis:':
            return async text => 'TODO';
        case 'http:':
        case 'https:':
            return async text => 'TODO';
        case 'ws:':
        case 'wss:':
            return async text => 'TODO';
        case 'tcp:':
            return async text => 'TODO';
        case 'udp:':
            return async text => 'TODO';
    }

    return async text => console.log('unknown protocol ', url.protocol);

}

