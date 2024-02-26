import path from "node:path";
import express from 'express';
import { runGitCommand } from '../verifierKicker/runGitCommand';
const fs = require('fs');
const { spawnSync } = require('node:child_process')
const router = express.Router();

interface ErrorObj {
    errorLine: number;
    errorColumn: number;
    errorMessage: string;
}

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
    if (!(fs.existsSync(filePath))) {
        res.status(400).json({
            'message': 'The mizar file described in the fileName parameter cannot be found.'
        })
        return
    }

    const result = spawnSync(path.join(rootDirectory, 'httpServer', 'mizarFormatter', 'main'),
        ["-l",
            filePath,
            path.join(rootDirectory, 'httpServer', 'mizarFormatter', 'mml.vct'),
            JSON.stringify(req.body.userSettings)], { shell: true });

    //エラーリスト作成
    const errorList: Array<object> = []
    const errors = result.output[2].toString().split('\n')
    for (let i = 0; i < errors.length - 1; i++) {
        const errorMessage = errors[i].slice(errors[i].lastIndexOf(":")+1, errors[i].indexOf("[")-1)
        const errorLine = errors[i].slice(errors[i].lastIndexOf("[") + 4, errors[i].indexOf(","))
        const errorColumn = errors[i].slice(errors[i].lastIndexOf(",") + 6, errors[i].indexOf("]"))
        const errorObj: ErrorObj = {
            errorLine: Number(errorLine),
            errorColumn: Number(errorColumn),
            errorMessage: errorMessage
        }
        errorList.push(errorObj)
    }

    res.json({
        errorList: errorList
    })
})

module.exports = router