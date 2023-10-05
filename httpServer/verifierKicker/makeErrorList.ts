// 結果をもらうAPIのレスポンスerroeFileを作成する
import fs from 'fs';
// const path = require('path');
import readline from 'readline';
import path from 'node:path';
const MIZFILES = process.env.MIZFILES;

interface ErrorObj {
    errorLine: number;
    errorColumn: number;
    errorNumber: number;
    errorMessage: string;
}

//エラーファイルに記入するMizarエラーメッセージを取得
function getMizarMsg() {
    const MizarMessage = fs.readFileSync(path.join(String(MIZFILES), 'mizar.msg'), 'utf-8');
    const MizarMessageList = MizarMessage.split(/\r\n|[\n\r]/);
    return MizarMessageList;
}

export function makeErrorList(client, ID, filePath) {
    return new Promise<void>((resolve) => {
        const MizarMessageList = getMizarMsg();
        const stream = fs.createReadStream(filePath.replace('.miz', '.err'), 'utf-8');
        const reader = readline.createInterface({ input: stream });
        let isReadingErrorMsg = false;
        const errorList : Array<object> = [];
        reader.on('line', (line) => {
            console.log(line)
            const [errorLine, errorColumn, errorNumber] = line.split(' ').map((str) => parseInt(str, 10));
            let errorMessage = ''

            for (const l of MizarMessageList) {
                const match = l.match(/# (\d+)/);
                if (match) {
                    // 「# 数字」の次の行はエラーメッセージであるため、trueを設定

                    if (match[1] === errorNumber.toString()) {
                        console.log(match[1])
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
            // errorList.push({ errorLine: errorLine, errorColumn: errorColumn, errorNumber: errorNumber, errorMessage: errorMessage })

        }).on('close', () => {
            try {
                console.log(errorList)
                client.hset(String(ID), 'errorList', JSON.stringify(errorList))
            } catch (e) {
                console.log(e)
            }
            resolve()
        })
    })

}


// module.exports = makeJson;