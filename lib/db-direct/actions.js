var connection_ = require('./connection.js');
function connect_(sql, params, cb) {
    connection_(sql, params, function (err, result) {
        if (result && result.rows) {
            cb(err, result.rows);
        } else {
            cb(err, result);
        }
    });
}

module.exports.createSonarTable = function (cb) {
    var sql = '' +
        'CREATE TABLE ci_sonar_builds' +
        '(' +
        '    id serial PRIMARY KEY,' +
        '    project_id integer,' +
        '    status character varying(255),' +
        '    container character varying(255),' +
        '    logdate character varying(255),' +
        '    finished_at timestamp without time zone,' +
        '    created_at timestamp without time zone,' +
        '    updated_at timestamp without time zone,' +
        '    started_at timestamp without time zone,' +
        '    commit_id integer,' +
        '    build_id integer' +
        ')';

    var params = [];
    connect_(sql, params, cb);
};

module.exports.dropSonarTable = function (cb) {
    var sql = '' +
        'DROP TABLE ci_sonar_builds';
    var params = [];
    connect_(sql, params, cb);
};

module.exports.insertSonar = function (obj, cb) {

    var sql = '' +
        'INSERT INTO ci_sonar_builds' +
        '(project_id, status,container,logdate,finished_at,created_at,updated_at,started_at,commit_id,build_id )' +
        'VALUES ($1, $2, $3, $4, null ,now(),now(),now(), $5, $6) RETURNING id';

    var params = [
        obj.project_id,
        obj.status,
        obj.container,
        obj.logdate,
        obj.commit_id,
        obj.build_id
    ];
    connect_(sql, params, cb);
};

module.exports.selectPending = function (cb) {
    var sql = '' +
        'SELECT * FROM ci_sonar_builds ' +
        'WHERE status = $1 ORDER BY created_at ASC';
    var params = [
        'pending'
    ];
    connect_(sql, params, cb);
};

module.exports.updateAsRunning = function (jobid, cb) {
    var sql = '' +
        'UPDATE ci_sonar_builds SET status = $1 , updated_at = now() , started_at = now() ' +
        'WHERE id = $2';
    var params = [
        'running',
        jobid
    ];
    connect_(sql, params, cb);
}

module.exports.updateAsFailed = function (jobid, cb) {
    var sql = '' +
        'UPDATE ci_sonar_builds SET status = $1 , updated_at = now() , finished_at = now() ' +
        'WHERE id = $2';
    var params = [
        'failed',
        jobid
    ];
    connect_(sql, params, cb);
}

module.exports.updateAsSuccess = function (jobid, cb) {
    var sql = '' +
        'UPDATE ci_sonar_builds SET status = $1 , updated_at = now() , finished_at = now() ' +
        'WHERE id = $2';
    var params = [
        'success',
        jobid
    ];
    connect_(sql, params, cb);
}

module.exports.updateAsCancled = function (jobid, cb) {
    var sql = '' +
        'UPDATE ci_sonar_builds SET status = $1 , updated_at = now() , finished_at = now() ' +
        'WHERE id = $2';
    var params = [
        'cancled',
        jobid
    ];
    connect_(sql, params, cb);
}

module.exports.selectCiProjectByProjectid = function (projectid, cb) {
    var sql = '' +
        'SELECT * FROM ci_projects ' +
        'WHERE gitlab_id = $1';
    var params = [
        projectid
    ];
    connect_(sql, params, function (err, rows) {
        if (err) {
            cb(err, null);
        } else {
            cb(null, rows[0]);
        }
    });
};

module.exports.selectCiprojectByid = function (ci_projectid, cb) {
    var sql = '' +
        'SELECT * FROM ci_projects ' +
        'WHERE id = $1';
    var params = [
        ci_projectid
    ];
    connect_(sql, params, function (err, rows) {
        if (err) {
            cb(err, null);
        } else {
            cb(null, rows[0]);
        }
    });
};

module.exports.selectSonarbuildById = function (jobid, cb) {
    var sql = '' +
        'SELECT * FROM ci_sonar_builds ' +
        'WHERE id = $1';
    var params = [
        jobid
    ];
    connect_(sql, params, function (err, rows) {
        if (err) {
            cb(err, null);
        } else {
            cb(null, rows[0]);
        }
    });
};

module.exports.createCiwebhooks = function (ci_project_id, url, cb) {
    var sql = '' +
        'INSERT INTO ci_web_hooks' +
        '(url, project_id,created_at,updated_at )' +
        'VALUES ($1, $2, now(),now()) RETURNING id';

    var params = [
        url,
        ci_project_id
    ];
    connect_(sql, params, cb);
};

module.exports.deleteCiwebhooks = function (ci_project_id, cb) {
    var sql = '' +
        'DELETE from ci_web_hooks ' +
        'WHERE project_id = $1';

    var params = [
        ci_project_id
    ];
    connect_(sql, params, cb);
};
