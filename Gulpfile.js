
const gulpBase = require('@franzzemen/gulp-base').init(require('./package.json'), 100, true);
require('@franzzemen/gulp-base').setMainBranch('main');


exports.buildTest = gulpBase.buildTest;
exports.test = gulpBase.test;

exports.default = gulpBase.default;
exports.patch = gulpBase.patch;
exports.minor = gulpBase.minor;
exports.major = gulpBase.major;


exports.npmForceUpdateProject = gulpBase.npmForceUpdateProject;
