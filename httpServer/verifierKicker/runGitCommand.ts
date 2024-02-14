import fs from "node:fs"
import makeDir from "make-dir";
import path from "node:path";

export function runGitCommand(repositoryUrl: string) {
    return new Promise<{ result: boolean, directoryName: string }>((resolve) => {
        //repositoryUrlからユーザー名を取得
        const trimmedUrl = repositoryUrl.replace("https://github.com/", "").replace(".git", "").split('/')
        const accountName = trimmedUrl[0]
        const repositoryName = trimmedUrl[1]
        const directoryPath = path.relative(__dirname, path.join(path.dirname(__dirname), 'mizarDirectory'))
        const directoryName = path.join(directoryPath, accountName, repositoryName)
        let command: string
        
        //ディレクトリの有無でコマンド選択
        if (fs.existsSync(path.join(directoryName,'text'))) {
            command = 'git -C ' + directoryName + ' checkout -- .';
            executeGitCommand(command)
            command = 'git -C ' + directoryName + ' pull'
            const gitCommandResult = executeGitCommand(command)
            resolve({ 'result': gitCommandResult, 'directoryName': directoryName })
        } else {
            //mizarDirectoryディレクトリの中にmizarファイル名と同じディレクトリを作成(.mizはなし)
            makeDir(directoryName).then(path => {
                command = 'git clone -b verifier --depth=1 ' + repositoryUrl + ' ' + path
                const gitCommandResult = executeGitCommand(command)
                resolve({ 'result': gitCommandResult, 'directoryName': directoryName })
            })
        }
    })
}

function executeGitCommand(command: string) {
    const { spawnSync } = require('node:child_process');
    const parts = command.split(' ');
    const cmd = parts[0]
    const args = parts.splice(1);
    const result = spawnSync(cmd, args, {
        stdio: 'ignore',
        detached: false,
        env: process.env,
        maxVuffer: 1000 * 1024 * 1024,
    });

    if (result.status !== 0) {
        return false
    }
    return true
}