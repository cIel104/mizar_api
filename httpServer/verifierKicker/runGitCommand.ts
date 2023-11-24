import fs from "node:fs"
import makeDir from "make-dir";
import path from "node:path";

export function runGitCommand(repositoryUrl: string) {
    return new Promise((resolve) => {
        //repositoryUrlからユーザー名を取得
        const gitHubName = repositoryUrl.replace("https://github.com/", "").split('/', 1) 
        const directoryPath = path.relative(__dirname, path.join(path.dirname(__dirname), 'mizarDirectory'))
        const directoryName = path.join(directoryPath, gitHubName[0])
        let command: string
        
        //ディレクトリの有無でコマンド選択
        if (fs.existsSync(directoryName)) {
            command = 'git -C ' + directoryName + ' checkout -- .';
            executeGitCommand(command)
            command = 'git -C ' + directoryName + ' pull'
            executeGitCommand(command)
            resolve(directoryName)
        } else {
            //mizarDirectoryディレクトリの中にmizarファイル名と同じディレクトリを作成(.mizはなし)
            makeDir(directoryName).then(path => {
                command = 'git clone -b verifier --depth=1 ' + repositoryUrl + ' ' + path
                executeGitCommand(command)
                resolve(directoryName)
            })
        }
    })
}

function executeGitCommand(command: string) {
    const { spawnSync } = require('node:child_process');
    const parts = command.split(' ');
    const cmd = parts[0]
    const args = parts.splice(1);
    spawnSync(cmd, args, {
        stdio: 'ignore',
        detached: false,
        env: process.env,
        maxVuffer: 1000 * 1024 * 1024,
    });
}