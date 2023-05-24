//mizファイルの整形(フォーマット)を行う
const express = require('express');
const { route } = require('../app');
const path = require('path');
const makeDir = require("make-dir");
const fs = require('fs');
const { execFileSync } = require('node:child_process')
const router = express.Router();

router.post('/', function (req, res, next) {
    const githubName = req.body.url.replace("https://github.com/", "").split('/', 1) //urlからユーザー名を取得
    const directoryPath = path.relative('.', '../mizarDirectory');
    let directoryName = directoryPath + '/' + githubName;
    directoryName = directoryName.replace('\\', '/');
    let gitCommand;
    const filePath = 'C:/mizar_api/mizarDirectory/' + githubName + '/text/' + req.body.fileName;
    let formatterCommand;
    console.log(directoryName);//デバック用
    if (fs.existsSync(directoryName)) {

        gitCommand = 'git -C ' + directoryName + ' pull'
        runGitCommand(gitCommand)
        if (process.platform === 'win32') {
            formatterCommand = path.join(path.dirname(__dirname), 'mizarFormatter', 'mizarformat.exe');
        } else {
            formatterCommand = path.join(path.dirname(__dirname), 'mizarFormatter', 'mizarformat.py');
        }
        execFileSync(formatterCommand, [path.join(directoryName, 'text', req.body.fileName)])
        const fileContent = fs.readFileSync(path.join(directoryName, 'text', req.body.fileName), 'utf-8');
        res.json({
            'fileContent': fileContent,
        })
        console.log(fileContent)

    } else {
        Promise.all([
            makeDir(directoryName).then(path => {
                gitCommand = 'git clone -b ' + req.body.branch + ' --depth=1 ' + req.body.url + ' ' + path
                runGitCommand(gitCommand)
            })
        ]).then(function () {
            if (process.platform === 'win32') {
                formatterCommand = path.join(path.dirname(__dirname), 'mizarFormatter', 'mizarformat.exe');
            } else {
                formatterCommand = path.join(path.dirname(__dirname), 'mizarFormatter', 'mizarformat.py');
            }
        }).then(function () {
            execFileSync(formatterCommand, [path.join(directoryName, 'text', req.body.fileName)])
            const fileContent = fs.readFileSync(path.join(directoryName, 'text', req.body.fileName), 'utf-8');
            res.json({
                'fileContent': fileContent,
            })
        })
    }


})

function runGitCommand(command) {
    const { spawnSync } = require('node:child_process');
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