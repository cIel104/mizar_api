import express from 'express';
import crypto from "crypto";
import { runGitCommand } from '../verifierKicker/runGitCommand';
import { verifier, killProcess } from '../verifierKicker/verifierKicker';
import { Queue } from '../verifierKicker/queue';
import path from 'node:path';
const redis = require('ioredis')
const router = express.Router();

const queue = new Queue();
//verifierを実行させるapi(POST形式)
router.post('/', async function (req: { body: { fileName: string; repositoryUrl: string; command: string; }; }, res: { json: (arg0: { ID: `${string}-${string}-${string}-${string}-${string}`; }) => void; }) {
    //UUID作成(DBのkeyとして利用)
    const uuid = crypto.randomUUID()

    //git clone(git pull)実行
    await runGitCommand(req.body.repositoryUrl)

    //DBの初期化
    const fileName = req.body.fileName.split('.', 1);
    const githubName = req.body.repositoryUrl.replace("https://github.com/", "").split('/', 1)
    const filePath = path.relative(__dirname, path.join(path.dirname(__dirname), 'mizarDirectory', githubName[0], 'text', req.body.fileName))
    initializeDB(uuid, fileName, filePath, req.body.command);

    //verifier実行
    // verifier(uuid)

    queue.enqueue(uuid)
    checkQueue()

    res.json({
        'ID': uuid,
    })
});

//検証結果を取得するapi(GET方式)
router.get('/:ID', async function (req: { params: { ID: any; }; }, res: { json: (arg0: { progressPhases: any; progressPercent: number; isMakeenvFinish: boolean; isMakeenvSuccess: boolean; isVerifierFinish: boolean; isVerifierSuccess: boolean; numOfErrors: number; errorList: any; makeenvText: any; queueNum: number }) => void; }, next: any) {
    const client = new redis();
    const result = await client.hgetall(req.params.ID)
    res.json({
        'progressPhases': JSON.parse(result.progressPhases),
        'progressPercent': Number(result.progressPercent),
        'isMakeenvFinish': (result.isMakeenvFinish == 'true') ? true : false,
        'isMakeenvSuccess': (result.isMakeenvSuccess == 'true') ? true : false,
        'isVerifierFinish': (result.isVerifierFinish == 'true') ? true : false,
        'isVerifierSuccess': (result.isVerifierSuccess == 'true') ? true : false,
        'numOfErrors': Number(result.numOfErrors),
        'errorList': JSON.parse(result.errorList),
        'makeenvText': result.makeenvText,
        'queueNum': queue.getItem(req.params.ID),
    });
})

//検証を取り消すapi
router.delete('/:ID', async function (req: { params: { ID: any; } }, res: any) {
    const client = new redis();
    const ID = req.params.ID
    if (queue.getItem(ID) === 0) {
        killProcess()
        res.status(200).send('kill process')
    } else if (queue.getItem(ID) > 0) {
        queue.removeItem(ID)
        console.log(queue.getItems())
        res.status(200).send('delete queue')
    } else {
        res.status(200).send('Already finished')
    }
})

async function initializeDB(ID: string, fileName: any, filePath: string, command: string) {
    const client = new redis();

    //デバッグ用
    client.on('connect', function () {
        console.log('Redisに接続しました');
    });
    client.on('error', function (err: string) {
        console.log('次のエラーが発生しました：' + err);
    });

    client.hset(String(ID), 'fileName', String(fileName));
    client.hset(String(ID), 'filePath', String(filePath));
    client.hset(String(ID), 'isVerifierFinish', String('false'));
    client.hset(String(ID), 'progressPhases', JSON.stringify([]));
    client.hset(String(ID), 'progressPercent', String(0));
    client.hset(String(ID), 'numOfErrors', String(0));
    client.hset(String(ID), 'makeenvText', String(''));
    client.hset(String(ID), 'isMakeenvFinish', String('false'));
    client.hset(String(ID), 'isMakeenvSuccess', String('true')); //失敗した際にfalseに変更し処理を止めるため
    client.hset(String(ID), 'isVerifierSuccess', String('true')); //失敗した際にfalseに変更し処理を止めるため
    client.hset(String(ID), 'errorList', JSON.stringify([]));
    client.hset(String(ID), 'command', String(command));
    client.hset(String(ID), 'isMakeenvStart', String('false'));
}

export async function checkQueue() {
    //同じIDを複数回確認する必要があるのでqueueの先頭を検証し、検証完了後dequeueするようにしている
    console.log(queue.getItems())
    const client = new redis();
    const isMakeenvStart = await client.hget(queue.peek(), 'isMakeenvStart')
    if (isMakeenvStart === 'false') {
        const ID: string | undefined = queue.peek()
        if (ID) {
            verifier(ID)
        }
    } else {
        const isMakeenvSuccess = await client.hget(queue.peek(), 'isMakeenvSuccess')
        const isMakeenvFinish = await client.hget(queue.peek(), 'isMakeenvFinish')
        const isVerifierFinish = await client.hget(queue.peek(), 'isVerifierFinish')
        if ((isMakeenvSuccess === 'false' && isMakeenvFinish === 'true') || isVerifierFinish === 'true') {
            queue.dequeue()
            console.log('dequeue')
            const ID: string | undefined = queue.peek()
            if (ID) {
                verifier(ID)
            }
        }
    }
}

module.exports = router;