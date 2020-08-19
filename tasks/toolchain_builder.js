// Toolchain builder

var fs = require('fs');
var fse = require('fs-extra');
var path = require('path');
var async = require('async');
var childProcess = require('child_process');
var _ = require('lodash');
var glob = require('glob');
var archiver = require('archiver');
var extract = require('extract-zip');
var inherits = require('inherits');
var EventEmitter = require('events').EventEmitter;

// We inherit from EventEmitter for logging
inherits(ToolchainBuilder, EventEmitter);
module.exports = ToolchainBuilder;
function ToolchainBuilder(options) {
  'use strict';
  var defaults = {
    apioMin: '',
    apioMax: '',
    buildDir: './build',
    cacheDir: './cache',
    extraPackages: [],
    platforms: ['linux32', 'linux64', 'win32', 'win64', 'osx64'],
  };

  // Assign options
  this.options = _.defaults(options, defaults);

  if (this.options.platforms.length === 0) {
    throw new Error('No platform to build!');
  }

  var venvRelease = 'virtualenv-16.7.10';

  // Prepare aux directories
  this.options.toolchainDir = path.join(this.options.cacheDir, 'toolchain');
  this.options.pythonPackagesDir = path.join(
    this.options.toolchainDir,
    'default-python-packages'
  );
  this.options.apioDir = path.join(this.options.toolchainDir, 'default-apio');
  this.options.apioPackagesDir = path.join(
    this.options.toolchainDir,
    'default-apio-packages'
  );

  this.options.venvExtractDir = path.join(
    this.options.toolchainDir,
    venvRelease
  );
  this.options.venvZipPath = path.join(
    'app',
    'resources',
    'virtualenv',
    venvRelease + '.zip'
  );

  this.options.venvDir = path.join(this.options.toolchainDir, 'venv');
  this.options.venvBinDir = path.join(
    this.options.venvDir,
    process.platform === 'win32' ? 'Scripts' : 'bin'
  );
  this.options.venvPip = path.join(this.options.venvBinDir, 'pip');
  this.options.venvApio = path.join(this.options.venvBinDir, 'apio');
}

ToolchainBuilder.prototype.build = function () {
  'use strict';
  this.emit('log', this.options.venvPip);
  // Let's create the standalone toolchains
  return (
    this.ensurePythonIsAvailable()
      .then(this.extractVirtualenv.bind(this))
      .then(this.createVirtualenv.bind(this))
      // .then(this.downloadPythonPackages.bind(this))
      // .then(this.packagePythonPackages.bind(this))
      .then(this.downloadApio.bind(this))
      .then(this.packageApio.bind(this))
      .then(this.installApio.bind(this))
      .then(this.downloadApioPackages.bind(this))
      .then(this.packageApioPackages.bind(this))
      .then(this.createDefaultToolchains.bind(this))
  );
};

ToolchainBuilder.prototype.ensurePythonIsAvailable = function () {
  'use strict';
  return new Promise(function (resolve, reject) {
    if (getPythonExecutable()) {
      resolve();
    } else {
      reject('Python 3.5/3.6/3.7/3.8 is not available');
    }
  });
};

