'use strict';

/* exported ICEpm */
var ICEpm = new IcePlugManager();

import $ from 'jquery';
window.$ = window.JQuery = window.jQuery = $;

require('jointjs/dist/joint.css');
require('bootstrap/dist/css/bootstrap.min.css');
require('select2/dist/css/select2.min.css');
require('alertifyjs/build/css/alertify.min.css');
require('alertifyjs/build/css/themes/default.min.css');

require('../resources/fonts/Lato2OFLWeb/Lato/latofonts.css');
require('../css/design.css');
require('../css/main.css');
require('../css/menu.css');
require('../css/version.css');
require('../resources/viewers/markdown/css/github-markdown.css');

//require('angular/angular.js');
//require('angular-route/angular-route.js');
//require('angular-gettext/dist/angular-gettext.min.js');
//require('jquery/dist/jquery.min.js');
//require('jquery-resize/jquery.ba-resize.min.js');
//require('underscore/underscore.js');
//require('backbone/backbone.js');
//require('lodash/index.js');
//require('jointjs/dist/joint.js');
//require('angular-ui-bootstrap/dist/ui-bootstrap-tpls.js');
//require('bootstrap/dist/js/bootstrap.js');
//require('select2/dist/js/select2.full.js');
//require('ace-builds/src-min-noconflict/ace.js');
//require('ace-builds/src-min-noconflict/theme-chrome.js');
//require('ace-builds/src-min-noconflict/mode-verilog.js');
//require('async/dist/async.min.js');
//require('svg-pan-zoom/dist/svg-pan-zoom.min.js');
//require('alertifyjs/build/alertify.js');

//require('./controllers/design.js');
//require('./controllers/main.js');
//require('./controllers/menu.js');
//require('./directives/menuboard.js');
//require('./directives/menutree.js');
//require('./factories/joint.js');
//require('./factories/node.js');
//require('./factories/window.js');
//require('./graphics/joint.command.js');
//require('./graphics/joint.connectors.js');
//require('./graphics/joint.routers.js');
//require('./graphics/joint.selection.js');
//require('./graphics/joint.shapes.js');
//require('./services/blocks.js');
//require('./services/boards.js');
//require('./services/common.js');
//require('./services/compiler.js');
//require('./services/drivers.js');
//require('./services/graph.js');
//require('./services/profile.js');
//require('./services/project.js');
//require('./services/collections.js');
//require('./services/shortcuts.js');
//require('./services/tools.js');
//require('./services/utils.js');

angular
  .module('icestudio', [
    'ui.bootstrap',
    'ngRoute',
    'gettext'
  ])
  .config(['$routeProvider',
    function($routeProvider) {
      $routeProvider
        .when('/', {
          templateUrl: 'views/main.html',
          controller: 'MainCtrl'
        })
        .otherwise({
          redirectTo: '/'
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
  ){
    $timeout(function(){
      $('body').addClass('waiting');
    }, 0);
    boards.loadBoards();
    utils.loadProfile(profile, function() {
      collections.loadAllCollections();
      utils.loadLanguage(profile, function() {
        if (profile.get('board') === '') {
          // Select board for the first time
          utils.selectBoardPrompt(function (selectedBoard) {
            var newBoard = boards.selectBoard(selectedBoard);
            profile.set('board', newBoard.name);
            alertify.success(gettextCatalog.getString('Board {{name}} selected',  { name: utils.bold(newBoard.info.label) }));
            tools.checkToolchain();
          });
        }
        else {
          profile.set('board', boards.selectBoard(profile.get('board')).name);
          tools.checkToolchain();
        }

        $('html').attr('lang', profile.get('language'));
          collections.sort();
          profile.set('collection', collections.selectCollection(profile.get('collection')));
          project.updateTitle(gettextCatalog.getString('Untitled'));
          $('body').removeClass('waiting');
      });
    });
  });
