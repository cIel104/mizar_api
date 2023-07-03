//mizファイルの整形(フォーマット)を行う
const express = require('express');
const { route } = require('../app');
const path = require('path');
const makeDir = require("make-dir");
const fs = require('fs');
const { execFileSync } = require('node:child_process')
const router = express.Router();
const runGitCommand = require('../verifierKicker/runGitCommand')

router.post('/', async function (req, res, next) {
    const directoryName = await runGitCommand(req.body.repositoryUrl)
    let formatterCommand = '';
    if (process.platform === 'win32') {
        formatterCommand = path.relative(__dirname, path.join(path.dirname(__dirname), 'mizarFormatter', 'mizarformat.exe'));
    } else {
        formatterCommand = 'python ' + path.relative(__dirname, path.join(__dirname, 'mizarFormatter', 'mizarformat.py'));
    }
    console.log(__dirname)
    formatterCommand = formatterCommand + ' ' + path.join(directoryName, 'text', req.body.fileName)
    console.log(fs.existsSync(path.relative(__dirname, path.join(__dirname, 'mizarFormatter', 'mizarformat.py'))))
    runFormatterCommand(formatterCommand)
    const fileContent = fs.readFileSync(path.join(directoryName, 'text', req.body.fileName), 'utf-8');
    console.log(formatterCommand)
    res.json({
        'fileContent': fileContent,
    })
})

function runFormatterCommand(command) {
    const parts = command.split(' ');
    cmd = parts[0];
    const args = parts.splice(1);
    execFileSync(cmd, args)
}

module.exports = router;