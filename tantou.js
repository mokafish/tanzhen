import si from 'systeminformation';

const DEFAULT_SENDER = { info: data => console.log(data) }
const DEFAULT_OPTION = {
    "cpu": true,
    "men": true,
    "disk": true,
    "io": true,
    "net": true,
    "time": true,
}

export default class TanTou {
    constructor(sender = DEFAULT_SENDER, option = DEFAULT_OPTION) {
        this.running = false;
        this.option = { ...DEFAULT_OPTION, ...option }
        this.sender = sender
    }

    async initialize() {

    }

    /**
     * @typedef {Object} StatResult
     * @property {si.Systeminformation.CurrentLoadData} [cpu]
     * @property {si.Systeminformation.MemData} [mem]
     * @property {si.Systeminformation.FsSizeData[]} [disk]
     * @property {si.Systeminformation.FsStatsData} [io]
     * @property {si.Systeminformation.NetworkStatsData[]} [net]
     * @property {number} time
     */

    /**
     * 获取系统状态信息
     * @returns {Promise<StatResult>}
     */
    async stat() {
        const st = {};
        this.option.time = this.option.time ? Date.now() : 0;
        if (this.option.cpu) st.cpu = si.currentLoad();
        if (this.option.mem) st.mem = si.mem();
        if (this.option.disk) st.disk = si.fsSize();
        if (this.option.io) st.io = si.fsStats();
        if (this.option.net) st.net = si.networkStats();

        const resolvedValues = await Promise.all(Object.values(st));
        return Object.keys(st).reduce((result, key, index) => {
            result[key] = resolvedValues[index];
            return result;
        }, { ...this.option });
    }
    /**
     * 
     * @param {StatResult} data 
     */
    async send(data) {
        this.sender.info(data)
    }

    async run() {
        const data = await this.stat();
        this.send(data);
    }

    start(interval = 1000) {
        if (this.running) return;

        const loop = () => (this.run()
            .finally(() => this.running && setTimeout(loop, interval)));

        this.running = true
        loop();
    }

    stop() {
        this.running = false
    }

    cleanup() {
        this.stop()
    }
}

