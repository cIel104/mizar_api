// import express from 'express';
import express from 'express';
const router = express.Router();
import crypto from "crypto";
// const path = require('path');
// import redis from "redis";
const redis = require('redis')
// import { spawn, spawnSync } from 'node:child_process';
// const runGitCommand = require('../verifierKicker/runGitCommand')
import { runGitCommand } from '../verifierKicker/runGitCommand';
import { verifier } from '../verifierKicker/verifierKicker';
import path from 'node:path';

//verifierを実行させるapi(POST形式)
router.post('/', async function (req: { body: { fileName: string; repositoryUrl: string; command: string; }; }, res: { json: (arg0: { ID: `${string}-${string}-${string}-${string}-${string}`; }) => void; }) {
    const uuid = crypto.randomUUID()//ID作成
    const fileName = req.body.fileName.split('.', 1);//残す
    const githubName = req.body.repositoryUrl.replace("https://github.com/", "").split('/', 1) //urlからユーザー名を取得

    //mizarDirectoryディレクトリの中にmizarファイル名と同じディレクトリを作成(.mizはなし)
    const hoge = await runGitCommand(req.body.repositoryUrl)
    console.log(hoge)
    // const filePath = 'C:/mizar_api/mizarDirectory/' + githubName + '/text/' + req.body.fileName;
    console.log(githubName)
    const filePath = path.relative(__dirname, path.join(path.dirname(__dirname), 'mizarDirectory', githubName[0], 'text', req.body.fileName))
    initializeDB(uuid, fileName, filePath);//DBの初期化
    // const command = 'node .\\verifierKicker\\verifierKicker.js ' + uuid + ' ' + req.body.command;
    console.log(__dirname);
    verifier(uuid, req.body.command)
    // runCommand(command);

    res.json({
        'ID': uuid,
    })
});

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

    //データを初期化
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

// function runCommand(command) {
//     const parts = command.split(' ');
//     const cmd = parts[0]
//     const args = parts.splice(1);
//     const child = spawn(cmd, args, {
//         stdio: 'ignore',
//         cwd: 'verifierKicker',
//         detached: true,
//         env: process.env,
//         maxVuffer: 1000 * 1024 * 1024,
//     });
//     child.unref();
// }


module.exports = router;