import path from "node:path";
import { countLines } from './countLines';
import { spawn } from 'node:child_process';
import os from 'os';
import { makeErrorList } from './makeErrorList';
const redis = require("redis")
const carrier = require("carrier")


export function verifier(ID: string, command: any) {
    let isVerifierSuccess = true;
    let isMakeenvSuccess = true;
    let isMakeenvFinish = false;
    let makeenvText = '';
    let numOfErrors = 0;
    let progressPhases: never[] = []
    const MIZFILES = process.env.MIZFILES;

    //コマンド作成
    let makeenvCmd = 'makeenv';
    let verifierCmd = command;
    if (process.platform === 'win32') {
        makeenvCmd = path.join(String(MIZFILES), makeenvCmd);
        verifierCmd = path.join(String(MIZFILES), verifierCmd);
    }

    const redisCreateClient = new Promise(async function (resolve) {
        const client = await redis.createClient();
        client.hget(ID, 'filePath', function (error: any, result: any) {
            resolve([client,result]);
        })
    })
    redisCreateClient.then(function (result:any) {
        const makeenvProcess = spawn(makeenvCmd, [result[1]], { shell: true });
        //makeenv実行
        console.log(__dirname)
        console.log('start makeenv')//デバック
        console.log('')
        console.log(makeenvCmd, result[1])
        carrier.carry(makeenvProcess.stdout, (line: string) => {
            console.log('in makeenv')
            console.log(line)
            if (line.indexOf('*') === -1) {
                if (line !== '' && !/^-/.test(line)) {
                    if (makeenvText !== '') {
                        makeenvText += os.EOL;
                    }
                    makeenvText += line;
                }
            }
            else { //makeenvでエラーが発生した場合
                const errorMatch = line.match(/\d+/);
                isMakeenvSuccess = false;
                if (errorMatch !== null) {//エラー文に数字がある場合.errファイルが生成される
                    numOfErrors = parseInt(errorMatch[0]);
                } else {
                    //エラー文に数字がない場合の処理を記述（松本さんに要相談）
                }
            }
        }, null, /\r?\n/);

        makeenvProcess.on('close', async () => {
            const verifierProcess = spawn(verifierCmd, [result[1]], { shell: true });
            isMakeenvFinish = true;
            //makeenvが失敗していた場合はverifierを行わず終了
            //carrier.carry(makeenvProcess.stdout)内で完結させたほうがいいかも
            console.log(isMakeenvSuccess)
            if (isMakeenvSuccess !== true) {
                await makeErrorList(result[0], ID, result[1]);
                await updateDb(result[0], ID, 'false', progressPhases, 0, numOfErrors, makeenvText, isMakeenvFinish, isMakeenvSuccess, 'false');
                return;
            }

            console.log('start verifier')
            try {
                await updateDb(result[0], ID, 'false', progressPhases, 0, numOfErrors, makeenvText, isMakeenvFinish, isMakeenvSuccess, isVerifierSuccess);
            } catch (e) {
                console.log(e)
            }

            //verifier実行
            const [numOfEnvironmentalLines, numOfArficleLines] = countLines(result[1])
            carrier.carry(verifierProcess.stdout, (async (line: string) => {
                if (line.indexOf('*') !== -1) {
                    isVerifierSuccess = false;
                }
                const cmdOutput = line.match(/^(\w+) +\[ *(\d+) *\**(\d*)\].*$/);
                if (cmdOutput === null) {
                    console.log('return')
                    return;
                }
                const phase:never = cmdOutput[1] as never;
                if (progressPhases.indexOf(phase) === -1) {
                    progressPhases.push(phase)
                }
                const numOfParsedLines = Number(cmdOutput[2]);
                numOfErrors = Number(cmdOutput[3]);
                //進捗計算(表記 : %,　小数点切り捨て)
                const progressPercent = Math.floor((numOfParsedLines - numOfEnvironmentalLines) / numOfArficleLines * 100)
                console.log(line)//デバッグ用
                try {
                    await updateDb(result[0], ID, 'false', progressPhases, progressPercent, numOfErrors, makeenvText, isMakeenvFinish, isMakeenvSuccess, isVerifierSuccess);
                } catch (e) {
                    console.log(e)
                }
            }), null, /\r/);
            verifierProcess.on('close', async () => {
                console.log('c')
                //isVerifierFinishをtrueにprogressPercentを100にする
                try {
                    await makeErrorList(result[0], ID, result[1]);
                    await updateDb(result[0], ID, 'true', progressPhases, '100', numOfErrors, makeenvText, isMakeenvFinish, isMakeenvSuccess, isVerifierSuccess)
                } catch (e) {
                    console.log(e)
                }
                return;
            });
        });
    })
}


//DBを更新(引数が多いので配列などにしたほうがよいかも)
async function updateDb(client: { hset: (arg0: string, arg1: string, arg2: string) => void; }, ID: string, isVerifierFinish: string, phases: never[], progressPercent: string | number, numOfErrors: number, makeenvText: string, isMakeenvFinish: boolean, isMakeenvSuccess: boolean, isVerifierSuccess: string | boolean) {
    console.log(isVerifierFinish, progressPercent)
    try {
        client.hset(String(ID), 'isVerifierFinish', String(isVerifierFinish));
        client.hset(String(ID), 'progressPhases', JSON.stringify(phases));
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