var conf = require('../conf/configProvider.js').get();
require('shelljs/global');
var fs = require('fs');

//디렉토리 순서 : conf['logdir']/yyyy/mm/dd/projectid/<container>/~
module.exports.createLogDir = function (project, container, logdate) {

    var obj = parseLogDate(logdate);

    var year = obj.year
    var mm = obj.mm
    var dd = obj.dd

    var logDir = conf['logdir'] + '/' + year + '/' + mm + '/' + dd + '/' + project.id + '/' + container;
    mkdir('-p', logDir);

    return logDir;
}

//디렉토리 순서 : conf['logdir']/yyyy/mm/dd/projectid/<container>/~
module.exports.getLogDir = function (projectid, container, logdate) {

    var obj = parseLogDate(logdate);

    var year = obj.year
    var mm = obj.mm
    var dd = obj.dd

    var logDir = conf['logdir'] + '/' + year + '/' + mm + '/' + dd + '/' + projectid + '/' + container;

    return logDir;
}


module.exports.createLogDate = function () {

    var date = new Date();
    var year = date.getFullYear();
    var mm = date.getMonth() + 1;
    var dd = date.getDate();

    var logdate = year + '-' + mm + '-' + dd;
    return logdate;
}

function parseLogDate(logdate){
    var split = logdate.split('-');

    return {
        year: split[0],
        mm: split[1],
        dd: split[2],
    }
}

