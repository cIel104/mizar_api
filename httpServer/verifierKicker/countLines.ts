import fs from 'fs';
//beginが記述されている行を判定する関数
function isBeginLine(line) {
    if (/\bbegin\b/.test(line)) {
        const beginIndex = line.indexOf('begin');
        const commentIndex = line.indexOf('::');
        if (commentIndex === -1 || beginIndex < commentIndex) {
            return true;
        }
    }
    return false;
}

//mizarファイルの環境部・記述部の行数を返す関数
export function countLines(fileName) {
    let articleCounter = 0;
    let environmentalCounter = 0;
    let result : number[] = [];
    const file = '' + fs.readFileSync(fileName);
    const lines = file.split(/\r\n|[\n\r]/);
    let isArticleArea = false;
    for (const line of lines) {
        // 記述部の行数取得のため，beginの記述行を見つけるまで判定
        if (!isArticleArea) {
            isArticleArea = isBeginLine(line);
        }
        // 記述部の行数のカウント
        // NOTE:「begin」から証明の記述部としてカウントしたいため「else」を利用していない
        if (isArticleArea) {
            articleCounter++;
        } else {
            environmentalCounter++;
        }
        // 改行やスペース以外の記述がある行数までを結果に格納する
        // つまりアルファベットや数字が記述されている行で最も大きい行数が返され、
        // それ以降の改行やスペースのみの行はカウントされないことになる
        if (/\w+/.test(line)) {
            result = [environmentalCounter, articleCounter];
        }
    }
    return result;
}

// module.exports = countLines;
