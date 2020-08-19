/* eslint-disable no-unused-vars */

var IcePlugManager = function () {
  'use strict';

  this.pluginDir = false;
  this.pluginUri = false;
  this.plugins = {};

  this.ebus = new IceEventBus();
  this.tpl = new IceTemplateSystem();
  this.parametric = new IceParametricHelper();
  this.toload = 0;
  this.onload = false;

  this.setPluginDir = function (dir, callback) {
    this.pluginDir = dir;
    let tu = dir.indexOf('resources');
    this.pluginUri = dir.substr(tu);
    this.load(callback);
  };

  this.isFactory = function (name) {
    return (
      this.plugins[name] !== undefined &&
      this.plugins[name].manifest.type === 'factory'
    );
  };

  this.runFactory = function (name, str, params, callback) {
    let b = JSON.parse(this.plugins[name].factory(str, params));
    callback(b ? b : false);
  };

  this.promptFactory = function (name, str, callback) {
    //get the closable setting value.
    let _currentFactory = this.plugins[name];
    let excel = false;
    let _this = this;
    alertify
      .alert()
      .setting({
        label: 'Generate',
        modal: true,
        movable: true,
        maximizable: true,
        message:
          '<div class="icepm-params-desc" style="margin-bottom:20px;"><p>Configure your parametric block:</p></div><div id="icepm-params-table"></div>',
        onok: function () {
          let p = excel.getData();
          excel.destroy(true);
          _this.runFactory(name, str, p, callback);
          // alertify.success('Parametric block ready');
        },
        onshow: function () {
          $('#icepm-params-table').empty();
          excel = jexcel(
            document.getElementById('icepm-params-table'),
            _currentFactory.params
          );
        },
      })
      .show();
  };

  this.factory = function (name, str, callback) {
    if (!this.isFactory(name)) {
      callback(false);
      return;
    }
    if (this.plugins[name].factory === undefined) {
      const fs = require('fs');
      let contents = fs.readFileSync(
        this.pluginDir + '/' + name + '/main.js',
        'utf8'
      );
      /* function ab2str(buf) {
                  return String.fromCharCode.apply(null, new Uint16Array(buf));
              }*/
      //let code=ab2str(contents);
      eval(contents);
    }
    this.promptFactory(name, str, callback);
  };

  this.paramsFactory = function (name, paramsDef) {
    if (!this.isFactory(name)) {
      return false;
    }
    this.plugins[name].params = paramsDef;
  };

  this.registerFactory = function (name, callback) {
    if (!this.isFactory(name)) {
      return false;
    }
    this.plugins[name].factory = callback;
  };

  this.load = function (callback) {
    if (this.pluginDir === false) {
      return false;
    }

    this.onload = true;
    const fs = require('fs');

    fs.readdir(
      this.pluginDir,
      function (err, files) {
        this.toload = files.length;
        files.forEach(
          function (file) {
            fs.readFile(
              this.pluginDir + '/' + file + '/manifest.json',
              'utf8',
              function (err, contents) {
                let mf = JSON.parse(contents);
                if (mf !== false) {
                  this.plugins[file] = {
                    dir: file,
                    manifest: mf,
                  };
                }
                this.toload--;
                if (this.toload === 0) {
                  this.onload = false;
                  if (typeof callback !== 'undefined') {
                    callback();
                  }
                }
              }.bind(this)
            );
          }.bind(this)
        );
      }.bind(this)
    );
  };

  console.log('Icestudio Plugin Manager v0.1');
};
