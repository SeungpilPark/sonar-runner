var jsonfile = require('jsonfile');
var conffile = __dirname + '/config.json'
var conf = jsonfile.readFileSync(conffile);

module.exports.get = function(){
    return conf;
}
