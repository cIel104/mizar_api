const express = require('express');
const router = express.Router();
const fs = require('fs');
const makeDir = require("make-dir");
const crypto = require("crypto");
const path = require('path');
const redis = require('redis');
const { spawn, spawnSync } = require('node:child_process');

//verifierを実行させるapi(POST形式)
router.post('/', function (req, res, next) {
    const uuid = crypto.randomUUID()//ID作成
    const fileName = req.body.fileName.split('.', 1);
    const githubName = req.body.repositoryUrl.replace("https://github.com/", "").split('/', 1) //urlからユーザー名を取得

    //mizarDirectoryディレクトリの中にmizarファイル名と同じディレクトリを作成(.mizはなし)
    //filePathなどはpath.join()で書いたほうがよいかも
    const directoryPath = path.relative('.', '../mizarDirectory');
    let directoryName = directoryPath + '/' + githubName;
    directoryName = directoryName.replace('\\', '/');
    let gitCommand;
    console.log(directoryName);//デバック用
    if (fs.existsSync(directoryName)) {
        gitCommand = 'git checkout -- .';
        runGitCommand(gitCommand);
        gitCommand = 'git -C ' + directoryName + ' pull';
        runGitCommand(gitCommand);
        const filePath = 'C:/mizar_api/mizarDirectory/' + githubName + '/text/' + req.body.fileName;
        initializeDB(uuid, fileName, filePath);//DBの初期化

        const command = 'node .\\verifierKicker\\verifierKicker.js ' + uuid + ' ' + req.body.command;
        runCommand(command);
    } else {
        Promise.all([
            makeDir(directoryName).then(path => {
                console.log(path)
                gitCommand = 'git clone -b ' + req.body.branch + ' --depth=1 ' + req.body.repositoryUrl + ' ' + path
                runGitCommand(gitCommand)
            }),
        ]).then(function () {
            const filePath = 'C:/mizar_api/mizarDirectory/' + githubName + '/text/' + req.body.fileName
            initializeDB(uuid, fileName, filePath);//DBの初期化

            const command = 'node .\\verifierKicker\\verifierKicker.js ' + uuid + ' ' + req.body.command;
            runCommand(command);
        })
    }

    res.json({
        'ID': uuid,
    })
});

router.get('/:ID', function (req, res, next) {
    const client = redis.createClient();
    client.hgetall(req.params.ID, function (error, result) {
        res.json({
            'progressPhase': result.progressPhase,
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
    client.hset(String(ID), 'progressPhase', String('Parser'));
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
        detached: true,
        env: process.env,
        maxVuffer: 1000 * 1024 * 1024,
    });
    child.unref();
}

function runGitCommand(command) {
    const parts = command.split(' ');
    const cmd = parts[0]
    const args = parts.splice(1);
    const child = spawnSync(cmd, args, {
        stdio: 'ignore',
        detached: false,
        env: process.env,
        maxVuffer: 1000 * 1024 * 1024,
    });
}

module.exports = router;