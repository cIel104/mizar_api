import fs from 'fs';
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
    const mizarMessage = fs.readFileSync(path.join(String(MIZFILES), 'mizar.msg'), 'utf-8');
    const mizarMessageList = mizarMessage.split(/\r\n|[\n\r]/);
    return mizarMessageList;
}

//現在はそれぞれのエラーに対してmizarMessageListを探索しているため、2重ループでの実装
//エラー番号をリストなどに保存しておけば、1重ループで実装できるかも
//さらに高速化を行うなら2分探索にする方法もある（.msgファイルの数字が抜けていたするので難易度は高そう）
export function makeErrorList(client: { hset: (arg0: string, arg1: string, arg2: string) => void; }, ID: any, filePath: string) {
    return new Promise<void>((resolve) => {
        const mizarMessageList = getMizarMsg();
        const stream = fs.createReadStream(filePath.replace('.miz', '.err'), 'utf-8');
        const reader = readline.createInterface({ input: stream });
        let isReadingErrorMsg = false;
        const errorList : Array<object> = [];
        reader.on('line', (line) => {
            console.log(line)
            const [errorLine, errorColumn, errorNumber] = line.split(' ').map((str) => parseInt(str, 10));
            let errorMessage = ''

            for (const l of mizarMessageList) {
                const match = l.match(/# (\d+)/);
                if (match) {
                    if (match[1] === errorNumber.toString()) {
                        // 「# 数字」の次の行はエラーメッセージであるため、isReadingErrorMsgをtrueに設定
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
                console.log(errorList)
                client.hset(String(ID), 'errorList', JSON.stringify(errorList))
            } catch (e) {
                console.log(e)
            }
            resolve()
        })
    })

}