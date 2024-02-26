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
    const trimmedUrl = req.body.repositoryUrl.replace("https://github.com/", "").replace(".git", "").split('/')
    const accountName = trimmedUrl[0]
    const repositoryName = trimmedUrl[1]
    const rootDirectory = path.resolve(__dirname, '../../');
    const directoryPath = path.join(rootDirectory, 'mizarDirectory', accountName, repositoryName);
    const filePath = path.join(directoryPath, 'text', req.body.fileName)
    console.log(filePath)
    if (!(fs.existsSync(filePath))) {
        res.status(400).json({
            'message': 'The mizar file described in the fileName parameter cannot be found.'
        })
        return
    }

    //main実行
    const result = spawnSync(path.join(rootDirectory, 'httpServer', 'mizarFormatter', 'main'),
        ["-f",
        filePath,
        path.join(rootDirectory, 'httpServer', 'mizarFormatter', 'mml.vct'),
        JSON.stringify(req.body.userSettings)], { shell: true });

    //formatterからのエラー取得
    let isFormatterSuccess = true;
    if (result.stderr.toString()) {
        isFormatterSuccess = false
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8')
    res.json({
        'fileContent': fileContent,
        'isFormatterSuccess': isFormatterSuccess,
        'errorLog': result.stderr.toString(),
    })
})

module.exports = router;