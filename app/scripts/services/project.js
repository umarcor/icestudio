angular
  .module('icestudio')
  .service('project', function (
    $log,
    $rootScope,
    alerts,
    common,
    compiler,
    gettextCatalog,
    graph,
    gui,
    nodeFs,
    nodePath,
    profile,
    utils
  ) {
    'use strict';

    const _tcStr = function (str, args) {
      return gettextCatalog.getString(str, args);
    };

    this.name = ''; // Used in File dialogs
    this.path = ''; // Used in Save / Save as
    this.filepath = ''; // Used to find external resources (.v, .vh, .list)
    this.changed = false;
    this.backup = false;

    var __project = _default();

    function _default() {
      return {
        version: common.VERSION,
        package: {
          name: '',
          version: '',
          description: '',
          author: '',
          image: '',
        },
        design: {
          boards: [],
          graph: {blocks: [], wires: []},
        },
        dependencies: {},
      };
    }

    this.get = function (key) {
      return key in __project ? __project[key] : __project;
    };

    this.set = function (key, obj) {
      if (key in __project) {
        __project[key] = obj;
      }
    };

    this.open = function (filepath, emptyPath) {
      $log.debug('[srv.project.open] filepath:', filepath);
      $log.debug('[srv.project.open] emptyPath:', emptyPath);
      var self = this;
      this.path = emptyPath ? '' : filepath;
      this.filepath = filepath;
      utils
        .readFile(filepath)
        .then(function (data) {
          self.load(utils.basename(filepath), data);
        })
        .catch(function (e) {
          $log.error(e);
          alertify.error(_tcStr('Invalid project format'), 30);
        });
    };

    this.load = function (name, data) {
      var self = this;
      if (!checkVersion(data.version)) {
        return;
      }

      // FIXME: when opening an example in a new window, sometimes common.selectedBoard is 'null' here
      if (!common.selectedBoard) {
        $log.error(
          '[srv.project.load] common.selectedBoard:',
          common.selectedBoard
        );
      }

      __project = _safeLoad(data, name);
      if (!__project.design.boards) {
        // 'Migrate' ICE projects with single board support
        // TODO: this is not a real migration yet, since the name is retained only;
        // top-level input/output blocks should be processed to extract the pin table
        if (__project.design.board) {
          __project.design.boards = {};
          __project.design.boards[__project.design.board] = {};
        } else {
          $log.error(
            '[srv.project.load] __project.design.boards is undefined!'
          );
        }
      }

      if (!__project.design.boards[common.selectedBoard.name]) {
        alerts.alert({
          icon: 'microchip',
          title: _tcStr(
            'The selected board is not supported in this project (yet)'
          ),
          body: _tcStr(
            'You need to define top-level pins for &lt;{{name}}&gt;. Alternatively, select one of the boards which is already supported in this project.',
            {name: common.selectedBoard.info.label}
          ),
        });
      }

      common.allDependencies = __project.dependencies;

      graph.loadDesign(
        __project.design,
        {reset: false, disabled: false},
        function () {
          graph.resetCommandStack();
          graph.fitContent();
          alertify.success(
            _tcStr('Project {{name}} loaded', {
              name: utils.bold(name),
            })
          );
          common.hasChangesSinceBuild = true;
        }
      );
      self.updateTitle(name);
      _updateIOList();
    };

    this.isBoardSupported = (bname) => {
      const boards = __project.design.boards;
      return boards ? boards[bname] : false;
    };

    function _updateIOList() {
      graph.getIOList();
    }

    function checkVersion(version) {
      if (version > common.VERSION) {
        var errorAlert = alertify.error(
          _tcStr('Unsupported project format {{version}}', {
            version: version,
          }),
          30
        );
        alertify.message(
          _tcStr('Click here to <b>download a newer version</b> of Icestudio'),
          30
        ).callback = function (isClicked) {
          if (isClicked) {
            errorAlert.dismiss(false);
            gui.Shell.openExternal(
              'https://github.com/FPGAwars/icestudio/releases'
            );
          }
        };
        return false;
      }
      return true;
    }

    function _safeLoad(data, name) {
      // Backwards compatibility
      var prj = {};
      switch (data.version) {
        case common.VERSION:
        case '1.1':
          prj = data;
          break;
        case '1.0':
          prj = convert10To12(data);
          break;
        default:
          prj = convert10To12(convertTo10(data, name));
          break;
      }
      prj.version = common.VERSION;
      return prj;
    }

    function convert10To12(data) {
      var prj = _default();
      prj.package = data.package;
      prj.design.board = data.design.board;
      prj.design.graph = data.design.graph;

      var depsInfo = findSubDependencies10(data.design.deps);
      replaceType10(prj, depsInfo);
      for (var d in depsInfo) {
        var dep = depsInfo[d];
        replaceType10(dep.content, depsInfo);
        prj.dependencies[dep.id] = dep.content;
      }

      return prj;
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
        delete block.design.deps;
        block.package.name = block.package.name || key;
        block.package.description = block.package.description || key;
        if (!(key in depsInfo)) {
          depsInfo[key] = {
            id: utils.dependencyID(block),
            content: block,
          };
        }
      }
      return depsInfo;
    }

    function replaceType10(prj, depsInfo) {
      for (var i in prj.design.graph.blocks) {
        var type = prj.design.graph.blocks[i].type;
        if (type.indexOf('basic.') === -1) {
          prj.design.graph.blocks[i].type = depsInfo[type].id;
        }
      }
    }

    function convertTo10(data, name) {
      for (var b in data.graph.blocks) {
        var block = data.graph.blocks[b];
        switch (block.type) {
          case 'basic.input':
          case 'basic.output':
          case 'basic.outputLabel':
          case 'basic.inputLabel':
            block.data = {
              name: block.data.label,
              pins: [
                {
                  index: '0',
                  name: block.data.pin ? block.data.pin.name : '',
                  value: block.data.pin ? block.data.pin.value : '0',
                },
              ],
              virtual: false,
            };
            break;
          case 'basic.constant':
            block.data = {
              name: block.data.label,
              value: block.data.value,
              local: false,
            };
            break;
          case 'basic.code':
            var params = [];
            for (var p in block.data.params) {
              params.push({
                name: block.data.params[p],
              });
            }
            var inPorts = [];
            for (var i in block.data.ports.in) {
              inPorts.push({
                name: block.data.ports.in[i],
              });
            }

            var outPorts = [];
            for (var o in block.data.ports.out) {
              outPorts.push({
                name: block.data.ports.out[o],
              });
            }
            block.data = {
              code: block.data.code,
              params: params,
              ports: {
                in: inPorts,
                out: outPorts,
              },
            };
            break;
        }
      }
      var prj = {
        version: '1.0',
        package: {
          name: name || '',
          version: '',
          description: name || '',
          author: '',
          image: '',
        },
        design: {
          board: data.board,
          graph: data.graph,
          deps: {},
        },
      };
      // Safe load all dependencies recursively
      for (var key in data.deps) {
        prj.design.deps[key] = convertTo10(data.deps[key], key);
      }

      return prj;
    }

    this.save = function (filepath, callback) {
      var backupProject = false;
      var name = utils.basename(filepath);
      if (common.isEditingSubmodule) {
        backupProject = utils.clone(__project);
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
        var code = compiler.generate('verilog', __project)[0].content;
        var listFiles = compiler.generate('list', __project);
        var internalFiles = listFiles.map(function (res) {
          return res.name;
        });
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
        } else {
          // No included files to copy
          // 4. Save project
          doSaveProject();
        }
      } else {
        // Same filepath
        // 4. Save project
        doSaveProject();
      }
      if (common.isEditingSubmodule) {
        __project = utils.clone(backupProject);
        //        sortGraph();
        //        this.update();
      } else {
        this.path = filepath;
        this.filepath = filepath;
      }

      function doSaveProject() {
        utils
          .saveFile(filepath, pruneProject(__project))
          .then(function () {
            if (callback) {
              callback();
            }
            alertify.success(
              _tcStr('Project {{name}} saved', {
                name: utils.bold(name),
              })
            );
          })
          .catch(function (e) {
            alertify.error(e, 30);
          });
      }
    };

    function sortGraph() {
      var cells = graph.getCells();

      // Sort Constant/Memory cells by x-coordinate
      cells = _.sortBy(cells, function (cell) {
        if (
          cell.get('type') === 'ice.Constant' ||
          cell.get('type') === 'ice.Memory'
        ) {
          return cell.get('position').x;
        }
      });

      // Sort I/O cells by y-coordinate
      cells = _.sortBy(cells, function (cell) {
        if (
          cell.get('type') === 'ice.Input' ||
          cell.get('type') === 'ice.Output'
        ) {
          return cell.get('position').y;
        }
      });

      graph.setCells(cells);
    }

    function _addBlockFile(self, orig, name, data, notify) {
      function _importBlock() {
        self.addBlock(block);
        if (notify) {
          alertify.success(
            _tcStr('Block {{name}} imported', {
              name: utils.bold(block.package.name),
            })
          );
        }
      }

      var block = _safeLoad(data, name);
      if (!block) {
        return;
      } // FIXME: should produce a meaningful error

      // 1. Parse and find included files
      var code = compiler.generate('verilog', block)[0].content;
      var internalFiles = compiler.generate('list', block).map(function (res) {
        return res.name;
      });
      var files = _.difference(utils.findIncludedFiles(code), internalFiles);

      function _importBlockWithFiles() {
        copyIncludedFiles(files, orig, utils.dirname(self.path), function (
          success
        ) {
          if (success) {
            _importBlock();
          } // FIXME: should notify if something went wrong, instead of failing silently...
        });
      }

      if (!files.length) {
        _importBlock();
        return;
      }
      if (self.path) {
        _importBlockWithFiles();
        return;
      }

      alerts.confirm({
        title: _tcStr('This import operation requires a project path'),
        body: _tcStr(
          'You need to save the current project. Do you want to continue?'
        ),
        onok: () => {
          $rootScope.saveProjectAs();
          _importBlockWithFiles();
        },
        labels: {
          ok: _tcStr('Save'),
          cancel: _tcStr('Cancel'),
        },
      });
    }

    this.addBlockFile = function (filepath, notify) {
      var self = this;
      utils
        .readFile(filepath)
        .then(function (data) {
          if (!checkVersion(data.version)) {
            return;
          } // FIXME: should produce a meaningful error
          _addBlockFile(
            self,
            utils.dirname(filepath),
            utils.basename(filepath),
            data,
            notify
          );
        })
        .catch(function (e) {
          $log.error(e);
          alertify.error(_tcStr('Invalid project format'), 30); // FIXME: other reasons might produce an error
        });
    };

    function copyIncludedFiles(files, origPath, destPath, callback) {
      var success = true;
      async.eachSeries(
        files,
        function (filename, next) {
          setTimeout(function () {
            if (origPath !== destPath) {
              function _ok() {
                if (!(success && doCopySync(origPath, destPath, filename))) {
                  return next();
                } // break
                next();
              }
              if (nodeFs.existsSync(nodePath.join(destPath, filename))) {
                alerts.confirm({
                  icon: 'question-circle',
                  title: _tcStr(
                    'File {{file}} already exists in the project path',
                    {
                      file: utils.bold(filename),
                    }
                  ),
                  body: _tcStr('Do you want to replace it?'),
                  onok: _ok,
                  oncancel: next,
                });
              } else {
                _ok();
              }
            } else {
              return next(); // break
            }
          }, 0);
        },
        function (/*result*/) {
          return callback(success);
        }
      );
    }

    function doCopySync(origPath, destPath, filename) {
      var orig = nodePath.join(origPath, filename);
      var dest = nodePath.join(destPath, filename);
      var success = utils.copySync(orig, dest);
      if (success) {
        alertify.message(
          _tcStr('File {{file}} imported', {
            file: utils.bold(filename),
          }),
          5
        );
      } else {
        alertify.error(
          _tcStr('Original file {{file}} does not exist', {
            file: utils.bold(filename),
          }),
          30
        );
      }
      return success;
    }

    function pruneProject(prj) {
      var _prj = utils.clone(prj);

      _prune(_prj);
      for (var d in _prj.dependencies) {
        _prune(_prj.dependencies[d]);
      }

      function _prune(_prj) {
        delete _prj.design.state;
        for (var i in _prj.design.graph.blocks) {
          var block = _prj.design.graph.blocks[i];
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

      return _prj;
    }

    this.snapshot = function () {
      this.backup = utils.clone(__project);
    };

    this.restoreSnapshot = function () {
      __project = utils.clone(this.backup);
    };

    this.update = function (opt, callback) {
      var graphData = graph.toJSON();
      var p = utils.cellsToProject(graphData.cells, opt);
      __project.design.board = p.design.board;
      __project.design.graph = p.design.graph;
      __project.dependencies = p.dependencies;
      if (
        common.isEditingSubmodule &&
        common.submoduleId &&
        common.allDependencies[common.submoduleId]
      ) {
        __project.package = common.allDependencies[common.submoduleId].package;
      }
      var state = graph.getState();
      __project.design.state = {
        pan: {
          x: parseFloat(state.pan.x.toFixed(4)),
          y: parseFloat(state.pan.y.toFixed(4)),
        },
        zoom: parseFloat(state.zoom.toFixed(4)),
      };

      if (callback) {
        callback();
      }
    };

    this.updateTitle = function (name) {
      if (name) {
        this.name = name;
        graph.resetTitle(name);
      }
      var title = (this.changed ? '*' : '') + this.name + ' ─ Icestudio';
      utils.updateWindowTitle(title);
    };

    this.compile = function (target) {
      this.update();
      var opt = {boardRules: profile.get('boardRules')};
      return compiler.generate(target, __project, opt);
    };

    this.addBasicBlock = function (type) {
      graph.createBasicBlock(type);
    };

    this.addBlock = function (block) {
      if (block) {
        block = _safeLoad(block);
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

    this.removeSelected = function () {
      graph.removeSelected();
    };

    this.clear = function () {
      __project = _default();
      graph.clearAll();
      graph.resetTitle();
      graph.resetCommandStack();
    };
  });
