#!/usr/bin/env node
var conf = require('../conf/configProvider.js').get();
var program = require('commander');
var executer = require('./executer.js');


//제이슨 파일 쓰기.
/*var jsonfile = require('jsonfile')

 var file = '/tmp/data.json'
 var obj = {name: 'JP'}

 jsonfile.writeFileSync(file, obj)*/

program
    .version('0.0.1')
    .option('-C, --chdir <path>', 'change the working directory')
    .option('-c, --config <path>', 'set config path. defaults to ./deploy.conf')
    .option('-T, --no-tests', 'ignore test hook')

program
    .command('setup [env]')
    .description('run setup commands for all envs')
    .option("-s, --setup_mode [mode]", "Which setup mode to use")
    .action(function (env, options) {
        var mode = options.setup_mode || "normal";
        env = env || 'all';
        console.log('setup for %s env(s) with %s mode', env, mode);
    });

program
    .command('exec <cmd>')
    .description('execute the given remote cmd')
    .option("-e, --exec_mode <mode>", "Which exec mode to use")
    .action(function (cmd, options) {
        console.log('exec "%s" using %s mode', cmd, options.exec_mode);
    }).on('--help', function () {
        console.log('  Examples:');
        console.log();
        console.log('    $ deploy exec sequential');
        console.log('    $ deploy exec async');
        console.log();
    });

program
    .command('run <projectid>')
    .description('run sonar-runner imediately from gitlab project.')
    .option("-log, --log-file <file>", "sdtout log file location")
    .option("-m, --image <image>", "excute docker image. default is " + conf.docker_image)
    .action(function (projectid, options) {
        executer.run(projectid, options, function (err, jobid) {
            if (err) {
                console.error('run project failed.' , err);
                process.exit(1);
            }
            if (jobid) {
                console.log('This jobid is equal ci_sonar_builds table`s primary key in gitlab-ci database');
                console.log('You can request status and logs using jobid. See README.md' +
                    ' how to request.');
                console.log('jobid : ' + jobid);
                process.exit();
            }
        });
    });

program
    .command('enablehook <projectid>')
    .description('enablehook will enable sonar-build automatically after a ci-build end.')
    .option("-log, --log-file <file>", "sdtout log file location")
    .action(function (projectid, options) {
        executer.enablehook(projectid, options, function (err, result) {
            if (err) {
                console.error('enablehook failed.' ,err);
                process.exit(1);
            }
            else {
                console.log('enablehook successed.');
                console.log(result);
                process.exit();
            }
        });
    });

program
    .command('disablehook <projectid>')
    .description('disablehook will disable sonar-build automatically after a ci-build end.')
    .option("-log, --log-file <file>", "sdtout log file location")
    .action(function (projectid, options) {
        executer.disablehook(projectid, options, function (err, result) {
            if (err) {
                console.error('disablehook failed.' ,err);
                process.exit(1);
            }
            else {
                console.log('disablehook successed.');
                console.log(result);
                process.exit();
            }
        });
    });

program
    .command('job <jobid>')
    .description('get job status')
    .option("-log, --log-file <file>", "sdtout log file location")
    .action(function (jobid, options) {
        executer.job(jobid, options, function (err, result) {
            if (err) {
                console.error('getting job status failed.' ,err);
                process.exit(1);
            }
            else {
                console.log('job status : ' + result);
                process.exit();
            }
        });
    });

program
    .command('cancle <jobid>')
    .description('cancle running job.')
    .option("-log, --log-file <file>", "sdtout log file location")
    .action(function (jobid, options) {
        executer.cancle(jobid, options, function (err, result) {
            if (err) {
                console.error('cancle job failed.' ,err);
                process.exit(1);
            }
            else {
                console.log('job cancled.');
                process.exit();
            }
        });
    });

program
    .command('logs <jobid>')
    .description('get logs of job')
    .option("-log, --log-file <file>", "sdtout log file location")
    .action(function (jobid, options) {
        executer.logs(jobid, options, function (err, result) {
            if (err) {
                console.error('getting job logs failed.' ,err);
                process.exit(1);
            }
            else {
                console.log(result);
                process.exit();
            }
        });
    });

program
    .command('initdb')
    .description('create ci_sonar_builds table in gitlab-ci database.')
    .action(function (options) {
        executer.initdb(options, function (err, result) {
            if (err) {
                console.log(err);
                process.exit(1);

            }
            else {
                console.log('ci_sonar_builds table created.');
                process.exit();
            }
        });
    });

program
    .command('dropdb')
    .description('drop ci_sonar_builds table in gitlab-ci database.')
    .action(function (options) {
        executer.dropdb(options, function (err, result) {
            if (err) {
                console.log(err);
                process.exit(1);
            }
            else {
                console.log('ci_sonar_builds table drop.');
                process.exit();
            }
        });
    });

program
    .command('start')
    .description('start gitlab-sonar-runner api and runner-Queue.')
    .action(function (options) {
        executer.start(options, function (err, result) {

        });
    });


program
    .command('stop')
    .description('stop gitlab-sonar-runner api and runner-Queue.')
    .action(function (options) {
        executer.stop(options, function (err, result) {

        });
    });


program.parse(process.argv);

if (!program.args.length) {
    program.help();
}



