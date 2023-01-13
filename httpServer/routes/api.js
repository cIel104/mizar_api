const express = require('express');
const { resolve } = require('path');
const { route } = require('../app');
const router = express.Router();
const fs = require('fs');

//verifierを実行させるapi(POST形式)
router.post('/', function (req, res, next) {
    const makeDir = require("make-dir");
    const crypto = require("crypto");
    const uuid = crypto.randomUUID()//ID作成
    const fileName = req.body.fileName.split('.', 1);

    //const text = fs.readFileSync("TEXT/" + req.body.fileName, "utf-8");//デバッグ用

    //mizarDirectoryディレクトリの中にmizarファイル名と同じディレクトリを作成(.mizはなし)

    const path = require('path');
    const directoryPath = path.relative('.', '../mizarDirectory');
    let directoryName = directoryPath + '/' + fileName
    directoryName = directoryName.replace('\\', '/');

    Promise.all([
        makeDir(directoryName),
        makeDir(directoryName + '/TEXT').then(path => {
            fs.writeFileSync(path + '/' + req.body.fileName,
                req.body.fileContent/*text*/); //mizarファイルを作成
        }),
        makeDir(directoryName + '/DICT'),
        makeDir(directoryName + '/prel'),
    ]).then(function () {
        const filePath = 'C:/mizar_api/mizarDirectory/' + fileName + '/TEXT/' + req.body.fileName
        console.log('filePath', filePath)
        initializeDB(uuid, fileName, filePath);//DBの初期化

        const command = 'node .\\verifierKicker\\verifierKicker.js ' + uuid;
        runCommand(command);
    });

    res.json({
        'ID': uuid,
    })

});

router.get('/:ID', function (req, res, next) {
    const insert = new Promise(async function (resolve, reject) {
        const client = await redis.createClient();
        client.hgetall(req.params.ID, function (error, result) {
            resolve(result)
        })
    })
    insert.then(function (result) {

        res.json({
            'progressPhase': result.progressPhase,
            'progressPercent': Number(result.progressPercent),
            'isMakeenvFinish': (result.isMakeenvFinish == 'true') ? true : false,
            'isMakeenvSuccess': (result.isMakeenvSuccess == 'true') ? true : false,
            'isVerifierFinish': (result.isVerifierFinish == 'true') ? true : false,
            'isVerifierSuccess': (result.isVerifierSuccess == 'true') ? true : false,
            'numOfErrors': Number(result.numOfErrors),
            'errorFile': fs.readFileSync(result.filePath.replace('.miz', '.err'), 'utf-8'),
            'makeenvText': result.makeenvText,

        });
    })

})

//以下をDBに格納
//ID(ハッシュ名)
//mizarファイル名(key=fileName)
//mizarファイルがあるファイルパス(key=filePath)
//進捗フェーズkey=progressPhase)
//進捗率(key=progressPercent)
//エラー数(key=numOfErrors)
//makeenvの文章(key=makeenvText)
//makeenvが終わったかどうか(key=isMakeenvFinish)
//makeenvが成功したかどうか(key=isMakeenvSuccess)
//verifier終わったかどうか)(key=isVerifierFinish)
//verifierが成功したがどうか(key=isVerifierSuccess)

const redis = require('redis');
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
    client.hset(String(ID), 'isMakeenvSuccess', String('true'));
    client.hset(String(ID), 'isVerifierSuccess', String('true'));
}

function runCommand(command) {
    const { spawn } = require('node:child_process');
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

module.exports = router;