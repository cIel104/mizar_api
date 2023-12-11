import path, { resolve } from "node:path";
import { countLines } from './countLines';
import * as cp from 'node:child_process';
import os from 'os';
import { makeErrorList } from './makeErrorList';
import { checkQueue} from "../routes/api";
const redis = require("ioredis")
const carrier = require("carrier")

let runningCommand: { process?: cp.ChildProcessWithoutNullStreams } = {}
export function killProcess() {
    if (runningCommand.process) {
        console.log('in killProcess')
        runningCommand.process.kill('SIGINT')
    }
}

export async function verifier(ID: string): Promise<void> {
    const client = new redis();
    client.hset(String(ID), 'isMakeenvStart', String('true'))
    let isVerifierSuccess = true;
    let isMakeenvSuccess = true;
    let isMakeenvFinish = false;
    let makeenvText = '';
    let numOfErrors = 0;
    let progressPhases: never[] = []
    const MIZFILES = process.env.MIZFILES;

    //コマンド作成
    let makeenvCmd = 'makeenv';
    let verifierCmd = await client.hget(ID, 'command');
    if (process.platform === 'win32') {
        makeenvCmd = path.join(String(MIZFILES), makeenvCmd);
        verifierCmd = path.join(String(MIZFILES), verifierCmd);
    }
    const filePath = await client.hget(ID, 'filePath')
    const makeenvProcess = cp.spawn(makeenvCmd, [filePath]);
    runningCommand.process = makeenvProcess

    //makeenv実行
    carrier.carry(makeenvProcess.stdout, (line: string) => {
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
        const verifierProcess = cp.spawn(verifierCmd, [filePath]);
        runningCommand.process = verifierProcess
        isMakeenvFinish = true;
        //makeenvが失敗していた場合はverifierを行わず終了
        //carrier.carry(makeenvProcess.stdout)内で完結させたほうがいいかも
        console.log('isMakeenvSuccess = %s',isMakeenvSuccess.toString())
        if (isMakeenvSuccess !== true) {
            await makeErrorList(client, ID, filePath);
            await updateDb(client, ID, 'false', progressPhases, 0, numOfErrors, makeenvText, isMakeenvFinish, isMakeenvSuccess, 'false');
            return;
        }

        console.log('start verifier : uuid = %s',ID)
        try {
            await updateDb(client, ID, 'false', progressPhases, 0, numOfErrors, makeenvText, isMakeenvFinish, isMakeenvSuccess, isVerifierSuccess);
        } catch (e) {
            console.log(e)
        }

        //verifier実行
        const [numOfEnvironmentalLines, numOfArficleLines] = countLines(filePath)
        carrier.carry(verifierProcess.stdout, (async (line: string) => {
            if (line.indexOf('*') !== -1) {
                isVerifierSuccess = false;
            }
            const cmdOutput = line.match(/^(\w+) +\[ *(\d+) *\**(\d*)\].*$/);
            if (cmdOutput === null) {
                // console.log('return')
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
            // console.log(line)//デバッグ用
            try {
                await updateDb(client, ID, 'false', progressPhases, progressPercent, numOfErrors, makeenvText, isMakeenvFinish, isMakeenvSuccess, isVerifierSuccess);
            } catch (e) {
                console.log(e)
            }
        }), null, /\r/);
        verifierProcess.on('close', async () => {
            runningCommand.process = undefined
            console.log('finish verifier : uuid = %s',ID)
            //isVerifierFinishをtrueにprogressPercentを100にする
            try {
                await makeErrorList(client, ID, filePath);
                await updateDb(client, ID, 'true', progressPhases, '100', numOfErrors, makeenvText, isMakeenvFinish, isMakeenvSuccess, isVerifierSuccess)
                checkQueue()
                resolve()
            } catch (e) {
                console.log(e)
            }
            return;
        });
    });
}


//DBを更新(引数が多いので配列などにしたほうがよいかも)
async function updateDb(client: { hset: (arg0: string, arg1: string, arg2: string) => void; }, ID: string, isVerifierFinish: string, phases: never[], progressPercent: string | number, numOfErrors: number, makeenvText: string, isMakeenvFinish: boolean, isMakeenvSuccess: boolean, isVerifierSuccess: string | boolean) {
    // console.log(isVerifierFinish, progressPercent)//デバック
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