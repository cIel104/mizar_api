import path from "node:path";
import express from 'express';

//mizファイルの整形(フォーマット)を行う
const fs = require('fs');
const { route } = require('../app.ts');
const makeDir = require("make-dir");
const { execFileSync, spawnSync } = require('node:child_process')
const router = express.Router();
import { runGitCommand } from '../verifierKicker/runGitCommand';

router.post('/', async function (req, res, next) {
    const directoryName = String(await runGitCommand(req.body.repositoryUrl))

    let formatterCommand = ['./' + path.relative(__dirname, path.join(__dirname, 'mizarFormatter', 'miz_format')),
    path.join(directoryName, 'text', req.body.fileName),
    path.relative(__dirname, path.join(__dirname, 'mizarFormatter', 'mml.vct')),
    JSON.stringify(req.body.userSettings)]

    const result = spawnSync("./" + path.relative(__dirname, path.join(__dirname, "mizarFormatter", "miz_format")),
        [path.join(directoryName, 'text', req.body.fileName),
        path.relative(__dirname, path.join(__dirname, 'mizarFormatter', 'mml.vct')),
        JSON.stringify(req.body.userSettings)], { shell: true });

    // console.log('stdout', result.stdout.toString())
    // console.log('stderr', result.stderr.toString())
    let isFormatterSuccess = true;
    if (result.stderr.toString()) {
        isFormatterSuccess = false
    }
    const fileContent = fs.readFileSync(path.join(directoryName, 'text', req.body.fileName), 'utf-8');

    res.json({
        'fileContent': fileContent,
        'isFormatterSuccess': isFormatterSuccess,
        'errorLog': result.stderr.toString(),
    })
})

module.exports = router;