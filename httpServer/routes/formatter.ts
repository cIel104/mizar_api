import path from "node:path";
import express from 'express';
import { runGitCommand } from '../verifierKicker/runGitCommand';
const fs = require('fs');
const { spawnSync } = require('node:child_process')
const router = express.Router();

//mizファイルの整形(フォーマット)を行う
router.post('/', async function (req, res, next) {
    if (!('fileName' in req.body && 'repositoryUrl' in req.body && 'userSettings' in req.body)) {
        res.status(400).json({
            'message': 'Not enough parameters are provided.'
        })
        return
    } else if (!(req.body.repositoryUrl.startsWith('https://github.com/'))) {
        res.status(422).json({
            'message': 'The repositoryUrl parameter is incorrect.'
        })
        return
    }

    //git clone(git pull)実行
    const gitCommandResult: { result: boolean; directoryName: string } = await runGitCommand(req.body.repositoryUrl)
    if (!(gitCommandResult.result)) {
        res.status(400).json({
            'message': 'The repositoryUrl parameter is incorrect.'
        })
        return
    }
    const githubName = req.body.repositoryUrl.replace("https://github.com/", "").split('/', 1)
    const filePath = path.relative(__dirname, path.join(path.dirname(__dirname), 'mizarDirectory', githubName[0], 'text', req.body.fileName))
    if (!(fs.existsSync(filePath))) {
        res.status(400).json({
            'message': 'The mizar file described in the fileName parameter cannot be found.'
        })
        return
    }

    //miz_format実行
    const result = spawnSync("./" + path.relative(__dirname, path.join(__dirname, "mizarFormatter", "main")),
        ["-f",
        path.join(gitCommandResult.directoryName, 'text', req.body.fileName),
        path.relative(__dirname, path.join(__dirname, 'mizarFormatter', 'mml.vct')),
        JSON.stringify(req.body.userSettings)], { shell: true });

    //formatterからのエラー取得は未完成(miz_format側の問題)
    let isFormatterSuccess = true;
    if (result.stderr.toString()) {
        isFormatterSuccess = false
    }

    //フォーマット後のmizファイル取得
    const fileContent = fs.readFileSync(path.join(gitCommandResult.directoryName, 'text', req.body.fileName), 'utf-8');
    console.log(fileContent)

    res.json({
        'fileContent': fileContent,
        'isFormatterSuccess': isFormatterSuccess,
        'errorLog': result.stderr.toString(),
    })
})

module.exports = router;