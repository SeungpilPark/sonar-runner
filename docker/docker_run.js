var conf = require('../conf/configProvider.js').get();
var process = require('child_process');
var logger = require('./logger.js');
var fs = require('fs');
var Docker = require('dockerode');
var dockerApi = new Docker({host: conf['docker.http.host'], port: conf['docker.http.port']});
var cidb = require('../lib/db-direct/actions.js');

//도커 실행 후 sdtout 의 전송. 파일저장 필요
//실행 job 토큰 리턴.  실행 job 로드. 에러 관리. job status 관리.
//maxjob 에 따른 job 분배설정.


module.exports.start = function (project, container, jobid, logdate) {

    var logDir;
    try {
        //도커 커맨드라인을 조합한다.
        var excutor = 'docker';
        var augs = [
            '-H',
            conf['docker.tcp.host'],
            'run',
            '--name',
            container,
            conf['docker.image'],
            '/bin/sh',
            '/root/runner.sh',
            conf['sonar.host.url'],
            conf['sonar.jdbc.username'],
            conf['sonar.jdbc.password'],
            conf['sonar.jdbc.url'],
            conf['sonar.login'],
            conf['sonar.password'],
            project.id + '-' + project.path,
            project.id + '-' + project.path,
            '1.0',
            project.http_url_to_repo,
            conf['gitlab.user'],
            conf['gitlab.pass']
        ];

        //로그 디렉토리를 생성한다.
        logDir = logger.createLogDir(project, container, logdate);

        var cmd = process.spawn(excutor, augs);
        //var cmd = process.spawn('/bin/sh', ['/Users/lecle/IdeaProjects/test.sh', 'aaa']);
        //var cmd = process.spawn('cat', ['/Users/lecle/IdeaProjects/jenkins-cli.jar']);
        //var cmd = process.spawn('pwdd');

        //도커 실행 커맨드를 저장한다.
        fs.appendFileSync(logDir + '/command.log', 'excutor = ' + excutor + '\n');
        fs.appendFileSync(logDir + '/command.log', 'augs = ' + JSON.stringify(augs, null, 4));


        //도커 로그가 생성될때.
        cmd.stdout.on('data', function (output) {
            console.log(output.toString());
            fs.appendFileSync(logDir + '/docker.log', output.toString());
        });

        //에러 로그 출력시에
        cmd.stderr.on('data', function (err) {
            console.log(err.toString());
            fs.appendFileSync(logDir + '/docker.log', err.toString());
            fs.appendFileSync(logDir + '/err.log', err.toString());
        });

        //커맨드 실행 에러시에
        cmd.on('error', function (err) {
            console.log(err);
            fs.appendFileSync(logDir + '/err.log', err.toString());
        });

        //종료시에
        cmd.on('close', function (code) {
            //정상 종료시에
            if (code === 0) {
                cidb.updateAsSuccess(jobid, function (err, result) {
                    if (err) {
                        console.error('updateAsSuccess failed on docker_run.sh. jobid : ' + jobid, err);
                    }
                });
            }
            //비정상 종료시에
            else {
                cidb.updateAsFailed(jobid, function (err, result) {
                    if (err) {
                        console.error('updateAsFailed failed on docker_run.sh. jobid : ' + jobid, err);
                    }
                });
            }
        });
    }

        //상기 과정중에 일어난 알 수 없는 에러 로그들을 기록한다.
        //로그 다이어 없을시 새로 생성한다.
    catch (e) {
        console.log(e);
        if (!logDir) {
            logDir = logger.createLogDir(project, container, logdate);
        }
        fs.appendFileSync(logDir + '/err.log', e);
    }

};


//docker -H tcp://172.31.26.45:3375 run --name "git" 172.31.21.144:5000/sonar-runner /bin/sh /root/runner.sh "http://yobi.baikal.io:9100" "sonar" "sonar" "jdbc:mysql://yobi.baikal.io:3306/sonar?useUnicode=true&characterEncoding=utf8&rewriteBatchedStatements=true&useConfigs=maxPerformance" "admin" "admin" "15-test2" "15-test2" "1.0" "http://git.baikal.io/root/test2.git" "root" "qkfka3000"

//컨테이너를 중지한다.
module.exports.stop = function (container_name, cb) {
    var container = dockerApi.getContainer(container_name);
    container.stop(function (err, data) {
        if (err !== null) {
            console.error(container_name + ' container stop failed.' + err);
        } else {
            console.log(container_name + ' container stoped.');
        }
        cb(err, data);
    });
};


//컨테이너를 삭제한다.
module.exports.remove = function (container_name, cb) {
    var container = dockerApi.getContainer(container_name);
    container.remove(function (err, data) {
        if (err !== null) {
            console.error(container_name + ' container delete failed.' + err);
        } else {
            console.log(container_name + ' container deleted.');
        }
        cb(err, data);
    });
};

//컨테이너 목록을 불러온다.
module.exports.listContainers = function (cb) {
    dockerApi.listContainers({all: true}, function (err, containers) {
        cb(err, containers);
    });
};

