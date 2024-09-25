import fs from 'fs';
import readline from 'readline';
import path from 'node:path';
import { logger } from "../logger";
import { discriminateVersion } from "./discriminatieVersion";

interface ErrorObj {
    errorLine: number;
    errorColumn: number;
    errorNumber: number;
    errorMessage: string;
}

//エラーファイルに記入するMizarエラーメッセージを取得
//利用者のバージョンの.msgファイルを取得
async function getMizarMsg(ID: string) {
    const mizVersion = await discriminateVersion(ID)
    const rootDirectory = path.resolve(__dirname, '../../');
    process.env.MIZFILES = path.join(rootDirectory, 'version', mizVersion, 'local', 'share', 'mizar')
    const MIZFILES = process.env.MIZFILES
    const mizarMessage = fs.readFileSync(path.join(String(MIZFILES), 'mizar.msg'), 'utf-8');
    const mizarMessageList = mizarMessage.split(/\r\n|[\n\r]/);
    return mizarMessageList;
}

//現在はそれぞれのエラーに対してmizarMessageListを探索しているため、2重ループでの実装
//エラー番号をリストなどに保存しておけば、1重ループで実装できるかも
export function makeErrorList(client: { hset: (arg0: string, arg1: string, arg2: string) => void; }, ID: any, filePath: string) {
    return new Promise<void>(async (resolve) => {
        const mizarMessageList = await getMizarMsg(ID);
        const stream = fs.createReadStream(filePath.replace('.miz', '.err'), 'utf-8');
        const reader = readline.createInterface({ input: stream });
        let isReadingErrorMsg = false;
        const errorList: Array<object> = [];
        reader.on('line', (line) => {
            logger.info(`err line : ${line}`)
            const [errorLine, errorColumn, errorNumber] = line.split(' ').map((str) => parseInt(str, 10));
            let errorMessage = ''

            for (const l of mizarMessageList) {
                const match = l.match(/# (\d+)/);
                if (match) {
                    if (match[1] === errorNumber.toString()) {
                        // mizar.msgファイルは「# 数字」の次の行にエラーメッセージが書かれているため、isReadingErrorMsgをtrueに設定
                        isReadingErrorMsg = true;
                    }
                } else if (isReadingErrorMsg) {
                    errorMessage = l
                    isReadingErrorMsg = false;
                }
            }
            const errorObj: ErrorObj = {
                errorLine: errorLine,
                errorColumn: errorColumn,
                errorNumber: errorNumber,
                errorMessage: errorMessage
            }
            errorList.push(errorObj)

        }).on('close', () => {
            try {
                console.log('errorList ', errorList)
                client.hset(String(ID), 'errorList', JSON.stringify(errorList))
            } catch (e) {
                logger.warn(e)
            }
            resolve()
        })
    })

}
