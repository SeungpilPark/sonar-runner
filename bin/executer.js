var async = require('async');
var docker = require('../docker/docker_run.js');
var logger = require('../docker/logger.js');
var scheduler = require('../docker/scheduler.js');
var conf = require('../conf/configProvider.js').get();
var cidb = require('../lib/db-direct/actions.js');
var shortid = require('shortid');
var process = require('child_process');
var fs = require('fs');
require('shelljs/global');

// 깃랩 ci 커넥션
var gitlab_ci = require('../lib/gitlab-ci-client')({
    apiUrl: conf['gitlab.ci.url']
    , runnerToken: conf['gitlab.ci.token']
    , gitlabUrl: conf['gitlab.url']
    , token: conf['gitlab.token']
    , strictSSL: true
});

// 깃랩 커넥션
var gitlab = require('gitlab')({
    url: conf['gitlab.url'],
    token: conf['gitlab.token']
});


//작업순서
//1. gitlab 서버에서 프로젝트 정보를 가져온다.
//2. gitlab-ci db 에 인서트한다. 리턴 아이디를 가져온다.
//3. 해당 function 은 아이디를 리턴하고 역할을 종료한다.
module.exports.run = function (projectid, options, callback) {
    try {
        async.waterfall([

                //1. gitlab 서버에서 프로젝트 정보를 가져온다.
                function (cb) {
                    gitlab.projects.show(projectid, function (project) {
                        if (project) {
                            cb(null, project);
                        } else {
                            callback(new Error('Can not find project. id:' + projectid), null);
                        }
                    });
                },


                //2. gitlab-ci db 에 인서트한다. 리턴 아이디를 가져온다.
                function (project, cb) {
                    var params = {
                        project_id: project.id,
                        status: 'pending',
                        container: 'sonar-p' + project.id + '-' + shortid.generate(),
                        logdate: logger.createLogDate(),
                        commit_id: options.commit_id ? options.commit_id : -1,
                        build_id: options.build_id ? options.build_id : -1
                    };
                    cidb.insertSonar(params, function (err, rows) {
                        if (err) {
                            callback(err, null);
                        }
                        if (rows) {
                            console.log('inserted new ci-sonar-builds record.');
                            cb(null, project, params.container, rows[0].id);
                        }
                    });
                },


                //3. 해당 function 은 아이디를 리턴하고 역할을 종료한다.
                function (project, container, jobid, cb) {
                    cb(null, jobid);
                }
            ],


            //모든 과정이 정상적으로 종료되었음.
            function (err, jobid) {
                callback(null, jobid);
            });
    } catch (e) {
        callback(e, null);
    }
};

module.exports.initdb = function (options, callback) {
    cidb.createSonarTable(function (err, result) {
        callback(err, result);
    });
};
module.exports.dropdb = function (options, callback) {
    cidb.dropSonarTable(function (err, result) {
        callback(err, result);
    });
};

module.exports.start = function (options, callback) {
    console.log('kill running sonar-runner server process....');
    process.exec('forever stopall', function (error, stdout, stderr) {
        if (error !== null) {
            console.error('failed', error);
        }
        else {
            var syslogDir = __dirname + '/../syslogs';
            mkdir('-p', syslogDir);

            process.exec('forever start ' +
                '-o ' + syslogDir + '/app.log ' +
                '-e ' + syslogDir + '/err.log ' +
                __dirname + '/server.js ',
                function (error, stdout, stderr) {
                    if (error !== null) {
                        console.error('failed', error);
                    }
                    console.log('gitlab-sonar-runner daemon started.');
                });
        }
    });
};

module.exports.stop = function (options, callback) {
    process.exec('forever stopall', function (error, stdout, stderr) {
        if (error !== null) {
            console.error('failed', error);
        }
        else {
            console.log('gitlab-sonar-runner daemon stoped.');
        }
    });
};

