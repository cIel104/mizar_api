// Mizarサーバ内のログをlog/serverOperationsLogに保存
// HTTPリクエストログはlog/requestLogに保存(app.tsに処理を記述)

import { createLogger, format, transports } from 'winston';
import path from 'path'

// winstonの設定
export const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp(),
        format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
    ),
    transports: [
        new transports.Console(),
        new transports.File({ filename: path.join(__dirname, 'logs', 'serverOperation.log') })
    ]
});

logger.info('test log')
