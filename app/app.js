"use strict";

import {
  _,
  connectors,
  dia,
  g,
  routers,
  shapes,
  ui,
  util,
  V,
  alertify,
  fastCopy
} from './_vendor';

import * as fs from "fs";
import * as fse from "fs-extra";
//import * as nRmdir from "rmdir";
//const nRmdir = require("rmdir");
import * as sha1 from "sha1";
import * as nPath from "path";
import * as nodeChildProcess from "child_process";
import * as nodeSSHexec from "ssh-exec";
import * as nodeRSync from "rsyncwrapper";
import * as nodeSudo from "sudo-prompt";
import * as nodeOnline from "is-online";
import * as glob from "glob";
import * as nodeLangInfo from "node-lang-info";
import * as admZip from "adm-zip";
import * as nodeExtract from "extract-zip";
import * as nodeGettext from "angular-gettext-tools";
import * as nodeCP from "copy-paste";
import * as getos from "getos";
import * as tmp from "tmp";
import * as nodeDebounce from "lodash.debounce";

import "./resources/fonts/Lato2OFLWeb/Lato/latofonts.css";
import "./css/design.css";
import "./css/main.css";
import "./css/menu.css";
import "./css/version.css";
import "./resources/viewers/markdown/css/github-markdown.css";

//
//> libs/iceprofiler.js
//

var IceProfiler = function() {
  this.measures = {};
  this.stats = {};
  this.start = function(label) {
    this.measures[label] = { t0: performance.now(), t1: 0, elapsed: -1 };
  };
  this.end = function(label) {
    this.measures[label].t1 = performance.now();
    this.measures[label].elapsed =
      this.measures[label].t1 - this.measures[label].t0;
    if (typeof this.stats[label] === "undefined") {
      this.stats[label] = { acc: 0.0, n: 0 };
    }
    this.stats[label].acc += this.measures[label].elapsed;
    this.stats[label].n++;
  };
};

export var iprof = new IceProfiler();

//<

//
//> app.js
//

export const appModule = angular.module("hwstudio", [
  "ui.bootstrap",
  "ngRoute",
  "gettext"
]);

//<

//
//> factories/joint.js
//

//appModule.factory("joint", function() {
//  return joint;
//});

//<

//
//> factories/node.js
//

appModule
  .factory("nodeFs", function() {
    return fs;
  })
  .factory("nodeFse", function() {
    return fse;
  })
  .factory("nodeRmdir", function() {
    return require("rmdir");//nRmdir;
  })
  .factory("nodePath", function() {
    return nPath;
  })
  .factory("SVGO", function() {
    var config = {
      full: true,
      plugins: [
        "removeDoctype",
        "removeXMLProcInst",
        "removeComments",
        "removeMetadata",
        "removeXMLNS",
        "removeEditorsNSData",
        "cleanupAttrs",
        "minifyStyles",
        "convertStyleToAttrs",
        "cleanupIDs",
        "removeRasterImages",
        "removeUselessDefs",
        "cleanupNumericValues",
        "cleanupListOfValues",
        "convertColors",
        "removeUnknownsAndDefaults",
        "removeNonInheritableGroupAttrs",
        "removeUselessStrokeAndFill",
        "removeViewBox",
        "cleanupEnableBackground",
        "removeHiddenElems",
        "removeEmptyText",
        "convertShapeToPath",
        "moveElemsAttrsToGroup",
        "moveGroupAttrsToElems",
        "collapseGroups",
        "convertPathData",
        "convertTransform",
        "removeEmptyAttrs",
        "removeEmptyContainers",
        "mergePaths",
        "removeUnusedNS",
        "transformsWithOnePath",
        "sortAttrs",
        "removeTitle",
        "removeDesc",
        "removeDimensions",
        "removeAttrs",
        "removeElementsByAttr",
        "addClassesToSVGElement",
        "removeStyleElement",
        "removeStyleElement"
      ]
    };
    var SVGO = require("svgo");
    return new SVGO(config);
  });

//<

//
//> factories/window.js
//

appModule
  .factory("gui", function() {
    //return require('nw.gui');
    return window.require("nw.gui");
  })
  .factory("window", function() {
    //return require('nw.gui').Window;
    return window.require("nw.gui").Window;
  })
  .factory("_package", function() {
    return require('./package.json');
    //return JSON.parse(fs.readFileSync("package.json", 'utf8'));
  });

//<

//
//> services/common.js
//

appModule.service("common", function(nodePath) {
  // Project version
  this.VERSION = "1.2";
  // Project status
  this.hasChangesSinceBuild = false;
  // All project dependencies
  this.allDependencies = {};
  // Selected board
  this.boards = [];
  this.selectedBoard = null;
  this.pinoutInputHTML = "";
  this.pinoutOutputHTML = "";
  // Selected collection
  this.defaultCollection = null;
  this.internalCollections = [];
  this.externalCollections = [];
  this.selectedCollection = null;
  // FPGA resources
  this.FPGAResources = {
    ffs: "-",
    luts: "-",
    pios: "-",
    plbs: "-",
    brams: "-"
  };

  // Debug mode (uncomment)
  // this.DEBUGMODE = 1;

  // Command output
  this.commandOutput = "";
  // Apio URL
  this.APIO_PIP_VCS =
    "git+https://github.com/FPGAwars/apio.git@%BRANCH%#egg=apio";
  // OS
  this.LINUX = Boolean(process.platform.indexOf("linux") > -1);
  this.WIN32 = Boolean(process.platform.indexOf("win32") > -1);
  this.DARWIN = Boolean(process.platform.indexOf("darwin") > -1);
  // Paths
  this.LOCALE_DIR = nodePath.join("resources", "locale");
  this.SAMPLE_DIR = nodePath.join("resources", "sample");
  this.DEFAULT_COLLECTION_DIR = nodePath.resolve(
    nodePath.join("resources", "collection")
  );

  this.BASE_DIR = process.env.HOME || process.env.USERPROFILE;
  this.LOGFILE = nodePath.join(this.BASE_DIR, "hwstudio.log");
  this.ICESTUDIO_DIR = safeDir(nodePath.join(this.BASE_DIR, ".hwstudio"), this);
  this.INTERNAL_COLLECTIONS_DIR = nodePath.join(
    this.ICESTUDIO_DIR,
    "collections"
  );
  this.APIO_HOME_DIR = nodePath.join(this.ICESTUDIO_DIR, "apio");
  this.PROFILE_PATH = nodePath.join(this.ICESTUDIO_DIR, "profile.json");
  this.CACHE_DIR = nodePath.join(this.ICESTUDIO_DIR, ".cache");
  this.OLD_BUILD_DIR = nodePath.join(this.ICESTUDIO_DIR, ".build");

  this.VENV = "virtualenv-15.2.0";
  this.VENV_DIR = nodePath.join(this.CACHE_DIR, this.VENV);
  this.VENV_ZIP = nodePath.join("resources", "virtualenv", this.VENV + ".zip");

  this.APP_DIR = nodePath.dirname(process.execPath);
  this.TOOLCHAIN_DIR = nodePath.join(this.APP_DIR, "toolchain");

  this.DEFAULT_PYTHON_PACKAGES = "default-python-packages";
  this.DEFAULT_PYTHON_PACKAGES_DIR = nodePath.join(
    this.CACHE_DIR,
    this.DEFAULT_PYTHON_PACKAGES
  );
  this.DEFAULT_PYTHON_PACKAGES_ZIP = nodePath.join(
    this.TOOLCHAIN_DIR,
    this.DEFAULT_PYTHON_PACKAGES + ".zip"
  );

  this.DEFAULT_APIO = "default-apio";
  this.DEFAULT_APIO_DIR = nodePath.join(this.CACHE_DIR, this.DEFAULT_APIO);
  this.DEFAULT_APIO_ZIP = nodePath.join(
    this.TOOLCHAIN_DIR,
    this.DEFAULT_APIO + ".zip"
  );

  this.DEFAULT_APIO_PACKAGES = "default-apio-packages";
  this.DEFAULT_APIO_PACKAGES_ZIP = nodePath.join(
    this.TOOLCHAIN_DIR,
    this.DEFAULT_APIO_PACKAGES + ".zip"
  );

  this.ENV_DIR = nodePath.join(this.ICESTUDIO_DIR, "venv");
  this.ENV_BIN_DIR = nodePath.join(
    this.ENV_DIR,
    this.WIN32 ? "Scripts" : "bin"
  );
  this.ENV_PIP = nodePath.join(this.ENV_BIN_DIR, "pip");
  this.ENV_APIO = nodePath.join(
    this.ENV_BIN_DIR,
    this.WIN32 ? "apio.exe" : "apio"
  );
  this.APIO_CMD =
    (this.WIN32 ? "set" : "export") +
    " APIO_HOME_DIR=" +
    this.APIO_HOME_DIR +
    (this.WIN32 ? "& " : "; ") +
    '"' +
    this.ENV_APIO +
    '"';

  this.BUILD_DIR_OBJ = new tmp.dirSync({
    prefix: "hwstudio-",
    unsafeCleanup: true
  });
  this.BUILD_DIR = this.BUILD_DIR_OBJ.name;

  this.PATTERN_PORT_LABEL = /^([A-Za-z_][A-Za-z_$0-9]*)?(\[([0-9]+):([0-9]+)\])?$/;
  this.PATTERN_PARAM_LABEL = /^([A-Za-z_][A-Za-z_$0-9]*)?$/;

  this.PATTERN_GLOBAL_PORT_LABEL = /^([^\[\]]+)?(\[([0-9]+):([0-9]+)\])?$/;
  this.PATTERN_GLOBAL_PARAM_LABEL = /^([^\[\]]+)?$/;

  function safeDir(_dir, self) {
    if (self.WIN32) {
      // Put the env directory to the root of the current local disk when
      // default path contains non-ASCII characters. Virtualenv will fail to
      for (var i in _dir) {
        if (_dir[i].charCodeAt(0) > 127) {
          const _dirFormat = nodePath.parse(_dir);
          return nodePath.format({
            root: _dirFormat.root,
            dir: _dirFormat.root,
            base: ".hwstudio",
            name: ".hwstudio"
          });
        }
      }
    }
    return _dir;
  }

  this.showToolchain = function() {
    return (
      (this.selectedBoard && this.selectedBoard.info.interface !== "GPIO") ||
      false
    );
  };

  this.showDrivers = function() {
    return (
      (this.selectedBoard &&
        (this.selectedBoard.info.interface === "FTDI" ||
          this.selectedBoard.info.interface === "Serial")) ||
      false
    );
  };
  this.isEditingSubmodule = false;
});

//<

//
//> services/utils.js
//

appModule.service("utils", function(
  $rootScope,
  gettextCatalog,
  common,
  _package,
  window,
  nodeFs,
  nodeFse,
  nodePath,
  gui,
  SVGO
) {
  var _pythonExecutableCached = null;
  // Get the system executable
  this.getPythonExecutable = function() {
    if (!_pythonExecutableCached) {
      const possibleExecutables = [];

      if (common.WIN32) {
        possibleExecutables.push("python.exe");
        possibleExecutables.push("C:\\Python38\\python.exe");
        possibleExecutables.push("C:\\Python37\\python.exe");
        possibleExecutables.push("C:\\Python36\\python.exe");
        possibleExecutables.push("C:\\Python35\\python.exe");
      } else {
        possibleExecutables.push(
          "/Library/Frameworks/Python.framework/Versions/3.8/bin/python3.8"
        );
        possibleExecutables.push(
          "/Library/Frameworks/Python.framework/Versions/3.8/bin/python3"
        );
        possibleExecutables.push(
          "/Library/Frameworks/Python.framework/Versions/3.7/bin/python3.7"
        );
        possibleExecutables.push(
          "/Library/Frameworks/Python.framework/Versions/3.7/bin/python3"
        );
        possibleExecutables.push(
          "/Library/Frameworks/Python.framework/Versions/3.6/bin/python3.6"
        );
        possibleExecutables.push(
          "/Library/Frameworks/Python.framework/Versions/3.6/bin/python3"
        );
        possibleExecutables.push(
          "/Library/Frameworks/Python.framework/Versions/3.5/bin/python3.5"
        );
        possibleExecutables.push(
          "/Library/Frameworks/Python.framework/Versions/3.5/bin/python3"
        );
        possibleExecutables.push("python3.8");
        possibleExecutables.push("python3.7");
        possibleExecutables.push("python3.6");
        possibleExecutables.push("python3.5");
        possibleExecutables.push("python3");
        possibleExecutables.push("python");
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
  };

  function isPython3(executable) {
    executable += " -V";
    try {
      const result = nodeChildProcess.execSync(executable);
      return (
        result !== false &&
        result !== null &&
        (result.toString().indexOf("3.5") >= 0 ||
          result.toString().indexOf("3.6") >= 0 ||
          result.toString().indexOf("3.7") >= 0 ||
          result.toString().indexOf("3.8") >= 0)
      );
    } catch (e) {
      return false;
    }
  }

  this.extractZip = function(source, destination, callback) {
    nodeExtract(source, { dir: destination }, function(error) {
      if (error) {
        callback(true);
      } else {
        callback();
      }
    });
  };

  this.extractVirtualenv = function(callback) {
    this.extractZip(common.VENV_ZIP, common.CACHE_DIR, callback);
  };

  function disableEvent(event) {
    event.stopPropagation();
    event.preventDefault();
  }

  this.enableClickEvents = function() {
    document.removeEventListener("click", disableEvent, true);
  };

  this.disableClickEvents = function() {
    document.addEventListener("click", disableEvent, true);
  };

  this.enableKeyEvents = function() {
    document.removeEventListener("keyup", disableEvent, true);
    document.removeEventListener("keydown", disableEvent, true);
    document.removeEventListener("keypress", disableEvent, true);
  };

  this.disableKeyEvents = function() {
    document.addEventListener("keyup", disableEvent, true);
    document.addEventListener("keydown", disableEvent, true);
    document.addEventListener("keypress", disableEvent, true);
  };

  this.executeCommand = function(command, callback) {
    var cmd = command.join(" ");
    //const fs = require('fs');
    if (typeof common.DEBUGMODE !== "undefined" && common.DEBUGMODE === 1) {
      nodeFs.appendFileSync(
        common.LOGFILE,
        "utils.executeCommand=>" + cmd + "\n"
      );
    }
    nodeChildProcess.exec(
      cmd,
      function(error, stdout, stderr) {
        common.commandOutput = command.join(" ") + "\n\n" + stdout + stderr;
        $(document).trigger("commandOutputChanged", [common.commandOutput]);
        if (error) {
          this.enableKeyEvents();
          this.enableClickEvents();
          callback(true);
          alertify.error(error.message, 30);
        } else {
          callback();
        }
      }.bind(this)
    );
  };

  this.createVirtualenv = function(callback) {
    if (!nodeFs.existsSync(common.ICESTUDIO_DIR)) {
      nodeFs.mkdirSync(common.ICESTUDIO_DIR);
    }
    if (!nodeFs.existsSync(common.ENV_DIR)) {
      nodeFs.mkdirSync(common.ENV_DIR);
      var command = [
        this.getPythonExecutable(),
        coverPath(nodePath.join(common.VENV_DIR, "virtualenv.py")),
        coverPath(common.ENV_DIR)
      ];
      if (common.WIN32) {
        command.push("--always-copy");
      }
      this.executeCommand(command, callback);
    } else {
      callback();
    }
  };

  this.checkDefaultToolchain = function() {
    try {
      // TODO: use zip with sha1
      return nodeFs.statSync(common.TOOLCHAIN_DIR).isDirectory();
    } catch (err) {
      return false;
    }
  };

  this.installDefaultPythonPackagesDir = function(defaultDir, callback) {
    var self = this;
    glob(nodePath.join(defaultDir, "*.*"), {}, function(error, files) {
      if (!error) {
        files = files.map(function(item) {
          return coverPath(item);
        });
        self.executeCommand(
          [coverPath(common.ENV_PIP), "install", "-U", "--no-deps"].concat(
            files
          ),
          callback
        );
      }
    });
  };

  this.extractDefaultPythonPackages = function(callback) {
    this.extractZip(
      common.DEFAULT_PYTHON_PACKAGES_ZIP,
      common.DEFAULT_PYTHON_PACKAGES_DIR,
      callback
    );
  };

  this.installDefaultPythonPackages = function(callback) {
    this.installDefaultPythonPackagesDir(
      common.DEFAULT_PYTHON_PACKAGES_DIR,
      callback
    );
  };

  this.extractDefaultApio = function(callback) {
    this.extractZip(common.DEFAULT_APIO_ZIP, common.DEFAULT_APIO_DIR, callback);
  };

  this.installDefaultApio = function(callback) {
    this.installDefaultPythonPackagesDir(common.DEFAULT_APIO_DIR, callback);
  };

  this.extractDefaultApioPackages = function(callback) {
    this.extractZip(
      common.DEFAULT_APIO_PACKAGES_ZIP,
      common.APIO_HOME_DIR,
      callback
    );
  };

  this.isOnline = function(callback, error) {
    nodeOnline(
      {
        timeout: 5000
      },
      function(err, online) {
        if (online) {
          callback();
        } else {
          error();
          callback(true);
        }
      }
    );
  };

  this.installOnlinePythonPackages = function(callback) {
    var pythonPackages = [];
    this.executeCommand(
      [coverPath(common.ENV_PIP), "install", "-U"] + pythonPackages,
      callback
    );
  };

  this.installOnlineApio = function(callback) {
    var versionRange =
      '">=' + _package.apio.min + ",<" + _package.apio.max + '"';
    var extraPackages = _package.apio.extras || [];
    var apio = this.getApioInstallable();
    this.executeCommand(
      [
        coverPath(common.ENV_PIP),
        "install",
        "-U",
        apio + "[" + extraPackages.toString() + "]" + versionRange
      ],
      callback
    );
  };

  this.getApioInstallable = function() {
    return _package.apio.branch
      ? common.APIO_PIP_VCS.replace("%BRANCH%", _package.apio.branch)
      : "apio";
  };

  this.apioInstall = function(pkg, callback) {
    this.executeCommand([common.APIO_CMD, "install", pkg], callback);
  };

  this.toolchainDisabled = false;

  this.getApioExecutable = function() {
    var candidateApio = process.env.ICESTUDIO_APIO
      ? process.env.ICESTUDIO_APIO
      : _package.apio.external;
    if (nodeFs.existsSync(candidateApio)) {
      if (!this.toolchainDisabled) {
        // Show message only on start
        alertify.message("Using external apio: " + candidateApio, 5);
      }
      this.toolchainDisabled = true;
      return coverPath(candidateApio);
    }
    this.toolchainDisabled = false;
    return common.APIO_CMD;
  };

  this.removeToolchain = function() {
    this.deleteFolderRecursive(common.ENV_DIR);
    this.deleteFolderRecursive(common.CACHE_DIR);
    this.deleteFolderRecursive(common.APIO_HOME_DIR);
  };

  this.removeCollections = function() {
    this.deleteFolderRecursive(common.INTERNAL_COLLECTIONS_DIR);
  };

  this.deleteFolderRecursive = function(path) {
    if (nodeFs.existsSync(path)) {
      nodeFs.readdirSync(path).forEach(
        function(file /*, index*/) {
          var curPath = nodePath.join(path, file);
          if (nodeFs.lstatSync(curPath).isDirectory()) {
            // recursive
            this.deleteFolderRecursive(curPath);
          } else {
            // delete file
            nodeFs.unlinkSync(curPath);
          }
        }.bind(this)
      );
      nodeFs.rmdirSync(path);
    }
  };

  this.sep = nodePath.sep;

  this.basename = basename;
  function basename(filepath) {
    var b = nodePath.basename(filepath);
    return b.substr(0, b.lastIndexOf("."));
  }

  this.dirname = function(filepath) {
    return nodePath.dirname(filepath);
  };

  this.readFile = function(filepath) {
    return new Promise(function(resolve, reject) {
      if (nodeFs.existsSync(common.PROFILE_PATH)) {
        nodeFs.readFile(filepath, function(err, content) {
          if (err) {
            reject(err.toString());
          } else {
            var data = isJSON(content);
            if (data) {
              // JSON data
              resolve(data);
            } else {
              reject();
            }
          }
        });
      } else {
        resolve({});
      }
    });
  };

  this.saveFile = function(filepath, data) {
    return new Promise(function(resolve, reject) {
      var content = data;
      if (typeof data !== "string") {
        content = JSON.stringify(data, null, 2);
      }
      nodeFs.writeFile(filepath, content, function(err) {
        if (err) {
          reject(err.toString());
        } else {
          resolve();
        }
      });
    });
  };

  function isJSON(content) {
    try {
      return JSON.parse(content);
    } catch (e) {
      return false;
    }
  }

  this.findCollections = function(folder) {
    var collectionsPaths = [];
    try {
      if (folder) {
        collectionsPaths = nodeFs
          .readdirSync(folder)
          .map(function(name) {
            return nodePath.join(folder, name);
          })
          .filter(function(path) {
            return (
              (isDirectory(path) || isSymbolicLink(path)) &&
              isCollectionPath(path)
            );
          });
      }
    } catch (e) {
      console.warn(e);
    }
    return collectionsPaths;
  };

  function isCollectionPath(path) {
    var result = false;
    try {
      var content = nodeFs.readdirSync(path);
      result =
        content &&
        contains(content, "package.json") &&
        isFile(nodePath.join(path, "package.json")) &&
        ((contains(content, "blocks") &&
          isDirectory(nodePath.join(path, "blocks"))) ||
          (contains(content, "examples") &&
            isDirectory(nodePath.join(path, "examples"))));
    } catch (e) {
      console.warn(e);
    }
    return result;
  }

  function isFile(path) {
    return nodeFs.lstatSync(path).isFile();
  }
  function isDirectory(path) {
    return nodeFs.lstatSync(path).isDirectory();
  }
  function isSymbolicLink(path) {
    return nodeFs.lstatSync(path).isSymbolicLink();
  }
  function contains(array, item) {
    return array.indexOf(item) !== -1;
  }

  function getFilesRecursive(folder, level) {
    var fileTree = [];
    var validator = /.*\.(ice|json|md)$/;

    try {
      var content = nodeFs.readdirSync(folder);

      level--;

      content.forEach(function(name) {
        var path = nodePath.join(folder, name);

        if (isDirectory(path)) {
          fileTree.push({
            name: name,
            path: path,
            children: level >= 0 ? getFilesRecursive(path, level) : []
          });
        } else if (validator.test(name)) {
          fileTree.push({
            name: basename(name),
            path: path
          });
        }
      });
    } catch (e) {
      console.warn(e);
    }

    return fileTree;
  }

  this.getFilesRecursive = getFilesRecursive;

  this.setLocale = function(locale, callback) {
    // Update current locale format
    locale = splitLocale(locale);
    // Load supported languages
    var supported = getSupportedLanguages();
    // Set the best matching language
    var bestLang = bestLocale(locale, supported);
    gettextCatalog.setCurrentLanguage(bestLang);
    // Application strings
    gettextCatalog.loadRemote(
      nodePath.join(common.LOCALE_DIR, bestLang, bestLang + ".json")
    );
    // Collections strings
    var collections = [common.defaultCollection]
      .concat(common.internalCollections)
      .concat(common.externalCollections);
    for (var c in collections) {
      var collection = collections[c];
      var filepath = nodePath.join(
        collection.path,
        "locale",
        bestLang,
        bestLang + ".json"
      );
      if (nodeFs.existsSync(filepath)) {
        gettextCatalog.loadRemote("file://" + filepath);
      }
    }
    if (callback) {
      setTimeout(function() {
        callback();
      }, 50);
    }
    // Return the best language
    return bestLang;
  };

  function splitLocale(locale) {
    var ret = {};
    var list = locale.split("_");
    if (list.length > 0) {
      ret.lang = list[0];
    }
    if (list.length > 1) {
      ret.country = list[1];
    }
    return ret;
  }

  function getSupportedLanguages() {
    var supported = [];
    nodeFs
      .readdirSync(common.LOCALE_DIR)
      .forEach(function(element /*, index*/) {
        var curPath = nodePath.join(common.LOCALE_DIR, element);
        if (nodeFs.lstatSync(curPath).isDirectory()) {
          supported.push(splitLocale(element));
        }
      });
    return supported;
  }

  function bestLocale(locale, supported) {
    var i;
    // 1. Try complete match
    if (locale.country) {
      for (i = 0; i < supported.length; i++) {
        if (
          locale.lang === supported[i].lang &&
          locale.country === supported[i].country
        ) {
          return supported[i].lang + "_" + supported[i].country;
        }
      }
    }
    // 2. Try lang match
    for (i = 0; i < supported.length; i++) {
      if (locale.lang === supported[i].lang) {
        return (
          supported[i].lang +
          (supported[i].country ? "_" + supported[i].country : "")
        );
      }
    }
    // 3. Return default lang
    return "en";
  }

  this.renderForm = function(specs, callback) {
    var content = [];
    content.push("<div>");
    for (var i in specs) {
      var spec = specs[i];
      switch (spec.type) {
        case "text":
          content.push(
            "\
              <p>" +
              spec.title +
              '</p>\
              <input class="ajs-input" type="text" id="form' +
              i +
              '"/>\
            '
          );
          break;
        case "checkbox":
          content.push(
            '\
              <div class="checkbox">\
                <label><input type="checkbox" ' +
              (spec.value ? "checked" : "") +
              ' id="form' +
              i +
              '"/>' +
              spec.label +
              "</label>\
              </div>\
            "
          );
          break;
        case "combobox":
          var options = spec.options
            .map(function(option) {
              var selected = spec.value === option.value ? " selected" : "";
              return (
                '<option value="' +
                option.value +
                '"' +
                selected +
                ">" +
                option.label +
                "</option>"
              );
            })
            .join("");
          content.push(
            '\
              <div class="form-group">\
                <label style="font-weight:normal">' +
              spec.label +
              '</label>\
                <select class="form-control" id="form' +
              i +
              '">\
                  ' +
              options +
              "\
                </select>\
              </div>\
            "
          );
          break;
      }
    }
    content.push("</div>");
    alertify
      .confirm(content.join("\n"))
      .set("onok", function(evt) {
        var values = [];
        if (callback) {
          for (var i in specs) {
            var spec = specs[i];
            switch (spec.type) {
              case "text":
              case "combobox":
                values.push($("#form" + i).val());
                break;
              case "checkbox":
                values.push($("#form" + i).prop("checked"));
                break;
            }
          }
          callback(evt, values);
        }
      })
      .set("oncancel", function(/*evt*/) {});
    // Restore input values
    setTimeout(function() {
      $("#form0").select();
      for (var i in specs) {
        var spec = specs[i];
        switch (spec.type) {
          case "text":
          case "combobox":
            $("#form" + i).val(spec.value);
            break;
          case "checkbox":
            $("#form" + i).prop("checked", spec.value);
            break;
        }
      }
    }, 50);
  };

  this.projectinfoprompt = function(values, callback) {
    var i;
    var content = [];
    var messages = [
      gettextCatalog.getString("Name"),
      gettextCatalog.getString("Version"),
      gettextCatalog.getString("Description"),
      gettextCatalog.getString("Author")
    ];
    var n = messages.length;
    var image = values[4];
    var blankImage =
      "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
    content.push("<div>");
    for (i in messages) {
      if (i > 0) {
        //content.push('<br>');
      }
      content.push("  <p>" + messages[i] + "</p>");
      content.push(
        '  <input class="ajs-input" id="input' +
          i +
          '" type="text" value="' +
          values[i] +
          '">'
      );
    }
    content.push("  <p>" + gettextCatalog.getString("Image") + "</p>");
    content.push(
      '  <input id="input-open-svg" type="file" accept=".svg" class="hidden">'
    );
    content.push(
      '  <input id="input-save-svg" type="file" accept=".svg" class="hidden" nwsaveas="image.svg">'
    );
    content.push("  <div>");
    content.push(
      '  <img id="preview-svg" class="ajs-input" src="' +
        (image ? "data:image/svg+xml," + image : blankImage) +
        '" height="68" style="pointer-events:none">'
    );
    content.push("  </div>");
    content.push("  <div>");
    content.push(
      '    <label for="input-open-svg" class="btn">' +
        gettextCatalog.getString("Open SVG") +
        "</label>"
    );
    content.push(
      '    <label id="save-svg" for="input-save-svg" class="btn">' +
        gettextCatalog.getString("Save SVG") +
        "</label>"
    );
    content.push(
      '    <label id="reset-svg" class="btn">' +
        gettextCatalog.getString("Reset SVG") +
        "</label>"
    );
    content.push("  </div>");
    content.push("</div>");
    // Restore values
    for (i = 0; i < n; i++) {
      $("#input" + i).val(values[i]);
    }
    if (image) {
      $("#preview-svg").attr("src", "data:image/svg+xml," + image);
    } else {
      $("#preview-svg").attr("src", blankImage);
    }

    var prevOnshow = alertify.confirm().get("onshow") || function() {};

    alertify.confirm().set("onshow", function() {
      prevOnshow();
      registerOpen();
      registerSave();
      registerReset();
    });

    function registerOpen() {
      // Open SVG
      var chooserOpen = $("#input-open-svg");
      chooserOpen.unbind("change");
      chooserOpen.change(function(/*evt*/) {
        var filepath = $(this).val();

        nodeFs.readFile(filepath, "utf8", function(err, data) {
          if (err) {
            throw err;
          }
          optimizeSVG(data, function(result) {
            image = encodeURI(result.data);
            registerSave();
            $("#preview-svg").attr("src", "data:image/svg+xml," + image);
          });
        });
        $(this).val("");
      });
    }

    function optimizeSVG(data, callback) {
      SVGO.optimize(data, callback);
    }

    function registerSave() {
      // Save SVG
      var label = $("#save-svg");
      if (image) {
        label.removeClass("disabled");
        label.attr("for", "input-save-svg");
        var chooserSave = $("#input-save-svg");
        chooserSave.unbind("change");
        chooserSave.change(function(/*evt*/) {
          if (image) {
            var filepath = $(this).val();
            if (!filepath.endsWith(".svg")) {
              filepath += ".svg";
            }
            nodeFs.writeFile(filepath, decodeURI(image), function(err) {
              if (err) {
                throw err;
              }
            });
            $(this).val("");
          }
        });
      } else {
        label.addClass("disabled");
        label.attr("for", "");
      }
    }

    function registerReset() {
      // Reset SVG
      var reset = $("#reset-svg");
      reset.click(function(/*evt*/) {
        image = "";
        registerSave();
        $("#preview-svg").attr("src", blankImage);
      });
    }

    alertify
      .confirm(content.join("\n"))
      .set("onok", function(evt) {
        var values = [];
        for (var i = 0; i < n; i++) {
          values.push($("#input" + i).val());
        }
        values.push(image);
        if (callback) {
          callback(evt, values);
        }
        // Restore onshow
        alertify.confirm().set("onshow", prevOnshow);
      })
      .set("oncancel", function(/*evt*/) {
        // Restore onshow
        alertify.confirm().set("onshow", prevOnshow);
      });
  };

  this.selectBoardPrompt = function(callback) {
    // Disable user events
    this.disableKeyEvents();
    // Hide Cancel button
    $(".ajs-cancel").addClass("hidden");

    var formSpecs = [
      {
        type: "combobox",
        label: gettextCatalog.getString("Select your board"),
        value: "",
        options: common.boards.map(function(board) {
          return {
            value: board.name,
            label: board.info.label
          };
        })
      }
    ];

    this.renderForm(
      formSpecs,
      function(evt, values) {
        var selectedBoard = values[0];
        if (selectedBoard) {
          evt.cancel = false;
          if (callback) {
            callback(selectedBoard);
          }
          // Enable user events
          this.enableKeyEvents();
          // Restore Cancel button
          setTimeout(function() {
            $(".ajs-cancel").removeClass("hidden");
          }, 200);
        } else {
          evt.cancel = true;
        }
      }.bind(this)
    );
  };

  this.copySync = function(orig, dest) {
    var ret = true;
    try {
      if (nodeFs.existsSync(orig)) {
        nodeFse.copySync(orig, dest);
      } else {
        // Error: file does not exist
        ret = false;
      }
    } catch (e) {
      alertify.error(
        gettextCatalog.getString("Error: {{error}}", { error: e.toString() }),
        30
      );
      ret = false;
    }
    return ret;
  };

  this.findIncludedFiles = function(code) {
    var ret = [];
    var patterns = [
      /[\n|\s]\/\/\s*@include\s+([^\s]*\.(v|vh))(\n|\s)/g,
      /[\n|\s][^\/]?\"(.*\.list?)\"/g
    ];
    for (var p in patterns) {
      var match;
      while ((match = patterns[p].exec(code))) {
        var file = match[1].replace(/ /g, "");
        if (ret.indexOf(file) === -1) {
          ret.push(file);
        }
      }
    }
    return ret;
  };

  this.bold = function(text) {
    return "<b>" + text + "</b>";
  };

  this.openDialog = function(inputID, ext, callback) {
    var chooser = $(inputID);
    chooser.unbind("change");
    chooser.change(function(/*evt*/) {
      var filepath = $(this).val();
      //if (filepath.endsWith(ext)) {
      if (callback) {
        callback(filepath);
      }
      //}
      $(this).val("");
    });
    chooser.trigger("click");
  };

  this.saveDialog = function(inputID, ext, callback) {
    var chooser = $(inputID);
    chooser.unbind("change");
    chooser.change(function(/*evt*/) {
      var filepath = $(this).val();
      if (!filepath.endsWith(ext)) {
        filepath += ext;
      }
      if (callback) {
        callback(filepath);
      }
      $(this).val("");
    });
    chooser.trigger("click");
  };

  this.updateWindowTitle = function(title) {
    window.get().title = title;
  };

  this.rootScopeSafeApply = function() {
    if (!$rootScope.$$phase) {
      $rootScope.$apply();
    }
  };

  this.parsePortLabel = function(data, pattern) {
    // e.g: name[x:y]
    var match,
      ret = {};
    var maxSize = 95;
    pattern = pattern || common.PATTERN_PORT_LABEL;
    match = pattern.exec(data);
    if (match && match[0] === match.input) {
      ret.name = match[1] ? match[1] : "";
      ret.rangestr = match[2];
      if (match[2]) {
        if (match[3] > maxSize || match[4] > maxSize) {
          alertify.warning(
            gettextCatalog.getString("Maximum bus size: 96 bits"),
            5
          );
          return null;
        } else {
          if (match[3] > match[4]) {
            ret.range = _.range(match[3], parseInt(match[4]) - 1, -1);
          } else {
            ret.range = _.range(match[3], parseInt(match[4]) + 1, +1);
          }
        }
      }
      return ret;
    }
    return null;
  };

  this.parseParamLabel = function(data, pattern) {
    // e.g: name
    var match,
      ret = {};
    pattern = pattern || common.PATTERN_PARAM_LABEL;
    match = pattern.exec(data);
    if (match && match[0] === match.input) {
      ret.name = match[1] ? match[1] : "";
      return ret;
    }
    return null;
  };

  this.clone = function(data) {
    // Very slow in comparison but more stable for all types
    // of objects, if fails, rollback to JSON method or try strict
    // on fast-copy module
    //return  JSON.parse(JSON.stringify(data));
    return fastCopy(data);
  };

  this.dependencyID = function(dependency) {
    if (dependency.package && dependency.design) {
      return sha1(
        JSON.stringify(dependency.package) + JSON.stringify(dependency.design)
      );
    }
  };

  this.newWindow = function(filepath, local) {
    var params =
      typeof filepath !== "undefined" ? { filepath: filepath } : false;

    if (typeof local !== "undefined" && local === true) {
      if (params === false) {
        params = {};
      }
      params.local = "local";
    }
    // To pass parameters to the new project window, we use de GET parameter "hwstudio_argv"
    // that contains the same arguments that shell call, in this way the two calls will be
    // compatible.
    // If in the future you will add more paremeters to the new window , you should review
    // scripts/controllers/menu.js even if all parameters that arrive are automatically parse

    var url =
      "index.html" +
      (params === false
        ? ""
        : "?hwstudio_argv=" + encodeURI(btoa(JSON.stringify(params))));
    // Create a new window and get it.
    // new-instance and new_instance are necesary for OS compatibility
    // to avoid crash on new window project after close parent
    // (little trick for nwjs bug).
    //url='index.html?hwstudio_argv=fsdfsfa';

    gui.Window.open(url, {
      // new_instance: true,  //Deprecated for new nwjs versios
      //      'new_instance': true,  //Deprecated for new nwjs versios
      position: "center",
      //        'toolbar': false,   //Deprecated for new nwjs versios
      width: 900,
      height: 600,
      show: true
    });
  };

  this.coverPath = coverPath;
  function coverPath(filepath) {
    return '"' + filepath + '"';
  }

  this.mergeDependencies = function(type, block) {
    if (type in common.allDependencies) {
      return; // If the block is already in dependencies
    }
    // Merge the block's dependencies
    var deps = block.dependencies;
    for (var depType in deps) {
      if (!(depType in common.allDependencies)) {
        common.allDependencies[depType] = deps[depType];
      }
    }
    // Add the block as a dependency
    delete block.dependencies;
    common.allDependencies[type] = block;
  };

  this.copyToClipboard = function(selection, graph) {
    var cells = selectionToCells(selection, graph);
    var clipboard = {
      hwstudio: this.cellsToProject(cells, graph)
    };

    // Send the clipboard object the global clipboard as a string
    nodeCP.copy(JSON.stringify(clipboard), function() {
      // Success
    });
  };

  this.pasteFromClipboard = function(callback) {
    nodeCP.paste(function(err, text) {
      if (err) {
        if (common.LINUX) {
          // xclip installation message
          var cmd = "";
          var message = gettextCatalog.getString("{{app}} is required.", {
            app: "<b>xclip</b>"
          });
          getos(function(e, os) {
            if (!e) {
              if (
                os.dist.indexOf("Debian") !== -1 ||
                os.dist.indexOf("Ubuntu Linux") !== -1 ||
                os.dist.indexOf("Linux Mint") !== -1
              ) {
                cmd = "sudo apt-get install xclip";
              } else if (os.dist.indexOf("Fedora")) {
                cmd = "sudo dnf install xclip";
              } else if (
                os.dist.indexOf("RHEL") !== -1 ||
                os.dist.indexOf("RHAS") !== -1 ||
                os.dist.indexOf("Centos") !== -1 ||
                os.dist.indexOf("Red Hat Linux") !== -1
              ) {
                cmd = "sudo yum install xclip";
              } else if (os.dist.indexOf("Arch Linux") !== -1) {
                cmd = "sudo pacman install xclip";
              }
              if (cmd) {
                message +=
                  " " +
                  gettextCatalog.getString("Please run: {{cmd}}", {
                    cmd: "<br><b><code>" + cmd + "</code></b>"
                  });
              }
            }
            alertify.warning(message, 30);
          });
        }
      } else {
        // Parse the global clipboard
        var clipboard = JSON.parse(text);
        if (callback && clipboard && clipboard.hwstudio) {
          callback(clipboard.hwstudio);
        }
      }
    });
  };

  function selectionToCells(selection, graph) {
    var cells = [];
    var blocksMap = {};
    selection.each(function(block) {
      // Add block
      cells.push(block.attributes);
      // Map blocks
      blocksMap[block.id] = block;
      // Add connected wires
      var processedWires = {};
      var connectedWires = graph.getConnectedLinks(block);
      _.each(connectedWires, function(wire) {
        if (processedWires[wire.id]) {
          return;
        }

        var source = blocksMap[wire.get("source").id];
        var target = blocksMap[wire.get("target").id];

        if (source && target) {
          cells.push(wire.attributes);
          processedWires[wire.id] = true;
        }
      });
    });
    return cells;
  }

  this.cellsToProject = function(cells, opt) {
    // Convert a list of cells into the following sections of a project:
    // - design.graph
    // - dependencies

    var blocks = [];
    var wires = [];
    var p = {
      version: common.VERSION,
      design: {},
      dependencies: {}
    };

    opt = opt || {};

    for (var c = 0; c < cells.length; c++) {
      var cell = cells[c];

      if (
        cell.type === "ice.Generic" ||
        cell.type === "ice.Input" ||
        cell.type === "ice.Output" ||
        cell.type === "ice.Code" ||
        cell.type === "ice.Info" ||
        cell.type === "ice.Constant" ||
        cell.type === "ice.Memory"
      ) {
        var block = {};
        block.id = cell.id;
        block.type = cell.blockType;
        block.data = cell.data;
        block.position = cell.position;
        if (
          cell.type === "ice.Generic" ||
          cell.type === "ice.Code" ||
          cell.type === "ice.Info" ||
          cell.type === "ice.Memory"
        ) {
          block.size = cell.size;
        }
        blocks.push(block);
      } else if (cell.type === "ice.Wire") {
        var wire = {};
        wire.source = { block: cell.source.id, port: cell.source.port };
        wire.target = { block: cell.target.id, port: cell.target.port };
        wire.vertices = cell.vertices;
        wire.size = cell.size > 1 ? cell.size : undefined;
        wires.push(wire);
      }
    }

    p.design.board = common.selectedBoard.name;
    p.design.graph = { blocks: blocks, wires: wires };

    // Update dependencies
    if (opt.deps !== false) {
      var types = this.findSubDependencies(p, common.allDependencies);
      for (var t in types) {
        p.dependencies[types[t]] = common.allDependencies[types[t]];
      }
    }

    return p;
  };

  this.findSubDependencies = function(dependency) {
    var subDependencies = [];
    if (dependency) {
      var blocks = dependency.design.graph.blocks;
      for (var i in blocks) {
        var type = blocks[i].type;
        if (type.indexOf("basic.") === -1) {
          subDependencies.push(type);
          var newSubDependencies = this.findSubDependencies(
            common.allDependencies[type]
          );
          subDependencies = subDependencies.concat(newSubDependencies);
        }
      }
      return _.unique(subDependencies);
    }
    return subDependencies;
  };

  this.hasInputRule = function(port, apply) {
    apply = apply === undefined ? true : apply;
    var _default;
    var rules = common.selectedBoard.rules;
    if (rules) {
      var allInitPorts = rules.input;
      if (allInitPorts) {
        for (var i in allInitPorts) {
          if (port === allInitPorts[i].port) {
            _default = allInitPorts[i];
            _default.apply = apply;
            break;
          }
        }
      }
    }
    return _.clone(_default);
  };

  this.hasLeftButton = function(evt) {
    return evt.which === 1;
  };
  this.hasMiddleButton = function(evt) {
    return evt.which === 2;
  };
  this.hasRightButton = function(evt) {
    return evt.which === 3;
  };
  this.hasButtonPressed = function(evt) {
    return evt.which !== 0;
  };
  this.hasShift = function(evt) {
    return evt.shiftKey;
  };
  this.hasCtrl = function(evt) {
    return evt.ctrlKey;
  };
  this.loadProfile = function(profile, callback) {
    profile.load(function() {
      if (callback) {
        callback();
      }
    });
  };

  this.loadLanguage = function(profile, callback) {
    var lang = profile.get("language");
    if (lang) {
      this.setLocale(lang, callback);
    } else {
      // If lang is empty, use the system language
      nodeLangInfo(
        function(err, sysLang) {
          if (!err) {
            profile.set("language", this.setLocale(sysLang, callback));
          }
        }.bind(this)
      );
    }
  };

  this.digestId = function(id) {
    if (id.indexOf("-") !== -1) {
      id = sha1(id).toString();
    }
    return "v" + id.substring(0, 6);
  };

  this.beginBlockingTask = function() {
    angular.element("#menu").addClass("is-disabled");
    $("body").addClass("waiting");
  };

  this.endBlockingTask = function() {
    angular.element("#menu").removeClass("is-disabled");
    $("body").removeClass("waiting");
  };

  this.isFunction = function(functionToCheck) {
    return (
      functionToCheck &&
      {}.toString.call(functionToCheck) === "[object Function]"
    );
  };

  this.openDevToolsUI = function() {
    gui.Window.get().showDevTools();
  };
  this.openUrlExternalBrowser = function(url) {
    gui.Shell.openExternal(url);
    //require('nw.gui').Shell.openExternal( url);
  };
});

//<

//
//> services/profile.js
//

appModule.service("profile", function(utils, common, nodeFs) {
  this.data = {
    board: "",
    boardRules: true,
    collection: "",
    externalCollections: "",
    language: "",
    remoteHostname: "",
    showFPGAResources: false,
    displayVersionInfoWindow: "yes"
  };

  if (common.DARWIN) {
    this.data['macosFTDIDrivers'] = false;
  }

  this.load = function (callback) {
    var self = this;
    utils.readFile(common.PROFILE_PATH)
      .then(function (data) {
        self.data = {
          'board': data.board || '',
          'boardRules': data.boardRules !== false,
          'collection': data.collection || '',
          'language': data.language || '',
          'externalCollections': data.externalCollections || '',
          'remoteHostname': data.remoteHostname || '',
          'showFPGAResources': data.showFPGAResources || false
        };
        if (common.DARWIN) {
          self.data['macosFTDIDrivers'] = data.macosFTDIDrivers || false;
        }
        if (callback) {
          callback();
        }
      })
      .catch(function (error) {
        console.warn(error);
        if (callback) {
          callback();
        }
      });
  };

  this.set = function (key, value) {
    if (this.data.hasOwnProperty(key)) {
      this.data[key] = value;
      this.save();
    }
  };

  this.get = function (key) {
    return this.data[key];
  };

  this.save = function () {
    if (!nodeFs.existsSync(common.ICESTUDIO_DIR)) {
      nodeFs.mkdirSync(common.ICESTUDIO_DIR);
    }
    utils.saveFile(common.PROFILE_PATH, this.data)
      .then(function () {
        // Success
      })
      .catch(function (error) {
        alertify.error(error, 30);
      });
  };
});


//<

//
//> services/boards.js
//

appModule.service("boards", function(utils, common, nodeFs, nodePath) {
  const DEFAULT = "icezum";

  this.loadBoards = function() {
    var boards = [];
    var path = nodePath.join("resources", "boards");
    var menu = nodeFs.readFileSync(nodePath.join(path, "menu.json"));
    JSON.parse(menu).forEach(function(section) {
      section.boards.forEach(function(name) {
        var contentPath = nodePath.join(path, name);
        if (nodeFs.statSync(contentPath).isDirectory()) {
          var info = readJSONFile(contentPath, "info.json");
          var pinout = readJSONFile(contentPath, "pinout.json");
          var rules = readJSONFile(contentPath, "rules.json");
          boards.push({
            name: name,
            info: info,
            pinout: pinout,
            rules: rules,
            type: section.type
          });
        }
      });
    });
    common.boards = boards;
  };

  function readJSONFile(filepath, filename) {
    var ret = {};
    try {
      var data = nodeFs.readFileSync(nodePath.join(filepath, filename));
      ret = JSON.parse(data);
    } catch (err) {}
    return ret;
  }

  this.selectBoard = function(name) {
    name = name || DEFAULT;
    var i;
    var selectedBoard = null;
    for (i in common.boards) {
      if (common.boards[i].name === name) {
        selectedBoard = common.boards[i];
        break;
      }
    }
    if (selectedBoard === null) {
      // Board not found: select default board
      for (i in common.boards) {
        if (common.boards[i].name === DEFAULT) {
          selectedBoard = common.boards[i];
          break;
        }
      }
    }
    common.selectedBoard = selectedBoard;
    common.pinoutInputHTML = generateHTMLOptions(
      common.selectedBoard.pinout,
      "input"
    );
    common.pinoutOutputHTML = generateHTMLOptions(
      common.selectedBoard.pinout,
      "output"
    );
    utils.rootScopeSafeApply();
    return common.selectedBoard;
  };

  this.boardLabel = function(name) {
    for (var i in common.boards) {
      if (common.boards[i].name === name) {
        return common.boards[i].info.label;
      }
    }
    return name;
  };

  function generateHTMLOptions(pinout, type) {
    var code = "<option></option>";
    for (var i in pinout) {
      if (pinout[i].type === type || pinout[i].type === "inout") {
        code +=
          '<option value="' +
          pinout[i].value +
          '">' +
          pinout[i].name +
          "</option>";
      }
    }
    return code;
  }
});

//<

//
//> services/blocks.js
//

appModule.service("blocks", function(utils, common, gettextCatalog) {
  var gridsize = 8;
  var resultAlert = null;

  this.newBasic = newBasic;
  this.newGeneric = newGeneric;

  this.loadBasic = loadBasic;
  this.loadGeneric = loadGeneric;
  this.loadWire = loadWire;

  this.editBasic = editBasic;

  //-- New

  function newBasic(type, callback) {
    switch (type) {
      case "basic.input":
        newBasicInput(callback);
        break;
      case "basic.output":
        newBasicOutput(callback);
        break;
      case "basic.outputLabel":
        newBasicOutputLabel(callback);
        break;
      case "basic.inputLabel":
        newBasicInputLabel(callback);
        break;

      case "basic.constant":
        newBasicConstant(callback);
        break;
      case "basic.memory":
        newBasicMemory(callback);
        break;
      case "basic.code":
        newBasicCode(callback);
        break;
      case "basic.info":
        newBasicInfo(callback);
        break;
      default:
        break;
    }
  }

  function newBasicOutputLabel(callback) {
    var blockInstance = {
      id: null,
      data: {},
      type: "basic.outputLabel",
      position: { x: 0, y: 0 }
    };
    var formSpecs = [
      {
        type: "text",
        title: gettextCatalog.getString("Enter the input blocks"),
        value: ""
      },
      {
        type: "combobox",
        label: gettextCatalog.getString("Choose a color"),
        value: "fuchsia",
        options: [
          {
            value: "indianred",
            label: gettextCatalog.getString("IndianRed")
          },
          { value: "red", label: gettextCatalog.getString("Red") },
          { value: "deeppink", label: gettextCatalog.getString("DeepPink") },
          {
            value: "mediumVioletRed",
            label: gettextCatalog.getString("MediumVioletRed")
          },
          { value: "coral", label: gettextCatalog.getString("Coral") },
          {
            value: "orangered",
            label: gettextCatalog.getString("OrangeRed")
          },
          {
            value: "darkorange",
            label: gettextCatalog.getString("DarkOrange")
          },
          { value: "gold", label: gettextCatalog.getString("Gold") },
          { value: "yellow", label: gettextCatalog.getString("Yellow") },
          { value: "fuchsia", label: gettextCatalog.getString("Fuchsia") },
          {
            value: "slateblue",
            label: gettextCatalog.getString("SlateBlue")
          },
          {
            value: "greenyellow",
            label: gettextCatalog.getString("GreenYellow")
          },
          {
            value: "springgreen",
            label: gettextCatalog.getString("SpringGreen")
          },
          {
            value: "darkgreen",
            label: gettextCatalog.getString("DarkGreen")
          },
          {
            value: "olivedrab",
            label: gettextCatalog.getString("OliveDrab")
          },
          {
            value: "lightseagreen",
            label: gettextCatalog.getString("LightSeaGreen")
          },
          {
            value: "turquoise",
            label: gettextCatalog.getString("Turquoise")
          },
          {
            value: "steelblue",
            label: gettextCatalog.getString("SteelBlue")
          },
          {
            value: "deepskyblue",
            label: gettextCatalog.getString("DeepSkyBlue")
          },
          {
            value: "royalblue",
            label: gettextCatalog.getString("RoyalBlue")
          },
          { value: "navy", label: gettextCatalog.getString("Navy") }
        ]
      }
    ];
    utils.renderForm(formSpecs, function(evt, values) {
      var labels = values[0].replace(/\s*,\s*/g, ",").split(",");
      var color = values[1];
      var virtual = !values[2];
      var clock = values[2];
      if (resultAlert) {
        resultAlert.dismiss(false);
      }
      // Validate values
      var portInfo,
        portInfos = [];
      for (var l in labels) {
        portInfo = utils.parsePortLabel(
          labels[l],
          common.PATTERN_GLOBAL_PORT_LABEL
        );
        if (portInfo) {
          evt.cancel = false;
          portInfos.push(portInfo);
        } else {
          evt.cancel = true;
          resultAlert = alertify.warning(
            gettextCatalog.getString("Wrong block name {{name}}", {
              name: labels[l]
            })
          );
          return;
        }
      }
      // Create blocks
      var cells = [];
      for (var p in portInfos) {
        portInfo = portInfos[p];
        if (portInfo.rangestr && clock) {
          evt.cancel = true;
          resultAlert = alertify.warning(
            gettextCatalog.getString("Clock not allowed for data buses")
          );
          return;
        }
        var pins = getPins(portInfo);
        blockInstance.data = {
          blockColor: color,
          name: portInfo.name,
          range: portInfo.rangestr,
          pins: pins,
          virtual: virtual,
          clock: clock
        };
        cells.push(loadBasic(blockInstance));
        // Next block position
        blockInstance.position.y +=
          (virtual ? 10 : 6 + 4 * pins.length) * gridsize;
      }
      if (callback) {
        callback(cells);
      }
    });
  }

  function newBasicInput(callback) {
    var blockInstance = {
      id: null,
      data: {},
      type: "basic.input",
      position: { x: 0, y: 0 }
    };
    var formSpecs = [
      {
        type: "text",
        title: gettextCatalog.getString("Enter the input blocks"),
        value: ""
      },
      {
        type: "checkbox",
        label: gettextCatalog.getString("FPGA pin"),
        value: true
      },
      {
        type: "checkbox",
        label: gettextCatalog.getString("Show clock"),
        value: false
      }
    ];
    utils.renderForm(formSpecs, function(evt, values) {
      var labels = values[0].replace(/\s*,\s*/g, ",").split(",");
      var virtual = !values[1];
      var clock = values[2];
      if (resultAlert) {
        resultAlert.dismiss(false);
      }
      // Validate values
      var portInfo,
        portInfos = [];
      for (var l in labels) {
        portInfo = utils.parsePortLabel(
          labels[l],
          common.PATTERN_GLOBAL_PORT_LABEL
        );
        if (portInfo) {
          evt.cancel = false;
          portInfos.push(portInfo);
        } else {
          evt.cancel = true;
          resultAlert = alertify.warning(
            gettextCatalog.getString("Wrong block name {{name}}", {
              name: labels[l]
            })
          );
          return;
        }
      }
      // Create blocks
      var cells = [];
      for (var p in portInfos) {
        portInfo = portInfos[p];
        if (portInfo.rangestr && clock) {
          evt.cancel = true;
          resultAlert = alertify.warning(
            gettextCatalog.getString("Clock not allowed for data buses")
          );
          return;
        }
        var pins = getPins(portInfo);
        blockInstance.data = {
          name: portInfo.name,
          range: portInfo.rangestr,
          pins: pins,
          virtual: virtual,
          clock: clock
        };
        cells.push(loadBasic(blockInstance));
        // Next block position
        blockInstance.position.y +=
          (virtual ? 10 : 6 + 4 * pins.length) * gridsize;
      }
      if (callback) {
        callback(cells);
      }
    });
  }

  function newBasicOutput(callback) {
    var blockInstance = {
      id: null,
      data: {},
      type: "basic.output",
      position: { x: 0, y: 0 }
    };
    var formSpecs = [
      {
        type: "text",
        title: gettextCatalog.getString("Enter the output blocks"),
        value: ""
      },
      {
        type: "checkbox",
        label: gettextCatalog.getString("FPGA pin"),
        value: true
      }
    ];
    utils.renderForm(formSpecs, function(evt, values) {
      var labels = values[0].replace(/\s*,\s*/g, ",").split(",");
      var virtual = !values[1];
      if (resultAlert) {
        resultAlert.dismiss(false);
      }
      // Validate values
      var portInfo,
        portInfos = [];
      for (var l in labels) {
        portInfo = utils.parsePortLabel(
          labels[l],
          common.PATTERN_GLOBAL_PORT_LABEL
        );
        if (portInfo) {
          evt.cancel = false;
          portInfos.push(portInfo);
        } else {
          evt.cancel = true;
          resultAlert = alertify.warning(
            gettextCatalog.getString("Wrong block name {{name}}", {
              name: labels[l]
            })
          );
          return;
        }
      }
      // Create blocks
      var cells = [];
      for (var p in portInfos) {
        portInfo = portInfos[p];
        var pins = getPins(portInfo);
        blockInstance.data = {
          name: portInfo.name,
          range: portInfo.rangestr,
          pins: pins,
          virtual: virtual
        };
        cells.push(loadBasic(blockInstance));
        // Next block position
        blockInstance.position.y +=
          (virtual ? 10 : 6 + 4 * pins.length) * gridsize;
      }
      if (callback) {
        callback(cells);
      }
    });
  }

  function newBasicInputLabel(callback) {
    var blockInstance = {
      id: null,
      data: {},
      type: "basic.inputLabel",
      position: { x: 0, y: 0 }
    };
    var formSpecs = [
      {
        type: "text",
        title: gettextCatalog.getString("Enter the output blocks"),
        value: ""
      },
      {
        type: "combobox",
        label: gettextCatalog.getString("Choose a color"),
        value: "fuchsia",
        options: [
          {
            value: "indianred",
            label: gettextCatalog.getString("IndianRed")
          },
          { value: "red", label: gettextCatalog.getString("Red") },
          { value: "deeppink", label: gettextCatalog.getString("DeepPink") },
          {
            value: "mediumvioletred",
            label: gettextCatalog.getString("MediumVioletRed")
          },
          { value: "coral", label: gettextCatalog.getString("Coral") },
          {
            value: "orangered",
            label: gettextCatalog.getString("OrangeRed")
          },
          {
            value: "darkorange",
            label: gettextCatalog.getString("DarkOrange")
          },
          { value: "gold", label: gettextCatalog.getString("Gold") },
          { value: "yellow", label: gettextCatalog.getString("Yellow") },
          { value: "fuchsia", label: gettextCatalog.getString("Fuchsia") },
          {
            value: "slateblue",
            label: gettextCatalog.getString("SlateBlue")
          },
          {
            value: "greenyellow",
            label: gettextCatalog.getString("GreenYellow")
          },
          {
            value: "springgreen",
            label: gettextCatalog.getString("SpringGreen")
          },
          {
            value: "darkgreen",
            label: gettextCatalog.getString("DarkGreen")
          },
          {
            value: "olivedrab",
            label: gettextCatalog.getString("OliveDrab")
          },
          {
            value: "lightseagreen",
            label: gettextCatalog.getString("LightSeaGreen")
          },
          {
            value: "turquoise",
            label: gettextCatalog.getString("Turquoise")
          },
          {
            value: "steelblue",
            label: gettextCatalog.getString("SteelBlue")
          },
          {
            value: "deepskyblue",
            label: gettextCatalog.getString("DeepSkyBlue")
          },
          {
            value: "royalblue",
            label: gettextCatalog.getString("RoyalBlue")
          },
          { value: "navy", label: gettextCatalog.getString("Navy") }
        ]
      }
    ];
    utils.renderForm(formSpecs, function(evt, values) {
      var labels = values[0].replace(/\s*,\s*/g, ",").split(",");
      var color = values[1];
      var virtual = !values[2];
      if (resultAlert) {
        resultAlert.dismiss(false);
      }
      // Validate values
      var portInfo,
        portInfos = [];
      for (var l in labels) {
        portInfo = utils.parsePortLabel(
          labels[l],
          common.PATTERN_GLOBAL_PORT_LABEL
        );
        if (portInfo) {
          evt.cancel = false;
          portInfos.push(portInfo);
        } else {
          evt.cancel = true;
          resultAlert = alertify.warning(
            gettextCatalog.getString("Wrong block name {{name}}", {
              name: labels[l]
            })
          );
          return;
        }
      }
      // Create blocks
      var cells = [];
      for (var p in portInfos) {
        portInfo = portInfos[p];
        var pins = getPins(portInfo);
        blockInstance.data = {
          blockColor: color,
          name: portInfo.name,
          range: portInfo.rangestr,
          pins: pins,
          virtual: virtual
        };
        cells.push(loadBasic(blockInstance));
        // Next block position
        blockInstance.position.y +=
          (virtual ? 10 : 6 + 4 * pins.length) * gridsize;
      }
      if (callback) {
        callback(cells);
      }
    });
  }

  function getPins(portInfo) {
    var pins = [];
    if (portInfo.range) {
      for (var r in portInfo.range) {
        pins.push({
          index: portInfo.range[r].toString(),
          name: "",
          value: ""
        });
      }
    } else {
      pins.push({ index: "0", name: "", value: "" });
    }
    return pins;
  }

  function newBasicConstant(callback) {
    var blockInstance = {
      id: null,
      data: {},
      type: "basic.constant",
      position: { x: 0, y: 0 }
    };
    var formSpecs = [
      {
        type: "text",
        title: gettextCatalog.getString("Enter the constant blocks"),
        value: ""
      },
      {
        type: "checkbox",
        label: gettextCatalog.getString("Local parameter"),
        value: false
      }
    ];
    utils.renderForm(formSpecs, function(evt, values) {
      var labels = values[0].replace(/\s*,\s*/g, ",").split(",");
      var local = values[1];
      if (resultAlert) {
        resultAlert.dismiss(false);
      }
      // Validate values
      var paramInfo,
        paramInfos = [];
      for (var l in labels) {
        paramInfo = utils.parseParamLabel(
          labels[l],
          common.PATTERN_GLOBAL_PARAM_LABEL
        );
        if (paramInfo) {
          evt.cancel = false;
          paramInfos.push(paramInfo);
        } else {
          evt.cancel = true;
          resultAlert = alertify.warning(
            gettextCatalog.getString("Wrong block name {{name}}", {
              name: labels[l]
            })
          );
          return;
        }
      }
      // Create blocks
      var cells = [];
      for (var p in paramInfos) {
        paramInfo = paramInfos[p];
        blockInstance.data = {
          name: paramInfo.name,
          value: "",
          local: local
        };
        cells.push(loadBasicConstant(blockInstance));
        blockInstance.position.x += 15 * gridsize;
      }
      if (callback) {
        callback(cells);
      }
    });
  }

  function newBasicMemory(callback) {
    var blockInstance = {
      id: null,
      data: {},
      type: "basic.memory",
      position: { x: 0, y: 0 },
      size: { width: 96, height: 104 }
    };
    var formSpecs = [
      {
        type: "text",
        title: gettextCatalog.getString("Enter the memory blocks"),
        value: ""
      },
      {
        type: "combobox",
        label: gettextCatalog.getString("Address format"),
        value: 10,
        options: [
          { value: 2, label: gettextCatalog.getString("Binary") },
          { value: 10, label: gettextCatalog.getString("Decimal") },
          { value: 16, label: gettextCatalog.getString("Hexadecimal") }
        ]
      },
      {
        type: "checkbox",
        label: gettextCatalog.getString("Local parameter"),
        value: false
      }
    ];
    utils.renderForm(formSpecs, function(evt, values) {
      var labels = values[0].replace(/\s*,\s*/g, ",").split(",");
      var local = values[2];
      var format = parseInt(values[1]);
      if (resultAlert) {
        resultAlert.dismiss(false);
      }
      // Validate values
      var paramInfo,
        paramInfos = [];
      for (var l in labels) {
        paramInfo = utils.parseParamLabel(
          labels[l],
          common.PATTERN_GLOBAL_PARAM_LABEL
        );
        if (paramInfo) {
          evt.cancel = false;
          paramInfos.push(paramInfo);
        } else {
          evt.cancel = true;
          resultAlert = alertify.warning(
            gettextCatalog.getString("Wrong block name {{name}}", {
              name: labels[l]
            })
          );
          return;
        }
      }
      // Create blocks
      var cells = [];
      for (var p in paramInfos) {
        paramInfo = paramInfos[p];
        blockInstance.data = {
          name: paramInfo.name,
          list: "",
          local: local,
          format: format
        };
        cells.push(loadBasicMemory(blockInstance));
        blockInstance.position.x += 15 * gridsize;
      }
      if (callback) {
        callback(cells);
      }
    });
  }

  function newBasicCode(callback, block) {
    var blockInstance = {
      id: null,
      data: {
        code: "",
        params: [],
        ports: { in: [], out: [] }
      },
      type: "basic.code",
      position: { x: 0, y: 0 },
      size: { width: 192, height: 128 }
    };
    var defaultValues = ["", "", ""];
    if (block) {
      blockInstance = block;
      var index, port;
      if (block.data.ports) {
        var inPorts = [];
        for (index in block.data.ports.in) {
          port = block.data.ports.in[index];
          inPorts.push(port.name + (port.range || ""));
        }
        defaultValues[0] = inPorts.join(" , ");
        var outPorts = [];
        for (index in block.data.ports.out) {
          port = block.data.ports.out[index];
          outPorts.push(port.name + (port.range || ""));
        }
        defaultValues[1] = outPorts.join(" , ");
      }
      if (block.data.params) {
        var params = [];
        for (index in block.data.params) {
          params.push(block.data.params[index].name);
        }
        defaultValues[2] = params.join(" , ");
      }
    }
    var formSpecs = [
      {
        type: "text",
        title: gettextCatalog.getString("Enter the input ports"),
        value: defaultValues[0]
      },
      {
        type: "text",
        title: gettextCatalog.getString("Enter the output ports"),
        value: defaultValues[1]
      },
      {
        type: "text",
        title: gettextCatalog.getString("Enter the parameters"),
        value: defaultValues[2]
      }
    ];
    utils.renderForm(formSpecs, function(evt, values) {
      var inPorts = values[0].replace(/\s*,\s*/g, ",").split(",");
      var outPorts = values[1].replace(/\s*,\s*/g, ",").split(",");
      var params = values[2].replace(/\s*,\s*/g, ",").split(",");
      var allNames = [];
      if (resultAlert) {
        resultAlert.dismiss(false);
      }
      // Validate values
      var i,
        inPortInfo,
        inPortInfos = [];

      var nib = 0;
      var nob = 0;
      for (i in inPorts) {
        if (inPorts[i]) {
          inPortInfo = utils.parsePortLabel(
            inPorts[i],
            common.PATTERN_PORT_LABEL
          );
          if (inPortInfo && inPortInfo.name) {
            evt.cancel = false;
            inPortInfos.push(inPortInfo);
          } else {
            evt.cancel = true;
            resultAlert = alertify.warning(
              gettextCatalog.getString("Wrong port name {{name}}", {
                name: inPorts[i]
              })
            );
            return;
          }
        } else {
          nib++;
        }
      }

      var o,
        outPortInfo,
        outPortInfos = [];
      for (o in outPorts) {
        if (outPorts[o]) {
          outPortInfo = utils.parsePortLabel(
            outPorts[o],
            common.PATTERN_PORT_LABEL
          );
          if (outPortInfo && outPortInfo.name) {
            evt.cancel = false;
            outPortInfos.push(outPortInfo);
          } else {
            evt.cancel = true;
            resultAlert = alertify.warning(
              gettextCatalog.getString("Wrong port name {{name}}", {
                name: outPorts[o]
              })
            );
            return;
          }
        } else {
          nob++;
        }
      }
      if (nib >= inPorts.length && nob >= outPorts.length) {
        evt.cancel = true;
        resultAlert = alertify.warning(
          gettextCatalog.getString(
            "Code block needs at least one input or one output"
          )
        );
        return;
      }

      var p,
        paramInfo,
        paramInfos = [];
      for (p in params) {
        if (params[p]) {
          paramInfo = utils.parseParamLabel(
            params[p],
            common.PATTERN_PARAM_LABEL
          );
          if (paramInfo) {
            evt.cancel = false;
            paramInfos.push(paramInfo);
          } else {
            evt.cancel = true;
            resultAlert = alertify.warning(
              gettextCatalog.getString("Wrong parameter name {{name}}", {
                name: params[p]
              })
            );
            return;
          }
        }
      }
      // Create ports
      var pins;
      blockInstance.data.ports.in = [];
      for (i in inPortInfos) {
        if (inPortInfos[i]) {
          pins = getPins(inPortInfos[i]);
          blockInstance.data.ports.in.push({
            name: inPortInfos[i].name,
            range: inPortInfos[i].rangestr,
            size: pins.length > 1 ? pins.length : undefined
          });
          allNames.push(inPortInfos[i].name);
        }
      }
      blockInstance.data.ports.out = [];
      for (o in outPortInfos) {
        if (outPortInfos[o]) {
          pins = getPins(outPortInfos[o]);
          blockInstance.data.ports.out.push({
            name: outPortInfos[o].name,
            range: outPortInfos[o].rangestr,
            size: pins.length > 1 ? pins.length : undefined
          });
          allNames.push(outPortInfos[o].name);
        }
      }
      blockInstance.data.params = [];
      for (p in paramInfos) {
        if (paramInfos[p]) {
          blockInstance.data.params.push({
            name: paramInfos[p].name
          });
          allNames.push(paramInfos[p].name);
        }
      }
      // Check duplicated attributes
      var numNames = allNames.length;
      if (numNames === $.unique(allNames).length) {
        evt.cancel = false;
        // Create block
        if (callback) {
          callback([loadBasicCode(blockInstance)]);
        }
      } else {
        evt.cancel = true;
        resultAlert = alertify.warning(
          gettextCatalog.getString("Duplicated block attributes")
        );
      }
    });
  }

  function newBasicInfo(callback) {
    var blockInstance = {
      id: null,
      data: { info: "", readonly: false },
      type: "basic.info",
      position: { x: 0, y: 0 },
      size: { width: 192, height: 128 }
    };
    if (callback) {
      callback([loadBasicInfo(blockInstance)]);
    }
  }

  function newGeneric(type, block, callback) {
    var blockInstance = {
      id: null,
      type: type,
      position: { x: 0, y: 0 }
    };
    if (resultAlert) {
      resultAlert.dismiss(false);
    }
    if (
      block &&
      block.design &&
      block.design.graph &&
      block.design.graph.blocks &&
      block.design.graph.wires
    ) {
      if (callback) {
        callback(loadGeneric(blockInstance, block));
      }
    } else {
      resultAlert = alertify.error(
        gettextCatalog.getString("Wrong block format: {{type}}", {
          type: type
        }),
        30
      );
    }
  }

  //-- Load

  function loadBasic(instance, disabled) {
    switch (instance.type) {
      case "basic.input":
        return loadBasicInput(instance, disabled);
      case "basic.output":
        return loadBasicOutput(instance, disabled);
      case "basic.outputLabel":
        return loadBasicOutputLabel(instance, disabled);
      case "basic.inputLabel":
        return loadBasicInputLabel(instance, disabled);

      case "basic.constant":
        return loadBasicConstant(instance, disabled);
      case "basic.memory":
        return loadBasicMemory(instance, disabled);
      case "basic.code":
        return loadBasicCode(instance, disabled);
      case "basic.info":
        return loadBasicInfo(instance, disabled);
      default:
        break;
    }
  }

  function loadBasicInput(instance, disabled) {
    var data = instance.data;
    var rightPorts = [
      {
        id: "out",
        name: "",
        label: "",
        size: data.pins ? data.pins.length : data.size || 1
      }
    ];

    var cell = new shapes.ice.Input({
      id: instance.id,
      blockType: instance.type,
      data: instance.data,
      position: instance.position,
      disabled: disabled,
      rightPorts: rightPorts,
      choices: common.pinoutInputHTML
    });

    return cell;
  }

  function loadBasicOutputLabel(instance, disabled) {
    var data = instance.data;
    var rightPorts = [
      {
        id: "outlabel",
        name: "",
        label: "",
        size: data.pins ? data.pins.length : data.size || 1
      }
    ];

    var cell = new shapes.ice.OutputLabel({
      id: instance.id,
      blockType: instance.type,
      data: instance.data,
      position: instance.position,
      disabled: disabled,
      rightPorts: rightPorts,
      choices: common.pinoutInputHTML
    });
    return cell;
  }

  function loadBasicOutput(instance, disabled) {
    var data = instance.data;
    var leftPorts = [
      {
        id: "in",
        name: "",
        label: "",
        size: data.pins ? data.pins.length : data.size || 1
      }
    ];
    var cell = new shapes.ice.Output({
      id: instance.id,
      blockType: instance.type,
      data: instance.data,
      position: instance.position,
      disabled: disabled,
      leftPorts: leftPorts,
      choices: common.pinoutOutputHTML
    });
    return cell;
  }
  function loadBasicInputLabel(instance, disabled) {
    var data = instance.data;
    var leftPorts = [
      {
        id: "inlabel",
        name: "",
        label: "",
        size: data.pins ? data.pins.length : data.size || 1
      }
    ];

    //var cell = new shapes.ice.Output({
    var cell = new shapes.ice.InputLabel({
      id: instance.id,
      blockColor: instance.blockColor,
      blockType: instance.type,
      data: instance.data,
      position: instance.position,
      disabled: disabled,
      leftPorts: leftPorts,
      choices: common.pinoutOutputHTML
    });
    return cell;
  }

  function loadBasicConstant(instance, disabled) {
    var bottomPorts = [
      {
        id: "constant-out",
        name: "",
        label: ""
      }
    ];
    var cell = new shapes.ice.Constant({
      id: instance.id,
      blockType: instance.type,
      data: instance.data,
      position: instance.position,
      disabled: disabled,
      bottomPorts: bottomPorts
    });
    return cell;
  }

  function loadBasicMemory(instance, disabled) {
    var bottomPorts = [
      {
        id: "memory-out",
        name: "",
        label: ""
      }
    ];
    var cell = new shapes.ice.Memory({
      id: instance.id,
      blockType: instance.type,
      data: instance.data,
      position: instance.position,
      size: instance.size,
      disabled: disabled,
      bottomPorts: bottomPorts
    });
    return cell;
  }

  function loadBasicCode(instance, disabled) {
    var port;
    var leftPorts = [];
    var rightPorts = [];
    var topPorts = [];

    for (var i in instance.data.ports.in) {
      port = instance.data.ports.in[i];
      if (!port.range) {
        port.default = utils.hasInputRule(port.name);
      }
      leftPorts.push({
        id: port.name,
        name: port.name,
        label: port.name + (port.range || ""),
        size: port.size || 1
      });
    }

    for (var o in instance.data.ports.out) {
      port = instance.data.ports.out[o];
      rightPorts.push({
        id: port.name,
        name: port.name,
        label: port.name + (port.range || ""),
        size: port.size || 1
      });
    }

    for (var p in instance.data.params) {
      port = instance.data.params[p];
      topPorts.push({
        id: port.name,
        name: port.name,
        label: port.name
      });
    }

    var cell = new shapes.ice.Code({
      id: instance.id,
      blockType: instance.type,
      data: instance.data,
      position: instance.position,
      size: instance.size,
      disabled: disabled,
      leftPorts: leftPorts,
      rightPorts: rightPorts,
      topPorts: topPorts
    });

    return cell;
  }

  function loadBasicInfo(instance, disabled) {
    // Translate info content
    if (instance.data.info && instance.data.readonly) {
      instance.data.text = gettextCatalog.getString(instance.data.info);
    }
    var cell = new shapes.ice.Info({
      id: instance.id,
      blockType: instance.type,
      data: instance.data,
      position: instance.position,
      size: instance.size,
      disabled: disabled
    });
    return cell;
  }

  function loadGeneric(instance, block, disabled) {
    var i;
    var leftPorts = [];
    var rightPorts = [];
    var topPorts = [];
    var bottomPorts = [];

    instance.data = { ports: { in: [] } };

    for (i in block.design.graph.blocks) {
      var item = block.design.graph.blocks[i];
      if (item.type === "basic.input") {
        if (!item.data.range) {
          instance.data.ports.in.push({
            name: item.id,
            default: utils.hasInputRule(
              (item.data.clock ? "clk" : "") || item.data.name
            )
          });
        }
        leftPorts.push({
          id: item.id,
          name: item.data.name,
          label: item.data.name + (item.data.range || ""),
          size: item.data.pins ? item.data.pins.length : item.data.size || 1,
          clock: item.data.clock
        });
      } else if (item.type === "basic.output") {
        rightPorts.push({
          id: item.id,
          name: item.data.name,
          label: item.data.name + (item.data.range || ""),
          size: item.data.pins ? item.data.pins.length : item.data.size || 1
        });
      } else if (
        item.type === "basic.constant" ||
        item.type === "basic.memory"
      ) {
        if (!item.data.local) {
          topPorts.push({
            id: item.id,
            name: item.data.name,
            label: item.data.name
          });
        }
      }
    }

    //      var size = instance.size;
    var size = false;
    if (!size) {
      var numPortsHeight = Math.max(leftPorts.length, rightPorts.length);
      var numPortsWidth = Math.max(topPorts.length, bottomPorts.length);

      size = {
        width: Math.max(4 * gridsize * numPortsWidth, 12 * gridsize),
        height: Math.max(4 * gridsize * numPortsHeight, 8 * gridsize)
      };
    }

    var blockLabel = block.package.name;
    var blockImage = "";
    if (block.package.image) {
      if (block.package.image.startsWith("%3Csvg")) {
        blockImage = block.package.image;
      } else if (block.package.image.startsWith("<svg")) {
        blockImage = encodeURI(block.package.image);
      }
    }

    var cell = new shapes.ice.Generic({
      id: instance.id,
      blockType: instance.type,
      data: instance.data,
      config: block.design.config,
      pullup: block.design.pullup,
      image: blockImage,
      label: blockLabel,
      tooltip: gettextCatalog.getString(block.package.description),
      position: instance.position,
      size: size,
      disabled: disabled,
      leftPorts: leftPorts,
      rightPorts: rightPorts,
      topPorts: topPorts
    });
    return cell;
  }

  function loadWire(instance, source, target) {
    // Find selectors
    var sourceSelector, targetSelector;
    var leftPorts = target.get("leftPorts");
    var rightPorts = source.get("rightPorts");

    for (var _out = 0; _out < rightPorts.length; _out++) {
      if (rightPorts[_out] === instance.source.port) {
        sourceSelector = _out;
        break;
      }
    }
    for (var _in = 0; _in < leftPorts.length; _in++) {
      if (leftPorts[_in] === instance.target.port) {
        targetSelector = _in;
        break;
      }
    }

    var _wire = new shapes.ice.Wire({
      source: {
        id: source.id,
        selector: sourceSelector,
        port: instance.source.port
      },
      target: {
        id: target.id,
        selector: targetSelector,
        port: instance.target.port
      },
      vertices: instance.vertices
    });
    return _wire;
  }

  //-- Edit

  function editBasic(type, cellView, callback) {
    switch (type) {
      case "basic.input":
        editBasicInput(cellView, callback);
        break;
      case "basic.output":
        editBasicOutput(cellView, callback);
        break;
      case "basic.outputLabel":
        editBasicOutputLabel(cellView, callback);
        break;
      case "basic.inputLabel":
        editBasicInputLabel(cellView, callback);
        break;

      case "basic.constant":
        editBasicConstant(cellView);
        break;
      case "basic.memory":
        editBasicMemory(cellView);
        break;
      case "basic.code":
        editBasicCode(cellView, callback);
        break;
      case "basic.info":
        editBasicInfo(cellView);
        break;
      default:
        break;
    }
  }

  function editBasicOutputLabel(cellView, callback) {
    var graph = cellView.paper.model;
    var block = cellView.model.attributes;
    var formSpecs = [
      {
        type: "text",
        title: gettextCatalog.getString("Update the block name"),
        value: block.data.name + (block.data.range || "")
      },
      {
        type: "combobox",
        title: gettextCatalog.getString("Choose a color"),
        value:
          typeof block.data.blockColor !== "undefined"
            ? block.data.blockColor
            : "fuchsia",
        options: [
          {
            value: "indianred",
            label: gettextCatalog.getString("IndianRed")
          },
          { value: "red", label: gettextCatalog.getString("Red") },
          { value: "deeppink", label: gettextCatalog.getString("DeepPink") },
          {
            value: "mediumvioletred",
            label: gettextCatalog.getString("MediumVioletRed")
          },
          { value: "coral", label: gettextCatalog.getString("Coral") },
          {
            value: "orangered",
            label: gettextCatalog.getString("OrangeRed")
          },
          {
            value: "darkorange",
            label: gettextCatalog.getString("DarkOrange")
          },
          { value: "gold", label: gettextCatalog.getString("Gold") },
          { value: "yellow", label: gettextCatalog.getString("Yellow") },
          { value: "fuchsia", label: gettextCatalog.getString("Fuchsia") },
          {
            value: "slateblue",
            label: gettextCatalog.getString("SlateBlue")
          },
          {
            value: "greenyellow",
            label: gettextCatalog.getString("GreenYellow")
          },
          {
            value: "springgreen",
            label: gettextCatalog.getString("SpringGreen")
          },
          {
            value: "darkgreen",
            label: gettextCatalog.getString("DarkGreen")
          },
          {
            value: "olivedrab",
            label: gettextCatalog.getString("OliveDrab")
          },
          {
            value: "lightseagreen",
            label: gettextCatalog.getString("LightSeaGreen")
          },
          {
            value: "turquoise",
            label: gettextCatalog.getString("Turquoise")
          },
          {
            value: "steelblue",
            label: gettextCatalog.getString("SteelBlue")
          },
          {
            value: "deepskyblue",
            label: gettextCatalog.getString("DeepSkyBlue")
          },
          {
            value: "royalblue",
            label: gettextCatalog.getString("RoyalBlue")
          },
          { value: "navy", label: gettextCatalog.getString("Navy") }
        ]
      }
    ];
    utils.renderForm(formSpecs, function(evt, values) {
      var oldSize,
        newSize,
        offset = 0;
      var label = values[0];
      var color = values[1];
      var virtual = !values[2];
      var clock = values[2];
      if (resultAlert) {
        resultAlert.dismiss(false);
      }
      // Validate values
      var portInfo = utils.parsePortLabel(
        label,
        common.PATTERN_GLOBAL_PORT_LABEL
      );
      if (portInfo) {
        evt.cancel = false;
        if (portInfo.rangestr && clock) {
          evt.cancel = true;
          resultAlert = alertify.warning(
            gettextCatalog.getString("Clock not allowed for data buses")
          );
          return;
        }
        if ((block.data.range || "") !== (portInfo.rangestr || "")) {
          var pins = getPins(portInfo);
          oldSize = block.data.virtual
            ? 1
            : block.data.pins
            ? block.data.pins.length
            : 1;
          newSize = virtual ? 1 : pins ? pins.length : 1;
          // Update block position when size changes
          offset = 16 * (oldSize - newSize);
          // Create new block
          var blockInstance = {
            id: null,
            data: {
              name: portInfo.name,
              range: portInfo.rangestr,
              pins: pins,
              virtual: virtual,
              clock: clock
            },
            type: block.blockType,
            position: {
              x: block.position.x,
              y: block.position.y + offset
            }
          };
          if (callback) {
            graph.startBatch("change");
            callback(loadBasic(blockInstance));
            cellView.model.remove();
            graph.stopBatch("change");
            resultAlert = alertify.success(
              gettextCatalog.getString("Block updated")
            );
          }
        } else if (
          block.data.name !== portInfo.name ||
          block.data.virtual !== virtual ||
          block.data.clock !== clock ||
          block.data.blockColor !== color
        ) {
          var size = block.data.pins ? block.data.pins.length : 1;
          oldSize = block.data.virtual ? 1 : size;
          newSize = virtual ? 1 : size;
          // Update block position when size changes
          offset = 16 * (oldSize - newSize);
          // Edit block
          graph.startBatch("change");
          var data = utils.clone(block.data);
          data.name = portInfo.name;
          data.oldBlockColor = data.blockColor;
          data.blockColor = color;
          data.virtual = virtual;
          data.clock = clock;
          cellView.model.set("data", data, {
            translateBy: cellView.model.id,
            tx: 0,
            ty: -offset
          });
          cellView.model.translate(0, offset);
          graph.stopBatch("change");
          cellView.apply();
          resultAlert = alertify.success(
            gettextCatalog.getString("Block updated")
          );
        }
      } else {
        evt.cancel = true;
        resultAlert = alertify.warning(
          gettextCatalog.getString("Wrong block name {{name}}", {
            name: label
          })
        );
      }
    });
  }

  function editBasicInputLabel(cellView, callback) {
    var graph = cellView.paper.model;
    var block = cellView.model.attributes;
    var formSpecs = [
      {
        type: "text",
        title: gettextCatalog.getString("Update the block name"),
        value: block.data.name + (block.data.range || "")
      },
      {
        type: "combobox",
        title: gettextCatalog.getString("Choose a color"),
        value:
          typeof block.data.blockColor !== "undefined"
            ? block.data.blockColor
            : "fuchsia",
        options: [
          {
            value: "indianred",
            label: gettextCatalog.getString("IndianRed")
          },
          { value: "red", label: gettextCatalog.getString("Red") },
          { value: "deeppink", label: gettextCatalog.getString("DeepPink") },
          {
            value: "mediumvioletred",
            label: gettextCatalog.getString("MediumVioletRed")
          },
          { value: "coral", label: gettextCatalog.getString("Coral") },
          {
            value: "orangered",
            label: gettextCatalog.getString("OrangeRed")
          },
          {
            value: "darkorange",
            label: gettextCatalog.getString("DarkOrange")
          },
          { value: "gold", label: gettextCatalog.getString("Gold") },
          { value: "yellow", label: gettextCatalog.getString("Yellow") },
          { value: "fuchsia", label: gettextCatalog.getString("Fuchsia") },
          {
            value: "slateblue",
            label: gettextCatalog.getString("SlateBlue")
          },
          {
            value: "greenyellow",
            label: gettextCatalog.getString("GreenYellow")
          },
          {
            value: "springgreen",
            label: gettextCatalog.getString("SpringGreen")
          },
          {
            value: "darkgreen",
            label: gettextCatalog.getString("DarkGreen")
          },
          {
            value: "olivedrab",
            label: gettextCatalog.getString("OliveDrab")
          },
          {
            value: "lightseagreen",
            label: gettextCatalog.getString("LightSeaGreen")
          },
          {
            value: "turquoise",
            label: gettextCatalog.getString("Turquoise")
          },
          {
            value: "steelblue",
            label: gettextCatalog.getString("SteelBlue")
          },
          {
            value: "deepskyblue",
            label: gettextCatalog.getString("DeepSkyBlue")
          },
          {
            value: "royalblue",
            label: gettextCatalog.getString("RoyalBlue")
          },
          { value: "navy", label: gettextCatalog.getString("Navy") }
        ]
      }
    ];
    utils.renderForm(formSpecs, function(evt, values) {
      var oldSize,
        newSize,
        offset = 0;
      var label = values[0];
      var color = values[1];
      var virtual = !values[2];
      if (resultAlert) {
        resultAlert.dismiss(false);
      }
      // Validate values
      var portInfo = utils.parsePortLabel(
        label,
        common.PATTERN_GLOBAL_PORT_LABEL
      );
      if (portInfo) {
        evt.cancel = false;
        if ((block.data.range || "") !== (portInfo.rangestr || "")) {
          var pins = getPins(portInfo);
          oldSize = block.data.virtual
            ? 1
            : block.data.pins
            ? block.data.pins.length
            : 1;
          newSize = virtual ? 1 : pins ? pins.length : 1;
          // Update block position when size changes
          offset = 16 * (oldSize - newSize);
          // Create new block
          var blockInstance = {
            id: null,
            data: {
              name: portInfo.name,
              range: portInfo.rangestr,
              pins: pins,
              virtual: virtual
            },
            type: block.blockType,
            position: {
              x: block.position.x,
              y: block.position.y + offset
            }
          };
          if (callback) {
            graph.startBatch("change");
            callback(loadBasic(blockInstance));
            cellView.model.remove();
            graph.stopBatch("change");
            resultAlert = alertify.success(
              gettextCatalog.getString("Block updated")
            );
          }
        } else if (
          block.data.name !== portInfo.name ||
          block.data.virtual !== virtual ||
          block.data.blockColor !== color
        ) {
          var size = block.data.pins ? block.data.pins.length : 1;
          oldSize = block.data.virtual ? 1 : size;
          newSize = virtual ? 1 : size;
          // Update block position when size changes
          offset = 16 * (oldSize - newSize);
          // Edit block
          graph.startBatch("change");
          var data = utils.clone(block.data);
          data.name = portInfo.name;
          data.oldBlockColor = data.blockColor;
          data.blockColor = color;
          data.virtual = virtual;
          cellView.model.set("data", data, {
            translateBy: cellView.model.id,
            tx: 0,
            ty: -offset
          });
          cellView.model.translate(0, offset);
          graph.stopBatch("change");
          cellView.apply();
          resultAlert = alertify.success(
            gettextCatalog.getString("Block updated")
          );
        }
      } else {
        evt.cancel = true;
        resultAlert = alertify.warning(
          gettextCatalog.getString("Wrong block name {{name}}", {
            name: label
          })
        );
      }
    });
  }

  function editBasicInput(cellView, callback) {
    var graph = cellView.paper.model;
    var block = cellView.model.attributes;
    var formSpecs = [
      {
        type: "text",
        title: gettextCatalog.getString("Update the block name"),
        value: block.data.name + (block.data.range || "")
      },
      {
        type: "checkbox",
        label: gettextCatalog.getString("FPGA pin"),
        value: !block.data.virtual
      },
      {
        type: "checkbox",
        label: gettextCatalog.getString("Show clock"),
        value: block.data.clock
      }
    ];
    utils.renderForm(formSpecs, function(evt, values) {
      var oldSize,
        newSize,
        offset = 0;
      var label = values[0];
      var virtual = !values[1];
      var clock = values[2];
      if (resultAlert) {
        resultAlert.dismiss(false);
      }
      // Validate values
      var portInfo = utils.parsePortLabel(
        label,
        common.PATTERN_GLOBAL_PORT_LABEL
      );
      if (portInfo) {
        evt.cancel = false;
        if (portInfo.rangestr && clock) {
          evt.cancel = true;
          resultAlert = alertify.warning(
            gettextCatalog.getString("Clock not allowed for data buses")
          );
          return;
        }
        if ((block.data.range || "") !== (portInfo.rangestr || "")) {
          var pins = getPins(portInfo);
          oldSize = block.data.virtual
            ? 1
            : block.data.pins
            ? block.data.pins.length
            : 1;
          newSize = virtual ? 1 : pins ? pins.length : 1;
          // Update block position when size changes
          offset = 16 * (oldSize - newSize);
          // Create new block
          var blockInstance = {
            id: null,
            data: {
              name: portInfo.name,
              range: portInfo.rangestr,
              pins: pins,
              virtual: virtual,
              clock: clock
            },
            type: block.blockType,
            position: {
              x: block.position.x,
              y: block.position.y + offset
            }
          };
          if (callback) {
            graph.startBatch("change");
            callback(loadBasic(blockInstance));
            cellView.model.remove();
            graph.stopBatch("change");
            resultAlert = alertify.success(
              gettextCatalog.getString("Block updated")
            );
          }
        } else if (
          block.data.name !== portInfo.name ||
          block.data.virtual !== virtual ||
          block.data.clock !== clock
        ) {
          var size = block.data.pins ? block.data.pins.length : 1;
          oldSize = block.data.virtual ? 1 : size;
          newSize = virtual ? 1 : size;
          // Update block position when size changes
          offset = 16 * (oldSize - newSize);
          // Edit block
          graph.startBatch("change");
          var data = utils.clone(block.data);
          data.name = portInfo.name;
          data.virtual = virtual;
          data.clock = clock;
          cellView.model.set("data", data, {
            translateBy: cellView.model.id,
            tx: 0,
            ty: -offset
          });
          cellView.model.translate(0, offset);
          graph.stopBatch("change");
          cellView.apply();
          resultAlert = alertify.success(
            gettextCatalog.getString("Block updated")
          );
        }
      } else {
        evt.cancel = true;
        resultAlert = alertify.warning(
          gettextCatalog.getString("Wrong block name {{name}}", {
            name: label
          })
        );
      }
    });
  }

  function editBasicOutput(cellView, callback) {
    var graph = cellView.paper.model;
    var block = cellView.model.attributes;
    var formSpecs = [
      {
        type: "text",
        title: gettextCatalog.getString("Update the block name"),
        value: block.data.name + (block.data.range || "")
      },
      {
        type: "checkbox",
        label: gettextCatalog.getString("FPGA pin"),
        value: !block.data.virtual
      }
    ];
    utils.renderForm(formSpecs, function(evt, values) {
      var oldSize,
        newSize,
        offset = 0;
      var label = values[0];
      var virtual = !values[1];
      if (resultAlert) {
        resultAlert.dismiss(false);
      }
      // Validate values
      var portInfo = utils.parsePortLabel(
        label,
        common.PATTERN_GLOBAL_PORT_LABEL
      );
      if (portInfo) {
        evt.cancel = false;
        if ((block.data.range || "") !== (portInfo.rangestr || "")) {
          var pins = getPins(portInfo);
          oldSize = block.data.virtual
            ? 1
            : block.data.pins
            ? block.data.pins.length
            : 1;
          newSize = virtual ? 1 : pins ? pins.length : 1;
          // Update block position when size changes
          offset = 16 * (oldSize - newSize);
          // Create new block
          var blockInstance = {
            id: null,
            data: {
              name: portInfo.name,
              range: portInfo.rangestr,
              pins: pins,
              virtual: virtual
            },
            type: block.blockType,
            position: {
              x: block.position.x,
              y: block.position.y + offset
            }
          };
          if (callback) {
            graph.startBatch("change");
            callback(loadBasic(blockInstance));
            cellView.model.remove();
            graph.stopBatch("change");
            resultAlert = alertify.success(
              gettextCatalog.getString("Block updated")
            );
          }
        } else if (
          block.data.name !== portInfo.name ||
          block.data.virtual !== virtual
        ) {
          var size = block.data.pins ? block.data.pins.length : 1;
          oldSize = block.data.virtual ? 1 : size;
          newSize = virtual ? 1 : size;
          // Update block position when size changes
          offset = 16 * (oldSize - newSize);
          // Edit block
          graph.startBatch("change");
          var data = utils.clone(block.data);
          data.name = portInfo.name;
          data.virtual = virtual;
          cellView.model.set("data", data, {
            translateBy: cellView.model.id,
            tx: 0,
            ty: -offset
          });
          cellView.model.translate(0, offset);
          graph.stopBatch("change");
          cellView.apply();
          resultAlert = alertify.success(
            gettextCatalog.getString("Block updated")
          );
        }
      } else {
        evt.cancel = true;
        resultAlert = alertify.warning(
          gettextCatalog.getString("Wrong block name {{name}}", {
            name: label
          })
        );
      }
    });
  }

  function editBasicConstant(cellView) {
    var block = cellView.model.attributes;
    var formSpecs = [
      {
        type: "text",
        title: gettextCatalog.getString("Update the block name"),
        value: block.data.name
      },
      {
        type: "checkbox",
        label: gettextCatalog.getString("Local parameter"),
        value: block.data.local
      }
    ];
    utils.renderForm(formSpecs, function(evt, values) {
      var label = values[0];
      var local = values[1];
      if (resultAlert) {
        resultAlert.dismiss(false);
      }
      // Validate values
      var paramInfo = utils.parseParamLabel(
        label,
        common.PATTERN_GLOBAL_PARAM_LABEL
      );
      if (paramInfo) {
        var name = paramInfo.name;
        evt.cancel = false;
        if (block.data.name !== name || block.data.local !== local) {
          // Edit block
          var data = utils.clone(block.data);
          data.name = name;
          data.local = local;
          cellView.model.set("data", data);
          cellView.apply();
          resultAlert = alertify.success(
            gettextCatalog.getString("Block updated")
          );
        }
      } else {
        evt.cancel = true;
        resultAlert = alertify.warning(
          gettextCatalog.getString("Wrong block name {{name}}", {
            name: label
          })
        );
        return;
      }
    });
  }

  function editBasicMemory(cellView) {
    var block = cellView.model.attributes;
    var formSpecs = [
      {
        type: "text",
        title: gettextCatalog.getString("Update the block name"),
        value: block.data.name
      },
      {
        type: "combobox",
        label: gettextCatalog.getString("Address format"),
        value: block.data.format,
        options: [
          { value: 2, label: gettextCatalog.getString("Binary") },
          { value: 10, label: gettextCatalog.getString("Decimal") },
          { value: 16, label: gettextCatalog.getString("Hexadecimal") }
        ]
      },
      {
        type: "checkbox",
        label: gettextCatalog.getString("Local parameter"),
        value: block.data.local
      }
    ];
    utils.renderForm(formSpecs, function(evt, values) {
      var label = values[0];
      var local = values[2];
      var format = parseInt(values[1]);
      if (resultAlert) {
        resultAlert.dismiss(false);
      }
      // Validate values
      var paramInfo = utils.parseParamLabel(
        label,
        common.PATTERN_GLOBAL_PARAM_LABEL
      );
      if (paramInfo) {
        var name = paramInfo.name;
        evt.cancel = false;
        if (
          block.data.name !== name ||
          block.data.local !== local ||
          block.data.format !== format
        ) {
          // Edit block
          var data = utils.clone(block.data);
          data.name = name;
          data.local = local;
          data.format = format;
          cellView.model.set("data", data);
          cellView.apply();
          resultAlert = alertify.success(
            gettextCatalog.getString("Block updated")
          );
        }
      } else {
        evt.cancel = true;
        resultAlert = alertify.warning(
          gettextCatalog.getString("Wrong block name {{name}}", {
            name: label
          })
        );
        return;
      }
    });
  }

  function editBasicCode(cellView, callback) {
    var graph = cellView.paper.model;
    var block = cellView.model.attributes;
    var blockInstance = {
      id: block.id,
      data: utils.clone(block.data),
      type: "basic.code",
      position: block.position,
      size: block.size
    };
    if (resultAlert) {
      resultAlert.dismiss(false);
    }
    newBasicCode(function(cells) {
      if (callback) {
        var cell = cells[0];
        if (cell) {
          var connectedWires = graph.getConnectedLinks(cellView.model);
          graph.startBatch("change");
          cellView.model.remove();
          callback(cell);
          // Restore previous connections
          for (var w in connectedWires) {
            var wire = connectedWires[w];
            var size = wire.get("size");
            var source = wire.get("source");
            var target = wire.get("target");
            if (
              (source.id === cell.id &&
                containsPort(source.port, size, cell.get("rightPorts"))) ||
              (target.id === cell.id &&
                containsPort(target.port, size, cell.get("leftPorts")) &&
                source.port !== "constant-out" &&
                source.port !== "memory-out") ||
              (target.id === cell.id &&
                containsPort(target.port, size, cell.get("topPorts")) &&
                (source.port === "constant-out" ||
                  source.port === "memory-out"))
            ) {
              graph.addCell(wire);
            }
          }
          graph.stopBatch("change");
          resultAlert = alertify.success(
            gettextCatalog.getString("Block updated")
          );
        }
      }
    }, blockInstance);
  }

  function containsPort(port, size, ports) {
    var found = false;
    for (var i in ports) {
      if (port === ports[i].name && size === ports[i].size) {
        found = true;
        break;
      }
    }
    return found;
  }

  function editBasicInfo(cellView) {
    var block = cellView.model.attributes;
    var data = utils.clone(block.data);
    // Toggle readonly
    data.readonly = !data.readonly;
    // Translate info content
    if (data.info && data.readonly) {
      data.text = gettextCatalog.getString(data.info);
    }
    cellView.model.set("data", data);
    cellView.apply();
  }
});

//<

//
//> services/graph.js
//

appModule.service("graph", function(
  $rootScope,
  boards,
  blocks,
  profile,
  utils,
  common,
  gettextCatalog,
  window
) {
  var z = { index: 100 };
  var graph = null;
  var paper = null;
  var selection = null;
  var selectionView = null;
  var commandManager = null;
  var mousePosition = { x: 0, y: 0 };
  var gridsize = 8;
  var state = { pan: { x: 0, y: 0 }, zoom: 1.0 };

  var self = this;

  const ZOOM_MAX = 2.1;
  const ZOOM_MIN = 0.3;
  const ZOOM_SENS = 0.3;

  this.breadcrumbs = [{ name: '', type: '' }];
  this.addingDraggableBlock = false;

  this.getState = function () {
      // Clone state
      return utils.clone(state);
  };

  this.setState = function (_state) {
      if (!_state) {
          _state = {
              pan: {
                  x: 0,
                  y: 0
              },
              zoom: 1.0
          };
      }
      this.panAndZoom.zoom(_state.zoom);
      this.panAndZoom.pan(_state.pan);
  };

  this.resetView = function () {
      this.setState(null);
  };

  this.fitContent = function () {
      if (!this.isEmpty()) {
          // Target box
          var margin = 40;
          var menuFooterHeight = 93;
          var winWidth = window.get().width;
          var winHeight = window.get().height;

          var tbox = {
              x: margin,
              y: margin,
              width: winWidth - 2 * margin,
              height: winHeight - menuFooterHeight - 2 * margin
          };
          // Source box
          var sbox = V(paper.viewport).bbox(true, paper.svg);
          sbox = {
              x: sbox.x * state.zoom,
              y: sbox.y * state.zoom,
              width: sbox.width * state.zoom,
              height: sbox.height * state.zoom
          };
          var scale;
          if (tbox.width / sbox.width > tbox.height / sbox.height) {
              scale = tbox.height / sbox.height;
          }
          else {
              scale = tbox.width / sbox.width;
          }
          if (state.zoom * scale > 1) {
              scale = 1 / state.zoom;
          }
          var target = {
              x: tbox.x + tbox.width / 2,
              y: tbox.y + tbox.height / 2
          };
          var source = {
              x: sbox.x + sbox.width / 2,
              y: sbox.y + sbox.height / 2
          };
          this.setState({
              pan: {
                  x: target.x - source.x * scale,
                  y: target.y - source.y * scale
              },
              zoom: state.zoom * scale
          });
          $('.joint-paper.joint-theme-default>svg').attr('height', winHeight);
          $('.joint-paper.joint-theme-default>svg').attr('width', winWidth);
      }
      else {
          this.resetView();
      }
  };

  this.resetBreadcrumbs = function (name) {
      this.breadcrumbs = [{ name: name, type: '' }];
      utils.rootScopeSafeApply();
  };

  this.createPaper = function (element) {
      graph = new joint.dia.Graph();

      paper = new joint.dia.Paper({
          el: element,
          width: 3000,
          height: 3000,
          model: graph,
          gridSize: gridsize,
          clickThreshold: 6,
          snapLinks: { radius: 16 },
          linkPinning: false,
          embeddingMode: false,
          //markAvailable: true,
          getState: this.getState,
          defaultLink: new joint.shapes.ice.Wire(),
          // guard: function(evt, view) vg
          //   // FALSE means the event isn't guarded.
          //   return false;
          // },
          validateMagnet: function (cellView, magnet) {
              // Prevent to start wires from an input port
              return (magnet.getAttribute('type') === 'output');
          },
          validateConnection: function (cellViewS, magnetS, cellViewT, magnetT, end, linkView) {
              // Prevent output-output links
              if (magnetS && magnetS.getAttribute('type') === 'output' &&
                  magnetT && magnetT.getAttribute('type') === 'output') {
                  if (magnetS !== magnetT) {
                      // Show warning if source and target blocks are different
                      warning(gettextCatalog.getString('Invalid connection'));
                  }
                  return false;
              }
              // Ensure right -> left connections
              if (magnetS && magnetS.getAttribute('pos') === 'right') {
                  if (magnetT && magnetT.getAttribute('pos') !== 'left') {
                      warning(gettextCatalog.getString('Invalid connection'));
                      return false;
                  }
              }
              // Ensure bottom -> top connections
              if (magnetS && magnetS.getAttribute('pos') === 'bottom') {
                  if (magnetT && magnetT.getAttribute('pos') !== 'top') {
                      warning(gettextCatalog.getString('Invalid connection'));
                      return false;
                  }
              }
              var i;
              var links = graph.getLinks();
              for (i in links) {
                  var link = links[i];
                  var linkIView = link.findView(paper);
                  if (linkView === linkIView) {
                      //Skip the wire the user is drawing
                      continue;
                  }
                  // Prevent multiple input links
                  if ((cellViewT.model.id === link.get('target').id) &&
                      (magnetT.getAttribute('port') === link.get('target').port)) {
                      warning(gettextCatalog.getString('Invalid multiple input connections'));
                      return false;
                  }
                  // Prevent to connect a pull-up if other blocks are connected
                  if ((cellViewT.model.get('pullup')) &&
                      (cellViewS.model.id === link.get('source').id)) {
                      warning(gettextCatalog.getString('Invalid <i>Pull up</i> connection:<br>block already connected'));
                      return false;
                  }
                  // Prevent to connect other blocks if a pull-up is connected
                  if ((linkIView.targetView.model.get('pullup')) &&
                      (cellViewS.model.id === link.get('source').id)) {
                      warning(gettextCatalog.getString('Invalid block connection:<br><i>Pull up</i> already connected'));
                      return false;
                  }
              }
              // Ensure input -> pull-up connections
              if (cellViewT.model.get('pullup')) {
                  var ret = (cellViewS.model.get('blockType') === 'basic.input');
                  if (!ret) {
                      warning(gettextCatalog.getString('Invalid <i>Pull up</i> connection:<br>only <i>Input</i> blocks allowed'));
                  }
                  return ret;
              }
              // Prevent different size connections
              var tsize;
              var lsize = linkView.model.get('size');
              var portId = magnetT.getAttribute('port');
              var tLeftPorts = cellViewT.model.get('leftPorts');
              for (i in tLeftPorts) {
                  var port = tLeftPorts[i];
                  if (portId === port.id) {
                      tsize = port.size;
                      break;
                  }
              }
              tsize = tsize || 1;
              lsize = lsize || 1;
              if (tsize !== lsize) {
                  warning(gettextCatalog.getString('Invalid connection: {{a}} → {{b}}', { a: lsize, b: tsize }));
                  return false;
              }
              // Prevent loop links
              return magnetS !== magnetT;
          }
      });


      // Command Manager

      commandManager = new joint.dia.CommandManager({
          paper: paper,
          graph: graph
      });

      // Selection View

      selection = new Backbone.Collection();
      selectionView = new joint.ui.SelectionView({
          paper: paper,
          graph: graph,
          model: selection,
          state: state
      });

      paper.options.enabled = true;
      paper.options.warningTimer = false;

      function warning(message) {
          if (!paper.options.warningTimer) {
              paper.options.warningTimer = true;
              alertify.warning(message, 5);
              setTimeout(function () {
                  paper.options.warningTimer = false;
              }, 4000);
          }
      }

      var targetElement = element[0];

      this.panAndZoom = svgPanZoom(targetElement.childNodes[2],
          {
              fit: false,
              center: false,
              zoomEnabled: true,
              panEnabled: false,
              zoomScaleSensitivity: ZOOM_SENS,
              dblClickZoomEnabled: false,
              minZoom: ZOOM_MIN,
              maxZoom: ZOOM_MAX,
              eventsListenerElement: targetElement,
             onZoom: function (scale) {
                  state.zoom = scale;
                  // Close expanded combo
                  if (document.activeElement.className === 'select2-search__field') {
                      $('select').select2('close');
                  }
                  updateCellBoxes();
              },
             onPan: function (newPan) {
                  state.pan = newPan;
                  graph.trigger('state', state);
                  updateCellBoxes();
              }
          });

      function updateCellBoxes() {
          var cells = graph.getCells();
          selectionView.options.state = state;

          for (var i = 0, len = cells.length; i < len; i++) {

              if (!cells[i].isLink()) {
                  cells[i].attributes.state = state;
                  var elementView = paper.findViewByModel(cells[i]);
                  // Pan blocks
                  elementView.updateBox();
                  // Pan selection boxes
                  selectionView.updateBox(elementView.model);

              }
          }

      }
      // Events

      var shiftPressed = false;

      $(document).on('keydown', function (evt) {
          if (utils.hasShift(evt)) {
              shiftPressed = true;
          }
      });



      $(document).on('keyup', function (evt) {
          if (!utils.hasShift(evt)) {
              shiftPressed = false;
          }
      });

      $(document).on('disableSelected', function () {
          if (!shiftPressed) {
              disableSelected();
          }
      });

      $('body').mousemove(function (event) {
          mousePosition = {
              x: event.pageX,
              y: event.pageY
          };
      });

      selectionView.on('selection-box:pointerdown', function (/*evt*/) {
          // Move selection to top view
          if (hasSelection()) {
              selection.each(function (cell) {
                  var cellView = paper.findViewByModel(cell);
                  if (!cellView.model.isLink()) {
                      if (cellView.$box.css('z-index') < z.index) {
                          cellView.$box.css('z-index', ++z.index);
                      }
                  }
              });
          }
      });

      selectionView.on('selection-box:pointerclick', function (evt) {
          if (self.addingDraggableBlock) {
              // Set new block's position
              self.addingDraggableBlock = false;
              processReplaceBlock(selection.at(0));
              disableSelected();
              updateWiresOnObstacles();
              graph.trigger('batch:stop');
          }
          else {
              // Toggle selected cell
              if (shiftPressed) {
                  var cell = selection.get($(evt.target).data('model'));
                  selection.reset(selection.without(cell));
                  selectionView.destroySelectionBox(cell);
              }
          }
      });

      /*paper.on('debug:test',function(args){

          console.log('DEBUG->TEST');
      });*/

      paper.on('cell:pointerclick', function (cellView, evt, x, y) {
          //M+

          if (!checkInsideViewBox(cellView, x, y)) {
              // Out of the view box
              return;
          }
          if (shiftPressed) {
              // If Shift is pressed process the click (no Shift+dblClick allowed)
              if (paper.options.enabled) {
                  if (!cellView.model.isLink()) {
                      // Disable current focus
                      document.activeElement.blur();
                      if (utils.hasLeftButton(evt)) {
                          // Add cell to selection
                          selection.add(cellView.model);
                          selectionView.createSelectionBox(cellView.model);
                      }
                  }
              }
          }

      });

      paper.on('cell:pointerdblclick', function (cellView, evt, x, y) {

          if (x && y && !checkInsideViewBox(cellView, x, y)) {
              // Out of the view box
              return;
          }
          selectionView.cancelSelection();
          if (!shiftPressed) {

              // Allow dblClick if Shift is not pressed
              var type = cellView.model.get('blockType');
              var blockId = cellView.model.get('id');


              if (type.indexOf('basic.') !== -1) {
                  // Edit basic blocks
                  if (paper.options.enabled) {
                      blocks.editBasic(type, cellView, addCell);

                  }
              }
              else if (common.allDependencies[type]) {
                  if (typeof common.isEditingSubmodule !== 'undefined' &&
                      common.isEditingSubmodule === true) {
                      alertify.warning(gettextCatalog.getString('To enter on "edit mode" of deeper block, you need to finish current "edit mode", lock the keylock to do it.'));
                      return;
                  }

                  // Navigate inside generic blocks
                  z.index = 1;
                  var project = common.allDependencies[type];
                  var breadcrumbsLength = self.breadcrumbs.length;

                  $('body').addClass('waiting');
                  setTimeout(function () {
                      $rootScope.$broadcast('navigateProject', {
                          update: breadcrumbsLength === 1,
                          project: project,
                          submodule: type,
                          submoduleId: blockId
                      });
                      self.breadcrumbs.push({ name: project.package.name || '#', type: type });
                      utils.rootScopeSafeApply();
                  }, 100);
              }
          }

      });

      function checkInsideViewBox(view, x, y) {
          var $box = $(view.$box[0]);
          var position = $box.position();
          var rbox = g.rect(position.left, position.top, $box.width(), $box.height());
          return rbox.containsPoint({
              x: x * state.zoom + state.pan.x,
              y: y * state.zoom + state.pan.y
          });
      }

      paper.on('blank:pointerdown', function (evt, x, y) {
          // Disable current focus
          document.activeElement.blur();

          if (utils.hasLeftButton(evt)) {
              if (utils.hasCtrl(evt)) {
                  if (!self.isEmpty()) {
                      self.panAndZoom.enablePan();
                  }
              }
              else if (paper.options.enabled) {
                  selectionView.startSelecting(evt, x, y);
              }
          }
          else if (utils.hasRightButton(evt)) {
              if (!self.isEmpty()) {
                  self.panAndZoom.enablePan();
              }
          }
      });

      paper.on('blank:pointerup', function (/*cellView, evt*/) {
          self.panAndZoom.disablePan();
      });

      paper.on('cell:mouseover', function (cellView, evt) {
          // Move selection to top view if !mousedown
          if (!utils.hasButtonPressed(evt)) {
              if (!cellView.model.isLink()) {
                  if (cellView.$box.css('z-index') < z.index) {
                      cellView.$box.css('z-index', ++z.index);
                  }
              }
          }
      });

      paper.on('cell:pointerup', function (cellView/*, evt*/) {
          graph.trigger('batch:start');
          processReplaceBlock(cellView.model);
          graph.trigger('batch:stop');
          if (paper.options.enabled) {
              updateWiresOnObstacles();
          }
      });

      paper.on('cell:pointermove', function (cellView/*, evt*/) {
          debounceDisableReplacedBlock(cellView.model);
      });

      selectionView.on('selection-box:pointermove', function (/*evt*/) {
          if (self.addingDraggableBlock && hasSelection()) {
              debounceDisableReplacedBlock(selection.at(0));
          }
      });

      function processReplaceBlock(upperBlock) {
          debounceDisableReplacedBlock.flush();
          var lowerBlock = findLowerBlock(upperBlock);
          replaceBlock(upperBlock, lowerBlock);
      }

      function findLowerBlock(upperBlock) {
          if (upperBlock.get('type') === 'ice.Wire' ||
              upperBlock.get('type') === 'ice.Info') {
              return;
          }
          var blocks = graph.findModelsUnderElement(upperBlock);
          // There is at least one model under the upper block
          if (blocks.length === 0) {
              return;
          }
          // Get the first model found
          var lowerBlock = blocks[0];
          if (lowerBlock.get('type') === 'ice.Wire' ||
              lowerBlock.get('type') === 'ice.Info') {
              return;
          }
          var validReplacements = {
              'ice.Generic': ['ice.Generic', 'ice.Code', 'ice.Input', 'ice.Output'],
              'ice.Code': ['ice.Generic', 'ice.Code', 'ice.Input', 'ice.Output'],
              'ice.Input': ['ice.Generic', 'ice.Code'],
              'ice.Output': ['ice.Generic', 'ice.Code'],
              'ice.Constant': ['ice.Constant', 'ice.Memory'],
              'ice.Memory': ['ice.Constant', 'ice.Memory']
          }[lowerBlock.get('type')];
          // Check if the upper block is a valid replacement
          if (validReplacements.indexOf(upperBlock.get('type')) === -1) {
              return;
          }
          return lowerBlock;
      }

      function replaceBlock(upperBlock, lowerBlock) {

          if (lowerBlock) {
              // 1. Compute portsMap between the upperBlock and the lowerBlock
              var portsMap = computeAllPortsMap(upperBlock, lowerBlock);
              // 2. Reconnect the wires from the lowerBlock to the upperBlock
              var wires = graph.getConnectedLinks(lowerBlock);
              _.each(wires, function (wire) {
                  // Replace wire's source
                  replaceWireConnection(wire, 'source');
                  // Replace wire's target
                  replaceWireConnection(wire, 'target');
              });
              // 3. Move the upperModel to be centered with the lowerModel
              var lowerBlockSize = lowerBlock.get('size');
              var upperBlockSize = upperBlock.get('size');
              var lowerBlockType = lowerBlock.get('type');
              var lowerBlockPosition = lowerBlock.get('position');
              if (lowerBlockType === 'ice.Constant' || lowerBlockType === 'ice.Memory') {
                  // Center x, Bottom y
                  upperBlock.set('position', {
                      x: lowerBlockPosition.x + (lowerBlockSize.width - upperBlockSize.width) / 2,
                      y: lowerBlockPosition.y + lowerBlockSize.height - upperBlockSize.height
                  });
              }
              else if (lowerBlockType === 'ice.Input') {
                  // Right x, Center y
                  upperBlock.set('position', {
                      x: lowerBlockPosition.x + lowerBlockSize.width - upperBlockSize.width,
                      y: lowerBlockPosition.y + (lowerBlockSize.height - upperBlockSize.height) / 2
                  });
              }
              else if (lowerBlockType === 'ice.Output') {
                  // Left x, Center y
                  upperBlock.set('position', {
                      x: lowerBlockPosition.x,
                      y: lowerBlockPosition.y + (lowerBlockSize.height - upperBlockSize.height) / 2
                  });
              }
              else {
                  // Center x, Center y
                  upperBlock.set('position', {
                      x: lowerBlockPosition.x + (lowerBlockSize.width - upperBlockSize.width) / 2,
                      y: lowerBlockPosition.y + (lowerBlockSize.height - upperBlockSize.height) / 2
                  });
              }
              // 4. Remove the lowerModel
              lowerBlock.remove();
              prevLowerBlock = null;
          }

          function replaceWireConnection(wire, connectorType) {
              var connector = wire.get(connectorType);
              if (connector.id === lowerBlock.get('id') && portsMap[connector.port]) {
                  wire.set(connectorType, {
                      id: upperBlock.get('id'),
                      port: portsMap[connector.port]
                  });
              }
          }
      }

      function computeAllPortsMap(upperBlock, lowerBlock) {
          var portsMap = {};
          // Compute the ports for each side: left, right and top.
          // If there are ports with the same name they are ordered
          // by position, from 0 to n.
          //
          //                   Top ports 0 ·· n
          //                   _____|__|__|_____
          //  Left ports 0  --|                 |--  0 Right ports
          //             ·  --|      BLOCK      |--  ·
          //             ·  --|                 |--  ·
          //             n    |_________________|    n
          //                        |  |  |
          //                   Bottom port 0 -- n

          _.merge(portsMap, computePortsMap(upperBlock, lowerBlock, 'leftPorts'));
          _.merge(portsMap, computePortsMap(upperBlock, lowerBlock, 'rightPorts'));
          _.merge(portsMap, computePortsMap(upperBlock, lowerBlock, 'topPorts'));
          _.merge(portsMap, computePortsMap(upperBlock, lowerBlock, 'bottomPorts'));

          return portsMap;
      }

      function computePortsMap(upperBlock, lowerBlock, portType) {
          var portsMap = {};
          var usedUpperPorts = [];
          var upperPorts = upperBlock.get(portType);
          var lowerPorts = lowerBlock.get(portType);

          _.each(lowerPorts, function (lowerPort) {
              var matchedPorts = _.filter(upperPorts, function (upperPort) {
                  return lowerPort.name === upperPort.name &&
                      lowerPort.size === upperPort.size &&
                      !_.includes(usedUpperPorts, upperPort);
              });
              if (matchedPorts && matchedPorts.length > 0) {
                  portsMap[lowerPort.id] = matchedPorts[0].id;
                  usedUpperPorts = usedUpperPorts.concat(matchedPorts[0]);
              }
          });

          if (_.isEmpty(portsMap)) {
              // If there is no match replace the connections if the
              // port's size matches ignoring the port's name.
              var n = Math.min(upperPorts.length, lowerPorts.length);
              for (var i = 0; i < n; i++) {
                  if (lowerPorts[i].size === upperPorts[i].size) {
                      portsMap[lowerPorts[i].id] = upperPorts[i].id;
                  }
              }
          }

          return portsMap;
      }

      var prevLowerBlock = null;

      function disableReplacedBlock(lowerBlock) {
          if (prevLowerBlock) {
              // Unhighlight previous lower block
              var prevLowerBlockView = paper.findViewByModel(prevLowerBlock);
              prevLowerBlockView.$box.removeClass('block-disabled');
              prevLowerBlockView.$el.removeClass('block-disabled');
          }
          if (lowerBlock) {
              // Highlight new lower block
              var lowerBlockView = paper.findViewByModel(lowerBlock);
              lowerBlockView.$box.addClass('block-disabled');
              lowerBlockView.$el.addClass('block-disabled');
          }
          prevLowerBlock = lowerBlock;
      }

      // Debounce `pointermove` handler to improve the performance
      var debounceDisableReplacedBlock = nodeDebounce(function (upperBlock) {
          var lowerBlock = findLowerBlock(upperBlock);
          disableReplacedBlock(lowerBlock);
      }, 100);

      graph.on('add change:source change:target', function (cell) {
          if (cell.isLink() && cell.get('source').id) {
              // Link connected
              var target = cell.get('target');
              if (target.id) {
                  // Connected to a port
                  cell.attributes.lastTarget = target;
                  updatePortDefault(target, false);
              }
              else {
                  // Moving the wire connection
                  target = cell.get('lastTarget');
                  updatePortDefault(target, true);
              }
          }
      });

      graph.on('remove', function (cell) {
          if (cell.isLink()) {
              // Link removed
              var target = cell.get('target');
              if (!target.id) {
                  target = cell.get('lastTarget');
              }
              updatePortDefault(target, true);
          }
      });

      function updatePortDefault(target, value) {
          if (target) {
              var i, port;
              var block = graph.getCell(target.id);
              if (block) {
                  var data = block.get('data');
                  if (data && data.ports && data.ports.in) {
                      for (i in data.ports.in) {
                          port = data.ports.in[i];
                          if (port.name === target.port && port.default) {
                              port.default.apply = value;
                              break;
                          }
                      }
                      paper.findViewByModel(block.id).updateBox();
                  }
              }
          }
      }
      // Initialize state
      graph.trigger('state', state);

  };

  function updateWiresOnObstacles() {
      var cells = graph.getCells();

      //_.each(cells, function (cell) {
      for(var i=0, n=cells.length;i<n;i++){
          if (cells[i].isLink()) {
              paper.findViewByModel(cells[i]).update();
          }
      }
  }

  this.setBoardRules = function (rules) {
      var cells = graph.getCells();
      profile.set('boardRules', rules);

      for(var i=0, n=cells.length;i<n;i++){
          if (!cells[i].isLink()) {
              cells[i].attributes.rules = rules;
              var cellView = paper.findViewByModel(cells[i]);
              cellView.updateBox();
          }
      }
  };

  this.undo = function () {
      if (!this.addingDraggableBlock) {
          disableSelected();
          commandManager.undo();
          updateWiresOnObstacles();
      }
  };

  this.redo = function () {
      if (!this.addingDraggableBlock) {
          disableSelected();
          commandManager.redo();
          updateWiresOnObstacles();
      }
  };

  this.clearAll = function () {
      graph.clear();
      this.appEnable(true);
      selectionView.cancelSelection();
  };

  this.appEnable = function (value) {
      paper.options.enabled = value;
      var ael, i;
      if (value) {


          /* In the new javascript context of nwjs, angular can't change classes over the dom in this way,
          for this we need to update directly , but for the moment we maintain angular too to maintain model synced */

          angular.element('#menu').removeClass('is-disabled');
          angular.element('.paper').removeClass('looks-disabled');
          angular.element('.board-container').removeClass('looks-disabled');
          angular.element('.banner').addClass('hidden');

          ael = document.getElementById('menu');
          if (typeof ael !== 'undefined') {
              ael.classList.remove('is-disabled');
          }
          ael = document.getElementsByClassName('paper');
          if (typeof ael !== 'undefined' && ael.length > 0) {
              for (i = 0; i < ael.length; i++) {
                  ael[i].classList.remove('looks-disabled');
              }
          }

          ael = document.getElementsByClassName('board-container');
          if (typeof ael !== 'undefined' && ael.length > 0) {
              for (i = 0; i < ael.length; i++) {
                  ael[i].classList.remove('looks-disabled');
              }
          }

          ael = document.getElementsByClassName('banner');

          if (typeof ael !== 'undefined' && ael.length > 0) {
              for (i = 0; i < ael.length; i++) {
                  ael[i].classList.add('hidden');
              }
          }
          if (!common.isEditingSubmodule) {
              angular.element('.banner-submodule').addClass('hidden');
              ael = document.getElementsByClassName('banner-submodule');
              if (typeof ael !== 'undefined' && ael.length > 0) {
                  for (i = 0; i < ael.length; i++) {
                      ael[i].classList.add('hidden');
                  }
              }
          }

      }
      else {


          angular.element('#menu').addClass('is-disabled');
          angular.element('.paper').addClass('looks-disabled');
          angular.element('.board-container').addClass('looks-disabled');
          angular.element('.banner').removeClass('hidden');
          angular.element('.banner-submodule').removeClass('hidden');

          ael = document.getElementById('menu');

          if (typeof ael !== 'undefined') {
              ael.classList.add('is-disabled');
          }

          ael = document.getElementsByClassName('paper');

          if (typeof ael !== 'undefined' && ael.length > 0) {
              for (i = 0; i < ael.length; i++) {
                  ael[i].classList.add('looks-disabled');
              }
          }

          ael = document.getElementsByClassName('board-container');

          if (typeof ael !== 'undefined' && ael.length > 0) {
              for (i = 0; i < ael.length; i++) {
                  ael[i].classList.add('looks-disabled');
              }
          }
          ael = document.getElementsByClassName('banner');

          if (typeof ael !== 'undefined' && ael.length > 0) {
              for (i = 0; i < ael.length; i++) {
                  ael[i].classList.remove('hidden');
              }
          }
          ael = document.getElementsByClassName('banner-submodule');

          if (typeof ael !== 'undefined' && ael.length > 0) {
              for (i = 0; i < ael.length; i++) {
                  ael[i].classList.remove('hidden');
              }
          }
      }

      var cells = graph.getCells();
      _.each(cells, function (cell) {
          var cellView = paper.findViewByModel(cell.id);
          cellView.options.interactive = value;
          if (cell.get('type') !== 'ice.Generic') {
              if (value) {
                  cellView.$el.removeClass('disable-graph');
              }
              else {
                  cellView.$el.addClass('disable-graph');
              }
          }
          else if (cell.get('type') !== 'ice.Wire') {
              if (value) {
                  cellView.$el.find('.port-body').removeClass('disable-graph');
              }
              else {
                  cellView.$el.find('.port-body').addClass('disable-graph');
              }
          }
      });
  };

  this.createBlock = function (type, block) {
      blocks.newGeneric(type, block, function (cell) {
          self.addDraggableCell(cell);
      });
  };

  this.createBasicBlock = function (type) {
      blocks.newBasic(type, function (cells) {
          self.addDraggableCells(cells);
      });
  };

  this.addDraggableCell = function (cell) {
      this.addingDraggableBlock = true;
      var menuHeight = $('#menu').height();
      cell.set('position', {
          x: Math.round(((mousePosition.x - state.pan.x) / state.zoom - cell.get('size').width / 2) / gridsize) * gridsize,
          y: Math.round(((mousePosition.y - state.pan.y - menuHeight) / state.zoom - cell.get('size').height / 2) / gridsize) * gridsize,
      });
      graph.trigger('batch:start');
      addCell(cell);
      disableSelected();
      var opt = { transparent: true, initooltip: false };
      selection.add(cell);
      selectionView.createSelectionBox(cell, opt);
      selectionView.startAddingSelection({ clientX: mousePosition.x, clientY: mousePosition.y });
  };

  this.addDraggableCells = function (cells) {
      this.addingDraggableBlock = true;
      var menuHeight = $('#menu').height();
      if (cells.length > 0) {
          var firstCell = cells[0];
          var offset = {
              x: Math.round(((mousePosition.x - state.pan.x) / state.zoom - firstCell.get('size').width / 2) / gridsize) * gridsize - firstCell.get('position').x,
              y: Math.round(((mousePosition.y - state.pan.y - menuHeight) / state.zoom - firstCell.get('size').height / 2) / gridsize) * gridsize - firstCell.get('position').y,
          };
          _.each(cells, function (cell) {
              var position = cell.get('position');
              cell.set('position', {
                  x: position.x + offset.x,
                  y: position.y + offset.y
              });
          });
          graph.trigger('batch:start');
          addCells(cells);
          disableSelected();
          var opt = { transparent: true };
          _.each(cells, function (cell) {
              selection.add(cell);
              selectionView.createSelectionBox(cell, opt);
          });
          selectionView.startAddingSelection({ clientX: mousePosition.x, clientY: mousePosition.y });
      }
  };

  this.toJSON = function () {
      return graph.toJSON();
  };

  this.getCells = function () {
      return graph.getCells();
  };

  this.setCells = function (cells) {
      graph.attributes.cells.models = cells;
  };

  this.selectBoard = function (board, reset) {
      graph.startBatch('change');
      // Trigger board event
      var data = {
          previous: common.selectedBoard,
          next: board
      };
      graph.trigger('board', { data: data });
      var newBoard = boards.selectBoard(board.name);
      if (reset) {
          resetBlocks();
      }
      graph.stopBatch('change');
      return newBoard;
  };
  this.setBlockInfo = function (values, newValues, blockId) {

      if (typeof common.allDependencies === 'undefined') {
          return false;
      }

      graph.startBatch('change');
      // Trigger info event
      var data = {
          previous: values,
          next: newValues
      };
      graph.trigger('info', { data: data });

      common.allDependencies[blockId].package.name = newValues[0];
      common.allDependencies[blockId].package.version = newValues[1];
      common.allDependencies[blockId].package.description = newValues[2];
      common.allDependencies[blockId].package.author = newValues[3];
      common.allDependencies[blockId].package.image = newValues[4];


      graph.stopBatch('change');
  };


  this.setInfo = function (values, newValues, project) {
      graph.startBatch('change');
      // Trigger info event
      var data = {
          previous: values,
          next: newValues
      };
      graph.trigger('info', { data: data });
      project.set('package', {
          name: newValues[0],
          version: newValues[1],
          description: newValues[2],
          author: newValues[3],
          image: newValues[4]
      });
      graph.stopBatch('change');
  };

  this.selectLanguage = function (language) {
      graph.startBatch('change');
      // Trigger lang event
      var data = {
          previous: profile.get('language'),
          next: language
      };
      graph.trigger('lang', { data: data });
      language = utils.setLocale(language);
      graph.stopBatch('change');
      return language;
  };

  function resetBlocks() {
      var data, connectedLinks;
      var cells = graph.getCells();
      _.each(cells, function (cell) {
          if (cell.isLink()) {
              return;
          }
          var type = cell.get('blockType');
          if (type === 'basic.input' || type === 'basic.output') {
              // Reset choices in all Input / blocks
              var view = paper.findViewByModel(cell.id);
              cell.set('choices', (type === 'basic.input') ? common.pinoutInputHTML : common.pinoutOutputHTML);
              view.clearValues();
              view.applyChoices();
          }
          else if (type === 'basic.code') {
              // Reset rules in Code block ports
              data = utils.clone(cell.get('data'));
              connectedLinks = graph.getConnectedLinks(cell);
              if (data && data.ports && data.ports.in) {
                  _.each(data.ports.in, function (port) {
                      var connected = false;
                      _.each(connectedLinks, function (connectedLink) {
                          if (connectedLink.get('target').port === port.name) {
                              connected = true;
                              return false;
                          }
                      });
                      port.default = utils.hasInputRule(port.name, !connected);
                      cell.set('data', data);
                      paper.findViewByModel(cell.id).updateBox();
                  });
              }
          }
          else if (type.indexOf('basic.') === -1) {
              // Reset rules in Generic block ports
              var block = common.allDependencies[type];
              data = { ports: { in: [] } };
              connectedLinks = graph.getConnectedLinks(cell);
              if (block.design.graph.blocks) {
                  _.each(block.design.graph.blocks, function (item) {
                      if (item.type === 'basic.input' && !item.data.range) {
                          var connected = false;
                          _.each(connectedLinks, function (connectedLink) {
                              if (connectedLink.get('target').port === item.id) {
                                  connected = true;
                                  return false;
                              }
                          });
                          data.ports.in.push({
                              name: item.id,
                              default: utils.hasInputRule((item.data.clock ? 'clk' : '') || item.data.name, !connected)
                          });
                      }
                      cell.set('data', data);
                      paper.findViewByModel(cell.id).updateBox();
                  });
              }
          }
      });
  }

  this.resetCommandStack = function () {
      commandManager.reset();
  };

  this.cutSelected = function () {
      if (hasSelection()) {
          utils.copyToClipboard(selection, graph);
          this.removeSelected();
      }
  };

  this.copySelected = function () {
      if (hasSelection()) {
          utils.copyToClipboard(selection, graph);
      }
  };

  this.pasteSelected = function () {
      if (document.activeElement.tagName === 'A' ||
          document.activeElement.tagName === 'BODY') {
          utils.pasteFromClipboard(function (object) {
              if (object.version === common.VERSION) {
                  self.appendDesign(object.design, object.dependencies);
              }
          });
      }
  };
  this.pasteAndCloneSelected = function () {
      if (document.activeElement.tagName === 'A' ||
          document.activeElement.tagName === 'BODY') {
          utils.pasteFromClipboard(function (object) {
              if (object.version === common.VERSION) {

                  var hash = {};
                  // We will clone all dependencies
                  if (typeof object.dependencies !== false &&
                      object.dependencies !== false &&
                      object.dependencies !== null) {

                      var dependencies = utils.clone(object.dependencies);
                      object.dependencies = {};
                      var hId = false;

                      for (var dep in dependencies) {
                          dependencies[dep].package.name = dependencies[dep].package.name + ' CLONE';
                          var dat = new Date();
                          var seq = dat.getTime();
                          var oldversion = dependencies[dep].package.version.replace(/(.*)(-c\d*)/, '$1');
                          dependencies[dep].package.version = oldversion + '-c' + seq;

                          hId = utils.dependencyID(dependencies[dep]);
                          object.dependencies[hId] = dependencies[dep];
                          hash[dep] = hId;
                      }

                      //reassign dependencies

                      object.design.graph.blocks = object.design.graph.blocks.map(function (e) {
                          if (typeof e.type !== 'undefined' &&
                              typeof hash[e.type] !== 'undefined') {
                              e.type = hash[e.type];
                          }
                          return e;
                      });
                  }
                  self.appendDesign(object.design, object.dependencies);
              }
          });
      }
  };


  this.selectAll = function () {
      disableSelected();
      var cells = graph.getCells();
      _.each(cells, function (cell) {
          if (!cell.isLink()) {
              selection.add(cell);
              selectionView.createSelectionBox(cell);
          }
      });
  };

  function hasSelection() {
      return selection && selection.length > 0;
  }

  this.removeSelected = function () {
      if (hasSelection()) {
          graph.removeCells(selection.models);
          selectionView.cancelSelection();
          updateWiresOnObstacles();
      }
  };

  function disableSelected() {
      if (hasSelection()) {
          selectionView.cancelSelection();
      }
  }

  var stepValue = 8;

  this.stepLeft = function () {
      performStep({ x: -stepValue, y: 0 });
  };

  this.stepUp = function () {
      performStep({ x: 0, y: -stepValue });
  };

  this.stepRight = function () {
      performStep({ x: stepValue, y: 0 });
  };

  this.stepDown = function () {
      performStep({ x: 0, y: stepValue });
  };

  var stepCounter = 0;
  var stepTimer = null;
  var stepGroupingInterval = 500;
  var allowStep = true;
  var allosStepInterval = 200;

  function performStep(offset) {
      if (selection && allowStep) {
          allowStep = false;
          // Check consecutive-change interval
          if (Date.now() - stepCounter < stepGroupingInterval) {
              clearTimeout(stepTimer);
          }
          else {
              graph.startBatch('change');
          }
          // Move a step
          step(offset);
          // Launch timer
          stepTimer = setTimeout(function () {
              graph.stopBatch('change');
          }, stepGroupingInterval);
          // Reset counter
          stepCounter = Date.now();
          setTimeout(function () {
              allowStep = true;
          }, allosStepInterval);
      }
  }

  function step(offset) {
      var processedWires = {};
      // Translate blocks
      selection.each(function (cell) {
          cell.translate(offset.x, offset.y);
          selectionView.updateBox(cell);
          // Translate link vertices
          var connectedWires = graph.getConnectedLinks(cell);
          _.each(connectedWires, function (wire) {

              if (processedWires[wire.id]) {
                  return;
              }

              var vertices = wire.get('vertices');
              if (vertices && vertices.length) {
                  var newVertices = [];
                  _.each(vertices, function (vertex) {
                      newVertices.push({ x: vertex.x + offset.x, y: vertex.y + offset.y });
                  });
                  wire.set('vertices', newVertices);
              }

              processedWires[wire.id] = true;
          });
      });
  }

  this.isEmpty = function () {
      return (graph.getCells().length === 0);
  };

  this.isEnabled = function () {
      return paper.options.enabled;
  };

  this.loadDesign = function (design, opt, callback) {
      if (design &&
          design.graph &&
          design.graph.blocks &&
          design.graph.wires) {

          opt = opt || {};

          $('body').addClass('waiting');
          setTimeout(function () {

              commandManager.stopListening();

              self.clearAll();

              var cells = graphToCells(design.graph, opt);


              graph.addCells(cells);

              self.setState(design.state);

              self.appEnable(!opt.disabled);

              if (!opt.disabled) {
                  commandManager.listen();
              }

              if (callback) {
                  callback();
              }

              $('body').removeClass('waiting');

          }, 100);

          return true;
      }
  };

  function graphToCells(_graph, opt) {
      // Options:
      // - new: assign a new id to all the cells
      // - reset: clear I/O blocks values
      // - disabled: set disabled flag to the blocks
      // - offset: apply an offset to all the cells
      // - originalPinout: if reset is true (conversion), this variable
      //   contains the pinout for the previous board.

      var cell;
      var cells = [];
      var blocksMap = {};
      opt = opt || {};
      // Blocks
      var isMigrated = false;


      function getBlocksFromLib(id) {
          for (var dep in common.allDependencies) {
              if (id === dep) {
                  return common.allDependencies[dep].design.graph.blocks;
              }
          }
          return false;
      }
      function outputExists(oid, blks) {
          var founded = false;
          for (var i = 0; i < blks.length; i++) {
              if (blks[i].id === oid) {
                  return true;
              }
          }
          return founded;
      }
      /* Check if wire source exists (block+port) */
      function wireExists(wre, blk, edge) {

          var founded = false;
          var blk2 = false;

          for (var i = 0; i < blk.length; i++) {
              if (wre[edge].block === blk[i].id) {
                  founded = i;
                  break;
              }
          }
          if (founded !== false) {
              switch (blk[founded].type) {
                  case 'basic.memory':
                  case 'basic.constant':
                  case 'basic.outputLabel': case 'basic.inputLabel':
                  case 'basic.code':
                  case 'basic.input': case 'basic.output':
                      founded = true;
                      break;

                  default:
                      /* Generic type, look into the library */
                      blk2 = getBlocksFromLib(blk[i].type);
                      founded = outputExists(wre[edge].port, blk2);
              }
          }
          return founded;
      }

      // Wires
      var test = false;
      var todelete = [];

      for (var i = 0; i < _graph.wires.length; i++) {
          test = wireExists(_graph.wires[i], _graph.blocks, 'source');
          if (test) {

              test = wireExists(_graph.wires[i], _graph.blocks, 'target');
              if (test === true) {
              } else {
                  todelete.push(i);
              }
          } else {

              todelete.push(i);
          }
      }
      var tempw = [];
      for (var z = 0; z < _graph.wires.length; z++) {

          if (todelete.indexOf(z) === -1) {
              tempw.push(_graph.wires[z]);
          }
      }
      _graph.wires = utils.clone(tempw);



      _.each(_graph.blocks, function (blockInstance) {


          if (blockInstance.type !== false && blockInstance.type.indexOf('basic.') !== -1) {
              if (opt.reset &&
                  (blockInstance.type === 'basic.input' ||
                      blockInstance.type === 'basic.output')) {
                  var pins = blockInstance.data.pins;

                  // - if conversion from one board to other is in progress,
                  //   now is based on pin names, an improvement could be
                  //   through hash tables with assigned pins previously
                  //   selected by hwstudio developers
                  var replaced = false;
                  console.log('MIGRANDO',opt);
                  for (var i in pins) {
                      replaced = false;
                      if (typeof opt.designPinout !== 'undefined') {
                          for (var opin = 0; opin < opt.designPinout.length; opin++) {
                              if (String(opt.designPinout[opin].name) === String(pins[i].name)) {

                                  replaced = true;
                              }else{
                                  let prefix= String(pins[i].name).replace(/[0-9]/g, '');
                                  if(String(opt.designPinout[opin].name) === prefix){

                                      replaced=true;
                                  }


                              }

                              if(replaced===true){
                                  pins[i].name = opt.designPinout[opin].name;
                                  pins[i].value = opt.designPinout[opin].value;
                                  opin = opt.designPinout.length;
                                  replaced = true;
                                  isMigrated = true;
                              }
                          }
                      }
                      if (replaced === false) {
                          pins[i].name = '';
                          pins[i].value = '0';
                      }
                  }

              }
              cell = blocks.loadBasic(blockInstance, opt.disabled);
          }
          else {
              if (blockInstance.type in common.allDependencies) {
                  cell = blocks.loadGeneric(blockInstance, common.allDependencies[blockInstance.type], opt.disabled);
              }
          }

          blocksMap[cell.id] = cell;
          if (opt.new) {
              var oldId = cell.id;
              cell = cell.clone();
              blocksMap[oldId] = cell;
          }
          if (opt.offset) {
              cell.translate(opt.offset.x, opt.offset.y);
          }
          updateCellAttributes(cell);
          cells.push(cell);


      });

      if (isMigrated) {
          alertify.warning(gettextCatalog.getString('If you have blank IN/OUT pins, it\'s because there is no equivalent in this board'));
      }


      _.each(_graph.wires, function (wireInstance) {
          var source = blocksMap[wireInstance.source.block];
          var target = blocksMap[wireInstance.target.block];
          if (opt.offset) {
              var newVertices = [];
              var vertices = wireInstance.vertices;
              if (vertices && vertices.length) {
                  _.each(vertices, function (vertex) {
                      newVertices.push({
                          x: vertex.x + opt.offset.x,
                          y: vertex.y + opt.offset.y
                      });
                  });
              }
              wireInstance.vertices = newVertices;
          }
          cell = blocks.loadWire(wireInstance, source, target);
          if (opt.new) {
              cell = cell.clone();
          }
          updateCellAttributes(cell);
          cells.push(cell);
      });

      return cells;
  }

  this.appendDesign = function (design, dependencies) {
      if (design &&
          dependencies &&
          design.graph &&
          design.graph.blocks &&
          design.graph.wires) {

          selectionView.cancelSelection();
          // Merge dependencies
          for (var type in dependencies) {
              if (!(type in common.allDependencies)) {
                  common.allDependencies[type] = dependencies[type];
              }
          }

          // Append graph cells: blocks and wires
          // - assign new UUIDs to the cells
          // - add the graph in the mouse position
          var origin = graphOrigin(design.graph);
          var menuHeight = $('#menu').height();
          var opt = {
              new: true,
              disabled: false,
              reset: design.board !== common.selectedBoard.name,
              offset: {
                  x: Math.round(((mousePosition.x - state.pan.x) / state.zoom - origin.x) / gridsize) * gridsize,
                  y: Math.round(((mousePosition.y - state.pan.y - menuHeight) / state.zoom - origin.y) / gridsize) * gridsize,
              }
          };
          var cells = graphToCells(design.graph, opt);
          graph.addCells(cells);

          // Select pasted elements
          _.each(cells, function (cell) {
              if (!cell.isLink()) {
                  var cellView = paper.findViewByModel(cell);
                  if (cellView.$box.css('z-index') < z.index) {
                      cellView.$box.css('z-index', ++z.index);
                  }
                  selection.add(cell);
                  selectionView.createSelectionBox(cell);
              }
          });
      }
  };

  function graphOrigin(graph) {
      var origin = { x: Infinity, y: Infinity };
      _.each(graph.blocks, function (block) {
          var position = block.position;
          if (position.x < origin.x) {
              origin.x = position.x;
          }
          if (position.y < origin.y) {
              origin.y = position.y;
          }
      });
      return origin;
  }

  function updateCellAttributes(cell) {
      cell.attributes.state = state;
      cell.attributes.rules = profile.get('boardRules');
      //cell.attributes.zindex = z.index;
  }

  function addCell(cell) {
      if (cell) {
          updateCellAttributes(cell);
          graph.addCell(cell);
          if (!cell.isLink()) {
              var cellView = paper.findViewByModel(cell);
              if (cellView.$box.css('z-index') < z.index) {
                  cellView.$box.css('z-index', ++z.index);
              }
          }
      }
  }

  function addCells(cells) {
      _.each(cells, function (cell) {
          updateCellAttributes(cell);
      });
      graph.addCells(cells);
      _.each(cells, function (cell) {
          if (!cell.isLink()) {
              var cellView = paper.findViewByModel(cell);
              if (cellView.$box.css('z-index') < z.index) {
                  cellView.$box.css('z-index', ++z.index);
              }
          }
      });
  }

  this.resetCodeErrors = function () {
      var cells = graph.getCells();
      return new Promise(function (resolve) {
          _.each(cells, function (cell) {
              var cellView;
              if (cell.get('type') === 'ice.Code') {
                  cellView = paper.findViewByModel(cell);
                  cellView.$box.find('.code-content').removeClass('highlight-error');
                  $('.sticker-error', cellView.$box).remove();
                  cellView.clearAnnotations();
              }
              else if (cell.get('type') === 'ice.Generic') {
                  cellView = paper.findViewByModel(cell);

                  $('.sticker-error', cellView.$box).remove();
                  cellView.$box.remove('.sticker-error').removeClass('highlight-error');

              }
              else if (cell.get('type') === 'ice.Constant') {
                  cellView = paper.findViewByModel(cell);

                  $('.sticker-error', cellView.$box).remove();
                  cellView.$box.remove('.sticker-error').removeClass('highlight-error');

              }
          });
          resolve();
      });
  };

  $(document).on('codeError', function (evt, codeError) {
      var cells = graph.getCells();
      _.each(cells, function (cell) {
          var blockId, cellView;
          if ((codeError.blockType === 'code' && cell.get('type') === 'ice.Code') ||
              (codeError.blockType === 'constant' && cell.get('type') === 'ice.Constant')) {
              blockId = utils.digestId(cell.id);
          }
          else if (codeError.blockType === 'generic' && cell.get('type') === 'ice.Generic') {
              blockId = utils.digestId(cell.attributes.blockType);
          }
          if (codeError.blockId === blockId) {
              cellView = paper.findViewByModel(cell);
              if (codeError.type === 'error') {
                  if (cell.get('type') === 'ice.Code') {

                      $('.sticker-error', cellView.$box).remove();
                      cellView.$box.find('.code-content').addClass('highlight-error').append('<div class="sticker-error error-code-editor"></div>');

                  }
                  else {

                      $('.sticker-error', cellView.$box).remove();
                      cellView.$box.addClass('highlight-error').append('<div class="sticker-error"></div>');

                  }
              }
              if (cell.get('type') === 'ice.Code') {
                  cellView.setAnnotation(codeError);
              }
          }
      });
  });
});

//<

//
//> services/compiler.js
//

appModule.service("compiler", function(common, utils, _package) {
  this.generate = function(target, project, opt) {
    var content = '';
    var files = [];
    switch(target) {
      case 'verilog':
        content += header('//', opt);
        content += '`default_nettype none\n';
        content += verilogCompiler('main', project, opt);
        files.push({
          name: 'main.v',
          content: content
        });
        break;
      case 'pcf':
        content += header('#', opt);
        content += pcfCompiler(project, opt);
        files.push({
          name: 'main.pcf',
          content: content
        });
        break;
        case 'lpf':
          content += header('#', opt);
          content += lpfCompiler(project, opt);
          files.push({
            name: 'main.lpf',
            content: content
          });
          break;

      case 'list':
        files = listCompiler(project);
        break;
      case 'testbench':
        content += header('//', opt);
        content += testbenchCompiler(project);
        files.push({
          name: 'main_tb.v',
          content: content
        });
        break;
      case 'gtkwave':
        content += header('[*]', opt);
        content += gtkwaveCompiler(project);
        files.push({
          name: 'main_tb.gtkw',
          content: content
        });
        break;
      default:
        break;
    }
    return files;
  };

  function header(comment, opt) {
    var header = '';
    var date = new Date();
    opt = opt || {};
    if (opt.header !== false) {
      header += comment + ' Code generated by hwstudio ' + _package.version + '\n';
      if (opt.datetime !== false) {
        header += comment + ' ' + date.toUTCString() + '\n';
      }
      header += '\n';
    }
    return header;
  }

  function module(data) {
    var code = '';
    if (data && data.name && data.ports) {

      // Header

      code += '\nmodule ' + data.name;

      //-- Parameters

      var params = [];
      for (var p in data.params) {
        if (data.params[p] instanceof Object) {
          params.push(' parameter ' + data.params[p].name + ' = ' + (data.params[p].value ? data.params[p].value : '0'));
        }
      }

      if (params.length > 0) {
        code += ' #(\n';
        code += params.join(',\n');
        code += '\n)';
      }

      //-- Ports

      var ports = [];
      for (var i in data.ports.in) {
        var _in = data.ports.in[i];
        ports.push(' input ' + (_in.range ? (_in.range + ' ') : '') + _in.name);
      }
      for (var o in data.ports.out) {
        var _out = data.ports.out[o];
        ports.push(' output ' + (_out.range ? (_out.range + ' ') : '') + _out.name);
      }

      if (ports.length > 0) {
        code += ' (\n';
        code += ports.join(',\n');
        code += '\n)';
      }

      if (params.length === 0 && ports.length === 0) {
        code += '\n';
      }

      code += ';\n';

      // Content

      if (data.content) {

        var content = data.content.split('\n');

        content.forEach(function (element, index, array) {
          array[index] = ' ' + element;
        });

        code += content.join('\n');
      }

      // Footer

      code += '\nendmodule\n';
    }

    return code;
  }

  function getParams(project) {
    var params = [];
    var graph = project.design.graph;

    for (var i in graph.blocks) {
      var block = graph.blocks[i];
      if (block.type === 'basic.constant') {
        params.push({
          name: utils.digestId(block.id),
          value: block.data.value
        });
      }
      else if (block.type === 'basic.memory') {
        var name = utils.digestId(block.id);
        params.push({
          name: name,
          value: '"' + name + '.list"'
        });
      }
    }

    return params;
  }

  function getPorts(project) {
    var ports = {
      in: [],
      out: []
    };
    var graph = project.design.graph;

    for (var i in graph.blocks) {
      var block = graph.blocks[i];
      if (block.type === 'basic.input') {
        ports.in.push({
          name: utils.digestId(block.id),
          range: block.data.range ? block.data.range : ''
        });
      }
      else if (block.type === 'basic.output') {
        ports.out.push({
          name: utils.digestId(block.id),
          range: block.data.range ? block.data.range : ''
        });
      }
    }

    return ports;
  }


  function getContent(name, project) {
    var i, j, w;
    var content = [];
    var graph = project.design.graph;
    var connections = {
      localparam: [],
      wire: [],
      assign: []
    };
      // We need to rearrange internal design specification to compile it
      // Convert virtual labels to wire and some stuff .

      var vwiresLut={};
      var lidx,widx, lin, vw;
      var twire;

      //Create virtual wires

      //First identify sources and targets and create a look up table to work easy with it
      if( typeof graph !== 'undefined' &&
          graph.blocks.length >0 &&
          graph.wires.length>0){

          for(lidx in graph.blocks){
              lin=graph.blocks[lidx];
              if( lin.type === 'basic.inputLabel' ){
                 for(widx in graph.wires){
                      vw=graph.wires[widx];
                     if(vw.target.block === lin.id){
                          if(typeof vwiresLut[lin.data.name] === 'undefined'){
                              vwiresLut[lin.data.name]={source:[],target:[]};
                          }
                          twire=vw.source;
                          twire.size=vw.size;
                          vwiresLut[lin.data.name].source.push(twire);
                     }
                 }
          }
          if( lin.type === 'basic.outputLabel' ){
                 for(widx in graph.wires){
                     vw=graph.wires[widx];
                     if(vw.source.block === lin.id){
                          if(typeof vwiresLut[lin.data.name] === 'undefined'){
                              vwiresLut[lin.data.name]={source:[],target:[]};
                          }

                          twire=vw.target;
                          twire.size=vw.size;
                          vwiresLut[lin.data.name].target.push(twire);
                     }
                 }
          }
        }//for lin
      }// if typeof....

      //Create virtual wires
      for(widx in vwiresLut){
          vw=vwiresLut[widx];
          if(vw.source.length>0 && vw.target.length>0){
              for(var vi=0;vi<vw.source.length;vi++){
                  for(var vj=0;vj<vw.target.length;vj++){
                      graph.wires.push({
                          tcTodelete: true,
                          size: vw.size,
                          source:vw.source[vi],
                          target:vw.target[vj],
                          vertices:undefined
                      });
                  }
              }
          }
      }

      // Remove virtual blocks
      // Save temporal wires and delete it

      graph.wiresVirtual=[];
      var wtemp=[];
      var iwtemp;
      var wi;
      for (wi=0;wi<graph.wires.length;wi++){

          if( graph.wires[wi].source.port === 'outlabel' ||
              graph.wires[wi].target.port  === 'outlabel' ||
              graph.wires[wi].source.port === 'inlabel' ||
              graph.wires[wi].target.port === 'inlabel' ){

                  graph.wiresVirtual.push(graph.wires[wi]);

          }else{
              iwtemp=graph.wires[wi];
              if(typeof iwtemp.source.size !== 'undefined'){
                  iwtemp.size=iwtemp.source.size;
              }
              wtemp.push(iwtemp);
          }
      }
      graph.wires=utils.clone(wtemp);
      // End of rearrange design connections for compilation


    for (w in graph.wires) {
      var wire = graph.wires[w];
      if (wire.source.port === 'constant-out' ||
          wire.source.port === 'memory-out') {
        // Local Parameters
        var constantBlock = findBlock(wire.source.block, graph);
        var paramValue = utils.digestId(constantBlock.id);
        if (paramValue) {
          connections.localparam.push('localparam p' + w + ' = ' + paramValue  + ';');
        }
      }
      else {
        // Wires
        var range = wire.size ? ' [0:' + (wire.size-1) +'] ' : ' ';
        connections.wire.push('wire' + range + 'w' + w + ';');
      }
      // Assignations
      for (i in graph.blocks) {
        var block = graph.blocks[i];
        if (block.type === 'basic.input') {
          if (wire.source.block === block.id) {
            connections.assign.push('assign w' + w + ' = ' + utils.digestId(block.id) + ';');
          }
        }
        else if (block.type === 'basic.output') {
          if (wire.target.block === block.id) {
            if (wire.source.port === 'constant-out' ||
                wire.source.port === 'memory-out') {
              // connections.assign.push('assign ' + digestId(block.id) + ' = p' + w + ';');
            }
            else {
              connections.assign.push('assign ' + utils.digestId(block.id) + ' = w' + w + ';');
            }
          }
        }
      }
    }

    content = content.concat(connections.localparam);
    content = content.concat(connections.wire);
    content = content.concat(connections.assign);

    // Wires Connections

    var numWires = graph.wires.length;
      var gwi,gwj;
    for (i = 1; i < numWires; i++) {
      for (j = 0; j < i; j++) {
        gwi = graph.wires[i];
        gwj = graph.wires[j];
        if (gwi.source.block === gwj.source.block &&
            gwi.source.port === gwj.source.port &&
            gwi.source.port !== 'constant-out' &&
            gwi.source.port !== 'memory-out') {
          content.push('assign w' + i + ' = w' + j + ';');
        }
      }
    }

    // Block instances

    content = content.concat(getInstances(name, project.design.graph));

      // Restore original graph
      // delete temporal wires
      //

      wtemp=[];
      var wn=0;
      for ( wi=0,wn=graph.wiresVirtual.length; wi<wn; wi++){
          if(typeof graph.wiresVirtual[wi].tcTodelete !== 'undefined'  &&
              graph.wiresVirtual[wi].tcTodelete === true){
              //Nothing for now, only remove
          }else{
              wtemp.push(graph.wiresVirtual[wi]);
          }

      }

      for ( wi=0,wn=graph.wires.length;wi<wn; wi++){
          if(typeof graph.wires[wi].tcTodelete !== 'undefined'  &&
              graph.wires[wi].tcTodelete === true){
              //Nothing for now, only remove
          }else{
              wtemp.push(graph.wires[wi]);
          }

      }

      graph.wires=wtemp;

      delete graph.wiresVirtual;
      //END ONWORK

    return content.join('\n');
  }

  function getInstances(name, graph) {
    var w, wire;
    var instances = [];
    var blocks = graph.blocks;

    for (var b in blocks) {
      var block = blocks[b];

      if (block.type !== 'basic.input' &&
          block.type !== 'basic.output' &&
          block.type !== 'basic.constant' &&
          block.type !== 'basic.memory' &&
          block.type !== 'basic.info' &&
          block.type !== 'basic.inputLabel' &&
          block.type !== 'basic.outputLabel') {

        // Header
        var instance;
        if (block.type === 'basic.code') {
          instance = name + '_' + utils.digestId(block.id);
        }
        else {
          instance = utils.digestId(block.type);

        }

        //-- Parameters

        var params = [];
        for (w in graph.wires) {
          wire = graph.wires[w];
          if ((block.id === wire.target.block) &&
              (wire.source.port === 'constant-out' ||
               wire.source.port === 'memory-out')) {
            var paramName = wire.target.port;
            if (block.type !== 'basic.code') {
              paramName = utils.digestId(paramName);
            }
            var param = '';
            param += ' .' + paramName;
            param += '(p' + w + ')';
            params.push(param);
          }
        }

        if (params.length > 0) {
          instance += ' #(\n' + params.join(',\n') + '\n)';
        }

        //-- Instance name

        instance += ' ' +  utils.digestId(block.id);

        //-- Ports

        var ports = [];
        var portsNames = [];
        for (w in graph.wires) {
          wire = graph.wires[w];
          if (block.id === wire.source.block) {
            connectPort(wire.source.port, portsNames, ports, block);
          }
          if (block.id === wire.target.block) {
            if (wire.source.port !== 'constant-out' &&
                wire.source.port !== 'memory-out') {
              connectPort(wire.target.port, portsNames, ports, block);
            }
          }
        }

        instance += ' (\n' + ports.join(',\n') + '\n);';

        if (instance) {
          instances.push(instance);
        }
      }
    }

    function connectPort(portName, portsNames, ports, block) {
      if (portName) {
        if (block.type !== 'basic.code') {
          portName = utils.digestId(portName);
        }
        if (portsNames.indexOf(portName) === -1) {
          portsNames.push(portName);
          var port = '';
          port += ' .' + portName;
          port += '(w' + w + ')';
          ports.push(port);
        }
      }
    }

    return instances;
  }

  function findBlock(id, graph) {
    for (var b in graph.blocks) {
      if (graph.blocks[b].id === id) {
        return graph.blocks[b];
      }
    }
    return null;
  }

  this.getInitPorts = getInitPorts;
  function getInitPorts(project) {
    // Find not connected input wire ports to initialize

    var i, j;
    var initPorts = [];
    var blocks = project.design.graph.blocks;

    // Find all not connected input ports:
    // - Code blocks
    // - Generic blocks
    for (i in blocks) {
      var block = blocks[i];
      if (block) {
        if (block.type === 'basic.code' || !block.type.startsWith('basic.')) {
          // Code block or Generic block
          for (j in block.data.ports.in) {
            var inPort = block.data.ports.in[j];
            if (inPort.default && inPort.default.apply) {
              initPorts.push({
                block: block.id,
                port: inPort.name,
                name: inPort.default.port,
                pin: inPort.default.pin
              });
            }
          }
        }
      }
    }

    return initPorts;
  }

  this.getInitPins = getInitPins;
  function getInitPins(project) {
    // Find not used output pins to initialize

    var i;
    var initPins = [];
    var usedPins = [];
    var blocks = project.design.graph.blocks;

    // Find all set output pins
    for (i in blocks) {
      var block = blocks[i];
      if (block.type === 'basic.output') {
        for (var p in block.data.pins) {
          usedPins.push(block.data.virtual ? '' : block.data.pins[p].value);
        }
      }
    }

    // Filter pins defined in rules
    var allInitPins = common.selectedBoard.rules.output;
    for (i in allInitPins) {
      if (usedPins.indexOf(allInitPins[i].pin) === -1) {
        initPins.push(allInitPins[i]);
      }
    }

    return initPins;
  }

  function verilogCompiler(name, project, opt) {
    var i, data, block, code = '';
    opt = opt || {};

    if (project &&
        project.design &&
        project.design.graph) {

      var blocks = project.design.graph.blocks;
      var dependencies = project.dependencies;

      // Main module

      if (name) {

        // Initialize input ports

        if (name === 'main' && opt.boardRules) {

          var initPorts = opt.initPorts || getInitPorts(project);
          for (i in initPorts) {
            var initPort = initPorts[i];

            // Find existing input block with the initPort value
            var found = false;
            var source = {
              block: initPort.name,
              port: 'out'
            };
            for (i in blocks) {
              block = blocks[i];
              if (block.type === 'basic.input' &&
                  !block.data.range &&
                  !block.data.virtual &&
                  initPort.pin === block.data.pins[0].value) {
                found = true;
                source.block = block.id;
                break;
              }
            }

            if (!found) {
              // Add imaginary input block with the initPort value
              project.design.graph.blocks.push({
                id: initPort.name,
                type: 'basic.input',
                data: {
                  name: initPort.name,
                  pins: [
                    {
                      index: '0',
                      value: initPort.pin
                    }
                  ],
                  virtual: false
                }
              });
            }

            // Add imaginary wire between the input block and the initPort
            project.design.graph.wires.push({
              source: {
                block: source.block,
                port: source.port
              },
              target: {
                block: initPort.block,
                port: initPort.port
              }
            });
          }
        }

        var params = getParams(project);
        var ports = getPorts(project);
        var content = getContent(name, project);

        // Initialize output pins

        if (name === 'main' && opt.boardRules) {

          var initPins = opt.initPins || getInitPins(project);
          var n = initPins.length;

          if (n > 0) {
            // Declare m port
            ports.out.push({
              name: 'vinit',
              range: '[0:' + (n-1) + ']'
            });
            // Generate port value
            var value = n.toString() + '\'b';
            for (i in initPins) {
              value += initPins[i].bit;
            }
            // Assign m port
            content += '\nassign vinit = ' + value + ';';
          }
        }

        data = {
          name: name,
          params: params,
          ports: ports,
          content: content
        };
        code += module(data);
      }

      // Dependencies modules

      for (var d in dependencies) {
        code += verilogCompiler(utils.digestId(d), dependencies[d]);
      }

      // Code modules

      for (i in blocks) {
        block = blocks[i];
        if (block) {
          if (block.type === 'basic.code') {
            data = {
              name: name + '_' + utils.digestId(block.id),
              params: block.data.params,
              ports: block.data.ports,
              content: block.data.code //.replace(/\n+/g, '\n').replace(/\n$/g, '')
            };
            code += module(data);
          }
        }
      }
    }

    return code;
  }

  function pcfCompiler(project, opt) {
    var i, j, block, pin, value, code = '';
    var blocks = project.design.graph.blocks;
    opt = opt || {};

    for (i in blocks) {
      block = blocks[i];
      if (block.type === 'basic.input' ||
          block.type === 'basic.output') {

        if (block.data.pins.length > 1) {
          for (var p in block.data.pins) {
            pin = block.data.pins[p];
            value = block.data.virtual ? '' : pin.value;
            code += 'set_io ';
            code += utils.digestId(block.id);
            code += '[' + pin.index + '] ';
            code += value;
            code += '\n';
          }
        }
        else if (block.data.pins.length > 0) {
          pin = block.data.pins[0];
          value = block.data.virtual ? '' : pin.value;
          code += 'set_io ';
          code += utils.digestId(block.id);
          code += ' ';
          code += value;
          code += '\n';
        }
      }
    }

    if (opt.boardRules) {
      // Declare init input ports

      var used = [];
      var initPorts = opt.initPorts || getInitPorts(project);
      for (i in initPorts) {
        var initPort = initPorts[i];
        if (used.indexOf(initPort.pin) !== -1) {
          break;
        }
        used.push(initPort.pin);

        // Find existing input block with the initPort value
        var found = false;
        for (j in blocks) {
          block = blocks[j];
          if (block.type === 'basic.input' &&
          !block.data.range &&
          !block.data.virtual &&
          initPort.pin === block.data.pins[0].value) {
            found = true;
            used.push(initPort.pin);
            break;
          }
        }

        if (!found) {
          code += 'set_io v';
          code += initPorts[i].name;
          code += ' ';
          code += initPorts[i].pin;
          code += '\n';
        }
      }

      // Declare init output pins

      var initPins = opt.initPins || getInitPins(project);
      if (initPins.length > 1) {
        for (i in initPins) {
          code += 'set_io vinit[' + i + '] ';
          code += initPins[i].pin;
          code += '\n';
        }
      }
      else if (initPins.length > 0) {
        code += 'set_io vinit ';
        code += initPins[0].pin;
        code += '\n';
      }
    }

    return code;
  }
  function lpfCompiler(project, opt) {
    var i, block, pin, value, code = '';
    var blocks = project.design.graph.blocks;
    opt = opt || {};

    for (i in blocks) {
      block = blocks[i];
      if (block.type === 'basic.input' ||
          block.type === 'basic.output') {

        if (block.data.pins.length > 1) {
          for (var p in block.data.pins) {
            pin = block.data.pins[p];
            value = block.data.virtual ? '' : pin.value;
            code += 'LOCATE COMP "';
            code += utils.digestId(block.id);
            code += '[' + pin.index + ']" SITE "';
            code += value;
            code += '";\n';

            code += 'IOBUF PORT "';
            code += utils.digestId(block.id);
            code += '[' + pin.index + ']" PULLMODE=NONE IO_TYPE=LVCMOS33 DRIVE=4;\n';
          }
        }
        else if (block.data.pins.length > 0) {
          pin = block.data.pins[0];
          value = block.data.virtual ? '' : pin.value;
          code += 'LOCATE COMP "';
          code += utils.digestId(block.id);
          code += '" SITE "';
          code += value;
          code += '";\n';

          code += 'IOBUF PORT "';
          code += utils.digestId(block.id);
          code += '" PULLMODE=NONE IO_TYPE=LVCMOS33 DRIVE=4;\n';
        }
      }
    }

    return code;
  }

  function listCompiler(project) {
    var i;
    var listFiles = [];

    if (project &&
        project.design &&
        project.design.graph) {

      var blocks = project.design.graph.blocks;
      var dependencies = project.dependencies;

      // Find in blocks

      for (i in blocks) {
        var block = blocks[i];
        if (block.type === 'basic.memory') {
          listFiles.push({
            name: utils.digestId(block.id) + '.list',
            content: block.data.list
          });
        }
      }

      // Find in dependencies

      for (i in dependencies) {
        var dependency = dependencies[i];
        listFiles = listFiles.concat(listCompiler(dependency));
      }
    }

    return listFiles;
  }

  function testbenchCompiler(project) {
    var i, o, p;
    var code = '';

    code += '// Testbench template\n\n';

    code += '`default_nettype none\n';
    code += '`define DUMPSTR(x) `"x.vcd`"\n';
    code += '`timescale 10 ns / 1 ns\n\n';

    var ports = { in: [], out: [] };
    var content = '\n';

    content += '// Simulation time: 100ns (10 * 10ns)\n';
    content += 'parameter DURATION = 10;\n';

    // Parameters
    var _params = [];
    var params = mainParams(project);
    if (params.length > 0) {
      content += '\n// TODO: edit the module parameters here\n';
      content += '// e.g. localparam constant_value = 1;\n';
      for (p in params) {
        content += 'localparam ' + params[p].name + ' = ' + params[p].value + ';\n';
        _params.push(' .' + params[p].id + '(' + params[p].name + ')');
      }
    }

    // Input/Output
    var io = mainIO(project);
    var input = io.input;
    var output = io.output;
    content += '\n// Input/Output\n';
    var _ports = [];
    for (i in input) {
      content += 'reg ' + (input[i].range ? input[i].range + ' ': '') + input[i].name + ';\n';
      _ports.push(' .' + input[i].id + '(' + input[i].name + ')');
    }
    for (o in output) {
      content += 'wire ' + (output[o].range ? output[o].range + ' ': '') + output[o].name + ';\n';
      _ports.push(' .' + output[o].id + '(' + output[o].name + ')');
    }

    // Module instance
    content += '\n// Module instance\n';
    content += 'main';

    //-- Parameters
    if (_params.length > 0) {
      content += ' #(\n';
      content += _params.join(',\n');
      content += '\n)';
    }

    content += ' MAIN';

    //-- Ports
    if (_ports.length > 0) {
      content += ' (\n';
      content += _ports.join(',\n');
      content += '\n)';
    }

    content += ';\n';

    // Clock signal
    var hasClk = false;
    for (i in input) {
      if (input[i].name.toLowerCase() === 'clk') {
        hasClk = true;
        break;
      }
    }
    if (hasClk) {
      content += '\n// Clock signal\n';
      content += 'always #0.5 clk = ~clk;\n';
    }

    content += '\ninitial begin\n';
    content += ' // File were to store the simulation results\n';
    content += ' $dumpfile(`DUMPSTR(`VCD_OUTPUT));\n';
    content += ' $dumpvars(0, main_tb);\n\n';
    content += ' // TODO: initialize the registers here\n';
    content += ' // e.g. value = 1;\n';
    content += ' // e.g. #2 value = 0;\n';
    for (i in input) {
      content += ' ' + input[i].name + ' = 0;\n';
    }
    content += '\n';
    content += ' #(DURATION) $display("End of simulation");\n';
    content += ' $finish;\n';
    content += 'end\n';

    var data = {
      name: 'main_tb',
      ports: ports,
      content: content
    };
    code += module(data);

    return code;
  }

  function gtkwaveCompiler(project) {
    var code = '';

    var io = mainIO(project);
    var input = io.input;
    var output = io.output;

    for (var i in input) {
      code += 'main_tb.' + input[i].name + (input[i].range ? input[i].range: '') + '\n';
    }
    for (var o in output) {
      code += 'main_tb.' + output[o].name + (output[o].range ? output[o].range: '') + '\n';
    }

    return code;
  }

  function mainIO(project) {
    var input = [];
    var output = [];
    var inputUnnamed = 0;
    var outputUnnamed = 0;
    var graph = project.design.graph;
    for (var i in graph.blocks) {
      var block = graph.blocks[i];
      if (block.type === 'basic.input') {
        if (block.data.name) {
          input.push({
            id: utils.digestId(block.id),
            name: block.data.name.replace(/ /g, '_'),
            range: block.data.range
          });
        }
        else {
          input.push({
            id: utils.digestId(block.id),
            name: inputUnnamed.toString(),
          });
          inputUnnamed += 1;
        }
      }
      else if (block.type === 'basic.output') {
        if (block.data.name) {
          output.push({
            id: utils.digestId(block.id),
            name: block.data.name.replace(/ /g, '_'),
            range: block.data.range
          });
        }
        else {
          output.push({
            id: utils.digestId(block.id),
            name: outputUnnamed.toString()
          });
          outputUnnamed += 1;
        }
      }
    }

    return {
      input: input,
      output: output
    };
  }

  function mainParams(project) {
    var params = [];
    var paramsUnnamed = 0;
    var graph = project.design.graph;
    for (var i in graph.blocks) {
      var block = graph.blocks[i];
      if (block.type === 'basic.constant') {
        if (!block.data.local) {
          if (block.data.name) {
            params.push({
              id: utils.digestId(block.id),
              name: 'constant_' + block.data.name.replace(/ /g, '_'),
              value: block.data.value
            });
          }
          else {
            params.push({
              id: utils.digestId(block.id),
              name: 'constant_' + paramsUnnamed.toString(),
              value: block.data.value
            });
            paramsUnnamed += 1;
          }
        }
      }
    }
    return params;
  }
});

//<

//
//> services/project.js
//

appModule.service("project", function(
  $rootScope,
  graph,
  boards,
  compiler,
  profile,
  utils,
  common,
  gui,
  gettextCatalog,
  nodeFs,
  nodePath
) {
  this.name = '';  // Used in File dialogs
  this.path = '';  // Used in Save / Save as
  this.filepath = ''; // Used to find external resources (.v, .vh, .list)
  this.changed = false;
  this.backup = false;
  var project = _default();

  function _default() {
    return {
      version: common.VERSION,
      package: {
        name: '',
        version: '',
        description: '',
        author: '',
        image: ''
      },
      design: {
        board: '',
        graph: { blocks: [], wires: [] }
      },
      dependencies: {}
    };
  }

  this.get = function (key) {
    if (key in project) {
      return project[key];
    }
    else {
      return project;
    }
  };

  this.set = function (key, obj) {
    if (key in project) {
      project[key] = obj;
    }
  };

  this.open = function (filepath, emptyPath) {
    var self = this;
    this.path = emptyPath ? '' : filepath;
    this.filepath = filepath;
    utils.readFile(filepath)
      .then(function (data) {
        var name = utils.basename(filepath);
        self.load(name, data);
      })
      .catch(function () {
        alertify.error(gettextCatalog.getString('Invalid project format'), 30);
      });
  };

  this.load = function (name, data) {
    var self = this;
    if (!checkVersion(data.version)) {
      return;
    }
    project = _safeLoad(data, name);
    if (project.design.board !== common.selectedBoard.name) {
      var projectBoard = boards.boardLabel(project.design.board);
      alertify.set('confirm', 'labels', {
        'ok': gettextCatalog.getString('Load'),
        'cancel': gettextCatalog.getString('Convert')
      });
      alertify.confirm(
        gettextCatalog.getString('This project is designed for the {{name}} board.', { name: utils.bold(projectBoard) }) + '<br>' +
        gettextCatalog.getString('You can load it as it is or convert it for the {{name}} board.', { name: utils.bold(common.selectedBoard.info.label) }),
        function () {
          // Load
          _load();
        },
        function () {
          // Convert
          project.design.board = common.selectedBoard.name;

          _load(true, boardMigration(projectBoard, common.selectedBoard.name));
        });
    }
    else {
      _load();
    }

    function _load(reset, originalBoard) {
      common.allDependencies = project.dependencies;
      var opt = { reset: reset || false, disabled: false };
      if (typeof originalBoard !== 'undefined' && originalBoard !== false) {
        for (var i = 0; i < common.boards.length; i++) {
          if (String(common.boards[i].name) === String(originalBoard)) {
            opt.originalPinout = common.boards[i].pinout;

          }
          if (String(common.boards[i].name) === String(project.design.board)) {
            opt.designPinout = common.boards[i].pinout;
          }
        }
      }

      var ret = graph.loadDesign(project.design, opt, function () {

        graph.resetCommandStack();
        graph.fitContent();
        alertify.success(gettextCatalog.getString('Project {{name}} loaded', { name: utils.bold(name) }));
        common.hasChangesSinceBuild = true;
      });

      if (ret) {
        profile.set('board', boards.selectBoard(project.design.board).name);
        self.updateTitle(name);
      }
      else {
        alertify.error(gettextCatalog.getString('Wrong project format: {{name}}', { name: utils.bold(name) }), 30);
      }
      setTimeout(function () {
        alertify.set('confirm', 'labels', {
          'ok': gettextCatalog.getString('OK'),
          'cancel': gettextCatalog.getString('Cancel')
        });
      }, 100);
    }
  };

  function boardMigration(oldBoard, newBoard) {

    var pboard = false;

    switch (oldBoard.toLowerCase()) {
      case 'icezum alhambra': case 'icezum':
        switch (newBoard.toLowerCase()) {
          case 'alhambra-ii': pboard = 'icezum'; break;
          default: pboard='icezum';
        }
        break;
    }
    return pboard;
  }


  function checkVersion(version) {
    if (version > common.VERSION) {
      var errorAlert = alertify.error(gettextCatalog.getString('Unsupported project format {{version}}', { version: version }), 30);
      alertify.message(gettextCatalog.getString('Click here to <b>download a newer version</b> of hwstudio'), 30)
        .callback = function (isClicked) {
          if (isClicked) {
            errorAlert.dismiss(false);
            gui.Shell.openExternal('https://github.com/umarcor/hwstudio/releases');
          }
        };
      return false;
    }
    return true;
  }

  function _safeLoad(data, name) {
    // Backwards compatibility
    var project = {};
    switch (data.version) {
      case common.VERSION:
      case '1.1':
        project = data;
        break;
      case '1.0':
        project = convert10To12(data);
        break;
      default:
        project = convertTo10(data, name);
        project = convert10To12(project);
        break;
    }
    project.version = common.VERSION;
    return project;
  }

  function convert10To12(data) {
    var project = _default();
    project.package = data.package;
    project.design.board = data.design.board;
    project.design.graph = data.design.graph;

    var depsInfo = findSubDependencies10(data.design.deps);
    replaceType10(project, depsInfo);
    for (var d in depsInfo) {
      var dep = depsInfo[d];
      replaceType10(dep.content, depsInfo);
      project.dependencies[dep.id] = dep.content;
    }

    return project;
  }

  function findSubDependencies10(deps) {
    var depsInfo = {};
    for (var key in deps) {
      var block = utils.clone(deps[key]);
      // Go recursive
      var subDepsInfo = findSubDependencies10(block.design.deps);
      for (var name in subDepsInfo) {
        if (!(name in depsInfo)) {
          depsInfo[name] = subDepsInfo[name];
        }
      }
      // Add current dependency
      block = pruneBlock(block);
      delete block.design.deps;
      block.package.name = block.package.name || key;
      block.package.description = block.package.description || key;
      if (!(key in depsInfo)) {
        depsInfo[key] = {
          id: utils.dependencyID(block),
          content: block
        };
      }
    }
    return depsInfo;
  }

  function replaceType10(project, depsInfo) {
    for (var i in project.design.graph.blocks) {
      var type = project.design.graph.blocks[i].type;
      if (type.indexOf('basic.') === -1) {
        project.design.graph.blocks[i].type = depsInfo[type].id;
      }
    }
  }

  function convertTo10(data, name) {
    var project = {
      version: '1.0',
      package: {
        name: name || '',
        version: '',
        description: name || '',
        author: '',
        image: ''
      },
      design: {
        board: '',
        graph: {},
        deps: {}
      },
    };
    for (var b in data.graph.blocks) {
      var block = data.graph.blocks[b];
      switch (block.type) {
        case 'basic.input':
        case 'basic.output':
        case 'basic.outputLabel':
        case 'basic.inputLabel':
          block.data = {
            name: block.data.label,
            pins: [{
              index: '0',
              name: block.data.pin ? block.data.pin.name : '',
              value: block.data.pin ? block.data.pin.value : '0'
            }],
            virtual: false
          };
          break;
        case 'basic.constant':
          block.data = {
            name: block.data.label,
            value: block.data.value,
            local: false
          };
          break;
        case 'basic.code':
          var params = [];
          for (var p in block.data.params) {
            params.push({
              name: block.data.params[p]
            });
          }
          var inPorts = [];
          for (var i in block.data.ports.in) {
            inPorts.push({
              name: block.data.ports.in[i]
            });
          }

          var outPorts = [];
          for (var o in block.data.ports.out) {
            outPorts.push({
              name: block.data.ports.out[o]
            });
          }
          block.data = {
            code: block.data.code,
            params: params,
            ports: {
              in: inPorts,
              out: outPorts
            }
          };
          break;
      }
    }
    project.design.board = data.board;
    project.design.graph = data.graph;
    // Safe load all dependencies recursively
    for (var key in data.deps) {
      project.design.deps[key] = convertTo10(data.deps[key], key);
    }

    return project;
  }

  this.save = function (filepath, callback) {
    var backupProject = false;
    var name = utils.basename(filepath);
    if (subModuleActive) {
      backupProject = utils.clone(project);

    } else {

      this.updateTitle(name);
    }

    sortGraph();
    this.update();

    // Copy included files if the previous filepath
    // is different from the new filepath
    if (this.filepath !== filepath) {
      var origPath = utils.dirname(this.filepath);
      var destPath = utils.dirname(filepath);
      // 1. Parse and find included files
      var code = compiler.generate('verilog', project)[0].content;
      var listFiles = compiler.generate('list', project);
      var internalFiles = listFiles.map(function (res) { return res.name; });
      var files = utils.findIncludedFiles(code);
      files = _.difference(files, internalFiles);
      // Are there included files?
      if (files.length > 0) {
        // 2. Check project's directory
        if (filepath) {
          // 3. Copy the included files
          copyIncludedFiles(files, origPath, destPath, function (success) {
            if (success) {
              // 4. Success: save project
              doSaveProject();
            }
          });
        }
      }
      else {
        // No included files to copy
        // 4. Save project
        doSaveProject();
      }
    }
    else {
      // Same filepath
      // 4. Save project
      doSaveProject();
    }
    if (subModuleActive) {
      project = utils.clone(backupProject);
      //        sortGraph();
      //        this.update();


    } else {
      this.path = filepath;
      this.filepath = filepath;
    }

    function doSaveProject() {
      utils.saveFile(filepath, pruneProject(project))
        .then(function () {
          if (callback) {
            callback();
          }
          alertify.success(gettextCatalog.getString('Project {{name}} saved', { name: utils.bold(name) }));
        })
        .catch(function (error) {
          alertify.error(error, 30);
        });
    }

  };

  function sortGraph() {
    var cells = graph.getCells();

    // Sort Constant/Memory cells by x-coordinate
    cells = _.sortBy(cells, function (cell) {
      if (cell.get('type') === 'ice.Constant' ||
        cell.get('type') === 'ice.Memory') {
        return cell.get('position').x;
      }
    });

    // Sort I/O cells by y-coordinate
    cells = _.sortBy(cells, function (cell) {
      if (cell.get('type') === 'ice.Input' ||
        cell.get('type') === 'ice.Output') {
        return cell.get('position').y;
      }
    });

    graph.setCells(cells);
  }

  this.addBlockFile = function (filepath, notification) {
    var self = this;
    utils.readFile(filepath)
      .then(function (data) {
        if (!checkVersion(data.version)) {
          return;
        }
        var name = utils.basename(filepath);
        var block = _safeLoad(data, name);
        if (block) {
          var origPath = utils.dirname(filepath);
          var destPath = utils.dirname(self.path);
          // 1. Parse and find included files
          var code = compiler.generate('verilog', block)[0].content;
          var listFiles = compiler.generate('list', block);
          var internalFiles = listFiles.map(function (res) { return res.name; });
          var files = utils.findIncludedFiles(code);
          files = _.difference(files, internalFiles);
          // Are there included files?
          if (files.length > 0) {
            // 2. Check project's directory
            if (self.path) {
              // 3. Copy the included files
              copyIncludedFiles(files, origPath, destPath, function (success) {
                if (success) {
                  // 4. Success: import block
                  doImportBlock();
                }
              });
            }
            else {
              alertify.confirm(gettextCatalog.getString('This import operation requires a project path. You need to save the current project. Do you want to continue?'),
                function () {
                  $rootScope.$emit('saveProjectAs', function () {
                    setTimeout(function () {
                      // 3. Copy the included files
                      copyIncludedFiles(files, origPath, destPath, function (success) {
                        if (success) {
                          // 4. Success: import block
                          doImportBlock();
                        }
                      });
                    }, 500);
                  });
                });
            }
          }
          else {
            // No included files to copy
            // 4. Import block
            doImportBlock();
          }
        }

        function doImportBlock() {
          self.addBlock(block);
          if (notification) {
            alertify.success(gettextCatalog.getString('Block {{name}} imported', { name: utils.bold(block.package.name) }));
          }
        }
      })
      .catch(function () {
        alertify.error(gettextCatalog.getString('Invalid project format'), 30);
      });
  };

  function copyIncludedFiles(files, origPath, destPath, callback) {
    var success = true;
    async.eachSeries(files, function (filename, next) {
      setTimeout(function () {
        if (origPath !== destPath) {
          if (nodeFs.existsSync(nodePath.join(destPath, filename))) {
            alertify.confirm(gettextCatalog.getString('File {{file}} already exists in the project path. Do you want to replace it?', { file: utils.bold(filename) }),
              function () {
                success = success && doCopySync(origPath, destPath, filename);
                if (!success) {
                  return next(); // break
                }
                next();
              },
              function () {
                next();
              });
          }
          else {
            success = success && doCopySync(origPath, destPath, filename);
            if (!success) {
              return next(); // break
            }
            next();
          }
        }
        else {
          return next(); // break
        }
      }, 0);
    }, function (/*result*/) {
      return callback(success);
    });
  }

  function doCopySync(origPath, destPath, filename) {
    var orig = nodePath.join(origPath, filename);
    var dest = nodePath.join(destPath, filename);
    var success = utils.copySync(orig, dest);
    if (success) {
      alertify.message(gettextCatalog.getString('File {{file}} imported', { file: utils.bold(filename) }), 5);
    }
    else {
      alertify.error(gettextCatalog.getString('Original file {{file}} does not exist', { file: utils.bold(filename) }), 30);
    }
    return success;
  }

  function pruneProject(project) {
    var _project = utils.clone(project);

    _prune(_project);
    for (var d in _project.dependencies) {
      _prune(_project.dependencies[d]);
    }

    function _prune(_project) {
      delete _project.design.state;
      for (var i in _project.design.graph.blocks) {
        var block = _project.design.graph.blocks[i];
        switch (block.type) {
          case 'basic.input':
          case 'basic.output':
          case 'basic.outputLabel':
          case 'basic.inputLabel':
          case 'basic.constant':
          case 'basic.memory':
            break;
          case 'basic.code':
            for (var j in block.data.ports.in) {
              delete block.data.ports.in[j].default;
            }
            break;
          case 'basic.info':
            delete block.data.text;
            break;
          default:
            // Generic block
            delete block.data;
            break;
        }
      }
    }

    return _project;
  }

  this.snapshot = function () {
    this.backup = utils.clone(project);
  };

  this.restoreSnapshot = function () {
    project = utils.clone(this.backup);

  };

  this.update = function (opt, callback) {
    var graphData = graph.toJSON();
    var p = utils.cellsToProject(graphData.cells, opt);
    project.design.board = p.design.board;
    project.design.graph = p.design.graph;
    project.dependencies = p.dependencies;
    if (subModuleActive && typeof common.submoduleId !== 'undefined' && typeof common.allDependencies[common.submoduleId] !== 'undefined') {
      project.package = common.allDependencies[common.submoduleId].package;
    }
    var state = graph.getState();
    project.design.state = {
      pan: {
        x: parseFloat(state.pan.x.toFixed(4)),
        y: parseFloat(state.pan.y.toFixed(4))
      },
      zoom: parseFloat(state.zoom.toFixed(4))
    };

    if (callback) {
      callback();
    }
  };

  this.updateTitle = function (name) {
    if (name) {
      this.name = name;
      graph.resetBreadcrumbs(name);
    }
    var title = (this.changed ? '*' : '') + this.name + ' ─ hwstudio';
    utils.updateWindowTitle(title);
  };

  this.compile = function (target) {
    this.update();
    var opt = { boardRules: profile.get('boardRules') };
    return compiler.generate(target, project, opt);
  };

  this.addBasicBlock = function (type) {
    graph.createBasicBlock(type);
  };

  this.addBlock = function (block) {
    if (block) {
      block = _safeLoad(block);
      block = pruneBlock(block);
      if (block.package.name.toLowerCase().indexOf('generic-') === 0) {
        var dat = new Date();
        var seq = dat.getTime();
        block.package.otid = seq;
      }
      var type = utils.dependencyID(block);
      utils.mergeDependencies(type, block);
      graph.createBlock(type, block);
    }
  };

  function pruneBlock(block) {
    // Remove all unnecessary information for a dependency:
    // - version, board, FPGA I/O pins (->size if >1), virtual flag
    delete block.version;
    delete block.design.board;
    var i, pins;
    for (i in block.design.graph.blocks) {
      if (block.design.graph.blocks[i].type === 'basic.input' ||
        block.design.graph.blocks[i].type === 'basic.output' ||
        block.design.graph.blocks[i].type === 'basic.outputLabel' ||
        block.design.graph.blocks[i].type === 'inputLabel'
      ) {
        if (block.design.graph.blocks[i].data.size === undefined) {
          pins = block.design.graph.blocks[i].data.pins;
          block.design.graph.blocks[i].data.size = (pins && pins.length > 1) ? pins.length : undefined;
        }
        delete block.design.graph.blocks[i].data.pins;
        delete block.design.graph.blocks[i].data.virtual;
      }
    }
    return block;
  }

  this.removeSelected = function () {
    graph.removeSelected();
  };

  this.clear = function () {
    project = _default();
    graph.clearAll();
    graph.resetBreadcrumbs();
    graph.resetCommandStack();
  };
});

//<

//
//> services/collections.js
//

appModule.service("collections", function(
  utils,
  common,
  profile,
  gettextCatalog,
  nodePath
) {
  const DEFAULT = "";
  const MAX_LEVEL_SEARCH = 20;

  this.loadAllCollections = function() {
    this.loadDefaultCollection();
    this.loadInternalCollections();
    this.loadExternalCollections();
  };

  this.loadDefaultCollection = function() {
    common.defaultCollection = getCollection(
      DEFAULT,
      common.DEFAULT_COLLECTION_DIR,
      utils.getFilesRecursive(common.DEFAULT_COLLECTION_DIR, MAX_LEVEL_SEARCH)
    );
  };

  this.loadInternalCollections = function() {
    var internalCollections = utils.findCollections(
      common.INTERNAL_COLLECTIONS_DIR
    );
    common.internalCollections = loadCollections(internalCollections);
  };

  this.loadExternalCollections = function() {
    var externalCollectionsPath = profile.get("externalCollections");
    if (externalCollectionsPath !== common.INTERNAL_COLLECTIONS_DIR) {
      common.externalCollections = loadCollections(
        utils.findCollections(externalCollectionsPath)
      );
    }
  };

  function loadCollections(paths) {
    var collections = [];
    paths.forEach(function(path) {
      collections.push(
        getCollection(
          nodePath.basename(path),
          path,
          utils.getFilesRecursive(path, MAX_LEVEL_SEARCH)
        )
      );
    });
    return collections;
  }

  function getCollection(name, path, children) {
    var collection = {
      name: name,
      path: path,
      content: {
        blocks: [],
        examples: [],
        package: {},
        readme: ""
      }
    };
    for (var i in children) {
      var child = children[i];
      switch (child.name) {
        case "blocks":
          if (child.children) {
            collection.content.blocks = child.children;
          }
          break;
        case "examples":
          if (child.children) {
            collection.content.examples = child.children;
          }
          break;
        case "package":
          if (!child.children) {
            try {
              collection.content.package = require(child.path);
            } catch (e) {}
          }
          break;
        case "README":
          if (!child.children) {
            collection.content.readme = child.path;
          }
          break;
      }
    }
    return collection;
  }

  this.selectCollection = function(path) {
    var selectedCollection = common.defaultCollection;
    var collections = common.internalCollections.concat(
      common.externalCollections
    );
    for (var i in collections) {
      if (collections[i].path === path) {
        selectedCollection = collections[i];
        break;
      }
    }
    common.selectedCollection = selectedCollection;
    return selectedCollection.path;
  };

  this.sort = function() {
    sortCollections([common.defaultCollection]);
    sortCollections(common.internalCollections);
    sortCollections(common.externalCollection);
  };

  function sortCollections(collections) {
    for (var i in collections) {
      var collection = collections[i];
      if (collection.content) {
        sortContent(collection.content.blocks);
        sortContent(collection.content.examples);
      }
    }
  }

  function sortContent(items) {
    if (items) {
      items.sort(byName);
      for (var i in items) {
        sortContent(items[i].children);
      }
    }
  }

  function byName(a, b) {
    a = gettextCatalog.getString(a.name);
    b = gettextCatalog.getString(b.name);
    return a > b ? 1 : a < b ? -1 : 0;
  }
});

//<

//
//> services/drivers.js
//

appModule.service("drivers", function(
  gettextCatalog,
  profile,
  common,
  gui,
  utils,
  $rootScope
) {
  this.enable = function() {
    switch (common.selectedBoard.info.interface) {
      case "FTDI":
        enableDriversFTDI();
        break;
      case "Serial":
        enableDriversSerial();
        break;
      default:
        console.warn("No valid selected board interface");
    }
  };

  this.disable = function() {
    switch (common.selectedBoard.info.interface) {
      case "FTDI":
        disableDriversFTDI();
        break;
      case "Serial":
        disableDriversSerial();
        break;
      default:
        console.warn("No valid selected board interface");
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

  this.preUpload = function(callback) {
    if (common.DARWIN) {
      preUploadDarwin(callback);
    } else if (callback) {
      callback();
    }
  };

  this.postUpload = function() {
    if (common.DARWIN) {
      postUploadDarwin();
    }
  };

  /*
   * Linux drivers
   */

  function enableLinuxDriversFTDI() {
    var rules = "";
    rules += 'ATTRS{idVendor}==\\"0403\\", ATTRS{idProduct}==\\"6010\\", ';
    rules += 'MODE=\\"0660\\", GROUP=\\"plugdev\\", TAG+=\\"uaccess\\"\n';
    rules += 'ATTRS{idVendor}==\\"0403\\", ATTRS{idProduct}==\\"6014\\", ';
    rules += 'MODE=\\"0660\\", GROUP=\\"plugdev\\", TAG+=\\"uaccess\\"';
    configureLinuxDrivers(
      ["echo '" + rules + "' > /etc/udev/rules.d/80-fpga-ftdi.rules"].concat(
        reloadRules()
      ),
      function() {
        alertify.success(gettextCatalog.getString("Drivers enabled"));
      }
    );
  }

  function disableLinuxDriversFTDI() {
    configureLinuxDrivers(
      [
        "rm -f /etc/udev/rules.d/80-icestick.rules",
        "rm -f /etc/udev/rules.d/80-fpga-ftdi.rules"
      ].concat(reloadRules()),
      function() {
        alertify.warning(gettextCatalog.getString("Drivers disabled"));
      }
    );
  }

  function enableLinuxDriversSerial() {
    var rules = "";
    rules += "# Disable ModemManager for BlackIce\n";
    rules +=
      'ATTRS{idVendor}==\\"0483\\", ATTRS{idProduct}==\\"5740\\", ENV{ID_MM_DEVICE_IGNORE}=\\"1\\"\n';
    rules += "# Disable ModemManager for TinyFPGA B2\n";
    rules +=
      'ATTRS{idVendor}==\\"1209\\", ATTRS{idProduct}==\\"2100\\", ENV{ID_MM_DEVICE_IGNORE}=\\"1\\"';
    rules += "# Disable ModemManager for TinyFPGA BX\n";
    rules +=
      'ATTRS{idVendor}==\\"1d50\\", ATTRS{idProduct}==\\"6130\\", ENV{ID_MM_DEVICE_IGNORE}=\\"1\\"';
    configureLinuxDrivers(
      ["echo '" + rules + "' > /etc/udev/rules.d/80-fpga-serial.rules"].concat(
        reloadRules()
      ),
      function() {
        alertify.success(gettextCatalog.getString("Drivers enabled"));
      }
    );
  }

  function disableLinuxDriversSerial() {
    configureLinuxDrivers(
      ["rm -f /etc/udev/rules.d/80-fpga-serial.rules"].concat(reloadRules()),
      function() {
        alertify.warning(gettextCatalog.getString("Drivers disabled"));
      }
    );
  }

  function reloadRules() {
    return [
      "udevadm control --reload-rules",
      "udevadm trigger",
      "service udev restart"
    ];
  }

  function configureLinuxDrivers(commands, callback) {
    var command = 'sh -c "' + commands.join("; ") + '"';
    utils.beginBlockingTask();
    nodeSudo.exec(command, { name: "hwstudio" }, function(
      error /*, stdout, stderr*/
    ) {
      utils.endBlockingTask();
      if (!error) {
        if (callback) {
          callback();
        }
        setTimeout(function() {
          alertify.message(
            gettextCatalog.getString(
              "<b>Unplug</b> and <b>reconnect</b> the board"
            ),
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
    enableDarwinDrivers(["libftdi", "libffi"], "macosFTDIDrivers");
  }

  function disableDarwinDriversFTDI() {
    disableDarwinDrivers("macosFTDIDrivers");
  }

  function enableDarwinDriversSerial() {
    enableDarwinDrivers(["libusb", "libffi"]);
  }

  function disableDarwinDriversSerial() {
    disableDarwinDrivers();
  }

  function enableDarwinDrivers(brewPackages, profileSetting) {
    var brewCommands = ["/usr/local/bin/brew update"];
    for (var i in brewPackages) {
      brewCommands = brewCommands.concat(brewInstall(brewPackages[i]));
    }
    utils.beginBlockingTask();
    if (typeof common.DEBUGMODE !== "undefined" && common.DEBUGMODE === 1) {
      fs.appendFileSync(common.LOGFILE, "drivers.enableDarwinDrivers" + "\n");
    }
    nodeChildProcess.exec(brewCommands.join("; "), function(
      error,
      stdout,
      stderr
    ) {
      if (typeof common.DEBUGMODE !== "undefined" && common.DEBUGMODE === 1) {
        fs.appendFileSync(common.LOGFILE, "STDERR " + stderr + "\n");
        fs.appendFileSync(common.LOGFILE, "STDERR " + stdout + "\n");
      }
      if (error) {
        if (
          stderr.indexOf("brew: command not found") !== -1 ||
          stderr.indexOf("brew: No such file or directory") !== -1
        ) {
          alertify.warning(
            gettextCatalog.getString("{{app}} is required.", {
              app: "<b>Homebrew</b>"
            }) +
              "<br>" +
              "<u>" +
              gettextCatalog.getString("Click here to install it") +
              "</u>",
            30
          ).callback = function(isClicked) {
            if (isClicked) {
              gui.Shell.openExternal("https://brew.sh");
            }
          };
        } else if (stderr.indexOf("Error: Failed to download") !== -1) {
          alertify.error(
            gettextCatalog.getString("Internet connection required"),
            30
          );
        } else {
          alertify.error(stderr, 30);
        }
      } else {
        if (profileSetting) {
          profile.set(profileSetting, true);
        }
        alertify.success(gettextCatalog.getString("Drivers enabled"));
      }
      utils.endBlockingTask();
    });
    if (typeof common.DEBUGMODE !== "undefined" && common.DEBUGMODE === 1) {
      const fs = require("fs");
      fs.appendFileSync(common.LOGFILE, "/drivers.enableDarwinDrivers" + "\n");
    }
  }

  function disableDarwinDrivers(profileSetting) {
    if (profileSetting) {
      profile.set(profileSetting, false);
    }
    alertify.warning(gettextCatalog.getString("Drivers disabled"));
  }

  function brewInstall(brewPackage) {
    return [
      "/usr/local/bin/brew install --force " + brewPackage,
      "/usr/local/bin/brew unlink " + brewPackage,
      "/usr/local/bin/brew link --force " + brewPackage
    ];
  }

  var driverC = "";

  function preUploadDarwin(callback) {
    if (profile.get("macosFTDIDrivers")) {
      // Check and unload the Drivers
      var driverA = "com.FTDI.driver.FTDIUSBSerialDriver";
      var driverB = "com.apple.driver.AppleUSBFTDI";
      if (checkDriverDarwin(driverA)) {
        driverC = driverA;
        processDriverDarwin(driverA, false, callback);
      } else if (checkDriverDarwin(driverB)) {
        driverC = driverB;
        processDriverDarwin(driverB, false, callback);
      } else {
        driverC = "";
        if (callback) {
          callback();
        }
      }
    } else if (callback) {
      callback();
    }
  }

  function postUploadDarwin() {
    if (profile.get("macosFTDIDrivers")) {
      processDriverDarwin(driverC, true);
    }
  }

  function checkDriverDarwin(driver) {
    var output = nodeChildProcess.execSync("kextstat").toString();
    return output.indexOf(driver) > -1;
  }

  function processDriverDarwin(driver, load, callback) {
    if (driver) {
      var command = (load ? "kextload" : "kextunload") + " -b " + driver;
      nodeSudo.exec(
        command,
        { name: "hwstudio" },
        function(/*error, stdout, stderr*/) {
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
    var message =
      gettextCatalog.getString(
        "<h4>FTDI driver installation instructions</h4><ol><li>Connect the FPGA board to the USB and wait until Windows finishes the default installation of the driver</li><li>When the OK button is clicked, the FTDI driver installer will be launched in a new window</li><li>In the installer, replace the <b>(Interface 0)</b> driver of the board by <b>libusbK</b></li><li>Unplug and reconnect the board</li></ol>"
      ) +
      gettextCatalog.getString("It is recommended to use <b>USB 2.0</b> ports");
    alertify.confirm(message, function() {
      enableWindowsDrivers("ftdi");
    });
  }

  function disableWindowsDriversFTDI() {
    var message = gettextCatalog.getString(
      "<h4>FTDI driver uninstallation instructions</h4><ol><li>Find the FPGA USB Device</li><li>Select the board interface and uninstall the driver</li></ol>"
    );
    alertify.confirm(message, function() {
      disableWindowsDrivers("ftdi");
    });
  }

  function enableWindowsDriversSerial() {
    var message = gettextCatalog.getString(
      "<h4>Serial driver installation instructions</h4><ol><li>Connect the FPGA board to the USB and wait until Windows finishes the default installation of the driver</li><li>When the OK button is clicked, the Serial driver installer will be launched in a new window</li><li>In the installer, follow the steps to install the driver</li><li>Unplug and reconnect the board</li></ol>"
    );
    alertify.confirm(message, function() {
      enableWindowsDrivers("serial");
    });
  }

  function disableWindowsDriversSerial() {
    var message = gettextCatalog.getString(
      "<h4>Serial driver uninstallation instructions</h4><ol><li>Find the FPGA USB Device</li><li>Select the board interface and uninstall the driver</li></ol>"
    );
    alertify.confirm(message, function() {
      disableWindowsDrivers("serial");
    });
  }

  function enableWindowsDrivers(type) {
    var option = "--" + type + "-enable";
    utils.beginBlockingTask();
    nodeSudo.exec(
      [common.APIO_CMD, "drivers", option].join(" "),
      { name: "hwstudio" },
      function(error, stdout, stderr) {
        utils.endBlockingTask();
        if (stderr) {
          alertify.error(
            gettextCatalog.getString("Toolchain not installed") +
              ".<br>" +
              gettextCatalog.getString("Click here to install it"),
            30
          ).callback = function(isClicked) {
            if (isClicked) {
              $rootScope.$broadcast("installToolchain");
            }
          };
        } else if (!error) {
          alertify.message(
            gettextCatalog.getString(
              "<b>Unplug</b> and <b>reconnect</b> the board"
            ),
            5
          );
        }
      }
    );
  }

  function disableWindowsDrivers(type) {
    var option = "--" + type + "-disable";
    utils.beginBlockingTask();
    nodeChildProcess.exec(
      [common.APIO_CMD, "drivers", option].join(" "),
      function(error, stdout, stderr) {
        utils.endBlockingTask();
        if (stderr) {
          alertify.error(
            gettextCatalog.getString("Toolchain not installed") +
              ".<br>" +
              gettextCatalog.getString("Click here to install it"),
            30
          ).callback = function(isClicked) {
            if (isClicked) {
              $rootScope.$broadcast("installToolchain");
            }
          };
        }
      }
    );
  }
});

//<

//
//> services/tools.js
//

appModule.service("tools", function(
  project,
  compiler,
  profile,
  collections,
  drivers,
  graph,
  utils,
  common,
  gettextCatalog,
  gettext,
  nodeFs,
  nodeFse,
  nodePath,
  _package,
  $rootScope
) {
  var taskRunning = false;
  var resources = [];
  var startAlert = null;
  var infoAlert = null;
  var resultAlert = null;
  var toolchainAlert = null;
  var toolchain = { apio: '-', installed: false, disabled: false };

  this.toolchain = toolchain;

  // Remove old build directory on start
  nodeFse.removeSync(common.OLD_BUILD_DIR);

  this.verifyCode = function (startMessage, endMessage) {
    return apioRun(['verify', '--board', common.selectedBoard.name], startMessage, endMessage);
  };

  this.buildCode = function (startMessage, endMessage) {
    return apioRun(['build', '--board', common.selectedBoard.name], startMessage, endMessage);
  };

  this.uploadCode = function (startMessage, endMessage) {
    return apioRun(['upload', '--board', common.selectedBoard.name], startMessage, endMessage);
  };

  function apioRun(commands, startMessage, endMessage) {
    return new Promise(function (resolve) {
      var sourceCode = '';

      if (!taskRunning) {
        taskRunning = true;

        if (infoAlert) {
          infoAlert.dismiss(false);
        }

        if (resultAlert) {
          resultAlert.dismiss(false);
        }
        graph.resetCodeErrors()
          .then(function () {
            return checkToolchainInstalled();
          })
          .then(function () {
            utils.beginBlockingTask();
            if (startMessage) {
              startAlert = alertify.message(startMessage, 100000);
            }

            return generateCode(commands);
          })
          .then(function (output) {
            sourceCode = output.code;

            return syncResources(output.code, output.internalResources);
          })
          .then(function () {
            var hostname = profile.get('remoteHostname');
            var command = commands[0];
            if (command === 'build' || command === 'upload') {
              if (profile.get('showFPGAResources')) {
                commands = commands.concat('--verbose-pnr');
              }
            }
            if (hostname) {
              return executeRemote(commands, hostname);
            }
            else {
              return executeLocal(commands);
            }
          })
          .then(function (result) {
            return processResult(result, sourceCode);
          })
          .then(function () {
            // Success
            if (endMessage) {
              resultAlert = alertify.success(gettextCatalog.getString(endMessage));
            }
            utils.endBlockingTask();
            restoreTask();
            resolve();
          })
          .catch(function (/* e */) {
            // Error
            utils.endBlockingTask();
            restoreTask();
          });
      }
    });
  }

  function restoreTask() {
    setTimeout(function () {
      // Wait 1s before run a task again
      if (startAlert) {
        startAlert.dismiss(false);
      }
      taskRunning = false;
    }, 1000);
  }

  function checkToolchainInstalled() {
    return new Promise(function (resolve, reject) {
      if (toolchain.installed) {
        resolve();
      }
      else {
        toolchainNotInstalledAlert(gettextCatalog.getString('Toolchain not installed'));
        reject();
      }
    });
  }

  function generateCode(cmd) {
    return new Promise(function (resolve) {
      project.snapshot();
      project.update();
      var opt = {
        datetime: false,
        boardRules: profile.get('boardRules')
      };
      if (opt.boardRules) {
        opt.initPorts = compiler.getInitPorts(project.get());
        opt.initPins = compiler.getInitPins(project.get());
      }

      // Verilog file
      var verilogFile = compiler.generate('verilog', project.get(), opt)[0];
      nodeFs.writeFileSync(nodePath.join(common.BUILD_DIR, verilogFile.name), verilogFile.content, 'utf8');

      if (cmd.indexOf('verify') > -1 && cmd.indexOf('--board') > -1 && cmd.length === 3) {
        //only verification
      } else {

        var archName = common.selectedBoard.info.arch;
        if (archName === 'ecp5')
        {
          // LPF file
          var lpfFile = compiler.generate('lpf', project.get(), opt)[0];
          nodeFs.writeFileSync(nodePath.join(common.BUILD_DIR, lpfFile.name), lpfFile.content, 'utf8');
        } else {
          // PCF file
          var pcfFile = compiler.generate('pcf', project.get(), opt)[0];
          nodeFs.writeFileSync(nodePath.join(common.BUILD_DIR, pcfFile.name), pcfFile.content, 'utf8');
        }
      }
      // List files
      var listFiles = compiler.generate('list', project.get());
      for (var i in listFiles) {
        var listFile = listFiles[i];

        nodeFs.writeFileSync(nodePath.join(common.BUILD_DIR, listFile.name), listFile.content, 'utf8');
      }

      project.restoreSnapshot();
      resolve({
        code: verilogFile.content,
        internalResources: listFiles.map(function (res) { return res.name; })
      });
    });
  }

  function syncResources(code, internalResources) {
    return new Promise(function (resolve, reject) {
      // Remove resources
      removeFiles(resources);
      resources = [];
      // Find included files
      resources = resources.concat(findIncludedFiles(code));
      // Find list files
      resources = resources.concat(findInlineFiles(code));
      // Sync resources
      resources = _.uniq(resources);
      // Remove internal files
      resources = _.difference(resources, internalResources);
      syncFiles(resources, reject);
      resolve();
    });
  }

  function removeFiles(files) {
    _.each(files, function (file) {
      var filepath = nodePath.join(common.BUILD_DIR, file);
      nodeFse.removeSync(filepath);
    });
  }

  function findIncludedFiles(code) {
    return findFiles(/[\n|\s]\/\/\s*@include\s+([^\s]*\.(v|vh|list))(\n|\s)/g, code);
  }

  function findInlineFiles(code) {
    return findFiles(/[\n|\s][^\/]?\"(.*\.list?)\"/g, code);
  }

  // TODO: duplicated: utils findIncludedFiles
  function findFiles(pattern, code) {
    var match;
    var files = [];
    while (match = pattern.exec(code)) {
      files.push(match[1]);
    }
    return files;
  }

  function syncFiles(files, reject) {
    _.each(files, function (file) {
      var destPath = nodePath.join(common.BUILD_DIR, file);
      var origPath = nodePath.join(utils.dirname(project.filepath), file);

      // Copy file
      var copySuccess = utils.copySync(origPath, destPath);
      if (!copySuccess) {
        resultAlert = alertify.error(gettextCatalog.getString('File {{file}} does not exist', { file: file }), 30);
        reject();
      }
    });
  }

  this.checkToolchain = checkToolchain;

  function checkToolchain(callback) {
    var apio = utils.getApioExecutable();
    nodeChildProcess.exec([apio, '--version'].join(' '), function (error, stdout/*, stderr*/) {
      if (error) {
        toolchain.apio = '';
        toolchain.installed = false;
        // Apio not installed
        toolchainNotInstalledAlert(gettextCatalog.getString('Toolchain not installed'));
        if (callback) {
          callback();
        }
      }
      else {
        toolchain.apio = stdout.match(/apio,\sversion\s(.+)/i)[1];
        toolchain.installed = toolchain.apio >= _package.apio.min &&
          toolchain.apio < _package.apio.max;
        if (toolchain.installed) {
          nodeChildProcess.exec([apio, 'clean', '-p', common.SAMPLE_DIR].join(' '), function (error/*, stdout, stderr*/) {
            toolchain.installed = !error;
            if (error) {
              toolchain.apio = '';
              // Toolchain not properly installed
              toolchainNotInstalledAlert(gettextCatalog.getString('Toolchain not installed'));
            }
            if (callback) {
              callback();
            }
          });
        }
        else {
          // An old version is installed
          toolchainNotInstalledAlert(gettextCatalog.getString('Toolchain version does not match'));
          if (callback) {
            callback();
          }
        }
      }
    });
  }

  function toolchainNotInstalledAlert(message) {
    if (resultAlert) {
      resultAlert.dismiss(false);
    }
    resultAlert = alertify.warning(message + '.<br>' + gettextCatalog.getString('Click here to install it'), 100000);
    resultAlert.callback = function (isClicked) {
      if (isClicked) {
        // Install the new toolchain
        $rootScope.$broadcast('installToolchain');
      }
    };
  }

  function executeRemote(commands, hostname) {
    return new Promise(function (resolve) {
      startAlert.setContent(gettextCatalog.getString('Synchronize remote files ...'));
      nodeRSync({
        src: common.BUILD_DIR + '/',
        dest: hostname + ':.build/',
        ssh: true,
        recursive: true,
        delete: true,
        include: ['*.v', '*.pcf', '*.lpf', '*.list'],
        exclude: ['.sconsign.dblite', '*.out', '*.blif', '*.asc', '*.bin', '*.config', '*.json']
      }, function (error, stdout, stderr/*, cmd*/) {
        if (!error) {
          startAlert.setContent(gettextCatalog.getString('Execute remote {{label}} ...', { label: '' }));
          nodeSSHexec((['apio'].concat(commands).concat(['--project-dir', '.build'])).join(' '), hostname,
            function (error, stdout, stderr) {
              resolve({ error: error, stdout: stdout, stderr: stderr });
            });
        }
        else {
          resolve({ error: error, stdout: stdout, stderr: stderr });
        }
      });
    });
  }

  function executeLocal(commands) {
    return new Promise(function (resolve) {
      if (commands[0] === 'upload') {
        // Upload command requires drivers setup (Mac OS)
        drivers.preUpload(function () {
          _executeLocal();
        });
      }
      else {
        // Other !upload commands
        _executeLocal();
      }

      function _executeLocal() {
        var apio = utils.getApioExecutable();
        var command = ([apio].concat(commands).concat(['-p', utils.coverPath(common.BUILD_DIR)])).join(' ');
        if (typeof common.DEBUGMODE !== 'undefined' &&
          common.DEBUGMODE === 1) {

          const fs = require('fs');
          fs.appendFileSync(common.LOGFILE, 'tools._executeLocal>' + command + "\n");
        }
        nodeChildProcess.exec(command,
          { maxBuffer: 5000 * 1024 },  // To avoid buffer overflow
          function (error, stdout, stderr) {
            if (commands[0] === 'upload') {
              // Upload command requires to restore the drivers (Mac OS)
              drivers.postUpload();
            }
            common.commandOutput = command + '\n\n' + stdout + stderr;
            $(document).trigger('commandOutputChanged', [common.commandOutput]);
            resolve({ error: error, stdout: stdout, stderr: stderr });
          });
      }
    });
  }

  function processResult(result, code) {
    result = result || {};
    var _error = result.error;
    var stdout = result.stdout;
    var stderr = result.stderr;

    return new Promise(function (resolve, reject) {
      if (_error || stderr) {
        // -- Process errors
        reject();
        if (stdout) {
          var boardName = common.selectedBoard.name;
          var boardLabel = common.selectedBoard.info.label;
          // - Apio errors
          if ((stdout.indexOf('Error: board ' + boardName + ' not connected') !== -1) ||
            (stdout.indexOf('USBError') !== -1) ||
            (stdout.indexOf('Activate bootloader') !== -1)) {
            var errorMessage = gettextCatalog.getString('Board {{name}} not connected', { name: utils.bold(boardLabel) });
            if (stdout.indexOf('Activate bootloader') !== -1) {
              if (common.selectedBoard.name.startsWith('TinyFPGA-B')) {
                // TinyFPGA bootloader notification
                errorMessage += '</br>(' + gettextCatalog.getString('Bootloader not active') + ')';
              }
            }
            resultAlert = alertify.error(errorMessage, 30);
          }
          else if (stdout.indexOf('Error: board ' + boardName + ' not available') !== -1) {
            resultAlert = alertify.error(gettextCatalog.getString('Board {{name}} not available', { name: utils.bold(boardLabel) }), 30);
            setupDriversAlert();
          }
          else if (stdout.indexOf('Error: unknown board') !== -1) {
            resultAlert = alertify.error(gettextCatalog.getString('Unknown board'), 30);
          }
          else if (stdout.indexOf('[upload] Error') !== -1) {
            switch (common.selectedBoard.name) {
              // TinyFPGA-B2 programmer errors
              case 'TinyFPGA-B2':
              case 'TinyFPGA-BX':
                var match = stdout.match(/Bootloader\snot\sactive/g);
                if (match && match.length === 3) {
                  resultAlert = alertify.error(gettextCatalog.getString('Bootloader not active'), 30);
                }
                else if (stdout.indexOf('Device or resource busy') !== -1) {
                  resultAlert = alertify.error(gettextCatalog.getString('Board {{name}} not available', { name: utils.bold(boardLabel) }), 30);
                  setupDriversAlert();
                }
                else if (stdout.indexOf('device disconnected or multiple access on port') !== -1) {
                  resultAlert = alertify.error(gettextCatalog.getString('Board {{name}} disconnected', { name: utils.bold(boardLabel) }), 30);
                }
                else {
                  resultAlert = alertify.error(gettextCatalog.getString(stdout), 30);
                }
                break;
              default:
                resultAlert = alertify.error(gettextCatalog.getString(stdout), 30);
            }
            console.warn(stdout);
          }
          // Yosys error (Mac OS)
          else if (stdout.indexOf('Library not loaded:') !== -1 &&
            stdout.indexOf('libffi') !== -1) {
            resultAlert = alertify.error(gettextCatalog.getString('Configuration not completed'), 30);
            setupDriversAlert();
          }
          // - Arachne-pnr errors
          else if (stdout.indexOf('set_io: too few arguments') !== -1 ||
            stdout.indexOf('fatal error: unknown pin') !== -1) {
            resultAlert = alertify.error(gettextCatalog.getString('FPGA I/O ports not defined'), 30);
          }
          else if (stdout.indexOf('fatal error: duplicate pin constraints') !== -1) {
            resultAlert = alertify.error(gettextCatalog.getString('Duplicated FPGA I/O ports'), 30);
          }
          else {
            var re, matchError, codeErrors = [];

            // - Iverilog errors & warnings
            // main.v:#: error: ...
            // main.v:#: warning: ...
            // main.v:#: syntax error
            re = /main.v:([0-9]+):\s(error|warning):\s(.*?)[\r|\n]/g;
            while (matchError = re.exec(stdout)) {
              codeErrors.push({
                line: parseInt(matchError[1]),
                msg: matchError[3].replace(/\sin\smain\..*$/, ''),
                type: matchError[2]
              });
            }
            re = /main.v:([0-9]+):\ssyntax\serror[\r|\n]/g;
            while (matchError = re.exec(stdout)) {
              codeErrors.push({
                line: parseInt(matchError[1]),
                msg: 'Syntax error',
                type: 'error'
              });
            }
            // - Yosys errors
            // ERROR: ... main.v:#...
            // Warning: ... main.v:#...
            re = /(ERROR|Warning):\s(.*?)\smain\.v:([0-9]+)(.*?)[\r|\n]/g;
            var msg = '';
            var line = -1;
            var type = false;
            var preContent = false;
            var postContent = false;

            while (matchError = re.exec(stdout)) {
              msg = '';
              line = parseInt(matchError[3]);
              type = matchError[1].toLowerCase();
              preContent = matchError[2];
              postContent = matchError[4];
              // Process error
              if (preContent === 'Parser error in line') {
                postContent = postContent.substring(2); // remove :\s
                if (postContent.startsWith('syntax error')) {
                  postContent = 'Syntax error';
                }
                msg = postContent;
              }
              else if (preContent.endsWith(' in line ')) {
                msg = preContent.replace(/\sin\sline\s$/, ' ') + postContent;
              }
              else {
                preContent = preContent.replace(/\sat\s$/, '');
                preContent = preContent.replace(/\sin\s$/, '');
                msg = preContent;
              }
              codeErrors.push({
                line: line,
                msg: msg,
                type: type
              });
            }

            // - Yosys syntax errors
            // - main.v:31: ERROR: #...
            re = /\smain\.v:([0-9]+):\s(.*?)(ERROR):\s(.*?)[\r|\n]/g;
            while (matchError = re.exec(stdout)) {

              msg = '';
              line = parseInt(matchError[1]);
              type = matchError[3].toLowerCase();
              preContent = matchError[4];

              // If the error is about an unexpected token, the error is not
              // deterministic, therefore we indicate that "the error
              //is around this line ..."
              if (preContent.indexOf('unexpected TOK_') >= 0) {
                msg = 'Syntax error arround this line';
              } else {
                msg = preContent;
              }
              codeErrors.push({
                line: line,
                msg: msg,
                type: type
              });
            }

            // Extract modules map from code
            var modules = mapCodeModules(code);
            var hasErrors = false;
            var hasWarnings = false;
            for (var i in codeErrors) {
              var codeError = normalizeCodeError(codeErrors[i], modules);
              if (codeError) {
                // Launch codeError event
                $(document).trigger('codeError', [codeError]);
                hasErrors = hasErrors || codeError.type === 'error';
                hasWarnings = hasWarnings || codeError.type === 'warning';
              }
            }

            if (hasErrors) {
              resultAlert = alertify.error(gettextCatalog.getString('Errors detected in the design'), 5);
            }
            else {
              if (hasWarnings) {
                resultAlert = alertify.warning(gettextCatalog.getString('Warnings detected in the design'), 5);
              }

              // var stdoutWarning = stdout.split('\n').filter(function (line) {
              //   line = line.toLowerCase();
              //   return (line.indexOf('warning: ') !== -1);
              // });
              var stdoutError = stdout.split('\n').filter(function (line) {
                line = line.toLowerCase();
                return (line.indexOf('error: ') !== -1 ||
                  line.indexOf('not installed') !== -1 ||
                  line.indexOf('already declared') !== -1);
              });
              // stdoutWarning.forEach(function (warning) {
              //   alertify.warning(warning, 20);
              // });
              if (stdoutError.length > 0) {
                // Show first error
                var error = '';
                // hardware.blif:#: fatal error: ...
                re = /hardware\.blif:([0-9]+):\sfatal\serror:\s(.*)/g;
                if (matchError = re.exec(stdoutError[0])) {
                  error = matchError[2];
                }
                resultAlert = alertify.error(error, 30);
              }
              else {
                resultAlert = alertify.error(stdout, 30);
              }
            }
          }
        }
        else if (stderr) {
          // Remote hostname errors
          if (stderr.indexOf('Could not resolve hostname') !== -1 ||
            stderr.indexOf('Connection refused') !== -1) {
            resultAlert = alertify.error(gettextCatalog.getString('Wrong remote hostname {{name}}', { name: profile.get('remoteHostname') }), 30);
          }
          else if (stderr.indexOf('No route to host') !== -1) {
            resultAlert = alertify.error(gettextCatalog.getString('Remote host {{name}} not connected', { name: profile.get('remoteHostname') }), 30);
          }
          else {
            resultAlert = alertify.error(stderr, 30);
          }
        }
      }
      else {
        //-- Process output
        resolve();

        if (stdout) {
          // Show used resources in the FPGA
          if(typeof common.FPGAResources.nextpnr === 'undefined'){
            common.FPGAResources.nextpnr={
                                            LC:  {used:'-',total:'-',percentage:'-'},
                                            RAM: {used:'-',total:'-',percentage:'-'},
                                            IO:  {used:'-',total:'-',percentage:'-'},
                                            GB:  {used:'-',total:'-',percentage:'-'},
                                            PLL: {used:'-',total:'-',percentage:'-'},
                                            WB:  {used:'-',total:'-',percentage:'-'},
                                            MF:{value:0}
                                          };

          }
          common.FPGAResources.nextpnr.LC = findValueNPNR(/_LC:\s{1,}(\d+)\/\s{1,}(\d+)\s{1,}(\d+)%/g, stdout, common.FPGAResources.nextpnr.LC);
          common.FPGAResources.nextpnr.RAM = findValueNPNR(/_RAM:\s{1,}(\d+)\/\s{1,}(\d+)\s{1,}(\d+)%/g, stdout, common.FPGAResources.nextpnr.RAM);
          common.FPGAResources.nextpnr.IO = findValueNPNR(/SB_IO:\s{1,}(\d+)\/\s{1,}(\d+)\s{1,}(\d+)%/g, stdout, common.FPGAResources.nextpnr.IO);
          common.FPGAResources.nextpnr.GB = findValueNPNR(/SB_GB:\s{1,}(\d+)\/\s{1,}(\d+)\s{1,}(\d+)%/g, stdout, common.FPGAResources.nextpnr.GB);
          common.FPGAResources.nextpnr.PLL = findValueNPNR(/_PLL:\s{1,}(\d+)\/\s{1,}(\d+)\s{1,}(\d+)%/g, stdout, common.FPGAResources.nextpnr.PLL);
          common.FPGAResources.nextpnr.WB = findValueNPNR(/_WARMBOOT:\s{1,}(\d+)\/\s{1,}(\d+)\s{1,}(\d+)%/g, stdout, common.FPGAResources.nextpnr.WB);
          common.FPGAResources.nextpnr.MF=findMaxFreq(/Max frequency for clock '[\w\W]+': ([\d\.]+) MHz/g,stdout,common.FPGAResources.nextpnr.MF);
          utils.rootScopeSafeApply();
        }
      }
    });
  }

  function findValueNPNR(pattern, output, previousValue) {
    var match = pattern.exec(output);
    return (match && match[1] && match[2] && match[3]) ? {used: match[1],total:match[2],percentage:match[3]} : previousValue;
  }
  function findMaxFreq(pattern, output, previousValue) {
    var match = pattern.exec(output);
    return (match && match[1]) ? {value: match[1]} : previousValue;
  }


  //function findValue(pattern, output, previousValue) {
  //  var match = pattern.exec(output);
  //  return (match && match[1]) ? match[1] : previousValue;
  //}

  function mapCodeModules(code) {
    var codelines = code.split('\n');
    var match, module = { params: [] }, modules = [];
    // Find begin/end lines of the modules
    for (var i in codelines) {
      var codeline = codelines[i];
      // Get the module name
      if (!module.name) {
        match = /^module\s(.*?)[\s|;]/.exec(codeline);
        if (match) {
          module.name = match[1];
          continue;
        }
      }
      // Get the module parameters
      if (!module.begin) {
        match = /^\sparameter\s(.*?)\s/.exec(codeline);
        if (match) {
          module.params.push({
            name: match[1],
            line: parseInt(i) + 1
          });
          continue;
        }
      }
      // Get the begin of the module code
      if (!module.begin) {
        match = /;$/.exec(codeline);
        if (match) {
          module.begin = parseInt(i) + 1;
          continue;
        }
      }
      // Get the end of the module code
      if (!module.end) {
        match = /^endmodule$/.exec(codeline);
        if (match) {
          module.end = parseInt(i) + 1;
          modules.push(module);
          module = { params: [] };
        }
      }
    }
    return modules;
  }

  function normalizeCodeError(codeError, modules) {
    var newCodeError;
    // Find the module with the error
    for (var i in modules) {
      var module = modules[i];
      if (codeError.line <= module.end) {
        newCodeError = {
          type: codeError.type,
          msg: codeError.msg
        };
        // Find constant blocks in Yosys error:
        //  The error comes from the generated code
        //  but the origin is the constant block value
        var re = /Failed\sto\sdetect\swidth\sfor\sparameter\s\\(.*?)\sat/g;
        var matchConstant = re.exec(newCodeError.msg);

        if (codeError.line > module.begin && !matchConstant) {
          if (module.name.startsWith('main_')) {
            // Code block
            newCodeError.blockId = module.name.split('_')[1];
            newCodeError.blockType = 'code';
            newCodeError.line = codeError.line - module.begin - ((codeError.line === module.end) ? 1 : 0);
          }
          else {
            // Generic block

            newCodeError.blockId = module.name.split('_')[0];
            newCodeError.blockType = 'generic';
          }
          break;
        }
        else {
          if (module.name === 'main') {
            // Constant block
            for (var j in module.params) {
              var param = module.params[j];
              if ((codeError.line === param.line) ||
                (matchConstant && param.name === matchConstant[1])) {
                newCodeError.blockId = param.name;
                newCodeError.blockType = 'constant';
                break;
              }
            }
          }
          else {
            // Generic block
            newCodeError.blockId = module.name;
            newCodeError.blockType = 'generic';
          }
          break;
        }
      }
    }
    return newCodeError;
  }

  // Toolchain methods

  $rootScope.$on('installToolchain', function (/*event*/) {
    this.installToolchain();
  }.bind(this));

  this.installToolchain = function () {
    if (resultAlert) {
      resultAlert.dismiss(false);
    }
    if (utils.checkDefaultToolchain()) {
      utils.removeToolchain();
      installDefaultToolchain();
    }
    else {
      alertify.confirm(gettextCatalog.getString('Default toolchain not found. Toolchain will be downloaded. This operation requires Internet connection. Do you want to continue?'),
        function () {
          utils.removeToolchain();
          installOnlineToolchain();
        });
    }
  };

  this.updateToolchain = function () {
    if (resultAlert) {
      resultAlert.dismiss(false);
    }
    alertify.confirm(gettextCatalog.getString('The toolchain will be updated. This operation requires Internet connection. Do you want to continue?'),
      function () {
        installOnlineToolchain();
      });
  };

  this.resetToolchain = function () {
    if (resultAlert) {
      resultAlert.dismiss(false);
    }
    if (utils.checkDefaultToolchain()) {
      alertify.confirm(gettextCatalog.getString('The toolchain will be restored to default. Do you want to continue?'),
        function () {
          utils.removeToolchain();
          installDefaultToolchain();
        });
    }
    else {
      alertify.alert(gettextCatalog.getString('Error: default toolchain not found in \'{{dir}}\'', { dir: common.TOOLCHAIN_DIR }));
    }
  };

  this.removeToolchain = function () {
    if (resultAlert) {
      resultAlert.dismiss(false);
    }
    alertify.confirm(gettextCatalog.getString('The toolchain will be removed. Do you want to continue?'),
      function () {
        utils.removeToolchain();
        toolchain.apio = '';
        toolchain.installed = false;
        alertify.success(gettextCatalog.getString('Toolchain removed'));
      });
  };

  $rootScope.$on('enableDrivers', function (/*event*/) {
    this.enableDrivers();
  }.bind(this));

  this.enableDrivers = function () {
    checkToolchain(function () {
      if (toolchain.installed) {
        drivers.enable();
      }
    });
  };

  this.disableDrivers = function () {
    checkToolchain(function () {
      if (toolchain.installed) {
        drivers.disable();
      }
    });
  };

  function installDefaultToolchain() {
    installationStatus();

    var content = [
      '<div>',
      '  <p id="progress-message">' + gettextCatalog.getString('Installing toolchain') + '</p>',
      '  </br>',
      '  <div class="progress">',
      '    <div id="progress-bar" class="progress-bar progress-bar-info progress-bar-striped active" role="progressbar"',
      '    aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width:0%">',
      '    </div>',
      '  </div>',
      '</div>'].join('\n');
    toolchainAlert = alertify.alert(content, function () {
      setTimeout(function () {
        initProgress();
        // Restore OK button
        $(toolchainAlert.__internal.buttons[0].element).removeClass('hidden');
      }, 200);
    });
    // Hide OK button
    $(toolchainAlert.__internal.buttons[0].element).addClass('hidden');

    toolchain.installed = false;

    // Reset toolchain
    async.series([
      ensurePythonIsAvailable,
      extractVirtualenv,
      createVirtualenv,
      extractDefaultApio,
      installDefaultApio,
      extractDefaultApioPackages,
      installationCompleted
    ]);
  }

  function installOnlineToolchain() {
    installationStatus();

    var content = [
      '<div>',
      '  <p id="progress-message">' + gettextCatalog.getString('Installing toolchain') + '</p>',
      '  </br>',
      '  <div class="progress">',
      '    <div id="progress-bar" class="progress-bar progress-bar-info progress-bar-striped active" role="progressbar"',
      '    aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width:0%">',
      '    </div>',
      '  </div>',
      '</div>'].join('\n');
    toolchainAlert = alertify.alert(content, function () {
      setTimeout(function () {
        initProgress();
        // Restore OK button
        $(toolchainAlert.__internal.buttons[0].element).removeClass('hidden');
      }, 200);
    });
    // Hide OK button
    $(toolchainAlert.__internal.buttons[0].element).addClass('hidden');

    toolchain.installed = false;

    // Install toolchain
    async.series([
      checkInternetConnection,
      ensurePythonIsAvailable,
      extractVirtualenv,
      createVirtualenv,
      installOnlineApio,
      apioInstallSystem,
      apioInstallYosys,
      apioInstallIce40,
      apioInstallECP5,
      apioInstallIverilog,
      apioInstallDrivers,
      apioInstallScons,
      installationCompleted
    ]);
  }

  function checkInternetConnection(callback) {
    updateProgress(gettextCatalog.getString('Check Internet connection...'), 0);
    utils.isOnline(callback, function () {
      closeToolchainAlert();
      restoreStatus();
      resultAlert = alertify.error(gettextCatalog.getString('Internet connection required'), 30);
      callback(true);
    });
  }

  function ensurePythonIsAvailable(callback) {
    updateProgress(gettextCatalog.getString('Check Python...'), 0);
    if (utils.getPythonExecutable()) {
      callback();
    }
    else {
      closeToolchainAlert();
      restoreStatus();
      resultAlert = alertify.error(gettextCatalog.getString('At least Python 3.5 is required'), 30);
      callback(true);
    }
  }

  function extractVirtualenv(callback) {
    updateProgress(gettextCatalog.getString('Extract virtualenv files...'), 5);
    utils.extractVirtualenv(callback);
  }

  function createVirtualenv(callback) {
    updateProgress(gettextCatalog.getString('Create virtualenv...'), 10);
    utils.createVirtualenv(callback);
  }

  // Local installation

  function extractDefaultApio(callback) {
    updateProgress(gettextCatalog.getString('Extract default apio files...'), 30);
    utils.extractDefaultApio(callback);
  }

  function installDefaultApio(callback) {
    updateProgress(gettextCatalog.getString('Install default apio...'), 50);
    utils.installDefaultApio(callback);
  }

  function extractDefaultApioPackages(callback) {
    updateProgress(gettextCatalog.getString('Extract default apio packages...'), 70);
    utils.extractDefaultApioPackages(callback);
  }

  // Remote installation

  function installOnlineApio(callback) {
    var extraPackages = _package.apio.extras || [];
    var apio = utils.getApioInstallable();

    updateProgress('pip install -U ' + apio + '[' + extraPackages.toString() + ']', 30);
    utils.installOnlineApio(callback);
  }

  function apioInstallSystem(callback) {
    updateProgress('apio install system', 40);
    utils.apioInstall('system', callback);
  }

  function apioInstallYosys(callback) {
    updateProgress('apio install yosys', 50);
    utils.apioInstall('yosys', callback);
  }

  function apioInstallIce40(callback) {
    updateProgress('apio install ice40', 50);
    utils.apioInstall('ice40', callback);
  }

  function apioInstallECP5(callback) {
    updateProgress('apio install ecp5', 50);
    utils.apioInstall('ecp5', callback);
  }

  function apioInstallIverilog(callback) {
    updateProgress('apio install iverilog', 70);
    utils.apioInstall('iverilog', callback);
  }

  function apioInstallDrivers(callback) {
    if (common.WIN32) {
      updateProgress('apio install drivers', 80);
      utils.apioInstall('drivers', callback);
    }
    else {
      callback();
    }
  }

  function apioInstallScons(callback) {
    updateProgress('apio install scons', 90);
    utils.apioInstall('scons', callback);
  }

  function installationCompleted(callback) {
    checkToolchain(function () {
      if (toolchain.installed) {
        closeToolchainAlert();
        updateProgress(gettextCatalog.getString('Installation completed'), 100);
        alertify.success(gettextCatalog.getString('Toolchain installed'));
        setupDriversAlert();
      }
      restoreStatus();
      callback();
    });
  }

  function setupDriversAlert() {
    if (common.showDrivers()) {
      var message = gettextCatalog.getString('Click here to <b>setup the drivers</b>');
      if (!infoAlert) {
        setTimeout(function () {
          infoAlert = alertify.message(message, 30);
          infoAlert.callback = function (isClicked) {
            infoAlert = null;
            if (isClicked) {
              if (resultAlert) {
                resultAlert.dismiss(false);
              }
              $rootScope.$broadcast('enableDrivers');
            }
          };
        }, 1000);
      }
    }
  }

  function updateProgress(message, value) {
    angular.element('#progress-message')
      .text(message);
    var bar = angular.element('#progress-bar');
    if (value === 100) {
      bar.removeClass('progress-bar-striped active');
    }
    bar.text(value + '%');
    bar.attr('aria-valuenow', value);
    bar.css('width', value + '%');
  }

  function initProgress() {
    angular.element('#progress-bar')
      .addClass('notransition progress-bar-info progress-bar-striped active')
      .removeClass('progress-bar-danger')
      .text('0%')
      .attr('aria-valuenow', 0)
      .css('width', '0%')
      .removeClass('notransition');
  }

  function closeToolchainAlert() {
    toolchainAlert.callback();
    toolchainAlert.close();
  }

  function installationStatus() {
    // Disable user events
    utils.disableKeyEvents();
    utils.disableClickEvents();
    $('body').addClass('waiting');
  }

  function restoreStatus() {
    // Enable user events
    utils.enableKeyEvents();
    utils.enableClickEvents();
    $('body').removeClass('waiting');
  }

  // Collections management

  this.addCollections = function (filepaths) {
    // Load zip file
    async.eachSeries(filepaths, function (filepath, nextzip) {
      //alertify.message(gettextCatalog.getString('Load {{name}} ...', { name: utils.bold(utils.basename(filepath)) }));
      var zipData = nodeAdmZip(filepath);
      var _collections = getCollections(zipData);

      async.eachSeries(_collections, function (collection, next) {
        setTimeout(function () {
          if (collection.package && (collection.blocks || collection.examples)) {

            alertify.prompt(gettextCatalog.getString('Edit the collection name'), collection.origName,
              function (evt, name) {
                if (!name) {
                  return false;
                }
                collection.name = name;

                var destPath = nodePath.join(common.INTERNAL_COLLECTIONS_DIR, name);
                if (nodeFs.existsSync(destPath)) {
                  alertify.confirm(
                    gettextCatalog.getString('The collection {{name}} already exists.', { name: utils.bold(name) }) + '<br>' +
                    gettextCatalog.getString('Do you want to replace it?'),
                    function () {
                      utils.deleteFolderRecursive(destPath);
                      installCollection(collection, zipData);
                      alertify.success(gettextCatalog.getString('Collection {{name}} replaced', { name: utils.bold(name) }));
                      next(name);
                    },
                    function () {
                      alertify.warning(gettextCatalog.getString('Collection {{name}} not replaced', { name: utils.bold(name) }));
                      next(name);
                    });
                }
                else {
                  installCollection(collection, zipData);
                  alertify.success(gettextCatalog.getString('Collection {{name}} added', { name: utils.bold(name) }));
                  next(name);
                }
              });
          }
          else {
            alertify.warning(gettextCatalog.getString('Invalid collection {{name}}', { name: utils.bold(name) }));
          }
        }, 0);
      }, function (name) {
        collections.loadInternalCollections();
        // If the selected collection is replaced, load it again
        if (common.selectedCollection.name === name) {
          collections.selectCollection(name);
        }
        utils.rootScopeSafeApply();
        nextzip();
      });
    });
  };

  function getCollections(zipData) {
    var data = '';
    var _collections = {};
    var zipEntries = zipData.getEntries();

    // Validate collections
    zipEntries.forEach(function (zipEntry) {
      data = zipEntry.entryName.match(/^([^\/]+)\/$/);
      if (data) {
        _collections[data[1]] = {
          origName: data[1], blocks: [], examples: [], locale: [], package: ''
        };
      }

      addCollectionItem('blocks', 'ice', _collections, zipEntry);
      addCollectionItem('blocks', 'v', _collections, zipEntry);
      addCollectionItem('blocks', 'vh', _collections, zipEntry);
      addCollectionItem('blocks', 'list', _collections, zipEntry);
      addCollectionItem('examples', 'ice', _collections, zipEntry);
      addCollectionItem('examples', 'v', _collections, zipEntry);
      addCollectionItem('examples', 'vh', _collections, zipEntry);
      addCollectionItem('examples', 'list', _collections, zipEntry);
      addCollectionItem('locale', 'po', _collections, zipEntry);

      data = zipEntry.entryName.match(/^([^\/]+)\/package\.json$/);
      if (data) {
        _collections[data[1]].package = zipEntry.entryName;
      }
      data = zipEntry.entryName.match(/^([^\/]+)\/README\.md$/);
      if (data) {
        _collections[data[1]].readme = zipEntry.entryName;
      }
    });

    return _collections;
  }

  function addCollectionItem(key, ext, collections, zipEntry) {
    var data = zipEntry.entryName.match(RegExp('^([^\/]+)\/' + key + '\/.*\.' + ext + '$'));
    if (data) {
      collections[data[1]][key].push(zipEntry.entryName);
    }
  }

  function installCollection(collection, zip) {
    var i, dest = '';
    var pattern = RegExp('^' + collection.origName);
    for (i in collection.blocks) {
      dest = collection.blocks[i].replace(pattern, collection.name);
      safeExtract(collection.blocks[i], dest, zip);
    }
    for (i in collection.examples) {
      dest = collection.examples[i].replace(pattern, collection.name);
      safeExtract(collection.examples[i], dest, zip);
    }
    for (i in collection.locale) {
      dest = collection.locale[i].replace(pattern, collection.name);
      safeExtract(collection.locale[i], dest, zip);
      // Generate locale JSON files
      var compiler = new nodeGettext.Compiler({ format: 'json' });
      var sourcePath = nodePath.join(common.INTERNAL_COLLECTIONS_DIR, dest);
      var targetPath = nodePath.join(common.INTERNAL_COLLECTIONS_DIR, dest.replace(/\.po$/, '.json'));
      var content = nodeFs.readFileSync(sourcePath).toString();
      var json = compiler.convertPo([content]);
      nodeFs.writeFileSync(targetPath, json);
      // Add strings to gettext
      gettextCatalog.loadRemote(targetPath);
    }
    if (collection.package) {
      dest = collection.package.replace(pattern, collection.name);
      safeExtract(collection.package, dest, zip);
    }
    if (collection.readme) {
      dest = collection.readme.replace(pattern, collection.name);
      safeExtract(collection.readme, dest, zip);
    }
  }

  function safeExtract(entry, dest, zip) {
    try {
      var newPath = nodePath.join(common.INTERNAL_COLLECTIONS_DIR, dest);
      zip.extractEntryTo(entry, utils.dirname(newPath), /*maintainEntryPath*/false);
    }
    catch (e) { }
  }

  this.removeCollection = function (collection) {
    utils.deleteFolderRecursive(collection.path);
    collections.loadInternalCollections();
    alertify.success(gettextCatalog.getString('Collection {{name}} removed', { name: utils.bold(collection.name) }));
  };

  this.removeAllCollections = function () {
    utils.removeCollections();
    collections.loadInternalCollections();
    alertify.success(gettextCatalog.getString('All collections removed'));
  };
  this.checkForNewVersion = function () {
    if (typeof _package.updatecheck !== 'undefined') {

      $.getJSON(_package.updatecheck + '?_tsi=' + new Date().getTime(), function (result) {
        var hasNewVersion = false;
        if (result !== false) {
          if (typeof result.version !== 'undefined' && _package.version < result.version) {
            hasNewVersion = 'stable';
          }
          if (typeof result.nightly !== 'undefined' && _package.version < result.nightly) {
            hasNewVersion = 'nightly';
          }
          if (hasNewVersion !== false) {
            var msg = '';
            if (hasNewVersion === 'stable') {
              msg = '<div class="new-version-notifier-box"><div class="new-version-notifier-box--icon"><img src="resources/images/confetti.svg"></div>\
                                        <div class="new-version-notifier-box--text">'+ gettextCatalog.getString('There is a new stable version available') + '</div></div>';

            } else {
              msg = '<div class="new-version-notifier-box"><div class="new-version-notifier-box--icon"><img src="resources/images/confetti.svg"></div>\
                                        <div class="new-version-notifier-box--text">'+ gettextCatalog.getString('There is a new nightly version available') + '</div></div>';

            }
            alertify.notify(msg, 'notify', 30);


          }
        }
      }
      );
    }
  };
  this.ifDevelopmentMode = function () {
    if (typeof _package.development !== 'undefined' &&
      typeof _package.development.mode !== 'undefined' &&
      _package.development.mode === true
    ) {
      utils.openDevToolsUI();
    }
  };
});

//<

//
//> app.js
//

appModule
  .config([
    "$routeProvider",
    function($routeProvider) {
      $routeProvider
        .when("/", {
          templateUrl: "views/main.html",
          controller: "MainCtrl"
        })
        .otherwise({
          redirectTo: "/"
        });
    }
  ])
  .run(function(
    profile,
    project,
    common,
    tools,
    utils,
    boards,
    collections,
    gettextCatalog,
    $timeout
  ) {
    $timeout(function() {
      $("body").addClass("waiting");
    }, 0);
    boards.loadBoards();
    utils.loadProfile(profile, function() {
      collections.loadAllCollections();
      utils.loadLanguage(profile, function() {
        if (profile.get("board") === "") {
          // Select board for the first time
          utils.selectBoardPrompt(function(selectedBoard) {
            var newBoard = boards.selectBoard(selectedBoard);
            profile.set("board", newBoard.name);
            alertify.success(
              gettextCatalog.getString("Board {{name}} selected", {
                name: utils.bold(newBoard.info.label)
              })
            );
            tools.checkToolchain();
          });
        } else {
          profile.set("board", boards.selectBoard(profile.get("board")).name);
          tools.checkToolchain();
        }

        $("html").attr("lang", profile.get("language"));
        collections.sort();
        profile.set(
          "collection",
          collections.selectCollection(profile.get("collection"))
        );
        project.updateTitle(gettextCatalog.getString("Untitled"));
        $("body").removeClass("waiting");
      });
    });
  });

//<

//
//> controllers/design.js
//

var subModuleActive = false;

appModule.controller("DesignCtrl", function(
  $rootScope,
  $scope,
  project,
  profile,
  graph,
  gettextCatalog,
  utils,
  common
) {
  $scope.graph = graph;
  $scope.common = common;
  $scope.profile = profile;
  $scope.information = {};
  $scope.topModule = true;
  $scope.isNavigating = false;
  $scope.backup = {};
  $scope.toRestore = false;
  // Intialization
  graph.createPaper($(".paper"));

  // Breadcrumbs

  $scope.breadcrumbsNavitate = function(selectedItem) {
    var item;
    if (common.isEditingSubmodule) {
      alertify.warning(
        gettextCatalog.getString(
          'To navigate through design, you need to close "edit mode".'
        )
      );
    } else {
      if (!$scope.isNavigating) {
        $scope.isNavigating = true;

        do {
          graph.breadcrumbs.pop();
          item = graph.breadcrumbs.slice(-1)[0];
        } while (selectedItem !== item);
        loadSelectedGraph();
      }
    }
  };

  $scope.breadcrumbsBack = function() {
    if (!$scope.isNavigating) {
      $scope.isNavigating = true;
      graph.breadcrumbs.pop();
      loadSelectedGraph();
    }
  };

  $scope.editModeToggle = function($event) {
    var btn = $event.currentTarget;

    if (!$scope.isNavigating) {
      var block = graph.breadcrumbs[graph.breadcrumbs.length - 1];
      var tmp = false;
      var rw = true;
      var lockImg = false;
      var lockImgSrc = false;
      if (common.isEditingSubmodule) {
        lockImg = $("img", btn);
        lockImgSrc = lockImg.attr("data-lock");
        lockImg[0].src = lockImgSrc;
        common.isEditingSubmodule = false;
        subModuleActive = false;
        var cells = $scope.graph.getCells();

        // Sort Constant/Memory cells by x-coordinate
        cells = _.sortBy(cells, function(cell) {
          if (
            cell.get("type") === "ice.Constant" ||
            cell.get("type") === "ice.Memory"
          ) {
            return cell.get("position").x;
          }
        });
        // Sort I/O cells by y-coordinate
        cells = _.sortBy(cells, function(cell) {
          if (
            cell.get("type") === "ice.Input" ||
            cell.get("type") === "ice.Output"
          ) {
            return cell.get("position").y;
          }
        });
        $scope.graph.setCells(cells);

        var graphData = $scope.graph.toJSON();
        var p = utils.cellsToProject(graphData.cells);
        tmp = utils.clone(common.allDependencies[block.type]);
        tmp.design.graph = p.design.graph;
        /*var hId = utils.dependencyID(tmp);*/

        var hId = block.type;
        common.allDependencies[hId] = tmp;
        $scope.toRestore = hId;

        common.forceBack = true;
      } else {
        lockImg = $("img", btn);
        lockImgSrc = lockImg.attr("data-unlock");
        lockImg[0].src = lockImgSrc;
        tmp = common.allDependencies[block.type];
        $scope.toRestore = false;
        rw = false;
        common.isEditingSubmodule = true;
        subModuleActive = true;
      }

      $rootScope.$broadcast("navigateProject", {
        update: false,
        project: tmp,
        editMode: rw
      });
      utils.rootScopeSafeApply();
    }
  };

  function loadSelectedGraph() {
    var n = graph.breadcrumbs.length;
    var opt = { disabled: true };
    var design = false;
    var i = 0;
    if (n === 1) {
      design = project.get("design");
      opt.disabled = false;
      if (
        $scope.toRestore !== false &&
        common.submoduleId !== false &&
        design.graph.blocks.length > 0
      ) {
        for (i = 0; i < design.graph.blocks.length; i++) {
          if (common.submoduleUID === design.graph.blocks[i].id) {
            design.graph.blocks[i].type = $scope.toRestore;
          }
        }

        $scope.toRestore = false;
      }

      graph.resetView();
      graph.loadDesign(design, opt, function() {
        $scope.isNavigating = false;
        graph.fitContent();
      });
      $scope.topModule = true;
    } else {
      var type = graph.breadcrumbs[n - 1].type;
      var dependency = common.allDependencies[type];
      design = dependency.design;
      if (
        $scope.toRestore !== false &&
        common.submoduleId !== false &&
        design.graph.blocks.length > 0
      ) {
        //toRestoreLn=$scope.toRestore;
        for (i = 0; i < design.graph.blocks.length; i++) {
          if (common.submoduleUID === design.graph.blocks[i].id) {
            common.allDependencies[type].design.graph.blocks[i].type =
              $scope.toRestore;
          }
        }
        $scope.toRestore = false;
      }

      //                               graph.fitContent();
      graph.resetView();
      graph.loadDesign(dependency.design, opt, function() {
        graph.fitContent();
        $scope.isNavigating = false;
      });
      $scope.information = dependency.package;
    }
  }

  $rootScope.$on("navigateProject", function(event, args) {
    var opt = { disabled: true };
    if (typeof args.submodule !== "undefined") {
      common.submoduleId = args.submodule;
    }
    if (typeof args.submoduleId !== "undefined") {
      common.submoduleUID = args.submoduleId;
    }
    if (typeof args.editMode !== "undefined") {
      opt.disabled = args.editMode;
    }

    if (args.update) {
      // Update the main project
      //        graph.fitContent();

      graph.resetView();
      project.update({ deps: false }, function() {
        graph.loadDesign(args.project.design, opt, function() {
          graph.fitContent();
        });
      });
    } else {
      //        graph.fitContent();
      //  utils.rootScopeSafeApply();

      graph.resetView();

      graph.loadDesign(args.project.design, opt, function() {
        graph.fitContent();
      });
    }
    $scope.topModule = false;
    $scope.information = args.project.package;
    //utils.rootScopeSafeApply();
    if (typeof common.forceBack !== "undefined" && common.forceBack === true) {
      common.forceBack = false;
      $scope.breadcrumbsBack();
    }
  });

  $rootScope.$on("breadcrumbsBack", function(/*event*/) {
    $scope.breadcrumbsBack();
    utils.rootScopeSafeApply();
  });

  $rootScope.$on("editModeToggle", function(event) {
    $scope.editModeToggle(event);
    utils.rootScopeSafeApply();
  });
});

//<

//
//> controllers/main.js
//

appModule.controller("MainCtrl", function(
  $scope,
  gettextCatalog,
  tools,
  utils
) {
  alertify.defaults.movable = false;
  alertify.defaults.closable = false;
  alertify.defaults.transition = "fade";
  alertify.defaults.notifier.delay = 3;

  setTimeout(function() {
    var labels = {
      ok: gettextCatalog.getString("OK"),
      cancel: gettextCatalog.getString("Cancel")
    };
    alertify.set("alert", "labels", labels);
    alertify.set("prompt", "labels", labels);
    alertify.set("confirm", "labels", labels);
  }, 100);

  /* If in package.json appears development:{mode:true}*/
  /* activate development tools */
  tools.ifDevelopmentMode();

  $(document).delegate(".action-open-url-external-browser", "click", function(
    e
  ) {
    e.preventDefault();
    utils.openUrlExternalBrowser($(this).prop("href"));
    return false;
  });

  /* Functions that checks if new version is available */
  setTimeout(function() {
    tools.checkForNewVersion();
  }, 30000);
});

//<

//
//> services/shortcuts.js
//

appModule
  .filter("shortcut", function(shortcuts) {
    return function(action) {
      return shortcuts.label(action);
    };
  })
  .service("shortcuts", function(common) {
    this.method = function(action, method) {
      // Configure shortcut method
      if (action in shortcuts) {
        shortcuts[action]["method"] = method;
      }
    };

    this.execute = function(event, opt) {
      // Execute shortcut method
      // Options:
      // - opt.prompt: enable shortcut when a prompt is shown
      // - opt.disable: enable shortcut when the graph is disabled
      var action = "";
      var method = null;
      var system = common.DARWIN ? "mac" : "linux";
      var ret = { preventDefault: false };
      for (action in shortcuts) {
        var options = shortcuts[action].opt || {};
        var command = shortcuts[action][system];
        if (
          event.keyCode === command.key &&
          event.altKey === (command.alt || false) &&
          event.ctrlKey === (command.ctrl || false) &&
          event.metaKey === (command.meta || false) &&
          event.shiftKey === (command.shift || false) &&
          (!opt.prompt || options.prompt || false) &&
          (!opt.disabled || options.disabled || false)
        ) {
          method = shortcuts[action].method;
          ret.preventDefault = options.preventDefault || false;
          break;
        }
      }
      if (method) {
        method();
      }
      return ret;
    };

    this.label = function(action) {
      // Return shortcut label
      var label = "";
      if (action in shortcuts) {
        if (common.DARWIN) {
          label = shortcuts[action].mac.label;
        } else {
          label = shortcuts[action].linux.label;
        }
      }
      return label;
    };

    var shortcuts = {
      newProject: {
        linux: { label: "Ctrl+N", ctrl: true, key: 78 },
        mac: { label: "⌘+N", meta: true, key: 78 }
      },
      openProject: {
        linux: { label: "Ctrl+O", ctrl: true, key: 79 },
        mac: { label: "⌘+O", meta: true, key: 79 }
      },
      saveProject: {
        linux: { label: "Ctrl+S", ctrl: true, key: 83 },
        mac: { label: "⌘+S", meta: true, key: 83 },
        opt: { prompt: true }
      },
      saveProjectAs: {
        linux: { label: "Ctrl+Shift+S", ctrl: true, shift: true, key: 83 },
        mac: { label: "Shift+⌘+S", meta: true, shift: true, key: 83 },
        opt: { prompt: true }
      },
      quit: {
        linux: { label: "Ctrl+Q", ctrl: true, key: 81 },
        mac: { label: "⌘+Q", meta: true, key: 81 }
      },
      undoGraph: {
        linux: { label: "Ctrl+Z", ctrl: true, key: 90 },
        mac: { label: "⌘+Z", meta: true, key: 90 },
        opt: { preventDefault: true }
      },
      redoGraph: {
        linux: { label: "Ctrl+Y", ctrl: true, key: 89 },
        mac: { label: "⌘+Y", meta: true, key: 89 },
        opt: { preventDefault: true }
      },
      redoGraph2: {
        linux: { label: "Ctrl+Shift+Z", ctrl: true, shift: true, key: 90 },
        mac: { label: "Shift+⌘+Z", meta: true, shift: true, key: 90 },
        opt: { preventDefault: true }
      },
      cutSelected: {
        linux: { label: "Ctrl+X", ctrl: true, key: 88 },
        mac: { label: "⌘+X", meta: true, key: 88 }
      },
      copySelected: {
        linux: { label: "Ctrl+C", ctrl: true, key: 67 },
        mac: { label: "⌘+C", meta: true, key: 67 }
      },
      pasteSelected: {
        linux: { label: "Ctrl+V", ctrl: true, key: 86 },
        mac: { label: "⌘+V", meta: true, key: 86 }
      },
      pasteAndCloneSelected: {
        linux: { label: "Ctrl+Shift+V", ctrl: true, shift: true, key: 86 },
        mac: { label: "Shit+⌘+V", meta: true, shift: true, key: 86 }
      },

      selectAll: {
        linux: { label: "Ctrl+A", ctrl: true, key: 65 },
        mac: { label: "⌘+A", meta: true, key: 65 }
      },
      fitContent: {
        linux: { label: "Ctrl+1", ctrl: true, key: 49 },
        mac: { label: "⌘+1", meta: true, key: 49 },
        opt: { disabled: true }
      },
      verifyCode: {
        linux: { label: "Ctrl+R", ctrl: true, key: 82 },
        mac: { label: "⌘+R", meta: true, key: 82 }
      },
      buildCode: {
        linux: { label: "Ctrl+B", ctrl: true, key: 66 },
        mac: { label: "⌘+B", meta: true, key: 66 }
      },
      uploadCode: {
        linux: { label: "Ctrl+U", ctrl: true, key: 85 },
        mac: { label: "⌘+U", meta: true, key: 85 }
      },
      stepUp: {
        linux: { label: "Arrow up", key: 38 },
        mac: { label: "Arrow up", key: 38 }
      },
      stepDown: {
        linux: { label: "Arrow down", key: 40 },
        mac: { label: "Arrow down", key: 40 }
      },
      stepLeft: {
        linux: { label: "Arrow left", key: 37 },
        mac: { label: "Arrow left", key: 37 }
      },
      stepRight: {
        linux: { label: "Arrow right", key: 39 },
        mac: { label: "Arrow right", key: 39 }
      },
      removeSelected: {
        linux: { label: "Supr", key: 46 },
        mac: { label: "Fn+Delete", key: 46 }
      },
      back: {
        linux: { label: "Back", key: 8 },
        mac: { label: "Delete", key: 8 },
        opt: { disabled: true }
      },
      takeSnapshot: {
        linux: { label: "Ctrl+P", ctrl: true, key: 80 },
        mac: { label: "⌘+P", meta: true, key: 80 },
        opt: { prompt: true, disabled: true, preventDefault: true }
      }
    };
  });

//<

//
//> controllers/menu.js
//

appModule.controller("MenuCtrl", function(
  $rootScope,
  $scope,
  $timeout,
  boards,
  profile,
  project,
  collections,
  graph,
  tools,
  utils,
  common,
  shortcuts,
  gettextCatalog,
  gui,
  _package,
  nodeFs,
  nodePath
) {
    //-- Initialize scope

    $scope.profile = profile;
    $scope.project = project;
    $scope.tools = tools;
    $scope.common = common;

    $scope.version = _package.version;
    $scope.toolchain = tools.toolchain;

    $scope.workingdir = '';
    $scope.snapshotdir = '';

    var zeroProject = true;  // New project without changes
    var resultAlert = null;
    var winCommandOutput = null;

    var buildUndoStack = [];
    var changedUndoStack = [];
    var currentUndoStack = [];


    // Window events
    var win = gui.Window.get();
    win.on('close', function () {
      exit();
    });
    win.on('resize', function () {
      graph.fitContent();
    });
    // Darwin fix for shortcuts
    if (process.platform === 'darwin') {
      var mb = new gui.Menu({ type: 'menubar' });
      mb.createMacBuiltin('hwstudio');
      win.menu = mb;
    }

    // New window, get the focus
    win.focus();
    // Load app arguments

    setTimeout(function () {

      // Parse GET url parmeters for window instance arguments
      // all arguments will be embeded in hwstudio_argv param
      // that is a JSON string url encoded

      // https://developer.mozilla.org/es/docs/Web/JavaScript/Referencia/Objetos_globales/unescape
      // unescape is deprecated javascript function, should use decodeURI instead

      var queryStr = (window.location.search.indexOf('?hwstudio_argv=')===0) ?
        '?hwstudio_argv='+atob(decodeURI(window.location.search.replace('?hwstudio_argv=','')))+'&'
      :
        decodeURI(window.location.search) + '&'
      ;
      var regex = new RegExp('.*?[&\\?]hwstudio_argv=(.*?)&.*');
      var val = queryStr.replace(regex, '$1');

      var params = (val === queryStr) ? false : val;
      // If there are url params, compatibilize it with shell call
        if (typeof gui.App.argv === 'undefined') {
          gui.App.argv = [];
        }

        var prop;
      if (params !== false) {
        params = JSON.parse(decodeURI(params));
        for ( prop in params) {
          gui.App.argv.push(params[prop]);
        }
      }
      var argv=gui.App.argv;

      if(window.opener.opener !== null){
        argv=[];
    }

      if(params !==false){
         for (prop in params) {
          argv.push(params[prop]);
        }
      }
      var local = false;
      for (var i in argv) {
        var arg = argv[i];
        processArg(arg);
        local = arg === 'local' || local;
      }

      console.log('ARGV',argv);
      var editable = !project.path.startsWith(common.DEFAULT_COLLECTION_DIR) &&
        !project.path.startsWith(common.INTERNAL_COLLECTIONS_DIR) &&
        project.path.startsWith(common.selectedCollection.path);

      if (editable || !local ) {
        updateWorkingdir(project.path);
      } else {
        project.path = '';
      }

    }, 500);

    function processArg(arg) {
      if (nodeFs.existsSync(arg)) {
        // Open filepath
        var filepath = arg;
        project.open(filepath);
      }
      else {
        // Move window
        var data = arg.split('x');
        var offset = {
          x: parseInt(data[0]),
          y: parseInt(data[1])
        };
        win.moveTo(offset.x, offset.y);
      }
    }

    //-- File

    $scope.newProject = function () {
      utils.newWindow();
    };

    $scope.openProjectDialog = function () {
      utils.openDialog('#input-open-project', '.ice', function (filepath) {
        if (zeroProject) {
          // If this is the first action, open
          // the projec in the same window
          updateWorkingdir(filepath);
          project.open(filepath);
        }
        else if (project.changed || !equalWorkingFilepath(filepath)) {
          // If this is not the first action, and
          // the file path is different, open
          // the project in a new window
          utils.newWindow(filepath);
        }
      });
    };

    $scope.openProject = function (filepath) {
      if (zeroProject) {
        // If this is the first action, open
        // the project in the same window
        var editable = !filepath.startsWith(common.DEFAULT_COLLECTION_DIR) &&
          !filepath.startsWith(common.INTERNAL_COLLECTIONS_DIR) &&
          filepath.startsWith(common.selectedCollection.path);
        updateWorkingdir(editable ? filepath : '');
        project.open(filepath, true);
      }
      else {
        // If this is not the first action, and
        // the file path is different, open
        // the project in a new window
        utils.newWindow(filepath, true);
      }
    };

    $scope.saveProject = function () {

      if (typeof common.isEditingSubmodule !== 'undefined' &&
        common.isEditingSubmodule === true) {
        alertify.alert(gettextCatalog.getString('Save submodule'),
          gettextCatalog.getString('To save your design you need to lock the keylock and go to top level design.<br/><br/>If you want to export this submodule to a file, execute "Save as" command to do it.'), function () { });

        return;
      }
      var filepath = project.path;
      if (filepath) {
        project.save(filepath, function () {
          reloadCollectionsIfRequired(filepath);
        });
        resetChangedStack();
      }
      else {
        $scope.saveProjectAs();
      }
    };

    $scope.doSaveProjectAs = function (localCallback) {

      utils.saveDialog('#input-save-project', '.ice', function (filepath) {
        updateWorkingdir(filepath);
        project.save(filepath, function () {
          reloadCollectionsIfRequired(filepath);
        });
        resetChangedStack();
        if (localCallback) {
          localCallback();
        }
      });



    };

    $scope.saveProjectAs = function (localCallback) {
      if (typeof common.isEditingSubmodule !== 'undefined' &&

        common.isEditingSubmodule === true) {
        alertify.confirm(gettextCatalog.getString('Export submodule'), gettextCatalog.getString('You are editing a submodule, if you save it, you save only the submodule (in this situation "save as" works like "export module"), Do you like to continue?'),
          function () {
            $scope.doSaveProjectAs(localCallback);
          }, function () {

          });

      } else {
        $scope.doSaveProjectAs(localCallback);

      }

    };

    function reloadCollectionsIfRequired(filepath) {
      var selected = common.selectedCollection.name;
      if (filepath.startsWith(common.INTERNAL_COLLECTIONS_DIR)) {
        collections.loadInternalCollections();
      }
      if (filepath.startsWith(profile.get('externalCollections'))) {
        collections.loadExternalCollections();
      }
      if (selected &&
        filepath.startsWith(nodePath.join(common.INTERNAL_COLLECTIONS_DIR, selected)) ||
        filepath.startsWith(nodePath.join(profile.get('externalCollections'), selected))) {
        collections.selectCollection(common.selectedCollection.path);
      }
    }

    $rootScope.$on('saveProjectAs', function (event, callback) {
      $scope.saveProjectAs(callback);
    });

    $scope.addAsBlock = function () {
      var notification = true;
      utils.openDialog('#input-add-as-block', '.ice', function (filepaths) {
        filepaths = filepaths.split(';');
        for (var i in filepaths) {
          project.addBlockFile(filepaths[i], notification);
        }
      });
    };

    $scope.exportVerilog = function () {
      exportFromCompiler('verilog', 'Verilog', '.v');
    };

    $scope.exportPCF = function () {
      exportFromCompiler('pcf', 'PCF', '.pcf');
    };

    $scope.exportTestbench = function () {
      exportFromCompiler('testbench', 'Testbench', '.v');
    };

    $scope.exportGTKwave = function () {
      exportFromCompiler('gtkwave', 'GTKWave', '.gtkw');
    };

    $scope.exportBLIF = function () {
      exportFromBuilder('blif', 'BLIF', '.blif');
    };

    $scope.exportASC = function () {
      exportFromBuilder('asc', 'ASC', '.asc');

    };
    $scope.exportBitstream = function () {
      exportFromBuilder('bin', 'Bitstream', '.bin');
    };

    function exportFromCompiler(id, name, ext) {
      checkGraph()
        .then(function () {
          // TODO: export list files
          utils.saveDialog('#input-export-' + id, ext, function (filepath) {
            // Save the compiler result
            var data = project.compile(id)[0].content;
            utils.saveFile(filepath, data)
              .then(function () {
                alertify.success(gettextCatalog.getString('{{name}} exported', { name: name }));
              })
              .catch(function (error) {
                alertify.error(error, 30);
              });
            // Update the working directory
            updateWorkingdir(filepath);
          });
        })
        .catch(function () { });
    }

    function exportFromBuilder(id, name, ext) {
      checkGraph()
        .then(function () {
          return tools.buildCode();
        })
        .then(function () {
          resetBuildStack();
        })
        .then(function () {
          utils.saveDialog('#input-export-' + id, ext, function (filepath) {
            // Copy the built file
            if (utils.copySync(nodePath.join(common.BUILD_DIR, 'hardware' + ext), filepath)) {
              alertify.success(gettextCatalog.getString('{{name}} exported', { name: name }));
            }
            // Update the working directory
            updateWorkingdir(filepath);
          });
        })
        .catch(function () { });
    }

    function updateWorkingdir(filepath) {
      $scope.workingdir = utils.dirname(filepath) + utils.sep;
    }

    function equalWorkingFilepath(filepath) {
      return $scope.workingdir + project.name + '.ice' === filepath;
    }

    $scope.quit = function () {
      exit();
    };

    function exit() {
      if (project.changed) {
        alertify.set('confirm', 'labels', {
          'ok': gettextCatalog.getString('Close')
        });
        alertify.set('confirm', 'defaultFocus', 'cancel');
        alertify.confirm(
          utils.bold(gettextCatalog.getString('Do you want to close the application?')) + '<br>' +
          gettextCatalog.getString('Your changes will be lost if you don’t save them'),
          function () {
            // Close
            _exit();
          },
          function () {
            // Cancel
            setTimeout(function () {
              alertify.set('confirm', 'labels', {
                'ok': gettextCatalog.getString('OK')
              });
              alertify.set('confirm', 'defaultFocus', 'ok');
            }, 200);
          }
        );
      }
      else {
        _exit();
      }
      function _exit() {
        //win.hide();
        win.close(true);
      }
    }


    //-- Edit

    $scope.undoGraph = function () {
      graph.undo();
    };

    $scope.redoGraph = function () {
      graph.redo();
    };

    $scope.cutSelected = function () {
      graph.cutSelected();
    };

    $scope.copySelected = function () {
      graph.copySelected();
    };

    var paste = true;

    $scope.pasteSelected = function () {
      if (paste) {
        paste = false;
        graph.pasteSelected();
        setTimeout(function () {
          paste = true;
        }, 250);
      }
    };
    var pasteAndClone = true;
    $scope.pasteAndCloneSelected = function () {
      if (paste) {
        pasteAndClone = false;
        graph.pasteAndCloneSelected();
        setTimeout(function () {
          pasteAndClone = true;
        }, 250);
      }
    };


    $scope.selectAll = function () {
      checkGraph()
        .then(function () {
          graph.selectAll();
        })
        .catch(function () { });
    };

    function removeSelected() {
      project.removeSelected();
    }

    $scope.fitContent = function () {
      graph.fitContent();
    };

    $scope.setExternalCollections = function () {
      var externalCollections = profile.get('externalCollections');
      var formSpecs = [
        {
          type: 'text',
          title: gettextCatalog.getString('Enter the external collections path'),
          value: externalCollections || ''
        }
      ];
      utils.renderForm(formSpecs, function (evt, values) {
        var newExternalCollections = values[0];
        if (resultAlert) {
          resultAlert.dismiss(false);
        }
        if (newExternalCollections !== externalCollections) {
          if (newExternalCollections === '' || nodeFs.existsSync(newExternalCollections)) {
            profile.set('externalCollections', newExternalCollections);
            collections.loadExternalCollections();
            collections.selectCollection(); // default
            utils.rootScopeSafeApply();
            if (common.selectedCollection.path.startsWith(newExternalCollections)) {
            }
            alertify.success(gettextCatalog.getString('External collections updated'));
          }
          else {
            evt.cancel = true;
            resultAlert = alertify.error(gettextCatalog.getString('Path {{path}} does not exist', { path: newExternalCollections }, 5));
          }
        }
      });
    };

    $(document).on('infoChanged', function (evt, newValues) {
      var values = getProjectInformation();
      if (!_.isEqual(values, newValues)) {
        graph.setInfo(values, newValues, project);
        alertify.message(gettextCatalog.getString('Project information updated') + '.<br>' + gettextCatalog.getString('Click here to view'), 5)
          .callback = function (isClicked) {
            if (isClicked) {
              $scope.setProjectInformation();
            }
          };
      }
    });

    $scope.setProjectInformation = function () {
      var values = getProjectInformation();
      utils.projectinfoprompt(values, function (evt, newValues) {
        if (!_.isEqual(values, newValues)) {
          if (subModuleActive && typeof common.submoduleId !== 'undefined' && typeof common.allDependencies[common.submoduleId] !== 'undefined') {
            graph.setBlockInfo(values, newValues, common.submoduleId);
          } else {
            graph.setInfo(values, newValues, project);
          }
          alertify.success(gettextCatalog.getString('Project information updated'));
        }
      });
    };

    function getProjectInformation() {
      var p = false;
      if (subModuleActive && typeof common.submoduleId !== 'undefined' && typeof common.allDependencies[common.submoduleId] !== 'undefined') {
        p = common.allDependencies[common.submoduleId].package;

      } else {
        p = project.get('package');
      }
      return [
        p.name,
        p.version,
        p.description,
        p.author,
        p.image
      ];
    }

    $scope.setRemoteHostname = function () {
      var current = profile.get('remoteHostname');
      alertify.prompt(gettextCatalog.getString('Enter the remote hostname user@host'), (current) ? current : '',
        function (evt, remoteHostname) {
          profile.set('remoteHostname', remoteHostname);
        });
    };

    $scope.toggleBoardRules = function () {
      graph.setBoardRules(!profile.get('boardRules'));
      if (profile.get('boardRules')) {
        alertify.success(gettextCatalog.getString('Board rules enabled'));
      }
      else {
        alertify.success(gettextCatalog.getString('Board rules disabled'));
      }
    };

    $(document).on('langChanged', function (evt, lang) {
      $scope.selectLanguage(lang);
    });

    $scope.selectLanguage = function (language) {
      if (profile.get('language') !== language) {
        profile.set('language', graph.selectLanguage(language));
        // Reload the project
        project.update({ deps: false }, function () {
          graph.loadDesign(project.get('design'), { disabled: false });
          //alertify.success(gettextCatalog.getString('Language {{name}} selected',  { name: utils.bold(language) }));
        });
        // Rearrange the collections content
        collections.sort();
      }
    };


    //-- View

    $scope.showPCF = function () {
      gui.Window.open('resources/viewers/plain/pcf.html?board=' + common.selectedBoard.name, {
        title: common.selectedBoard.info.label + ' - PCF',
        focus: true,
        //toolbar: false,
        resizable: true,
        width: 700,
        height: 700,
        'min_width': 300,
        'min_height': 300,
        icon: 'resources/images/logo.png'
      });
    };

    $scope.showPinout = function () {
      var board = common.selectedBoard;
      if (nodeFs.existsSync(nodePath.join('resources', 'boards', board.name, 'pinout.svg'))) {
        gui.Window.open('resources/viewers/svg/pinout.html?board=' + board.name, {
          title: common.selectedBoard.info.label + ' - Pinout',
          focus: true,
          //toolbar: false,
          resizable: true,
          width: 500,
          height: 700,
          'min_width': 300,
          'min_height': 300,
          icon: 'resources/images/logo.png'
        });
      }
      else {
        alertify.warning(gettextCatalog.getString('{{board}} pinout not defined', { board: utils.bold(board.info.label) }), 5);
      }
    };

    $scope.showDatasheet = function () {
      var board = common.selectedBoard;
      if (board.info.datasheet) {
        gui.Shell.openExternal(board.info.datasheet);
      }
      else {
        alertify.error(gettextCatalog.getString('{{board}} datasheet not defined', { board: utils.bold(board.info.label) }), 5);
      }
    };

    $scope.showBoardRules = function () {
      var board = common.selectedBoard;
      var rules = JSON.stringify(board.rules);
      if (rules !== '{}') {
        var encRules=encodeURIComponent(rules);
        gui.Window.open('resources/viewers/table/rules.html?rules=' + encRules, {
          title: common.selectedBoard.info.label + ' - Rules',
          focus: true,
          //toolbar: false,
          resizable: false,
          width: 500,
          height: 500,
          'min_width': 300,
          'min_height': 300,
          icon: 'resources/images/logo.png'
        });
      }
      else {
        alertify.error(gettextCatalog.getString('{{board}} rules not defined', { board: utils.bold(board.info.label) }), 5);
      }
    };

    $scope.toggleFPGAResources = function () {
      profile.set('showFPGAResources', !profile.get('showFPGAResources'));
    };

    $scope.showCollectionData = function () {
      var collection = common.selectedCollection;
      var readme = collection.content.readme;
      if (readme) {
        gui.Window.open('resources/viewers/markdown/readme.html?readme=' + readme, {
          title: (collection.name ? collection.name : 'Default') + ' Collection - Data',
          focus: true,
          //toolbar: false,
          resizable: true,
          width: 700,
          height: 700,
          'min_width': 300,
          'min_height': 300,
          icon: 'resources/images/logo.png'
        });
      }
      else {
        alertify.error(gettextCatalog.getString('Collection {{collection}} info not defined', { collection: utils.bold(collection.name) }), 5);
      }
    };

    $scope.showCommandOutput = function () {
      winCommandOutput = gui.Window.open('resources/viewers/plain/output.html?content=' + encodeURIComponent(common.commandOutput), {
        title: gettextCatalog.getString('Command output'),
        focus: true,
/*        toolbar: false,*/
        resizable: true,
        width: 700,
        height: 400,
        'min_width': 300,
        'min_height': 300,
        icon: 'resources/images/logo.png'
      });
    };

    $(document).on('commandOutputChanged', function (evt, commandOutput) {
      if (winCommandOutput) {
        try {
          winCommandOutput.window.location.href = 'resources/viewers/plain/output.html?content=' + encodeURIComponent(commandOutput);
        }
        catch (e) {
          winCommandOutput = null;
        }
      }
    });

    $scope.selectCollection = function (collection) {
      if (common.selectedCollection.path !== collection.path) {
        var name = collection.name;
        profile.set('collection', collections.selectCollection(collection.path));
        alertify.success(gettextCatalog.getString('Collection {{name}} selected', { name: utils.bold(name ? name : 'Default') }));
      }
    };

    function updateSelectedCollection() {
      profile.set('collection', collections.selectCollection(profile.get('collection')));
    }


    //-- Boards

    $(document).on('boardChanged', function (evt, board) {
      if (common.selectedBoard.name !== board.name) {
        var newBoard = graph.selectBoard(board);
        profile.set('board', newBoard.name);
      }
    });

    $scope.selectBoard = function (board) {
      if (common.selectedBoard.name !== board.name) {
        if (!graph.isEmpty()) {
          alertify.confirm(gettextCatalog.getString('The current FPGA I/O configuration will be lost. Do you want to change to {{name}} board?', { name: utils.bold(board.info.label) }),
            function () {
              _boardSelected();
            });
        }
        else {
          _boardSelected();
        }
      }
      function _boardSelected() {
        var reset = true;
        var newBoard = graph.selectBoard(board, reset);
        profile.set('board', newBoard.name);
        alertify.success(gettextCatalog.getString('Board {{name}} selected', { name: utils.bold(newBoard.info.label) }));
      }
    };


    //-- Tools

    $scope.verifyCode = function () {
      var startMessage = gettextCatalog.getString('Start verification');
      var endMessage = gettextCatalog.getString('Verification done');
      checkGraph()
        .then(function () {
          return tools.verifyCode(startMessage, endMessage);
        })
        .catch(function () {

        });
    };

    $scope.buildCode = function () {
      if (typeof common.isEditingSubmodule !== 'undefined' &&
        common.isEditingSubmodule === true) {
        alertify.alert(gettextCatalog.getString('Build'),
          gettextCatalog.getString('You can only build at top-level design. Inside submodules you only can <strong>Verify</strong>'), function () { });
        return;
      }

      var startMessage = gettextCatalog.getString('Start build');
      var endMessage = gettextCatalog.getString('Build done');
      checkGraph()
        .then(function () {
          return tools.buildCode(startMessage, endMessage);
        })
        .then(function () {
          resetBuildStack();
        })
        .catch(function () { });
    };

    $scope.uploadCode = function () {
      if (typeof common.isEditingSubmodule !== 'undefined' &&
        common.isEditingSubmodule === true) {
        alertify.alert(gettextCatalog.getString('Upload'),
          gettextCatalog.getString('You can only upload  your design at top-level design. Inside submodules you only can <strong>Verify</strong>'), function () { });

        return;
      }


      var startMessage = gettextCatalog.getString('Start upload');
      var endMessage = gettextCatalog.getString('Upload done');
      checkGraph()
        .then(function () {
          return tools.uploadCode(startMessage, endMessage);
        })
        .then(function () {
          resetBuildStack();
        })
        .catch(function () { });
    };

    function checkGraph() {
      return new Promise(function (resolve, reject) {
        if (!graph.isEmpty()) {
          resolve();
        }
        else {
          if (resultAlert) {
            resultAlert.dismiss(true);
          }
          resultAlert = alertify.warning(gettextCatalog.getString('Add a block to start'), 5);
          reject();
        }
      });
    }

    $scope.addCollections = function () {
      utils.openDialog('#input-add-collection', '.zip', function (filepaths) {
        filepaths = filepaths.split(';');
        tools.addCollections(filepaths);
      });
    };

    $scope.reloadCollections = function () {
      collections.loadAllCollections();
      collections.selectCollection(common.selectedCollection.path);
    };

    $scope.removeCollection = function (collection) {
      alertify.confirm(gettextCatalog.getString('Do you want to remove the {{name}} collection?', { name: utils.bold(collection.name) }),
        function () {
          tools.removeCollection(collection);
          updateSelectedCollection();
          utils.rootScopeSafeApply();
        });
    };

    $scope.removeAllCollections = function () {
      if (common.internalCollections.length > 0) {
        alertify.confirm(gettextCatalog.getString('All stored collections will be lost. Do you want to continue?'),
          function () {
            tools.removeAllCollections();
            updateSelectedCollection();
            utils.rootScopeSafeApply();
          });
      }
      else {
        alertify.warning(gettextCatalog.getString('No collections stored'), 5);
      }
    };

    $scope.showChromeDevTools = function () {

      //win.showDevTools();
       utils.openDevToolsUI();
    };

    //-- Help

    $scope.openUrl = function (url,$event) {
     // $event.preventDefault();

      utils.openUrlExternalBrowser(url);
      return false;
    };

    $scope.about = function () {
      alertify.alert([
        '<div class="row">',
        '  <div class="col-sm-12">',
        '    <h4>Hardware Studio (<a class="action-open-url-external-browser" href="https://github.com/umarcor/hwstudio">hwstudio</a>)</h4>',
        '    <p><i>GUI editor for hardware description designers</i></p>',
        '  </div>',
        '</div>',
        '<div class="row" style="margin-top:15px;">',
        '  <div class="col-sm-12">',
        '    <p>Version: ' + $scope.version + '</p>',
        '    <p>License: <a class="action-open-url-external-browser" href="https://www.gnu.org/licenses/old-licenses/gpl-2.0.html">GPL-2.0</a></p>',
        '    <p>Documentation: <a class="action-open-url-external-browser" href="http://umarcor.github.io/hwstudio">umarcor.github.io/hwstudio</a></p>',
        '  </div>',
        '</div>',
         '<div class="row" style="margin-top:15px;">',
        '  <div class="col-sm-12">',
        '    <p>Thanks to all the <a class="action-open-url-external-browser" href="https://github.com/umarcor/hwstudio/graphs/contributors">contributors</a>!</p>',
        '  </div>',
        '</div>'].join('\n'));
    };

    // Events

    $(document).on('stackChanged', function (evt, undoStack) {
      currentUndoStack = undoStack;
      var undoStackString = JSON.stringify(undoStack);
      project.changed = JSON.stringify(changedUndoStack) !== undoStackString;
      project.updateTitle();
      zeroProject = false;
      common.hasChangesSinceBuild = JSON.stringify(buildUndoStack) !== undoStackString;
      utils.rootScopeSafeApply();
    });

    function resetChangedStack() {
      changedUndoStack = currentUndoStack;
      project.changed = false;
      project.updateTitle();
    }

    function resetBuildStack() {
      buildUndoStack = currentUndoStack;
      common.hasChangesSinceBuild = false;
      utils.rootScopeSafeApply();
    }

    // Detect prompt

    var promptShown = false;

    alertify.prompt().set({
      onshow: function () {
        promptShown = true;
      },
      onclose: function () {
        promptShown = false;
      }
    });

    alertify.confirm().set({
      onshow: function () {
        promptShown = true;
      },
      onclose: function () {
        promptShown = false;
      }
    });

    // Configure all shortcuts

    // -- File
    shortcuts.method('newProject', $scope.newProject);
    shortcuts.method('openProject', $scope.openProjectDialog);
    shortcuts.method('saveProject', $scope.saveProject);
    shortcuts.method('saveProjectAs', $scope.saveProjectAs);
    shortcuts.method('quit', $scope.quit);

    // -- Edit
    shortcuts.method('undoGraph', $scope.undoGraph);
    shortcuts.method('redoGraph', $scope.redoGraph);
    shortcuts.method('redoGraph2', $scope.redoGraph);
    shortcuts.method('cutSelected', $scope.cutSelected);
    shortcuts.method('copySelected', $scope.copySelected);
    shortcuts.method('pasteAndCloneSelected', $scope.pasteAndCloneSelected);
    shortcuts.method('pasteSelected', $scope.pasteSelected);
    shortcuts.method('selectAll', $scope.selectAll);
    shortcuts.method('fitContent', $scope.fitContent);

    // -- Tools
    shortcuts.method('verifyCode', $scope.verifyCode);
    shortcuts.method('buildCode', $scope.buildCode);
    shortcuts.method('uploadCode', $scope.uploadCode);

    // -- Misc
    shortcuts.method('stepUp', graph.stepUp);
    shortcuts.method('stepDown', graph.stepDown);
    shortcuts.method('stepLeft', graph.stepLeft);
    shortcuts.method('stepRight', graph.stepRight);

    shortcuts.method('removeSelected', removeSelected);
    shortcuts.method('back', function () {
      if (graph.isEnabled()) {
        removeSelected();
      }
      else {
        $rootScope.$broadcast('breadcrumbsBack');
      }
    });

    shortcuts.method('takeSnapshot', takeSnapshot);

    $(document).on('keydown', function (event) {
      var opt = {
        prompt: promptShown,
        disabled: !graph.isEnabled()
      };
      event.stopImmediatePropagation();
      var ret = shortcuts.execute(event, opt);
      if (ret.preventDefault) {
        event.preventDefault();
      }
    });

    function takeSnapshot() {
      win.capturePage(function (img) {
        var base64Data = img.replace(/^data:image\/(png|jpg|jpeg);base64,/, '');
        saveSnapshot(base64Data);
      }, 'png');
    }

    function saveSnapshot(base64Data) {
      utils.saveDialog('#input-save-snapshot', '.png', function (filepath) {
        nodeFs.writeFile(filepath, base64Data, 'base64', function (err) {
          $scope.snapshotdir = utils.dirname(filepath) + utils.sep;
          $scope.$apply();
          if (!err) {
            alertify.success(gettextCatalog.getString('Image {{name}} saved', { name: utils.bold(utils.basename(filepath)) }));
          }
          else {
            throw err;
          }
        });
      });
    }

    // Show/Hide menu management
    var menu;
    var timerOpen;
    var timerClose;

    // mousedown event
    var mousedown = false;
    $(document).on('mouseup', function () {
      mousedown = false;
    });

    $(document).on('mousedown', '.paper', function () {
      mousedown = true;
      // Close current menu
      if (typeof $scope.status !== 'undefined' &&
        typeof $scope.status[menu] !== 'undefined') {
        $scope.status[menu] = false;
      }
      utils.rootScopeSafeApply();
    });

    // Show menu with delay
    $scope.showMenu = function (newMenu) {
      cancelTimeouts();
      if (!mousedown && !graph.addingDraggableBlock && !$scope.status[newMenu]) {
        timerOpen = $timeout(function () {
          $scope.fixMenu(newMenu);
        }, 300);
      }
    };

    // Hide menu with delay
    $scope.hideMenu = function () {
      cancelTimeouts();
      timerClose = $timeout(function () {
        $scope.status[menu] = false;
      }, 900);
    };

    // Fix menu
    $scope.fixMenu = function (newMenu) {
      menu = newMenu;
      $scope.status[menu] = true;
    };

    function cancelTimeouts() {
      $timeout.cancel(timerOpen);
      $timeout.cancel(timerClose);
    }

    // Disable click in submenus
    $(document).click('.dropdown-submenu', function (event) {
      if ($(event.target).hasClass('dropdown-toggle')) {
        event.stopImmediatePropagation();
        event.preventDefault();
      }
    });
});

//<

//
//> directives/menuboard.js
//

appModule.directive("menuboard", function() {
  return {
    restrict: "E",
    replace: true,
    scope: {
      type: "=",
      board: "="
    },
    template:
      '      <a href ng-click="selectBoard(board)" ng-if="board.type == type">\
        {{ board.info.label }}&ensp;\
        <span ng-show="common.selectedBoard.name == board.name" class="glyphicon glyphicon-ok-circle"></span>\
      </a>'
  };
});

//<

//
//> directives/menutree.js
//

appModule
  .directive("menutree", function() {
    return {
      restrict: "E",
      replace: true,
      scope: {
        data: "=",
        right: "=",
        callback: "&"
      },
      template:
        '<ul uib-dropdown-menu ng-show="data.length > 0">' +
        '<child ng-repeat="child in data" child="child" callback="click(path)" right="right"></child>' +
        "</ul>",
      link: function(scope /*, element, attrs*/) {
        scope.click = function(path) {
          scope.callback({ path: path });
        };
      }
    };
  })
  .directive("child", function($compile) {
    return {
      restrict: "E",
      replace: true,
      scope: {
        child: "=",
        right: "=",
        callback: "&"
      },
      template:
        "<li ng-class=\"child.children ? (right ? 'dropdown-submenu-right' : 'dropdown-submenu') : ''\" uib-dropdown>" +
        '<a href ng-click="click(child.path)" ng-if="!child.children">{{ child.name | translate }}</a>' +
        '<a href uib-dropdown-toggle ng-if="child.children">{{ child.name | translate }}</a>' +
        "</li>",
      link: function(scope, element /*, attrs*/) {
        scope.click = function(path) {
          scope.callback({ path: path });
        };
        if (angular.isArray(scope.child.children)) {
          element.append(
            '<menutree data="child.children" callback="click(path)" right="right"></menutree>'
          );
          $compile(element.contents())(scope);
        }
      }
    };
  });

//<

//
//> graphics/joint.command.js
//

/*
Copyright (c) 2016-2019 FPGAwars
Copyright (c) 2013 client IO
*/

dia.CommandManager = Backbone.Model.extend({
  defaults: {
    cmdBeforeAdd: null,
    cmdNameRegex: /^(?:add|remove|board|info|lang|change:\w+)$/
  },

  // length of prefix 'change:' in the event name
  PREFIX_LENGTH: 7,

  initialize: function(options) {
    _.bindAll(this, "initBatchCommand", "storeBatchCommand");
    this.paper = options.paper;
    this.graph = options.graph;
    this.reset();
    this.listen();
  },

  listen: function() {
    this.listenTo(this.graph, "state", this.updateState, this);
    this.listenTo(this.graph, "all", this.addCommand, this);
    this.listenTo(this.graph, "batch:start", this.initBatchCommand, this);
    this.listenTo(this.graph, "batch:stop", this.storeBatchCommand, this);
  },

  createCommand: function(options) {
    var cmd = {
      action: undefined,
      data: { id: undefined, type: undefined, previous: {}, next: {} },
      batch: options && options.batch
    };

    return cmd;
  },

  updateState: function(state) {
    this.state = state;
  },

  addCommand: function(cmdName, cell, graph, options) {
    if (
      cmdName === "change:labels" ||
      cmdName === "change:z" ||
      !this.get("cmdNameRegex").test(cmdName) ||
      (typeof this.get("cmdBeforeAdd") === "function" &&
        !this.get("cmdBeforeAdd").apply(this, arguments))
    ) {
      return;
    }

    var push = _.bind(function(cmd) {
      this.redoStack = [];

      if (!cmd.batch) {
        this.undoStack.push(cmd);
        this.changesStack.push(cmd);
        this.triggerChange();
        this.trigger("add", cmd);
      } else {
        this.lastCmdIndex = Math.max(this.lastCmdIndex, 0);
        // Commands possible thrown away. Someone might be interested.
        this.trigger("batch", cmd);
      }
    }, this);
    var command;
    if (this.batchCommand) {
      // set command as the one used last.
      // in most cases we are working with same object, doing same action
      // etc. translate an object piece by piece
      command = this.batchCommand[Math.max(this.lastCmdIndex, 0)];
      // Check if we are start working with new object or performing different action with it.
      // Note, that command is uninitialized when lastCmdIndex equals -1. (see 'initBatchCommand()')
      // in that case we are done, command we were looking for is already set
      if (
        this.lastCmdIndex >= 0 &&
        (command.data.id !== cell.id || command.action !== cmdName)
      ) {
        // trying to find command first, which was performing same action with the object
        // as we are doing now with cell
        command = _.find(
          this.batchCommand,
          function(cmd, index) {
            this.lastCmdIndex = index;
            return cmd.data.id === cell.id && cmd.action === cmdName;
          },
          this
        );
        if (!command) {
          // command with such an id and action was not found. Let's create new one
          this.lastCmdIndex =
            this.batchCommand.push(this.createCommand({ batch: true })) - 1;
          command = _.last(this.batchCommand);
        }
      }
    } else {
      // single command
      command = this.createCommand();
      command.batch = false;
    }
    // In a batch: delete an "add-*-remove" sequence if it is applied to the same cell
    if (cmdName === "remove" && this.batchCommand && this.lastCmdIndex > 0) {
      for (var i = 0; i < this.lastCmdIndex; i++) {
        var prevCommand = this.batchCommand[i];
        if (prevCommand.action === "add" && prevCommand.data.id === cell.id) {
          delete this.batchCommand;
          delete this.lastCmdIndex;
          delete this.batchLevel;
          return;
        }
      }
    }
    if (cmdName === "add" || cmdName === "remove") {
      command.action = cmdName;
      command.data.id = cell.id;
      command.data.type = cell.attributes.type;
      command.data.attributes = _.merge({}, cell.toJSON());
      command.options = options || {};
      return push(command);
    }
    if (cmdName === "board" || cmdName === "info" || cmdName === "lang") {
      command.action = cmdName;
      command.data = cell.data;
      return push(command);
    }
    // `changedAttribute` holds the attribute name corresponding
    // to the change event triggered on the model.
    var changedAttribute = cmdName.substr(this.PREFIX_LENGTH);
    if (!command.batch || !command.action) {
      // Do this only once. Set previous box and action (also serves as a flag so that
      // we don't repeat this branche).
      command.action = cmdName;
      command.data.id = cell.id;
      command.data.type = cell.attributes.type;
      command.data.previous[changedAttribute] = _.clone(
        cell.previous(changedAttribute)
      );
      command.options = options || {};
    }
    command.data.next[changedAttribute] = _.clone(cell.get(changedAttribute));
    return push(command);
  },

  // Batch commands are those that merge certain commands applied in a row (1) and those that
  // hold multiple commands where one action consists of more than one command (2)
  // (1) This is useful for e.g. when the user is dragging an object in the paper which would
  // normally lead to 1px translation commands. Applying undo() on such commands separately is
  // most likely undesirable.
  // (2) e.g When you are removing an element, you don't want all links connected to that element, which
  // are also being removed to be part of different command

  initBatchCommand: function() {
    if (!this.batchCommand) {
      this.batchCommand = [this.createCommand({ batch: true })];
      this.lastCmdIndex = -1;
      // batch level counts how many times has been initBatchCommand executed.
      // It is useful when we doing an operation recursively.
      this.batchLevel = 0;
    } else {
      // batch command is already active
      this.batchLevel++;
    }
  },

  storeBatchCommand: function() {
    // In order to store batch command it is necesary to run storeBatchCommand as many times as
    // initBatchCommand was executed
    if (this.batchCommand && this.batchLevel <= 0) {
      // checking if there is any valid command in batch
      // for example: calling `initBatchCommand` immediately followed by `storeBatchCommand`
      if (this.lastCmdIndex >= 0) {
        this.redoStack = [];
        this.undoStack.push(this.batchCommand);
        if (
          this.batchCommand &&
          this.batchCommand[0] &&
          this.batchCommand[0].action !== "lang"
        ) {
          // Do not store lang in changesStack
          this.changesStack.push(this.batchCommand);
          this.triggerChange();
        }
        this.trigger("add", this.batchCommand);
      }
      delete this.batchCommand;
      delete this.lastCmdIndex;
      delete this.batchLevel;
    } else if (this.batchCommand && this.batchLevel > 0) {
      // low down batch command level, but not store it yet
      this.batchLevel--;
    }
  },

  revertCommand: function(command) {
    this.stopListening();
    var batchCommand;
    if (_.isArray(command)) {
      batchCommand = command;
    } else {
      batchCommand = [command];
    }
    for (var i = batchCommand.length - 1; i >= 0; i--) {
      var cmd = batchCommand[i],
        cell = this.graph.getCell(cmd.data.id);
      switch (cmd.action) {
        case "add":
          if (cell) {
            cell.remove();
          }
          break;
        case "remove":
          cmd.data.attributes.state = this.state;
          this.graph.addCell(cmd.data.attributes);
          break;
        case "board":
          this.triggerBoard(cmd.data.previous);
          break;
        case "info":
          this.triggerInfo(cmd.data.previous);
          break;
        case "lang":
          this.triggerLanguage(cmd.data.previous);
          break;
        default:
          var data = null;
          var options = null;
          var attribute = cmd.action.substr(this.PREFIX_LENGTH);
          if (attribute === "data" && cmd.options.translateBy) {
            // Invert relative movement
            cmd.options.ty *= -1;
            options = cmd.options;
          }
          if (attribute === "deltas") {
            // Ace editor requires the next deltas to revert
            data = cmd.data.next[attribute];
          } else {
            data = cmd.data.previous[attribute];
          }
          if (cell) {
            cell.set(attribute, data, options);
            var cellView = this.paper.findViewByModel(cell);
            if (cellView) {
              cellView.apply({ undo: true, attribute: attribute });
            }
          }
          break;
      }
    }

    this.listen();
  },

  applyCommand: function(command) {
    this.stopListening();
    var batchCommand;
    if (_.isArray(command)) {
      batchCommand = command;
    } else {
      batchCommand = [command];
    }
    for (var i = 0; i < batchCommand.length; i++) {
      var cmd = batchCommand[i],
        cell = this.graph.getCell(cmd.data.id);
      switch (cmd.action) {
        case "add":
          cmd.data.attributes.state = this.state;
          this.graph.addCell(cmd.data.attributes);
          break;
        case "remove":
          cell.remove();
          break;
        case "board":
          this.triggerBoard(cmd.data.next);
          break;
        case "info":
          this.triggerInfo(cmd.data.next);
          break;
        case "lang":
          this.triggerLanguage(cmd.data.next);
          break;
        default:
          var data = null;
          var options = null;
          var attribute = cmd.action.substr(this.PREFIX_LENGTH);
          if (attribute === "data" && cmd.options.translateBy) {
            cmd.options.ty *= -1;
            options = cmd.options;
          }
          data = cmd.data.next[attribute];
          if (cell) {
            cell.set(attribute, data, options);
            var cellView = this.paper.findViewByModel(cell);
            if (cellView) {
              cellView.apply({ undo: false, attribute: attribute });
            }
          }
          break;
      }
    }
    this.listen();
  },

  undo: function() {
    var command = this.undoStack.pop();
    if (command) {
      this.revertCommand(command);
      this.redoStack.push(command);
      this.changesStack.pop();
      this.triggerChange();
    }
  },

  redo: function() {
    var command = this.redoStack.pop();
    if (command) {
      this.applyCommand(command);
      this.undoStack.push(command);
      if (!(command[0] && command[0].action === "lang")) {
        // Avoid lang changes
        this.changesStack.push(command);
      }
      this.triggerChange();
    }
  },

  cancel: function() {
    if (this.hasUndo()) {
      this.revertCommand(this.undoStack.pop());
      this.redoStack = [];
    }
  },

  reset: function() {
    this.undoStack = [];
    this.redoStack = [];
    this.changesStack = [];
  },

  hasUndo: function() {
    return this.undoStack.length > 0;
  },

  hasRedo: function() {
    return this.redoStack.length > 0;
  },

  triggerChange: function() {
    var currentUndoStack = _.clone(this.changesStack);
    $(document).trigger("stackChanged", [currentUndoStack]);
  },

  triggerBoard: function(board) {
    $(document).trigger("boardChanged", [board]);
  },

  triggerInfo: function(info) {
    $(document).trigger("infoChanged", [info]);
  },

  triggerLanguage: function(lang) {
    $(document).trigger("langChanged", [lang]);
  }
});

//<

//
//> graphics/connectors.js
//

import { iceConnectors } from "./connectors.js";

connectors.ice = iceConnectors;

//<

//
//> graphics/joint.routers.js
//

routers.ice = (function(g, _) {
  var config = {
    // size of the step to find a route
    step: 8,
    // use of the perpendicular linkView option to connect center of element with first vertex
    perpendicular: true,
    // should be source or target not to be consider as an obstacle
    excludeEnds: [], // 'source', 'target'
    // should be any element with a certain type not to be consider as an obstacle
    excludeTypes: ["ice.Info"],
    // if number of route finding loops exceed the maximum, stops searching and returns
    // fallback route
    maximumLoops: 2000,
    // possible starting directions from an element
    startDirections: ["right", "bottom"],
    // possible ending directions to an element
    endDirections: ["left", "top"],
    // specify directions above
    directionMap: {
      right: { x: 1, y: 0 },
      bottom: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      top: { x: 0, y: -1 }
    },
    // maximum change of the direction
    maxAllowedDirectionChange: 90,

    // padding applied on the element bounding boxes
    paddingBox: function() {
      var step = 2;
      return {
        x: -step,
        y: -step,
        width: 2 * step,
        height: 2 * step
      };
    },

    // an array of directions to find next points on the route
    directions: function() {
      var step = this.step;
      return [
        { offsetX: step, offsetY: 0, cost: step },
        { offsetX: 0, offsetY: step, cost: step },
        { offsetX: -step, offsetY: 0, cost: step },
        { offsetX: 0, offsetY: -step, cost: step }
      ];
    },

    // a penalty received for direction change
    penalties: function() {
      return {
        0: 0,
        45: this.step / 2,
        90: this.step / 2
      };
    },

    // * Deprecated *
    // a simple route used in situations, when main routing method fails
    // (exceed loops, inaccessible).
    /* i.e.
      function(from, to, opts) {
        // Find an orthogonal route ignoring obstacles.
        var point = ((opts.previousDirAngle || 0) % 180 === 0)
                ? g.point(from.x, to.y)
                : g.point(to.x, from.y);
        return [point, to];
      },
    */
    fallbackRoute: _.constant(null),
    // if a function is provided, it's used to route the link while dragging an end
    // i.e. function(from, to, opts) { return []; }
    draggingRoute: null
  };

  // Map of obstacles
  // Helper structure to identify whether a point lies in an obstacle.
  function ObstacleMap(opt, paper) {
    this.map = {};
    this.options = opt;
    this.paper = paper;
    // tells how to divide the paper when creating the elements map
    this.mapGridSize = 100;
  }

  ObstacleMap.prototype.build = function(graph, link) {
    var opt = this.options;

    // source or target element could be excluded from set of obstacles
    var excludedEnds = _.chain(opt.excludeEnds)
      .map(link.get, link)
      .pluck("id")
      .map(graph.getCell, graph)
      .value();

    // Exclude any embedded elements from the source and the target element.
    var excludedAncestors = [];

    var source = graph.getCell(link.get("source").id);
    if (source) {
      excludedAncestors = _.union(
        excludedAncestors,
        _.map(source.getAncestors(), "id")
      );
    }

    var target = graph.getCell(link.get("target").id);
    if (target) {
      excludedAncestors = _.union(
        excludedAncestors,
        _.map(target.getAncestors(), "id")
      );
    }

    // builds a map of all elements for quicker obstacle queries (i.e. is a point contained
    // in any obstacle?) (a simplified grid search)
    // The paper is divided to smaller cells, where each of them holds an information which
    // elements belong to it. When we query whether a point is in an obstacle we don't need
    // to go through all obstacles, we check only those in a particular cell.
    var mapGridSize = this.mapGridSize;

    // Compute rectangles from all the blocks
    var blockRectangles = _.chain(graph.getElements())
      // remove source and target element if required
      .difference(excludedEnds)
      // remove all elements whose type is listed in excludedTypes array
      .reject(function(element) {
        // reject any element which is an ancestor of either source or target
        return (
          _.contains(opt.excludeTypes, element.get("type")) ||
          _.contains(excludedAncestors, element.id)
        );
      })
      // change elements (models) to their bounding boxes
      .invoke("getBBox")
      .value();

    // Compute rectangles from all the port labels
    var state = this.paper.options.getState();
    var plabels = document.querySelectorAll(".port-label");
    var labelRectangles = [];
    var rect = false;
    var i, npl;
    for (i = 0, npl = plabels.length; i < npl; i++) {
      rect = V(plabels[i]).bbox();
      labelRectangles.push(
        g.rect({
          x: (rect.x - state.pan.x) / state.zoom,
          y: (rect.y - state.pan.y) / state.zoom,
          width: rect.width / state.zoom,
          height: rect.height / state.zoom
        })
      );
    }

    /* var labelRectangles = $('.port-label').map(function (index, node) {
      var rect = V(node).bbox();
      return g.rect({
        x: (rect.x - state.pan.x) / state.zoom,
        y: (rect.y - state.pan.y) / state.zoom,
        width: rect.width / state.zoom,
        height: rect.height / state.zoom
      });
    }).toArray();*/

    var x, y, origin, corner;
    // Add all rectangles to the map's grid
    _.chain(blockRectangles.concat(labelRectangles))
      // expand their boxes by specific padding
      .invoke("moveAndExpand", opt.paddingBox)
      // build the map
      .foldl(function(map, bbox) {
        origin = bbox.origin().snapToGrid(mapGridSize);
        corner = bbox.corner().snapToGrid(mapGridSize);

        for (x = origin.x; x <= corner.x; x += mapGridSize) {
          for (y = origin.y; y <= corner.y; y += mapGridSize) {
            var gridKey = x + "@" + y;

            map[gridKey] = map[gridKey] || [];
            map[gridKey].push(bbox);
          }
        }

        return map;
      }, this.map)
      .value();

    return this;
  };

  ObstacleMap.prototype.isPointAccessible = function(point) {
    var mapKey = point
      .clone()
      .snapToGrid(this.mapGridSize)
      .toString();

    return _.every(this.map[mapKey], function(obstacle) {
      return !obstacle.containsPoint(point);
    });
  };

  // Sorted Set
  // Set of items sorted by given value.
  function SortedSet() {
    this.items = [];
    this.hash = {};
    this.values = {};
    this.OPEN = 1;
    this.CLOSE = 2;
  }

  SortedSet.prototype.add = function(item, value) {
    if (this.hash[item]) {
      // item removal
      this.items.splice(this.items.indexOf(item), 1);
    } else {
      this.hash[item] = this.OPEN;
    }

    this.values[item] = value;

    var index = _.sortedIndex(
      this.items,
      item,
      function(i) {
        return this.values[i];
      },
      this
    );

    this.items.splice(index, 0, item);
  };

  SortedSet.prototype.remove = function(item) {
    this.hash[item] = this.CLOSE;
  };

  SortedSet.prototype.isOpen = function(item) {
    return this.hash[item] === this.OPEN;
  };

  SortedSet.prototype.isClose = function(item) {
    return this.hash[item] === this.CLOSE;
  };

  SortedSet.prototype.isEmpty = function() {
    return this.items.length === 0;
  };

  SortedSet.prototype.pop = function() {
    var item = this.items.shift();
    this.remove(item);
    return item;
  };

  function normalizePoint(point) {
    return g.point(
      point.x === 0 ? 0 : Math.abs(point.x) / point.x,
      point.y === 0 ? 0 : Math.abs(point.y) / point.y
    );
  }

  // reconstructs a route by concating points with their parents
  function reconstructRoute(parents, point, startCenter, endCenter) {
    var route = [];
    var prevDiff = normalizePoint(endCenter.difference(point));
    var current = point;
    var parent;

    while ((parent = parents[current])) {
      var diff = normalizePoint(current.difference(parent));

      if (!diff.equals(prevDiff)) {
        route.unshift(current);
        prevDiff = diff;
      }

      current = parent;
    }

    var startDiff = normalizePoint(g.point(current).difference(startCenter));
    if (!startDiff.equals(prevDiff)) {
      route.unshift(current);
    }

    return route;
  }

  // find points around the rectangle taking given directions in the account
  function getRectPoints(bbox, directionList, opt) {
    var step = opt.step;
    var center = bbox.center();
    var startPoints = _.chain(opt.directionMap)
      .pick(directionList)
      .map(function(direction) {
        var x = (direction.x * bbox.width) / 2;
        var y = (direction.y * bbox.height) / 2;

        var point = center.clone().offset(x, y);

        if (bbox.containsPoint(point)) {
          point.offset(direction.x * step, direction.y * step);
        }

        return point.snapToGrid(step);
      })
      .value();

    return startPoints;
  }

  // returns a direction index from start point to end point
  function getDirectionAngle(start, end, dirLen) {
    var q = 360 / dirLen;
    return Math.floor(g.normalizeAngle(start.theta(end) + q / 2) / q) * q;
  }

  function getDirectionChange(angle1, angle2) {
    var dirChange = Math.abs(angle1 - angle2);
    return dirChange > 180 ? 360 - dirChange : dirChange;
  }

  // heurestic method to determine the distance between two points
  function estimateCost(from, endPoints) {
    var min = Infinity;

    for (var i = 0, len = endPoints.length; i < len; i++) {
      var cost = from.manhattanDistance(endPoints[i]);
      if (cost < min) {
        min = cost;
      }
    }

    return min;
  }

  // finds the route between to points/rectangles implementing A* alghoritm
  function findRoute(start, end, map, opt) {
    var step = opt.step;
    var startPoints, endPoints;
    var startCenter, endCenter;

    // set of points we start pathfinding from
    if (start instanceof g.rect) {
      startPoints = getRectPoints(start, opt.startDirections, opt);
      startCenter = start.center().snapToGrid(step);
    } else {
      startCenter = start.clone().snapToGrid(step);
      startPoints = [startCenter];
    }

    // set of points we want the pathfinding to finish at
    if (end instanceof g.rect) {
      endPoints = getRectPoints(end, opt.endDirections, opt);
      endCenter = end.center().snapToGrid(step);
    } else {
      endCenter = end.clone().snapToGrid(step);
      endPoints = [endCenter];
    }

    // take into account only accessible end points
    startPoints = _.filter(startPoints, map.isPointAccessible, map);
    endPoints = _.filter(endPoints, map.isPointAccessible, map);

    // Check if there is a accessible end point.
    // We would have to use a fallback route otherwise.
    if (startPoints.length > 0 && endPoints.length > 0) {
      // The set of tentative points to be evaluated, initially containing the start points.
      var openSet = new SortedSet();
      // Keeps reference to a point that is immediate predecessor of given element.
      var parents = {};
      // Cost from start to a point along best known path.
      var costs = {};

      _.each(startPoints, function(point) {
        var key = point.toString();
        openSet.add(key, estimateCost(point, endPoints));
        costs[key] = 0;
      });

      // directions
      var dir, dirChange;
      var dirs = opt.directions;
      var dirLen = dirs.length;
      var loopsRemain = opt.maximumLoops;
      var endPointsKeys = _.invoke(endPoints, "toString");

      var currentDirAngle;
      var previousDirAngle;

      // main route finding loop
      while (!openSet.isEmpty() && loopsRemain > 0) {
        // remove current from the open list
        var currentKey = openSet.pop();
        var currentPoint = g.point(currentKey);
        var currentDist = costs[currentKey];
        previousDirAngle = currentDirAngle;
        /* jshint -W116 */
        currentDirAngle = parents[currentKey]
          ? getDirectionAngle(parents[currentKey], currentPoint, dirLen)
          : opt.previousDirAngle != null
          ? opt.previousDirAngle
          : getDirectionAngle(startCenter, currentPoint, dirLen);
        /* jshint +W116 */

        // Check if we reached any endpoint
        if (endPointsKeys.indexOf(currentKey) >= 0) {
          // We don't want to allow route to enter the end point in opposite direction.
          dirChange = getDirectionChange(
            currentDirAngle,
            getDirectionAngle(currentPoint, endCenter, dirLen)
          );
          if (currentPoint.equals(endCenter) || dirChange < 180) {
            opt.previousDirAngle = currentDirAngle;
            return reconstructRoute(
              parents,
              currentPoint,
              startCenter,
              endCenter
            );
          }
        }

        // Go over all possible directions and find neighbors.
        for (var i = 0; i < dirLen; i++) {
          dir = dirs[i];
          dirChange = getDirectionChange(currentDirAngle, dir.angle);
          // if the direction changed rapidly don't use this point
          // Note that check is relevant only for points with previousDirAngle i.e.
          // any direction is allowed for starting points
          if (previousDirAngle && dirChange > opt.maxAllowedDirectionChange) {
            continue;
          }

          var neighborPoint = currentPoint
            .clone()
            .offset(dir.offsetX, dir.offsetY);
          var neighborKey = neighborPoint.toString();
          // Closed points from the openSet were already evaluated.
          if (
            openSet.isClose(neighborKey) ||
            !map.isPointAccessible(neighborPoint)
          ) {
            continue;
          }

          // The current direction is ok to proccess.
          var costFromStart = currentDist + dir.cost + opt.penalties[dirChange];

          if (
            !openSet.isOpen(neighborKey) ||
            costFromStart < costs[neighborKey]
          ) {
            // neighbor point has not been processed yet or the cost of the path
            // from start is lesser than previously calcluated.
            parents[neighborKey] = currentPoint;
            costs[neighborKey] = costFromStart;
            openSet.add(
              neighborKey,
              costFromStart + estimateCost(neighborPoint, endPoints)
            );
          }
        }

        loopsRemain--;
      }
    }

    // no route found ('to' point wasn't either accessible or finding route took
    // way to much calculations)
    return opt.fallbackRoute(startCenter, endCenter, opt);
  }

  // resolve some of the options
  function resolveOptions(opt) {
    opt.directions = _.result(opt, "directions");
    opt.penalties = _.result(opt, "penalties");
    opt.paddingBox = _.result(opt, "paddingBox");

    for (var i = 0, no = opt.directions.length; i < no; i++) {
      //_.each(opt.directions, function (direction) {

      var point1 = g.point(0, 0);
      var point2 = g.point(
        opt.directions[i].offsetX,
        opt.directions[i].offsetY
      );

      opt.directions[i].angle = g.normalizeAngle(point1.theta(point2));
    }
  }

  // initiation of the route finding
  function router(vertices, opt) {
    resolveOptions(opt);

    /* jshint -W040 */

    // enable/disable linkView perpendicular option
    this.options.perpendicular = !!opt.perpendicular;

    // Force source/target BBoxes to be points

    this.sourceBBox.x += this.sourceBBox.width / 2;
    this.sourceBBox.y += this.sourceBBox.height / 2;
    this.sourceBBox.width = 0;
    this.sourceBBox.height = 0;

    this.targetBBox.x += this.targetBBox.width / 2;
    this.targetBBox.y += this.targetBBox.height / 2;
    this.targetBBox.width = 0;
    this.targetBBox.height = 0;

    // expand boxes by specific padding
    var sourceBBox = g.rect(this.sourceBBox);
    var targetBBox = g.rect(this.targetBBox);

    // pathfinding
    var map = new ObstacleMap(opt, this.paper).build(
      this.paper.model,
      this.model
    );
    var oldVertices = _.map(vertices, g.point);
    var newVertices = [];
    var tailPoint = sourceBBox.center().snapToGrid(opt.step);

    var from;
    var to;

    // find a route by concating all partial routes (routes need to go through the vertices)
    // startElement -> vertex[1] -> ... -> vertex[n] -> endElement
    for (var i = 0, len = oldVertices.length; i <= len; i++) {
      var partialRoute = null;

      from = to || sourceBBox;
      to = oldVertices[i];

      if (!to) {
        to = targetBBox;

        // 'to' is not a vertex. If the target is a point (i.e. it's not an element), we
        // might use dragging route instead of main routing method if that is enabled.
        var endingAtPoint =
          !this.model.get("source").id || !this.model.get("target").id;

        if (endingAtPoint && _.isFunction(opt.draggingRoute)) {
          // Make sure we passing points only (not rects).
          var dragFrom = from instanceof g.rect ? from.center() : from;
          partialRoute = opt.draggingRoute(dragFrom, to.origin(), opt);
        }
      }

      // if partial route has not been calculated yet use the main routing method to find one
      partialRoute = partialRoute || findRoute(from, to, map, opt);

      if (partialRoute === null) {
        // The partial route could not be found.
        // use orthogonal (do not avoid elements) route instead.
        if (!_.isFunction(routers.orthogonal)) {
          throw new Error("Manhattan requires the orthogonal router.");
        }
        return routers.orthogonal(vertices, opt, this);
      }

      var leadPoint = _.first(partialRoute);

      if (leadPoint && leadPoint.equals(tailPoint)) {
        // remove the first point if the previous partial route had the same point as last
        partialRoute.shift();
      }

      tailPoint = _.last(partialRoute) || tailPoint;

      Array.prototype.push.apply(newVertices, partialRoute);
    }

    /* jshint +W040 */

    return newVertices;
  }

  // public function
  return function(vertices, opt, linkView) {
    if (linkView.sourceMagnet) {
      opt.startDirections = [linkView.sourceMagnet.attributes.pos.value];
    }

    if (linkView.targetMagnet) {
      opt.endDirections = [linkView.targetMagnet.attributes.pos.value];
    }

    return router.call(linkView, vertices, _.extend({}, config, opt));
  };
})(g, _);

//<

//
//> graphics/joint.selection.js
//

/*
Copyright (c) 2016-2019 FPGAwars
Copyright (c) 2013 client IO
*/

ui.SelectionView = Backbone.View.extend({
  className: "selection",

  events: {
    "click .selection-box": "click",
    dblclick: "dblclick",
    "mousedown .selection-box": "startTranslatingSelection",
    mouseover: "mouseover",
    mouseout: "mouseout",
    mouseup: "mouseup",
    mousedown: "mousedown"
  },

  showtooltip: true,
  $selectionArea: null,

  initialize: function(options) {
    _.bindAll(
      this,
      "click",
      "startSelecting",
      "stopSelecting",
      "adjustSelection"
    );

    $(document.body).on(
      "mouseup touchend",
      function(evt) {
        if (evt.which === 1) {
          // Mouse left button
          this.stopSelecting(evt);
        }
      }.bind(this)
    );
    $(document.body).on("mousemove touchmove", this.adjustSelection);

    this.options = options;

    this.options.paper.$el.append(this.$el);
    this.$el.addClass("selected").show();
  },

  click: function(evt) {
    if (evt.which === 1) {
      // Mouse left button
      this.trigger("selection-box:pointerclick", evt);
    }
  },

  dblclick: function(evt) {
    var id = evt.target.getAttribute("data-model");
    if (id) {
      var view = this.options.paper.findViewByModel(id);
      if (view) {
        // Trigger dblclick in selection to the Cell View
        view.notify("cell:pointerdblclick", evt);
      }
    }
  },

  mouseover: function(evt) {
    this.mouseManager(evt, "mouseovercard");
  },

  mouseout: function(evt) {
    this.mouseManager(evt, "mouseoutcard");
  },

  mouseup: function(evt) {
    this.mouseManager(evt, "mouseupcard");
  },

  mousedown: function(evt) {
    if (!this.showtooltip && evt.which === 1) {
      // Mouse left button: block fixed
      this.showtooltip = true;
    }

    this.mouseManager(evt, "mousedowncard");
  },

  mouseManager: function(evt, fnc) {
    evt.preventDefault();

    if (this.showtooltip) {
      var id = evt.target.getAttribute("data-model");
      if (id) {
        var view = this.options.paper.findViewByModel(id);
        if (view && view[fnc]) {
          view[fnc].apply(view, [evt]);
        }
      }
    }
  },

  startTranslatingSelection: function(evt) {
    if (this._action !== "adding" && evt.which === 1) {
      // Mouse left button

      if (!evt.shiftKey) {
        this._action = "translating";

        this.options.graph.trigger("batch:stop");
        this.options.graph.trigger("batch:start");

        var snappedClientCoords = this.options.paper.snapToGrid(
          g.point(evt.clientX, evt.clientY)
        );
        this._snappedClientX = snappedClientCoords.x;
        this._snappedClientY = snappedClientCoords.y;

        this.trigger("selection-box:pointerdown", evt);
      }
    }
  },

  startAddingSelection: function(evt) {
    this._action = "adding";

    var snappedClientCoords = this.options.paper.snapToGrid(
      g.point(evt.clientX, evt.clientY)
    );
    this._snappedClientX = snappedClientCoords.x;
    this._snappedClientY = snappedClientCoords.y;

    this.trigger("selection-box:pointerdown", evt);
  },

  startSelecting: function(evt /*, x, y*/) {
    this.createSelectionArea();

    this._action = "selecting";

    this._clientX = evt.clientX;
    this._clientY = evt.clientY;

    // Normalize `evt.offsetX`/`evt.offsetY` for browsers that don't support it (Firefox).
    var paperElement = evt.target.parentElement || evt.target.parentNode;
    var paperOffset = $(paperElement).offset();
    var paperScrollLeft = paperElement.scrollLeft;
    var paperScrollTop = paperElement.scrollTop;

    this._offsetX =
      evt.offsetX === undefined
        ? evt.clientX - paperOffset.left + window.pageXOffset + paperScrollLeft
        : evt.offsetX;
    this._offsetY =
      evt.offsetY === undefined
        ? evt.clientY - paperOffset.top + window.pageYOffset + paperScrollTop
        : evt.offsetY;

    this.$selectionArea.css({
      width: 1,
      height: 1,
      left: this._offsetX,
      top: this._offsetY
    });
  },

  adjustSelection: function(evt) {
    var dx;
    var dy;

    switch (this._action) {
      case "selecting":
        dx = evt.clientX - this._clientX;
        dy = evt.clientY - this._clientY;

        var left = parseInt(this.$selectionArea.css("left"), 10);
        var top = parseInt(this.$selectionArea.css("top"), 10);

        this.$selectionArea.css({
          left: dx < 0 ? this._offsetX + dx : left,
          top: dy < 0 ? this._offsetY + dy : top,
          width: Math.abs(dx),
          height: Math.abs(dy)
        });
        break;

      case "adding":
      case "translating":
        var snappedClientCoords = this.options.paper.snapToGrid(
          g.point(evt.clientX, evt.clientY)
        );
        var snappedClientX = snappedClientCoords.x;
        var snappedClientY = snappedClientCoords.y;

        dx = snappedClientX - this._snappedClientX;
        dy = snappedClientY - this._snappedClientY;

        // This hash of flags makes sure we're not adjusting vertices of one link twice.
        // This could happen as one link can be an inbound link of one element in the selection
        // and outbound link of another at the same time.
        var processedLinks = {};

        this.model.each(function(element) {
          // Translate the element itself.
          element.translate(dx, dy);

          // Translate also the `selection-box` of the element.
          this.updateBox(element);

          // Translate link vertices as well.
          var connectedLinks = this.options.graph.getConnectedLinks(element);

          _.each(connectedLinks, function(link) {
            if (processedLinks[link.id]) {
              return;
            }

            var vertices = link.get("vertices");
            if (vertices && vertices.length) {
              var newVertices = [];
              _.each(vertices, function(vertex) {
                newVertices.push({ x: vertex.x + dx, y: vertex.y + dy });
              });

              link.set("vertices", newVertices);
            }

            processedLinks[link.id] = true;
          });
        }, this);

        if (dx || dy) {
          this._snappedClientX = snappedClientX;
          this._snappedClientY = snappedClientY;
        }

        this.trigger("selection-box:pointermove", evt);

        break;
    }
  },

  stopSelecting: function(evt) {
    switch (this._action) {
      case "selecting":
        if (!evt.shiftKey) {
          // Reset previous selection
          this.cancelSelection();
        }

        var offset = this.$selectionArea.offset();
        var width = this.$selectionArea.width();
        var height = this.$selectionArea.height();

        // Convert offset coordinates to the local point of the <svg> root element.
        var localPoint = V(this.options.paper.svg).toLocalPoint(
          offset.left,
          offset.top
        );

        // Take page scroll into consideration.
        localPoint.x -= window.pageXOffset;
        localPoint.y -= window.pageYOffset;

        var elementViews = this.findBlocksInArea(
          g.rect(localPoint.x, localPoint.y, width, height),
          { strict: false }
        );

        this.model.add(_.pluck(elementViews, "model"));

        _.each(this.model.models, this.createSelectionBox, this);

        this.destroySelectionArea();

        break;

      case "translating":
        this.options.graph.trigger("batch:stop");
        // Everything else is done during the translation.
        break;

      case "adding":
        break;

      case "cherry-picking":
        // noop;  All is done in the `createSelectionBox()` function.
        // This is here to avoid removing selection boxes as a reaction on mouseup event and
        // propagating to the `default` branch in this switch.
        break;

      default:
        break;
    }

    delete this._action;
  },

  findBlocksInArea: function(rect, opt) {
    opt = _.defaults(opt || {}, { strict: false });
    rect = g.rect(rect);

    var paper = this.options.paper;
    var views = _.map(paper.model.getElements(), paper.findViewByModel, paper);
    var method = opt.strict ? "containsRect" : "intersect";

    return _.filter(
      views,
      function(view) {
        var $box = $(view.$box[0]);
        var position = $box.position();
        var rbox = g.rect(
          position.left,
          position.top,
          $box.width(),
          $box.height()
        );
        return view && rect[method](rbox);
      },
      this
    );
  },

  cancelSelection: function() {
    this.$(".selection-box").remove();
    this.model.reset([]);
  },

  destroySelectionArea: function() {
    this.$selectionArea.remove();
    this.$selectionArea = this.$(".selection-area");
    this.$el.addClass("selected");
  },

  createSelectionArea: function() {
    var $selectionArea = $("<div/>", {
      class: "selection-area"
    });
    this.$el.append($selectionArea);
    this.$selectionArea = this.$(".selection-area");
    this.$el.removeClass("selected");
  },

  destroySelectionBox: function(element) {
    this.$('[data-model="' + element.get("id") + '"]').remove();
  },

  createSelectionBox: function(element, opt) {
    opt = opt || {};

    if (!element.isLink()) {
      var $selectionBox = $("<div/>", {
        class: "selection-box",
        "data-model": element.get("id")
      });
      if (this.$('[data-model="' + element.get("id") + '"]').length === 0) {
        this.$el.append($selectionBox);
      }
      this.showtooltip = opt.initooltip !== undefined ? opt.initooltip : true;
      $selectionBox.css({ opacity: opt.transparent ? 0 : 1 });

      this.updateBox(element);

      this._action = "cherry-picking";
    }
  },

  updateBox: function(element) {
    var bbox = element.getBBox();
    var state = this.options.state;

    var i,
      pendingTasks = [];
    var sels = document.querySelectorAll(
      'div[data-model="' + element.get("id") + '"]'
    );
    for (i = 0; i < sels.length; i++) {
      pendingTasks.push({
        e: sels[i],
        property: "left",
        value:
          Math.round(
            bbox.x * state.zoom +
              state.pan.x +
              (bbox.width / 2.0) * (state.zoom - 1)
          ) + "px"
      });
      pendingTasks.push({
        e: sels[i],
        property: "top",
        value:
          Math.round(
            bbox.y * state.zoom +
              state.pan.y +
              (bbox.height / 2.0) * (state.zoom - 1)
          ) + "px"
      });
      pendingTasks.push({
        e: sels[i],
        property: "width",
        value: Math.round(bbox.width) + "px"
      });
      pendingTasks.push({
        e: sels[i],
        property: "height",
        value: Math.round(bbox.height) + "px"
      });
      pendingTasks.push({
        e: sels[i],
        property: "transform",
        value: "scale(" + state.zoom + ")"
      });
    }
    i = pendingTasks.length;
    for (i = 0; i < pendingTasks.length; i++) {
      if (pendingTasks[i].e !== null) {
        pendingTasks[i].e.style[pendingTasks[i].property] =
          pendingTasks[i].value;
      }
    }
  }
});

//<

//import { iceShapes } from './shapes/_module';
//shapes.ice = iceShapes;

import * as os from "os";

import { iceModel } from './shapes/Model';
import { iceModelView } from './shapes/ModelView';
import { iceGeneric } from './shapes/Generic';
import { iceGenericView } from './shapes/GenericView';
import { iceInput } from './shapes/Input';
import { iceOutput } from './shapes/Output';
import { iceILabelView } from './shapes/InputLabelView';
import { iceOLabelView } from './shapes/OutputLabelView';
import { iceIOView } from './shapes/IOView';
import { iceConstant } from './shapes/Constant';
import { iceConstantView } from './shapes/ConstantView';
import { iceMemory } from './shapes/Memory';
import { iceMemoryView } from './shapes/MemoryView';
import { iceCode } from './shapes/Code';
import { iceCodeView } from './shapes/CodeView';
import { iceInfo } from './shapes/Info';
import { iceInfoView } from './shapes/InfoView';
//import { iceWire } from './shapes/Wire';
import { iceWireView } from './shapes/WireView';

const DARWIN = Boolean(os.platform().indexOf("darwin") > -1);
const aceFontSize = (DARWIN) ? "12" : "14";

const WIRE_WIDTH = 1.5;

shapes.ice = {};
shapes.ice.Model =        iceModel(shapes.basic, WIRE_WIDTH),
shapes.ice.ModelView =    iceModelView(),
shapes.ice.Generic =      iceGeneric(shapes.ice),
shapes.ice.GenericView =  iceGenericView(shapes.ice, WIRE_WIDTH),
shapes.ice.Input =        iceInput(shapes.ice),
shapes.ice.Output =       iceOutput(shapes.ice),
shapes.ice.InputLabel =   iceILabelView(shapes.ice),
shapes.ice.OutputLabel =  iceOLabelView(shapes.ice),
shapes.ice.IOView =       iceIOView(shapes.ice, WIRE_WIDTH, subModuleActive),
shapes.ice.InputView =    shapes.ice.IOView;
shapes.ice.OutputView =   shapes.ice.IOView;
shapes.ice.Constant =     iceConstant(shapes.ice),
shapes.ice.ConstantView = iceConstantView(shapes.ice, WIRE_WIDTH),
shapes.ice.Memory =       iceMemory(shapes.ice),
shapes.ice.MemoryView =   iceMemoryView(shapes.ice, WIRE_WIDTH, getCSSRule),
shapes.ice.Code =         iceCode(shapes.ice),
shapes.ice.CodeView =     iceCodeView(shapes.ice, WIRE_WIDTH, getCSSRule),
shapes.ice.Info =         iceInfo(shapes.ice),
shapes.ice.InfoView =     iceInfoView(shapes.ice, aceFontSize),
//shapes.ice.Wire =         iceWire(WIRE_WIDTH),

shapes.ice.Wire = dia.Link.extend({
    markup: [
      '<path class="connection" d="M 0 0 0 0"/>',
      '<path class="connection-wrap" d="M 0 0 0 0"/>',
      '<path class="marker-source" d="M 0 0 0 0"/>',
      '<path class="marker-target" d="M 0 0 0 0"/>',
      '<g class="labels"/>',
      '<g class="marker-vertices"/>',
      '<g class="marker-bifurcations"/>',
      '<g class="marker-arrowheads"/>',
      '<g class="link-tools"/>'
    ].join(""),

    labelMarkup: [
      '<g class="label hidden">',
      '<rect x="-8" y="-6" width="16" height="12" rx="2" ry="2" fill="white" stroke="#777"/>',
      '<text fill="#555"/>',
      "</g>"
    ].join(""),

    bifurcationMarkup: [
      '<g class="marker-bifurcation-group" transform="translate(<%= x %>, <%= y %>)">',
      '<circle class="marker-bifurcation" idx="<%= idx %>" r="<%= r %>" fill="#777"/>',
      "</g>"
    ].join(""),

    arrowheadMarkup: [
      '<g class="marker-arrowhead-group marker-arrowhead-group-<%= end %>">',
      '<circle class="marker-arrowhead" end="<%= end %>" r="8"/>',
      "</g>"
    ].join(""),

    toolMarkup: [
      '<g class="link-tool">',
      '<g class="tool-remove" event="remove">',
      '<circle r="8" />',
      '<path transform="scale(.6) translate(-16, -16)" d="M24.778,21.419 19.276,15.917 24.777,10.415 21.949,7.585 16.447,13.087 10.945,7.585 8.117,10.415 13.618,15.917 8.116,21.419 10.946,24.248 16.447,18.746 21.948,24.248z" />',
      "<title>Remove link</title>",
      "</g>",
      "</g>"
    ].join(""),

    vertexMarkup: [
      '<g class="marker-vertex-group" transform="translate(<%= x %>, <%= y %>)">',
      '<circle class="marker-vertex" idx="<%= idx %>" r="8" />',
      '<path class="marker-vertex-remove-area" idx="<%= idx %>" transform="scale(.8) translate(5, -33)" d="M16,5.333c-7.732,0-14,4.701-14,10.5c0,1.982,0.741,3.833,2.016,5.414L2,25.667l5.613-1.441c2.339,1.317,5.237,2.107,8.387,2.107c7.732,0,14-4.701,14-10.5C30,10.034,23.732,5.333,16,5.333z"/>',
      '<path class="marker-vertex-remove" idx="<%= idx %>" transform="scale(.6) translate(11.5, -39)" d="M24.778,21.419 19.276,15.917 24.777,10.415 21.949,7.585 16.447,13.087 10.945,7.585 8.117,10.415 13.618,15.917 8.116,21.419 10.946,24.248 16.447,18.746 21.948,24.248z">',
      "<title>Remove vertex</title>",
      "</path>",
      "</g>"
    ].join(""),

    defaults: util.deepSupplement(
      {
        type: "ice.Wire",
        labels: [{
            position: 0.5,
            attrs: {
              text: {
                text: "",
                y: "4px",
                "font-weight": "bold",
                "font-size": "11px",
                "text-anchor": "middle"
              }
            }
        }],
        attrs: {
          ".connection": {
            "stroke-width": WIRE_WIDTH,
            stroke: "#777"
          }
        },
        router: { name: "ice" },
        connector: { name: "ice" }
      },
      dia.Link.prototype.defaults
    )
  });

//shapes.ice.WireView =     iceWireView(WIRE_WIDTH)

shapes.ice.WireView = dia.LinkView.extend({
  options: {
    shortLinkLength: 64,
    longLinkLength: 160,
    linkToolsOffset: 40
  },

  initialize: function() {
    dia.LinkView.prototype.initialize.apply(this, arguments);
    var self = this;
    setTimeout(function() {
      var size = self.model.get("size");
      if (!size) {
        // New wire
        var i,
          port,
          portName = self.model.get("source").port;
        var rightPorts = self.sourceView.model.get("rightPorts");
        // Initialize wire properties
        for (i in rightPorts) {
          port = rightPorts[i];
          if (portName === port.id) {
            size = port.size;
            // For wire size connection validation
            self.model.attributes.size = size;
            break;
          }
        }
      }
      self.updateWireProperties(size);
      self.updateBifurcations();
    }, 0);
  },

  apply: function() {
    // No operation required
  },

  render: function() {
    dia.LinkView.prototype.render.apply(this, arguments);
    return this;
  },

  remove: function() {
    dia.LinkView.prototype.remove.apply(this, arguments);
    this.updateBifurcations();
    return this;
  },

  update: function() {
    dia.LinkView.prototype.update.apply(this, arguments);
    this.updateBifurcations();
    return this;
  },

  renderLabels: function() {
    if (!this._V.labels) {
      return this;
    }
    this._labelCache = {};
    var $labels = $(this._V.labels.node).empty();
    var labels = this.model.get("labels") || [];
    if (!labels.length) {
      return this;
    }
    var labelTemplate = util.template(
      this.model.get("labelMarkup") || this.model.labelMarkup
    );
    // This is a prepared instance of a vectorized SVGDOM node for the label element resulting from
    // compilation of the labelTemplate. The purpose is that all labels will just `clone()` this
    // node to create a duplicate.
    var labelNodeInstance = V(labelTemplate());
    _.each(
      labels,
      function(label, idx) {
        var labelNode = labelNodeInstance.clone().node;
        V(labelNode).attr("label-idx", idx);
        this._labelCache[idx] = V(labelNode);

        var $text = $(labelNode).find("text");
        var textAttributes = _.extend(
          { "text-anchor": "middle", "font-size": 13 },
          util.getByPath(label, "attrs/text", "/")
        );

        $text.attr(_.omit(textAttributes, "text"));
        if (label.attrs.text.text) {
          $(labelNode).removeClass("hidden");
        }
        if (!_.isUndefined(textAttributes.text)) {
          V($text[0]).text(textAttributes.text + "", {
            annotations: textAttributes.annotations
          });
        }
        $labels.append(labelNode);
      },
      this
    );
    return this;
  },

  updateToolsPosition: function() {
    if (!this._V.linkTools) {
      return this;
    }
    var scale = "";
    var offset = this.options.linkToolsOffset;
    var connectionLength = this.getConnectionLength();
    if (!_.isNaN(connectionLength)) {
      // If the link is too short, make the tools half the size and the offset twice as low.
      if (connectionLength < this.options.shortLinkLength) {
        scale = "scale(.5)";
        offset /= 2;
      }
      var toolPosition = this.getPointAtLength(connectionLength - offset);
      this._toolCache.attr(
        "transform",
        "translate(" + toolPosition.x + ", " + toolPosition.y + ") " + scale
      );
    }
    return this;
  },

  updateWireProperties: function(size) {
    if (size > 1) {
      this.$(".connection").css("stroke-width", WIRE_WIDTH * 3);
      this.model.label(0, { attrs: { text: { text: size } } });
      this.model.bifurcationMarkup = this.model.bifurcationMarkup.replace(
        /<%= r %>/g,
        WIRE_WIDTH * 4
      );
    } else {
      this.model.bifurcationMarkup = this.model.bifurcationMarkup.replace(
        /<%= r %>/g,
        WIRE_WIDTH * 2
      );
    }
  },

  updateConnection: function(opt) {
    opt = opt || {};
    // Necessary path finding
    var route = (this.route = this.findRoute(this.model.get("vertices") || [], opt));
    // finds all the connection points taking new vertices into account
    this._findConnectionPoints(route);
    var pathData = this.getPathData(route);
    // The markup needs to contain a `.connection`
    this._V.connection.attr("d", pathData.full);
    if (this._V.connectionWrap) {
      this._V.connectionWrap.attr("d", pathData.wrap);
    }
    this._translateAndAutoOrientArrows(
      this._V.markerSource,
      this._V.markerTarget
    );
  },

  // cacheUpdateBifurcations:{},
  updateBifurcations: function() {
    if (this._V.markerBifurcations) {
      var self = this;
      var currentWire = this.model;
      var allWires = this.paper.model.getLinks();
      // Find all the wires in the same port
      var portWires = [];
      var wireSource = false;
      var cwireSource = false;
      var wireView = false;
      var markerBifurcations = false;
      for (var i = 0, n = allWires.length; i < n; i++) {
        wireSource = allWires[i].get("source");
        cwireSource = currentWire.get("source");
        if (
          wireSource.id === cwireSource.id &&
          wireSource.port === cwireSource.port
        ) {
          // Wire with the same source of currentWire
          wireView = self.paper.findViewByModel(allWires[i]);
          // Clean the wire bifurcations
          markerBifurcations = $(wireView._V.markerBifurcations.node).empty();
          portWires.push({
            id: allWires[i].get("id"),
            view: wireView,
            markers: markerBifurcations
          });
        }
      }
      var points = [];
      // Update all the portWires combinations
      if (portWires.length > 0) {
        var markupTemplate = util.template(
          this.model.get("bifurcationMarkup") || this.model.bifurcationMarkup
        );
        var A, B, nW;
        for (A = 0, nW = portWires.length; A < nW; A++) {
          //        _.each(portWires, function (wireA) {
          for (B = 0; B < nW; B++) {
            //         _.each(portWires, function (wireB) {
            if (portWires[A].id !== portWires[B].id) {
              // Not the same wire
              findBifurcations(
                portWires[A].view,
                portWires[B].view,
                portWires[A].markers
              );
            }
          }
        }
      }

      /* jshint -W082 */

      function findBifurcations(wireA, wireB, markersA) {
        // Find the corners in A that intersects with any B segment
        var vA = v(wireA);
        var vB = v(wireB);
        if (vA.length > 2) {
          for (var i = 1; i < vA.length - 1; i++) {
            if (vA[i - 1].x !== vA[i + 1].x && vA[i - 1].y !== vA[i + 1].y) {
              // vA[i] is a corner
              for (var j = 0; j < vB.length - 1; j++) {
                // Eval if intersects any segment of wire vB
                if (evalIntersection(vA[i], [vB[j], vB[j + 1]])) {
                  // Bifurcation found!
                  var point = vA[i];
                  if (!contains(point, points)) {
                    points.push(point);
                    markersA.append(V(markupTemplate(point)).node);
                  }
                }
              }
            }
          }
        }
      }

      function contains(point, points) {
        var found = false;
        var np = points.length;
        for (var i = 0; i < np; i++) {
          if (points[i].x === point.x && points[i].y === point.y) {
            found = true;
            return;
          }
        }
        return found;
      }

      function v(wire) {
        var v = [];
        v.push(wire.sourcePoint);
        v = v.concat(wire.route);
        v.push({
          x: wire.targetPoint.x + 9,
          y: wire.targetPoint.y
        });
        return v;
      }

      function evalIntersection(point, segment) {
        if (segment[0].x === segment[1].x) {
          // Vertical
          return (
            point.x === segment[0].x &&
            point.y > Math.min(segment[0].y, segment[1].y) &&
            point.y < Math.max(segment[0].y, segment[1].y)
          );
        } else {
          // Horizontal
          return (
            point.y === segment[0].y &&
            point.x > Math.min(segment[0].x, segment[1].x) &&
            point.x < Math.max(segment[0].x, segment[1].x)
          );
        }
      }
    }

    /* jshint +W082 */

    return this;
  }
});

function getCSSRule(ruleName) {
  if (document.styleSheets) {
    for (var i = 0; i < document.styleSheets.length; i++) {
      var styleSheet = document.styleSheets[i];
      var ii = 0;
      var cssRule = false;
      do {
        cssRule = styleSheet.cssRules
          ? styleSheet.cssRules[ii]
          : styleSheet.rules[ii];
        if (cssRule) {
          if (cssRule.selectorText === ruleName) {
            return cssRule;
          }
        }
        ii++;
      } while (cssRule);
    }
  }
  return false;
}
