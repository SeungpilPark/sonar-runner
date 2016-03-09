var conf = require('../../conf/configProvider.js').get();
var pg = require('pg');
var conString = 'postgres://' +
    conf['gitlab.ci.db.username'] +
    ':' +
    conf['gitlab.ci.db.pass'] +
    '@'
    + conf['gitlab.ci.db.host']
    + ':' + conf['gitlab.ci.db.port'] +
    '/' + conf['gitlab.ci.dbname'];


module.exports = function (query, params, cb) {
    try {
        pg.connect(conString, function (err, client, done) {
            if (err) {
                cb(err, null);
            }
            client.query(query, params, function (err, result) {
                //call `done()` to release the client back to the pool
                done();

                if (err) {
                    cb(err, null);
                }else{
                    cb(null, result);
                }

            });
        });
    } catch (e) {
        cb(e, null);
    }
}
