import express from 'express';
import crypto from "crypto";
import fs from "node:fs"
import { runGitCommand } from '../verifierKicker/runGitCommand';
import { verifier, killProcess } from '../verifierKicker/verifierKicker';
import { Queue } from '../verifierKicker/queue';
import path from 'node:path';
import { logger } from "../logger";
const redis = require('ioredis')
const router = express.Router();

const queue = new Queue();

const config = {
    host: "redis",
    port: 6379
}

const commandArray = [
    'verifier',
    'irrths',
    'relinfer',
    'trivdemo',
    'reliters',
    'relprem',
    'irrvoc',
    'inacc',
    'chklab',
]

//verifierを実行させるapi(POST形式)
router.post('/', async function (req: { body: { fileName: string; repositoryUrl: string; command: string; }; }, res: any) {
    //UUID作成(DBのkeyとして利用)
    const uuid = crypto.randomUUID()
    const logObject = {
        uuid: uuid,
        requestParameter: req.body,
    }
    logger.info(`verifierを実行させるapi呼び出し`, logObject)

    if (!('fileName' in req.body && 'repositoryUrl' in req.body && 'command' in req.body)) {
        res.status(400).json({
            'message': 'Not enough parameters are provided.'
        })
        return
    } else if (!(commandArray.includes(req.body.command))) {
        res.status(422).json({
            'message': 'Please input the appropriate command into the command parameter.'
        })
        return
    } else if (!(req.body.repositoryUrl.startsWith('https://github.com/'))) {
        res.status(422).json({
            'message': 'The repositoryUrl parameter is incorrect.'
        })
        return
    }

    logger.info(`git コマンド実行`)
    const gitCommandResult: { result: boolean; directoryName: string } = await runGitCommand(req.body.repositoryUrl)
    console.log(gitCommandResult)
    process.chdir(__dirname)
    if (!(gitCommandResult.result)) {
        res.status(400).json({
            'message': 'The repositoryUrl parameter is incorrect.'
        })
        return
    }

    const fileName = req.body.fileName.split('.', 1);
    const trimmedUrl = req.body.repositoryUrl.replace("https://github.com/", "").replace(".git", "").split('/')
    const accountName = trimmedUrl[0]
    const repositoryName = trimmedUrl[1]
    const filePath = path.relative(__dirname, path.join(path.dirname(path.dirname(__dirname)), 'mizarDirectory', accountName, repositoryName, 'text', req.body.fileName))
    const iniPath = path.relative(__dirname, path.join(path.dirname(path.dirname(__dirname)), 'mizarDirectory', accountName, repositoryName, 'mml.ini'))
    if (!(fs.existsSync(filePath))) {
        res.status(400).json({
            'message': 'The mizar file described in the fileName parameter cannot be found.'
        })
        return
    }

    //DBの初期化
    initializeDB(uuid, fileName, filePath, iniPath, req.body.command);

    queue.enqueue(uuid)

    res.json({
        'ID': uuid,
    })
});

//検証結果を取得するapi(GET方式)
router.get('/:ID', async function (req: { params: { ID: any; }; }, res: any, next: any) {
    const client = new redis(config);
    const result = await client.hgetall(req.params.ID)
    if (Object.keys(result).length === 0) {
        res.status(400).json({
            'message': 'The ID parameter is incorrect.'
        })
        return
    }
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
    const ID = req.params.ID
    if (queue.getItem(ID) === 0) {
        killProcess()
    } else if (queue.getItem(ID) > 0) {
        queue.removeItem(ID)
    }
    res.sendStatus(204)
})

async function initializeDB(ID: string, fileName: any, filePath: string, iniPath: string, command: string) {
    const client = new redis(config);

    //デバッグ用
    client.on('connect', function () {
        console.log('Redisに接続しました');
    });
    client.on('error', function (err: string) {
        console.log('次のエラーが発生しました：' + err);
    });

    client.hset(ID, 'fileName', String(fileName));
    client.hset(ID, 'filePath', filePath);
    client.hset(ID, 'isVerifierFinish', 'false');
    client.hset(ID, 'progressPhases', JSON.stringify([]));
    client.hset(ID, 'progressPercent', String(0));
    client.hset(ID, 'numOfErrors', String(0));
    client.hset(ID, 'makeenvText', '');
    client.hset(ID, 'isMakeenvFinish', 'false');
    client.hset(ID, 'isMakeenvSuccess', 'true'); //失敗した際にfalseに変更し処理を止めるため
    client.hset(ID, 'isVerifierSuccess', 'true'); //失敗した際にfalseに変更し処理を止めるため
    client.hset(ID, 'errorList', JSON.stringify([]));
    client.hset(ID, 'command', command);
    client.hset(ID, 'iniPath', iniPath);
    await client.hset(ID, 'isMakeenvStart', 'false');
    checkQueue()
}

export async function checkQueue() {
    //同じIDを複数回確認する必要があるのでqueueの先頭を検証し、検証完了後dequeueするようにしている
    logger.info(`in checkQueue ${queue.getItems()}`)
    const client = new redis(config);
    const isMakeenvStart = await client.hget(queue.peek(), 'isMakeenvStart')
    logger.info(`isMakeenvStart : ${isMakeenvStart}`)
    const isMakeenvSuccess = await client.hget(queue.peek(), 'isMakeenvSuccess')
    const isMakeenvFinish = await client.hget(queue.peek(), 'isMakeenvFinish')
    const isVerifierFinish = await client.hget(queue.peek(), 'isVerifierFinish')
    if (isMakeenvStart === 'false') {
        const ID: string = queue.peek()
        client.hset(String(ID), 'isMakeenvStart', String('true'))
        logger.info(`isMakeenvStart change true`)
        verifier(ID)
    } else if ((isMakeenvSuccess === 'false' && isMakeenvFinish === 'true') || isVerifierFinish === 'true') {
        queue.dequeue()
        logger.info(`dequeue`)
        const ID: string = queue.peek()
        if (ID) {
            client.hset(String(ID), 'isMakeenvStart', String('true'))
            verifier(ID)
        }
    }
}

module.exports = router;