ToolchainBuilder.prototype.extractVirtualenv = function () {
  'use strict';
  var self = this;
  self.emit('log', '> Extract virtualenv zip');
  return new Promise(function (resolve, reject) {
    var source = self.options.venvZipPath;
    var target = path.resolve(self.options.toolchainDir);
    extract(source, {dir: target}, function (error) {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
};

ToolchainBuilder.prototype.createVirtualenv = function () {
  'use strict';
  var self = this;
  self.emit('log', '> Create virtualenv');
  return new Promise(function (resolve, reject) {
    var command = [
      getPythonExecutable(),
      path.join(self.options.venvExtractDir, 'virtualenv.py'),
      self.options.venvDir,
    ];
    childProcess.exec(command.join(' '), function (error /*, stdout, stderr*/) {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
};

ToolchainBuilder.prototype.downloadPythonPackages = function () {
  'use strict';
  var self = this;
  self.emit('log', '> Download python packages');
  return new Promise(function (resolve, reject) {
    var pythonPackages = [];
    var command = [
      self.options.venvPip,
      'download',
      '--dest',
      self.options.pythonPackagesDir,
    ].concat(pythonPackages);
    childProcess.exec(command.join(' '), function (error /*, stdout, stderr*/) {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
};

ToolchainBuilder.prototype.packagePythonPackages = function () {
  'use strict';
  var self = this;
  self.emit('log', '> Package python packages');
  return new Promise(function (resolve, reject) {
    var source = self.options.pythonPackagesDir;
    var target = path.join(
      self.options.toolchainDir,
      'default-python-packages.zip'
    );
    compress(source, target, resolve, reject);
  });
};

ToolchainBuilder.prototype.downloadApio = function () {
  'use strict';
  var self = this;
  self.emit('log', '> Download apio');
  return new Promise(function (resolve, reject) {
    var versionRange =
      '">=' + self.options.apioMin + ',<' + self.options.apioMax + '"';
    var command = [
      self.options.venvPip,
      'download',
      '--dest',
      self.options.apioDir,
      'apio[' + self.options.extraPackages.toString() + ']' + versionRange,
    ];
    childProcess.exec(command.join(' '), function (error /*, stdout, stderr*/) {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
};

ToolchainBuilder.prototype.packageApio = function () {
  'use strict';
  var self = this;
  self.emit('log', '> Package apio');
  return new Promise(function (resolve, reject) {
    var source = self.options.apioDir;
    var target = path.join(self.options.toolchainDir, 'default-apio.zip');
    compress(source, target, resolve, reject);
  });
};

ToolchainBuilder.prototype.installApio = function () {
  'use strict';
  var self = this;
  self.emit('log', '> Install apio');
  return new Promise(function (resolve, reject) {
    glob(path.join(self.options.apioDir, '*.*'), {}, function (error, files) {
      if (error) {
        reject(error);
      } else {
        var command = [
          self.options.venvPip,
          'install',
          '-U',
          '--no-deps',
        ].concat(files);
        childProcess.exec(command.join(' '), function (
          error /*, stdout, stderr*/
        ) {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      }
    });
  });
};

ToolchainBuilder.prototype.downloadApioPackages = function () {
  'use strict';
  var self = this;
  self.emit('log', '> Download apio packages');
  return new Promise(function (resolve, reject) {
    function command(dest, platform) {
      var packages = [
        'system',
        'ice40',
        'yosys',
        'ecp5',
        'verilator',
        'iverilog',
        platform.startsWith('windows') ? 'drivers' : '',
        'scons',
      ];
      return [
        process.platform === 'win32' ? 'set' : 'export',
        'APIO_HOME_DIR=' + dest + (process.platform === 'win32' ? '&' : ';'),
        self.options.venvApio,
        'install',
        '--platform',
        platform,
      ].concat(packages);
    }
    self.pFound = [];
    self.options.platforms.forEach(function (platform) {
      var p = getRealPlatform(platform);
      if (p && self.pFound.indexOf(p) === -1) {
        self.pFound.push(p);
        self.emit('log', '  - ' + p);
        var cmd = command(path.join(self.options.apioPackagesDir, p), p);
        childProcess.execSync(cmd.join(' '), function (
          error /*, stdout, stderr*/
        ) {
          if (error) {
            reject(error);
          }
        });
      }
    });
    resolve();
  });
};

ToolchainBuilder.prototype.packageApioPackages = function () {
  'use strict';
  var self = this;
  self.emit('log', '> Package apio packages');
  return new Promise(function (resolve, reject) {
    self.pFound = [];
    async.eachSeries(
      self.options.platforms,
      function iteratee(platform, callback) {
        async.setImmediate(function () {
          var p = getRealPlatform(platform);
          if (p && self.pFound.indexOf(p) === -1) {
            self.pFound.push(p);
            self.emit('log', '  - ' + p);
            var source = path.join(self.options.apioPackagesDir, p);
            var target = path.join(
              self.options.toolchainDir,
              'default-apio-packages-' + p + '.zip'
            );
            compress(
              source,
              target,
              function () {
                callback();
              },
              reject
            );
          } else {
            callback();
          }
        });
      },
      function done() {
        resolve();
      }
    );
  });
};

ToolchainBuilder.prototype.createDefaultToolchains = function () {
  'use strict';
  var self = this;
  self.emit('log', '> Create default toolchains');
  return new Promise(function (resolve /*, reject*/) {
    self.options.platforms.forEach(function (platform) {
      self.emit('log', '  - ' + platform);
      var p = getRealPlatform(platform);
      var destPath = path.join(self.options.buildDir, 'icestudio', platform);
      if (platform === 'osx32' || platform === 'osx64') {
        destPath = path.join(
          destPath,
          'icestudio.app',
          'Contents',
          'Frameworks',
          'nwjs Helper.app',
          'Contents',
          'MacOS'
        );
      }
      // fse.copySync(
      //   path.join(self.options.toolchainDir, 'default-python-packages.zip'),
      //   path.join(destPath, 'toolchain', 'default-python-packages.zip')
      // );
      fse.copySync(
        path.join(self.options.toolchainDir, 'default-apio.zip'),
        path.join(destPath, 'toolchain', 'default-apio.zip')
      );
      fse.copySync(
        path.join(
          self.options.toolchainDir,
          'default-apio-packages-' + p + '.zip'
        ),
        path.join(destPath, 'toolchain', 'default-apio-packages.zip')
      );
    });
    resolve();
  });
};

// Auxiliar functions

var _pythonExecutableCached = null;
// Get the system executable
function getPythonExecutable() {
  'use strict';
  if (!_pythonExecutableCached) {
    const possibleExecutables = [];

    if (process.platform === 'win32') {
      possibleExecutables.push('C:\\Python38\\python.exe');
      possibleExecutables.push('C:\\Python37\\python.exe');
      possibleExecutables.push('C:\\Python36\\python.exe');
      possibleExecutables.push('C:\\Python35\\python.exe');
      possibleExecutables.push('python.exe');
    } else {
      possibleExecutables.push('/usr/local/Cellar/python/3.8.2/bin/python3');
      possibleExecutables.push('/usr/local/Cellar/python/3.7.7/bin/python3');

      possibleExecutables.push('/usr/bin/python3.8');
      possibleExecutables.push('/usr/bin/python3.7');
      possibleExecutables.push('/usr/bin/python3.6');
      possibleExecutables.push('/usr/bin/python3.5');
      possibleExecutables.push('/usr/bin/python3');
      possibleExecutables.push('/usr/bin/python');

      possibleExecutables.push('/usr/local/bin/python3.8');
      possibleExecutables.push('/usr/local/bin/python3.7');
      possibleExecutables.push('/usr/local/bin/python3.6');
      possibleExecutables.push('/usr/local/bin/python3.5');
      possibleExecutables.push('/usr/local/bin/python3');
      possibleExecutables.push('/usr/local/bin/python');

      possibleExecutables.push('python3.8');
      possibleExecutables.push('python3.7');
      possibleExecutables.push('python3.6');
      possibleExecutables.push('python3.5');
      possibleExecutables.push('python3');
      possibleExecutables.push('python');
    }

    for (var i in possibleExecutables) {
      var executable = possibleExecutables[i];
      if (isPython3(executable)) {
        _pythonExecutableCached = executable;
        break;
      }
    }
  }
  return _pythonExecutableCached;
}

function isPython3(executable) {
  'use strict';
  const args = ['-V'];
  try {
    const result = childProcess.spawnSync(executable, args);
    return (
      result !== false &&
      result !== null &&
      (result.stdout.toString().indexOf('3.5') >= 0 ||
        result.stdout.toString().indexOf('3.6') >= 0 ||
        result.stdout.toString().indexOf('3.7') >= 0 ||
        result.stdout.toString().indexOf('3.8') >= 0)
    );
  } catch (e) {
    return false;
  }
}

function getRealPlatform(platform) {
  'use strict';
  switch (platform) {
    case 'linux32':
      return 'linux_i686';
    case 'linux64':
      return 'linux_x86_64';
    case 'win32':
      return 'windows_x86';
    case 'win64':
      return 'windows_amd64';
    case 'osx32':
    case 'osx64':
      return 'darwin';
    default:
      return '';
  }
}

function compress(source, target, resolve, reject) {
  'use strict';
  var output = fs.createWriteStream(target);
  var archive = archiver.create('zip');

  output.on('close', function () {
    resolve();
  });

  output.on('error', function (err) {
    reject(err);
  });

  archive.on('error', function (err) {
    reject(err);
  });

  archive.pipe(output);
  archive.glob('**/*', {cwd: source});
  archive.finalize();
}
