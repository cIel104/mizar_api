import path from "node:path";
import express from 'express';
import { runGitCommand } from '../verifierKicker/runGitCommand';
const fs = require('fs');
const { spawnSync } = require('node:child_process')
const router = express.Router();

//mizファイルの整形(フォーマット)を行う
router.post('/', async function (req, res, next) {
    //git clone(git pull)実行
    const directoryName = String(await runGitCommand(req.body.repositoryUrl))

    //miz_format実行
    const result = spawnSync("./" + path.relative(__dirname, path.join(__dirname, "mizarFormatter", "miz_format")),
        [path.join(directoryName, 'text', req.body.fileName),
        path.relative(__dirname, path.join(__dirname, 'mizarFormatter', 'mml.vct')),
        JSON.stringify(req.body.userSettings)], { shell: true });

    //formatterからのエラー取得は未完成(miz_format側の問題)
    let isFormatterSuccess = true;
    if (result.stderr.toString()) {
        isFormatterSuccess = false
    }

    //フォーマット後のmizファイル取得
    const fileContent = fs.readFileSync(path.join(directoryName, 'text', req.body.fileName), 'utf-8');

    res.json({
        'fileContent': fileContent,
        'isFormatterSuccess': isFormatterSuccess,
        'errorLog': result.stderr.toString(),
    })
})

module.exports = router;