const express = require('express');
const router = express.Router();
const fs = require('fs');
const makeDir = require("make-dir");
const crypto = require("crypto");
const path = require('path');
const redis = require('redis');
const { spawn, spawnSync } = require('node:child_process');
const runGitCommand = require('../verifierKicker/runGitCommand')
const verifier = require('../verifierKicker/verifierKicker')

//verifierを実行させるapi(POST形式)
router.post('/', async function (req, res, next) {
    const uuid = crypto.randomUUID()//ID作成
    const fileName = req.body.fileName.split('.', 1);//残す
    const githubName = req.body.repositoryUrl.replace("https://github.com/", "").split('/', 1) //urlからユーザー名を取得

    //mizarDirectoryディレクトリの中にmizarファイル名と同じディレクトリを作成(.mizはなし)
    //filePathなどはpath.join()で書いたほうがよいかも
    const hoge = await runGitCommand(req.body.repositoryUrl)
    console.log(hoge)
    // const filePath = 'C:/mizar_api/mizarDirectory/' + githubName + '/text/' + req.body.fileName;
    console.log(githubName)
    const filePath = path.relative(__dirname, path.join(path.dirname(__dirname), 'mizarDirectory', githubName[0], 'text', req.body.fileName))
    console.log(fs.existsSync(filePath))
    initializeDB(uuid, fileName, filePath);//DBの初期化
    // const command = 'node .\\verifierKicker\\verifierKicker.js ' + uuid + ' ' + req.body.command;
    const command = 'node verifierKicker.js ' + uuid + ' ' + req.body.command;
    console.log(command);
    console.log(__dirname);
    verifier(uuid, req.body.command)
    // runCommand(command);

    res.json({
        'ID': uuid,
    })
});

router.get('/:ID', function (req, res, next) {
    const client = redis.createClient();
    client.hgetall(req.params.ID, function (error, result) {
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

async function initializeDB(ID, fileName, filePath) {
    const client = await redis.createClient();

    //デバッグ用
    client.on('connect', function () {
        console.log('Redisに接続しました');
    });
    client.on('error', function (err) {
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

function runCommand(command) {
    const parts = command.split(' ');
    const cmd = parts[0]
    const args = parts.splice(1);
    const child = spawn(cmd, args, {
        stdio: 'ignore',
        cwd: 'verifierKicker',
        detached: true,
        env: process.env,
        maxVuffer: 1000 * 1024 * 1024,
    });
    child.unref();
}


module.exports = router;