var conf = require('../conf/configProvider.js').get();
var docker = require('./docker_run.js');
var async = require('async');
var cidb = require('../lib/db-direct/actions.js');
// 깃랩 커넥션
var gitlab = require('gitlab')({
    url: conf['gitlab.url'],
    token: conf['gitlab.token']
});

//스케쥴 파일에 스케쥴을 등록한다.
module.exports.insert = function (project, container, jobid) {

}

//0. 도커 컨테이너에서 sonar runner 컨테이너가 종료된 것을 삭제한다.
//1. 도커 컨테이너중에서 sonar runner 컨테이너가 돌아가고 있는 수를 구한다.
//2. 더 돌아갈 수 있는 여력만큼 gitlab-ci db 에서 pending 상태인것을 가져온다.
//3. 도커 컨테이너를 돌린다.
module.exports.excute = function (callback) {

    var exited = [];
    var running = [];

    try {
        async.waterfall([

                //도커 컨테이너 리스트를 구한 후, 분석한다.
                function (cb) {
                    docker.listContainers(function (err, containers) {
                        if (err) {
                            console.error('failed list containers', err);
                            callback();
                        } else {
                            for (var i = 0; i < containers.length; i++) {
                                var status = containers[i].Status;
                                var name = containers[i].Names[0];

                                if (name.indexOf('sonar-') !== -1) {
                                    var split = name.split('/');
                                    var containerName = split[split.length - 1];

                                    if (status.indexOf('Exited') !== -1) {
                                        exited.push(containerName);
                                    }
                                    if (status.indexOf('Up') !== -1) {
                                        running.push(containerName);
                                    }
                                }
                            }
                            cb(null);
                        }
                    });
                },

                //도커 컨테이너에서 sonar runner 컨테이너가 종료된 것을 삭제한다.
                function (cb) {
                    for (var i = 0; i < exited.length; i++) {
                        docker.remove(exited[0], function (err, result) {
                        });
                    }
                    cb(null);
                },

                //도커 컨테이너에서 sonar runner 컨테이너가 돌아가고 있는 개수와 수용가능 수의 차이만큼
                // pending 상태에 있는 잡들을 실행시키고 상태를 running 으로 변환한다.
                function (cb) {
                    var enableJobCount = conf['maxjob'] - running.length;
                    if (enableJobCount > 0) {
                        cidb.selectPending(function (err, rows) {
                            if (err) {
                                console.error('failed list pending jobs.', err);
                                callback();
                            } else {
                                cb(null, rows);
                            }
                        })
                    }else{
                        console.log('All docker node is busy.');
                        callback();
                    }
                },

                function (rows, cb) {
                    var remainJobs = rows.length;

                    function doNext() {
                        if (remainJobs < 1) {
                            cb(null, null);
                        } else {
                            var row = rows[remainJobs - 1];
                            var projectid = row.project_id;
                            var container = row.container;
                            var jobid = row.id;
                            var logdate = row.logdate;


                            gitlab.projects.show(projectid, function (project) {
                                if (project) {

                                    cidb.updateAsRunning(jobid, function (err, res) {
                                        if (err) {
                                            console.error('updateAsRunning failed: jobid:' + jobid, err);
                                            remainJobs--;
                                            doNext();
                                        } else {
                                            docker.start(project, container, jobid, logdate);
                                            remainJobs--;
                                            doNext();
                                        }
                                    });

                                } else {

                                    console.error('project is not exist: projectid:' + projectid);
                                    cidb.updateAsFailed(jobid, function (err, res) {
                                        if (err) {
                                            console.error('updateAsFailed failed: jobid:' + jobid, err);
                                            remainJobs--;
                                            doNext();
                                        } else {
                                            remainJobs--;
                                            doNext();
                                        }
                                    });
                                }
                            });

                        }
                    }

                    doNext();
                }

            ],

            //모든 과정이 정상적으로 종료되었음.
            function (err, result) {
                callback();
            });
    } catch (e) {
        console.error('Error during excute que.', e);
        callback();
    }
}
