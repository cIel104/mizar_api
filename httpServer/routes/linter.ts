import path from "node:path";
import express from 'express';
import { runGitCommand } from '../verifierKicker/runGitCommand';
import { arrayBuffer } from "stream/consumers";
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
    const githubName = req.body.repositoryUrl.replace("https://github.com/", "").split('/', 1)
    const filePath = path.relative(__dirname, path.join(path.dirname(__dirname), 'mizarDirectory', githubName[0], 'text', req.body.fileName))
    if (!(fs.existsSync(filePath))) {
        res.status(400).json({
            'message': 'The mizar file described in the fileName parameter cannot be found.'
        })
        return
    }

    //main実行
    const result = spawnSync("./" + path.relative(__dirname, path.join(__dirname, "mizarFormatter", "main")),
        ["-l",
            path.join(gitCommandResult.directoryName, 'text', req.body.fileName),
            path.relative(__dirname, path.join(__dirname, 'mizarFormatter', 'mml.vct')),
            JSON.stringify(req.body.userSettings)], { shell: true });

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