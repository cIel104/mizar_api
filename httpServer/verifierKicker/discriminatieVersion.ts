import fs from 'fs';
const redis = require("ioredis")

export async function discriminateVersion(ID: string) {
    const client = new redis();
    const iniPath = await client.hget(ID, 'iniPath')
    const iniFile = fs.readFileSync(iniPath, 'utf8');
    const matchResult = iniFile.match(/MizarReleaseNbr=(\d+)\s+MizarVersionNbr=(\d+)\s+MizarVariantNbr=(\d+)/);
    let MizarReleaseNbr = '8'
    let MizarVersionNbr = '1'
    let MizarVariantNbr = '14'
    if (matchResult) {
        MizarReleaseNbr = matchResult[1];
        MizarVersionNbr = matchResult[2];
        MizarVariantNbr = matchResult[3];
    }
    console.log(MizarReleaseNbr + '_' + MizarVersionNbr + '_' + MizarVariantNbr)//デバック用
    const mizVersion = 'v' + MizarReleaseNbr + '.' + MizarVersionNbr + '.' + MizarVariantNbr
    return mizVersion
}