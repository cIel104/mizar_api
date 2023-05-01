//現在の進捗
// リクエストされた時決まったレスポンスが返される
const express = require('express');
const { resolve } = require('path');
const { route } = require('../app');
const router = express.Router();

router.post('/', function (req, res, next) {
    res.json({
        'ID': '01234567-8901-2345-6789-012345678901'
    })
})

router.get('/:ID', function (req, res, next) {
    if (req.params.ID === '1') {
        res.json({
            'progressPhase': 'Parser',
            'progressPercent': 100,
            'isMakeenvFinish': true,
            'isMakeenvSuccess': true,
            'isVerifierFinish': true,
            'isVerifierSuccess': true,
            'numOfErrors': 0,
            'errorList': [],
            'makeenvText': "Make Environment, Mizar Ver. 8.1.11 (Win32/FPC)\r\nCopyright (c) 1990-2021 Association of Mizar Users",
        })
    } else if (req.params.ID === '2') {
        res.json({
            'progressPhase': 'Parser',
            'progressPercent': 100,
            'isMakeenvFinish': true,
            'isMakeenvSuccess': true,
            'isVerifierFinish': true,
            'isVerifierSuccess': false,
            'numOfErrors': 1,
            'errorList': [{ errLine: 72, errorColumn: 4, errorNumber: 321, errorMessage: 'Predicate symbol or "is" expected' }],
            'makeenvText': "Make Environment, Mizar Ver. 8.1.11 (Win32/FPC)\r\nCopyright (c) 1990-2021 Association of Mizar Users",
        })
    }

}

)

module.exports = router;