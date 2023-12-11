import fs from "node:fs"
import makeDir from "make-dir";
import path from "node:path";

export function runGitCommand(repositoryUrl: string) {
    return new Promise<{ result: boolean, directoryName: string }>((resolve) => {
        //repositoryUrlからユーザー名を取得
        const gitHubName = repositoryUrl.replace("https://github.com/", "").split('/', 1) 
        const directoryPath = path.relative(__dirname, path.join(path.dirname(__dirname), 'mizarDirectory'))
        const directoryName = path.join(directoryPath, gitHubName[0])
        let command: string
        
        //ディレクトリの有無でコマンド選択
        /* メモ
        cloneのが失敗するURLでもgithubユーザー名のフォルダは生成されるため
        fs.existsSync(directoryName)ではなくfs.existsSync(path.join(directoryName, 'text'))にする

        現在は一つのgithubアカウントにつき、一つのリポジトリまでしか対応していない。
        (2個め以降はディレクトリが存在しているのでgit pullになってしまう)
        */
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