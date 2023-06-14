//git clone か git pull コマンドを実行する
const path = require('path');
const fs = require('fs');
const makeDir = require("make-dir");

function gitCommand(repositoryUrl) {
    return new Promise((resolve) => {
        const gitHubName = repositoryUrl.replace("https://github.com/", "").split('/', 1) //repositoryUrlからユーザー名を取得
        const directoryPath = path.relative(__dirname, path.join(path.dirname(__dirname), 'mizarDirectory'))
        const directoryName = path.join(directoryPath, gitHubName[0])
        let command
        if (fs.existsSync(directoryName)) {
            command = 'git -C ' + directoryName + ' checkout -- .';
            runGitCommand(command)
            command = 'git -C ' + directoryName + ' pull'
            runGitCommand(command)
            resolve(directoryName)
        } else {
            makeDir(directoryName).then(path => {
                command = 'git clone -b verifier --depth=1 ' + repositoryUrl + ' ' + path
                runGitCommand(command)
                resolve(directoryName)
            })
        }
    })
}

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

//デバック
// async function d() {
//     console.log('start')
//     const f = await gitCommand("https://github.com/cIel104/fork_test.git", "master")
//     console.log('end')
//     console.log(f)
// }
// d()

module.exports = gitCommand;