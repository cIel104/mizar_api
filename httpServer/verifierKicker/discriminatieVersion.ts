//Mizarのバージョンを判定する
import fs from 'fs';
const redis = require("ioredis")

const config = {
    host: "redis",
    port: 6379
}

export async function discriminateVersion(ID: string) {
    const client = new redis(config);
    const iniPath = await client.hget(ID, 'iniPath')
    const iniFile = fs.readFileSync(iniPath, 'utf8').split('\n');
    const versionNbrs: string[] = []
    iniFile.forEach(line => {
        const match = line.match(/\d+/);
        if (match) {
            versionNbrs.push(match[0])
        }
    });
    //初期値は最新バージョン
    let MizarReleaseNbr = '8'
    let MizarVersionNbr = '1'
    let MizarVariantNbr = '14'
    if (versionNbrs) {
        MizarReleaseNbr = versionNbrs[0];
        MizarVersionNbr = versionNbrs[1];
        MizarVariantNbr = versionNbrs[2];
    }
    const mizVersion = 'v' + MizarReleaseNbr + '.' + MizarVersionNbr + '.' + MizarVariantNbr
    return mizVersion
}
