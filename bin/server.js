var conf = require('../conf/configProvider.js').get();
var bodyParser = require('body-parser');
var express = require('express');
var app = express();
var scheduler = require('../docker/scheduler.js');
var executer = require('./executer.js');
var cidb = require('../lib/db-direct/actions.js');

app.use(bodyParser.json());

app.post('/api/gethook', function (req, res) {
    try {
        var body = req.body;
        var ci_projectid = body.project_id;
        var buildid = body.build_id;

        console.log('recieve hook.');
        console.log(body);

        cidb.selectCiprojectByid(ci_projectid, function (err, ciproject) {
            if (err) {
                console.error('Can not select Ciproject', err);
            } else {
                if (ciproject) {
                    executer.run(ciproject.gitlab_id, {build_id: buildid}, function (err, jobid) {
                        if (err) {
                            console.error('Webhook event failed by build_id : ' + buildid, err);
                        } else {
                            console.log('Webhook event started by build_id : ' + buildid + ' ==> jobid :' + jobid);
                        }
                    });

                } else {
                    console.error('Can not find ci-project where id is ' + ci_projectid);
                }
            }
        });
    } catch (e) {

    }
    res.send('complete!');
});

app.post('/api/enablehook', function (req, res) {
    try {
        var body = req.body;
        var projectid = body.projectid;
        if (!projectid) {
            res.status(500).send({
                code: 500,
                error: 'projectid is not found.'
            });

        } else {
            executer.enablehook(projectid, {}, function (err, result) {
                if (err) {
                    res.status(500).send({
                        code: 500,
                        error: 'enablehook failed.',
                        stack: err.stack
                    });
                }
                else {
                    res.send('enablehook successed.');
                }
            });
        }

    } catch (e) {
        res.status(500).send({
            code: 500,
            error: 'enablehook failed.',
            stack: e.stack
        });
    }
});


app.post('/api/disablehook', function (req, res) {
    try {
        var body = req.body;
        var projectid = body.projectid;
        if (!projectid) {
            res.status(500).send({
                code: 500,
                error: 'projectid is not found.'
            });

        } else {
            executer.disablehook(projectid, {}, function (err, result) {
                if (err) {
                    res.status(500).send({
                        code: 500,
                        error: 'disablehook failed.',
                        stack: err.stack
                    });
                }
                else {
                    res.send('disablehook successed.');
                }
            });
        }

    } catch (e) {
        res.status(500).send({
            code: 500,
            error: 'disablehook failed.',
            stack: e.stack
        });
    }
});

app.post('/api/run', function (req, res) {
    try {
        var body = req.body;
        var projectid = body.projectid;
        if (!projectid) {
            res.status(500).send({
                code: 500,
                error: 'projectid is not found.'
            });

        } else {

            executer.run(projectid, {}, function (err, jobid) {
                if (err) {
                    res.status(500).send({
                        code: 500,
                        error: 'run project failed.',
                        stack: err.stack
                    });
                }
                else {
                    res.send({
                        jobid: jobid
                    });
                }
            });
        }

    } catch (e) {
        res.status(500).send({
            code: 500,
            error: 'run project failed.',
            stack: e.stack
        });
    }
});

app.post('/api/job', function (req, res) {
    try {
        var body = req.body;
        var jobid = body.jobid;
        if (!jobid) {
            res.status(500).send({
                code: 500,
                error: 'jobid is not found.'
            });

        } else {

            executer.job(jobid, {}, function (err, result) {
                if (err) {
                    res.status(500).send({
                        code: 500,
                        error: 'getting job status failed.',
                        stack: err.stack
                    });
                }
                else {
                    res.send({
                        status: result
                    });
                }
            });
        }
    } catch (e) {
        res.status(500).send({
            code: 500,
            error: 'getting job status failed.',
            stack: e.stack
        });
    }
});

app.post('/api/cancle', function (req, res) {
    try {
        var body = req.body;
        var jobid = body.jobid;
        if (!jobid) {
            res.status(500).send({
                code: 500,
                error: 'jobid is not found.'
            });

        } else {

            executer.cancle(jobid, {}, function (err, result) {
                if (err) {
                    res.status(500).send({
                        code: 500,
                        error: 'job cancle failed.',
                        stack: err.stack
                    });
                }
                else {
                    res.send('job cancle successed.');
                }
            });
        }
    } catch (e) {
        res.status(500).send({
            code: 500,
            error: 'job cancle failed.',
            stack: e.stack
        });
    }
});

app.post('/api/logs', function (req, res) {
    try {
        var body = req.body;
        var jobid = body.jobid;
        if (!jobid) {
            res.status(500).send({
                code: 500,
                error: 'jobid is not found.'
            });

        } else {
            executer.logs(jobid, {}, function (err, result) {
                if (err) {
                    res.status(500).send({
                        code: 500,
                        error: 'getting job logs failed.',
                        stack: err.stack
                    });
                }
                else {
                    res.send(result);
                }
            });
        }
    } catch (e) {
        res.status(500).send({
            code: 500,
            error: 'getting job logs failed.',
            stack: e.stack
        });
    }
});


var server = app.listen(conf['listen.port'], function () {
    var host = server.address().address;
    var port = server.address().port;

    console.log('Gitlab Sonar multi server app listening at http://%s:%s', host, port);
});


function excuteQue() {
    console.log('excuteQue');
    scheduler.excute(function () {
        setTimeout(function () {
            excuteQue();
        }, conf['jobInterval']);
    });
}

excuteQue();

