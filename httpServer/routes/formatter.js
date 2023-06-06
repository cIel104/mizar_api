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
    const directoryName = await runGitCommand(req.body.repositoryUrl, req.body.branch)

    if (process.platform === 'win32') {
        formatterCommand = path.join(path.dirname(__dirname), 'mizarFormatter', 'mizarformat.exe');
    } else {
        formatterCommand = path.join(path.dirname(__dirname), 'mizarFormatter', 'mizarformat.py');
    }
    execFileSync(formatterCommand, [path.join(directoryName, 'text', req.body.fileName)])
    const fileContent = fs.readFileSync(path.join(directoryName, 'text', req.body.fileName), 'utf-8');
    console.log(fileContent)
    res.json({
        'fileContent': fileContent,
    })
})


module.exports = router;