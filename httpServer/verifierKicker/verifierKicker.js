//プロセスはhttpServerが実行してくれる
//process.argv[2]にファイル名をもらう(node verifierKicker.js xxx)
//コマンドの情報からDBへアクセスし、必要な.mizファイルを見つける
//返ってきた情報を整理し、DBへ転送
const carrier = require('carrier');
const { spawn } = require('node:child_process');
const countLines = require('./countLines');
const path = require('path');
const redis = require('redis');
const { resolve } = require('node:path');

let isVerifierSuccess = true;
let isMakeenvSuccess = true;
let isMakeenvFinish = false;
let makeenvText = '';
let numOfErrors = 0;
const MIZFILES = process.env.MIZFILES;
const ID = process.argv[2]
console.log(path.join(String(MIZFILES), 'verifier'));//デバッグ用
//コマンド作成
const makeenvCmd = path.join(String(MIZFILES), 'makeenv');
const verifierCmd = path.join(String(MIZFILES), 'verifier');

const redisCreateClient = new Promise(async function (resolve) {
    const client = await redis.createClient();
    client.hget(ID, 'filePath', function (error, result) {
        console.log(result);
        resolve([client, result]);
    })
})
redisCreateClient.then(function (result) {
    console.log(result);//デバッグ用
    const makeenvProcess = spawn(makeenvCmd, [result[1]], { shell: true });
    const verifierProcess = spawn(verifierCmd, [result[1]], { shell: true });
    console.log('aaaa')
    //makeenv実行
    carrier.carry(makeenvProcess.stdout, line => {
        if (!/^-/.test(line) || line.indexOf('*') !== -1) {
            makeenvText += line;
        }
        if (line.indexOf('*') !== -1) {
            isMakeenvSuccess = false;
        }
    }, null, /\r\n/);

    //verifier実行
    makeenvProcess.on('close', async () => {
        isMakeenvFinish = true;
        if (!(isMakeenvSuccess === false)) {
            carrier.carry(verifierProcess.stdout, (async (line) => {
                if (line.indexOf('*') !== -1) {
                    console.log(line)
                    isVerifierSuccess = false;
                    //process.exit(1)//デバッグ用
                }
                const cmdOutput = line.match(/^(\w+) +\[ *(\d+) *\**(\d*)\].*$/);
                if (cmdOutput === null) {
                    return;
                }
                const phase = cmdOutput[1];
                const numOfParsedLines = Number(cmdOutput[2]);
                numOfErrors = Number(cmdOutput[3]);
                const [numOfEnvironmentalLines, numOfArficleLines] = countLines(result[1])
                //進捗計算(表記 : %,　小数点切り捨て)
                const progressPercent = Math.floor((numOfParsedLines - numOfEnvironmentalLines) / numOfArficleLines * 100)
                console.log(line)//デバッグ用
                console.log("fdsjank")
                try {
                    await updateDb(result[0], ID, 'false', phase, progressPercent, numOfErrors, makeenvText, isMakeenvFinish, isMakeenvSuccess, isVerifierSuccess);
                } catch (e) {
                    console.log(e)
                }
            }), null, /\r/);
            verifierProcess.on('close', async () => {
                console.log('c')
                //isVerifierFinishをtrueにprogressPercentを100にする
                try {
                    await updateDb(result[0], ID, 'true', 'Checker', '100', numOfErrors, makeenvText, isMakeenvFinish, isMakeenvSuccess, isVerifierSuccess)
                } catch (e) {
                    console.log(e)
                }
                process.exit(1);
            });
        }
    });
})

//DBを更新(引数が多いので配列などにしたほうがよいかも)
async function updateDb(client, ID, isVerifierFinish, phase, progressPercent, numOfErrors, makeenvText, isMakeenvFinish, isMakeenvSuccess, isVerifierSuccess) {
    // client.on('error', (err) => console.log('Redis Client Error', err));
    console.log(isVerifierFinish, progressPercent)
    try {
        client.hset(String(ID), 'isVerifierFinish', String(isVerifierFinish));
        client.hset(String(ID), 'progressPhase', String(phase));
        client.hset(String(ID), 'progressPercent', String(progressPercent));
        client.hset(String(ID), 'numOfErrors', String(numOfErrors));
        client.hset(String(ID), 'makeenvText', String(makeenvText));
        client.hset(String(ID), 'isMakeenvFinish', String(isMakeenvFinish));
        client.hset(String(ID), 'isMakeenvSuccess', String(isMakeenvSuccess));
        client.hset(String(ID), 'isVerifierSuccess', String(isVerifierSuccess));
    } catch (e) {
        console.log(e)
    }

}