// 結果をもらうAPIのレスポンスerroeFileを作成する
const fs = require('fs');
const path = require('path');
const redis = require('redis');
const readline = require('readline');
const MIZFILES = process.env.MIZFILES;

//エラーファイルに記入するMizarエラーメッセージを取得
function getMizarMsg() {
    const MizarMessage = fs.readFileSync(path.join(String(MIZFILES), 'mizar.msg'), 'utf-8');
    const MizarMessageList = MizarMessage.split(/\r\n|[\n\r]/);
    return MizarMessageList;
}

function makeJson(client, ID, filePath) {
    return new Promise((resolve) => {
        const MizarMessageList = getMizarMsg();
        const stream = fs.createReadStream(filePath.replace('.miz', '.err'), 'utf-8');
        const reader = readline.createInterface({ input: stream });
        let isReadingErrorMsg = false;
        const errorList = [];
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
            errorList.push({ errorLine: errorLine, errorColumn: errorColumn, errorNumber: errorNumber, errorMessage: errorMessage })

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


module.exports = makeJson;