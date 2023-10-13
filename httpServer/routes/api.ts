import express from 'express';
import crypto from "crypto";
import { runGitCommand } from '../verifierKicker/runGitCommand';
import { verifier } from '../verifierKicker/verifierKicker';
import path from 'node:path';
const redis = require('redis')
const router = express.Router();

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
    initializeDB(uuid, fileName, filePath);

    //verifier実行
    verifier(uuid, req.body.command)

    res.json({
        'ID': uuid,
    })
});

//検証結果を取得するapi(GET方式)
//1つのファイルに2つのapiが書かれているのでファイルを分けたほうがよいかもしれない -> urlの変更が必要
router.get('/:ID', function (req: { params: { ID: any; }; }, res: { json: (arg0: { progressPhases: any; progressPercent: number; isMakeenvFinish: boolean; isMakeenvSuccess: boolean; isVerifierFinish: boolean; isVerifierSuccess: boolean; numOfErrors: number; errorList: any; makeenvText: any; }) => void; }, next: any) {
    const client = redis.createClient();
    client.hgetall(req.params.ID, function (err: any, result: { progressPhases: string; progressPercent: any; isMakeenvFinish: string; isMakeenvSuccess: string; isVerifierFinish: string; isVerifierSuccess: string; numOfErrors: any; errorList: string; makeenvText: any; }) {
        // errを削除するとエラーになる（原因不明）
        if (err) {
            console.log('err')
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
        });
    })
})

async function initializeDB(ID: string, fileName: any, filePath: string) {
    const client = await redis.createClient();

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
    client.hset(String(ID), 'isMakeenvSuccess', String('false'));
    client.hset(String(ID), 'isVerifierSuccess', String('false'));
    client.hset(String(ID), 'errorList', JSON.stringify([]))
}

module.exports = router;