module.exports.enablehook = function (projectid, options, callback) {
    try {
        async.waterfall([

                //1. gitlab 서버 ci_projects 에서 정보를 가져온다.
                function (cb) {
                    cidb.selectCiProjectByProjectid(projectid, function (err, result) {
                        if (err) {
                            callback(err, null);
                        } else {
                            if (result) {
                                cb(null, result.id);
                            } else {
                                callback(new Error('Can not find ci-project where gitlab_id is ' + projectid), null);
                            }
                        }
                    });
                },

                //2. gitlab 서버 ci_web_hooks 의 기존 데이터를 삭제한다.

                function (ci_project_id, cb) {
                    cidb.deleteCiwebhooks(ci_project_id, function (err, result) {
                        if (err) {
                            callback(err, null);
                        } else {
                            cb(null, ci_project_id);
                        }
                    })
                },

                //3. gitlab 서버 ci_web_hooks 에 새 데이터를 추가한다.
                function (ci_project_id, cb) {
                    var url = 'http://' + conf['listen.host'] + ':' + conf['listen.port'] + '/api/gethook';
                    cidb.createCiwebhooks(ci_project_id, url, function (err, result) {
                        if (err) {
                            callback(err, null);
                        } else {
                            cb(null, result[0].id);
                        }
                    })
                },

            ],

            //모든 과정이 정상적으로 종료되었음.
            function (err, ci_web_hooks_id) {
                callback(null, ci_web_hooks_id);
            });
    } catch (e) {
        callback(e, null);
    }
};

module.exports.disablehook = function (projectid, options, callback) {
    try {
        async.waterfall([

                //1. gitlab 서버 ci_projects 에서 정보를 가져온다.
                function (cb) {
                    cidb.selectCiProjectByProjectid(projectid, function (err, result) {
                        if (err) {
                            callback(err, null);
                        } else {
                            if (result) {
                                cb(null, result.id);
                            } else {
                                callback(new Error('Can not find ci-project where gitlab_id is ' + projectid), null);
                            }
                        }
                    });
                },

                //2. gitlab 서버 ci_web_hooks 의 기존 데이터를 삭제한다.
                function (ci_project_id, cb) {
                    cidb.deleteCiwebhooks(ci_project_id, function (err, result) {
                        if (err) {
                            callback(err, null);
                        } else {
                            cb(null, ci_project_id);
                        }
                    })
                },
            ],

            //모든 과정이 정상적으로 종료되었음.
            function (err, ci_web_hooks_id) {
                callback(null, ci_web_hooks_id);
            });
    } catch (e) {
        callback(e, null);
    }
};


module.exports.job = function (jobid, options, callback) {
    try {
        cidb.selectSonarbuildById(jobid, function (err, result) {
            if (err) {
                callback(err, null);
            } else {
                if (result) {
                    callback(null, result.status);
                } else {
                    callback(new Error('Can not find ci_sonar_builds where id is ' + jobid), null);
                }
            }
        });

    } catch (e) {
        callback(e, null);
    }
};

module.exports.cancle = function (jobid, options, callback) {
    try {
        async.waterfall([

                //1. sonar_build 테이블에 레코드를 가져온다.
                function (cb) {
                    cidb.selectSonarbuildById(jobid, function (err, result) {
                        if (err) {
                            callback(err, null);
                        } else {
                            if (result) {
                                cb(null, result);
                            } else {
                                callback(new Error('Can not find ci_sonar_builds where id is ' + jobid), null);
                            }
                        }
                    });
                },

                //2. 컨테이너를 중단한다.
                function (result, cb) {
                    docker.stop(result.container, function (err, result) {
                        cb(null, jobid);
                    });
                },

                //3. sonar_build 테이블에 cancled 로 업데이트한다.
                function (jobid, cb) {
                    cidb.updateAsCancled(jobid, function (err, result) {
                        if (err) {
                            callback(new Error('Can not updateAsCancled jobid ' + jobid), null);
                        } else {
                            cb(null, result);
                        }
                    })
                },
            ],

            //모든 과정이 정상적으로 종료되었음.
            function (err, result) {
                callback(null, result);
            });

    } catch (e) {
        callback(e, null);
    }
};

module.exports.logs = function (jobid, options, callback) {
    try {
        cidb.selectSonarbuildById(jobid, function (err, result) {
            if (err) {
                callback(err, null);
            } else {
                if (result) {
                    var logDir = logger.getLogDir(result.project_id, result.container, result.logdate);
                    console.log('logDir : ' + logDir);
                    var logs = {
                        command: fs.readFileSync(logDir + '/command.log').toString(),
                        log: fs.readFileSync(logDir + '/docker.log').toString(),
                        err: fs.readFileSync(logDir + '/err.log').toString()
                    }
                    callback(null, logs);

                } else {
                    callback(new Error('Can not find ci_sonar_builds where id is ' + jobid), null);
                }
            }
        });

    } catch (e) {
        callback(e, null);
    }
};



