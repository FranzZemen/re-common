const join = require('path').join;
const gulpBase = require('@franzzemen/gulp-base').init(require('./package.json'), 100, true);
require('@franzzemen/gulp-base').setMainBranch('main');

const npmu = require('@franzzemen/npmu').npmu;

exports.npmu = (cb) => npmu([
  {
    path: join(__dirname, '../gulp-base'), packageName: '@franzzemen/gulp-base',
  }, {
    path: join(__dirname, '../gulp-base'), packageName: '@franzzemen/safe-config',
  }, {
    path: join(__dirname, '../gulp-base'), packageName: '@franzzemen/npmu',
  }, {
    path: join(__dirname, '../gulp-base'), packageName: '@franzzemen/app-utility',
  }])
  .then(() => {
    console.log('cb...');
    cb();
  });

exports.buildTest = gulpBase.buildTest;
exports.test = gulpBase.test;

exports.default = gulpBase.default;
exports.patch = gulpBase.patch;
exports.minor = gulpBase.minor;
exports.major = gulpBase.major;


exports.npmForceUpdateProject = gulpBase.npmForceUpdateProject;
