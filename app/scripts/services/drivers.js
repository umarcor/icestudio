angular
  .module('icestudio')
  .service('drivers', function (
    $rootScope,
    alerts,
    common,
    gettextCatalog,
    gui,
    nodeSudo,
    nodeChildProcess,
    profile,
    utils
  ) {
    'use strict';

    const _tcStr = function (str, args) {
      return gettextCatalog.getString(str, args);
    };

    this.enable = function () {
      switch (common.selectedBoard.info.interface) {
        case 'FTDI':
          enableDriversFTDI();
          break;
        case 'Serial':
          enableDriversSerial();
          break;
        default:
          console.warn('No valid selected board interface');
      }
    };

    this.disable = function () {
      switch (common.selectedBoard.info.interface) {
        case 'FTDI':
          disableDriversFTDI();
          break;
        case 'Serial':
          disableDriversSerial();
          break;
        default:
          console.warn('No valid selected board interface');
      }
    };

    function enableDriversFTDI() {
      if (common.WIN32) {
        enableWindowsDriversFTDI();
      } else if (common.DARWIN) {
        enableDarwinDriversFTDI();
      } else {
        enableLinuxDriversFTDI();
      }
    }

    function disableDriversFTDI() {
      if (common.WIN32) {
        disableWindowsDriversFTDI();
      } else if (common.DARWIN) {
        disableDarwinDriversFTDI();
      } else {
        disableLinuxDriversFTDI();
      }
    }

    function enableDriversSerial() {
      if (common.WIN32) {
        enableWindowsDriversSerial();
      } else if (common.DARWIN) {
        enableDarwinDriversSerial();
      } else {
        enableLinuxDriversSerial();
      }
    }

    function disableDriversSerial() {
      if (common.WIN32) {
        disableWindowsDriversSerial();
      } else if (common.DARWIN) {
        disableDarwinDriversSerial();
      } else {
        disableLinuxDriversSerial();
      }
    }

    this.preUpload = function (callback) {
      if (common.DARWIN) {
        preUploadDarwin(callback);
      } else if (callback) {
        callback();
      }
    };

    this.postUpload = function () {
      if (common.DARWIN) {
        postUploadDarwin();
      }
    };

    /*
     * Linux drivers
     */

    function enableLinuxDriversFTDI() {
      var rules = '';
      rules += 'ATTRS{idVendor}==\\"0403\\", ATTRS{idProduct}==\\"6010\\", ';
      rules += 'MODE=\\"0660\\", GROUP=\\"plugdev\\", TAG+=\\"uaccess\\"\n';
      rules += 'ATTRS{idVendor}==\\"0403\\", ATTRS{idProduct}==\\"6014\\", ';
      rules += 'MODE=\\"0660\\", GROUP=\\"plugdev\\", TAG+=\\"uaccess\\"';
      configureLinuxDrivers(
        ["echo '" + rules + "' > /etc/udev/rules.d/80-fpga-ftdi.rules"].concat(
          reloadRules()
        ),
        function () {
          alertify.success(_tcStr('Drivers enabled'));
        }
      );
    }

    function disableLinuxDriversFTDI() {
      configureLinuxDrivers(
        [
          'rm -f /etc/udev/rules.d/80-icestick.rules',
          'rm -f /etc/udev/rules.d/80-fpga-ftdi.rules',
        ].concat(reloadRules()),
        function () {
          alertify.warning(_tcStr('Drivers disabled'));
        }
      );
    }

    function enableLinuxDriversSerial() {
      var rules = '';
      rules += '# Disable ModemManager for BlackIce\n';
      rules +=
        'ATTRS{idVendor}==\\"0483\\", ATTRS{idProduct}==\\"5740\\", ENV{ID_MM_DEVICE_IGNORE}=\\"1\\"\n';
      rules += '# Disable ModemManager for TinyFPGA B2\n';
      rules +=
        'ATTRS{idVendor}==\\"1209\\", ATTRS{idProduct}==\\"2100\\", ENV{ID_MM_DEVICE_IGNORE}=\\"1\\"';
      rules += '# Disable ModemManager for TinyFPGA BX\n';
      rules +=
        'ATTRS{idVendor}==\\"1d50\\", ATTRS{idProduct}==\\"6130\\", ENV{ID_MM_DEVICE_IGNORE}=\\"1\\"';
      rules += '# Disable ModemManager for iceFUN\n';
      rules +=
        'ATTRS{idVendor}==\\"04d8\\", ATTRS{idProduct}==\\"ffee\\", ENV{ID_MM_DEVICE_IGNORE}=\\"1\\"';
      configureLinuxDrivers(
        [
          "echo '" + rules + "' > /etc/udev/rules.d/80-fpga-serial.rules",
        ].concat(reloadRules()),
        function () {
          alertify.success(_tcStr('Drivers enabled'));
        }
      );
    }

    function disableLinuxDriversSerial() {
      configureLinuxDrivers(
        ['rm -f /etc/udev/rules.d/80-fpga-serial.rules'].concat(reloadRules()),
        function () {
          alertify.warning(_tcStr('Drivers disabled'));
        }
      );
    }

    function reloadRules() {
      return [
        'udevadm control --reload-rules',
        'udevadm trigger',
        'service udev restart',
      ];
    }

    function configureLinuxDrivers(commands, callback) {
      var command = 'sh -c "' + commands.join('; ') + '"';
      utils.startWait();
      nodeSudo.exec(command, {name: 'Icestudio'}, function (
        error /*, stdout, stderr*/
      ) {
        utils.endWait();
        if (!error) {
          if (callback) {
            callback();
          }
          setTimeout(function () {
            alertify.message(
              _tcStr('<b>Unplug</b> and <b>reconnect</b> the board'),
              5
            );
          }, 1000);
        }
      });
    }

    /*
     * Darwin drivers
     */

    function enableDarwinDriversFTDI() {
      enableDarwinDrivers(['libftdi', 'libffi'], 'macosFTDIDrivers');
    }

    function disableDarwinDriversFTDI() {
      disableDarwinDrivers('macosFTDIDrivers');
    }

    function enableDarwinDriversSerial() {
      enableDarwinDrivers(['libusb', 'libffi']);
    }

    function disableDarwinDriversSerial() {
      disableDarwinDrivers();
    }

    function enableDarwinDrivers(brewPackages, profileSetting) {
      var brewCommands = ['/usr/local/bin/brew update'];
      for (var i in brewPackages) {
        brewCommands = brewCommands.concat(brewInstall(brewPackages[i]));
      }
      utils.startWait();
      if (typeof common.DEBUGMODE !== 'undefined' && common.DEBUGMODE === 1) {
        const fs = require('fs');
        fs.appendFileSync(common.LOGFILE, 'drivers.enableDarwinDrivers' + '\n');
      }
      nodeChildProcess.exec(brewCommands.join('; '), function (
        error,
        stdout,
        stderr
      ) {
        if (typeof common.DEBUGMODE !== 'undefined' && common.DEBUGMODE === 1) {
          const fs = require('fs');
          fs.appendFileSync(common.LOGFILE, 'STDERR ' + stderr + '\n');

          fs.appendFileSync(common.LOGFILE, 'STDERR ' + stdout + '\n');
        }
        if (error) {
          if (
            stderr.indexOf('brew: command not found') !== -1 ||
            stderr.indexOf('brew: No such file or directory') !== -1
          ) {
            alertify.warning(
              _tcStr('{{app}} is required.', {
                app: '<b>Homebrew</b>',
              }) +
                '<br>' +
                '<u>' +
                _tcStr('Click here to install it') +
                '</u>',
              30
            ).callback = function (isClicked) {
              if (isClicked) {
                gui.Shell.openExternal('https://brew.sh');
              }
            };
          } else if (stderr.indexOf('Error: Failed to download') !== -1) {
            alertify.error(_tcStr('Internet connection required'), 30);
          } else {
            alertify.error(stderr, 30);
          }
        } else {
          if (profileSetting) {
            profile.set(profileSetting, true);
          }
          alertify.success(_tcStr('Drivers enabled'));
        }
        utils.endWait();
      });
      if (typeof common.DEBUGMODE !== 'undefined' && common.DEBUGMODE === 1) {
        const fs = require('fs');
        fs.appendFileSync(
          common.LOGFILE,
          '/drivers.enableDarwinDrivers' + '\n'
        );
      }
    }

    function disableDarwinDrivers(profileSetting) {
      if (profileSetting) {
        profile.set(profileSetting, false);
      }
      alertify.warning(_tcStr('Drivers disabled'));
    }

    function brewInstall(brewPackage) {
      return [
        '/usr/local/bin/brew install --force ' + brewPackage,
        '/usr/local/bin/brew unlink ' + brewPackage,
        '/usr/local/bin/brew link --force ' + brewPackage,
      ];
    }

    var driverC = '';

    function preUploadDarwin(callback) {
      if (profile.get('macosFTDIDrivers')) {
        // Check and unload the Drivers
        var driverA = 'com.FTDI.driver.FTDIUSBSerialDriver';
        var driverB = 'com.apple.driver.AppleUSBFTDI';
        if (checkDriverDarwin(driverA)) {
          driverC = driverA;
          processDriverDarwin(driverA, false, callback);
        } else if (checkDriverDarwin(driverB)) {
          driverC = driverB;
          processDriverDarwin(driverB, false, callback);
        } else {
          driverC = '';
          if (callback) {
            callback();
          }
        }
      } else if (callback) {
        callback();
      }
    }

    function postUploadDarwin() {
      if (profile.get('macosFTDIDrivers')) {
        processDriverDarwin(driverC, true);
      }
    }

    function checkDriverDarwin(driver) {
      var output = nodeChildProcess.execSync('kextstat').toString();
      return output.indexOf(driver) > -1;
    }

    function processDriverDarwin(driver, load, callback) {
      if (driver) {
        var command = (load ? 'kextload' : 'kextunload') + ' -b ' + driver;
        nodeSudo.exec(
          command,
          {name: 'Icestudio'},
          function (/*error, stdout, stderr*/) {
            if (callback) {
              callback();
            }
          }
        );
      } else if (callback) {
        callback();
      }
    }

    /*
     * Windows drivers
     */

    function enableWindowsDriversFTDI() {
      alerts.confirm({
        title: _tcStr('FTDI driver installation instructions'),
        body:
          _tcStr(
            '<ol><li>Connect the FPGA board to the USB and wait until Windows finishes the default installation of the driver</li><li>When the OK button is clicked, the FTDI driver installer will be launched in a new window</li><li>In the installer, replace the <b>(Interface 0)</b> driver of the board by <b>libusbK</b></li><li>Unplug and reconnect the board</li></ol>'
          ) + _tcStr('It is recommended to use <b>USB 2.0</b> ports'),
        onok: () => {
          enableWindowsDrivers('ftdi');
        },
      });
    }

    function disableWindowsDriversFTDI() {
      alerts.confirm({
        title: _tcStr('FTDI driver uninstallation instructions'),
        body: _tcStr(
          '<ol><li>Find the FPGA USB Device</li><li>Select the board interface and uninstall the driver</li></ol>'
        ),
        onok: () => {
          disableWindowsDrivers('ftdi');
        },
      });
    }

    function enableWindowsDriversSerial() {
      alerts.confirm({
        title: _tcStr('Serial driver installation instructions'),
        body: _tcStr(
          '<ol><li>Connect the FPGA board to the USB and wait until Windows finishes the default installation of the driver</li><li>When the OK button is clicked, the Serial driver installer will be launched in a new window</li><li>In the installer, follow the steps to install the driver</li><li>Unplug and reconnect the board</li></ol>'
        ),
        onok: () => {
          enableWindowsDrivers('serial');
        },
      });
    }

    function disableWindowsDriversSerial() {
      alerts.confirm({
        title: _tcStr('Serial driver uninstallation instructions'),
        body: _tcStr(
          '<ol><li>Find the FPGA USB Device</li><li>Select the board interface and uninstall the driver</li></ol>'
        ),
        onok: () => {
          disableWindowsDrivers('serial');
        },
      });
    }

    function enableWindowsDrivers(type) {
      var option = '--' + type + '-enable';
      utils.startWait();
      nodeSudo.exec(
        [common.APIO_CMD, 'drivers', option].join(' '),
        {name: 'Icestudio'},
        function (error, stdout, stderr) {
          utils.endWait();
          if (stderr) {
            alertify.error(
              _tcStr('Toolchain not installed') +
                '.<br>' +
                _tcStr('Click here to install it'),
              30
            ).callback = function (isClicked) {
              if (isClicked) {
                $rootScope.$broadcast('installToolchain');
              }
            };
          } else if (!error) {
            alertify.message(
              _tcStr('<b>Unplug</b> and <b>reconnect</b> the board'),
              5
            );
          }
        }
      );
    }

    function disableWindowsDrivers(type) {
      var option = '--' + type + '-disable';
      utils.startWait();
      nodeChildProcess.exec(
        [common.APIO_CMD, 'drivers', option].join(' '),
        function (error, stdout, stderr) {
          utils.endWait();
          if (stderr) {
            alertify.error(
              _tcStr('Toolchain not installed') +
                '.<br>' +
                _tcStr('Click here to install it'),
              30
            ).callback = function (isClicked) {
              if (isClicked) {
                $rootScope.$broadcast('installToolchain');
              }
            };
          }
        }
      );
    }
  });
