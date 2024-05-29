import cors from 'cors';
import createError from 'http-errors'
import path from 'path'
import cookieParser from 'cookie-parser'
import logger from 'morgan'
import express from 'express';
import fs from "node:fs"
const verifierRouter = require('./routes/api')
const formatterRouter = require('./routes/formatter')
const linterRouter = require('./routes/linter')

export var app = express();

// CORSを無視する
app.use(cors());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// Httpリクエストログの出力とファイル保存
app.use(logger('dev'));
const logDirectory = path.join(__dirname, './logs');
fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);
const requestLogStream = fs.createWriteStream(path.join(logDirectory, 'request.log'), { flags: 'a' })
const logFormat = ':date[clf] - :method :status :url - :response-time ms'
app.use(logger(logFormat, {
  stream: requestLogStream
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '1000mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/v0.1/verifier', verifierRouter);
app.use('/api/v0.1/formatter', formatterRouter);
app.use('/api/v0.1/linter', linterRouter);

// catch 404 and forward to error handler
app.use(function (req: any, res: any, next: (arg0: any) => void) {
  next(createError(404));
});

// error handler
app.use(function (err: { message: any; status: any; }, req: { app: { get: (arg0: string) => string; }; }, res: { locals: { message: any; error: any; }; status: (arg0: any) => void; json: (arg0: { error: any }) => void; }, next: any) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.json({ error: err.message })
  // res.render('error');
});

module.exports = app;
