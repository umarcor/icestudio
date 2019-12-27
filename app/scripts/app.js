'use strict';

/* exported ICEpm */
var ICEpm = new IcePlugManager();

import $ from 'jquery';
window.$ = window.JQuery = window.jQuery = $;

import '../resources/fonts/Lato2OFLWeb/Lato/latofonts.css';
import '../css/design.css';
import '../css/main.css';
import '../css/menu.css';
import '../css/version.css';
import '../resources/viewers/markdown/css/github-markdown.css';

import './libs/iceprofiler.js';

const appModule = angular.module('hwstudio', [
  'ui.bootstrap',
  'ngRoute',
  'gettext'
]);

import projectService from './services/tools';
appModule.service('project', projectService);

import toolsService from './services/tools';
appModule.service('tools', toolsService);


import mainController from './controllers/main';
import mainTemplate from '../views/main.html';

appModule.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider
      .when('/', {
        template: mainTemplate,
        controller: mainController
      })
      .otherwise({
        redirectTo: '/'
      });
  }
]);

import designController from './controllers/design';
import designTemplate from '../views/design.html';

appModule.controller('DesignCtrl', designController);

import menuController from './controllers/design';
import menuTemplate from '../views/design.html';

appModule.controller('MenuCtrl', menuController);

//angular.module('hwstudio')
//.run(function(
//  profile,
//  project,
//  common,
//  tools,
//  utils,
//  boards,
//  collections,
//  gettextCatalog,
//  $timeout
//){
//  $timeout(function(){
//    $('body').addClass('waiting');
//  }, 0);
//  boards.loadBoards();
//  utils.loadProfile(profile, function() {
//    collections.loadAllCollections();
//    utils.loadLanguage(profile, function() {
//      if (profile.get('board') === '') {
//        // Select board for the first time
//        utils.selectBoardPrompt(function (selectedBoard) {
//          var newBoard = boards.selectBoard(selectedBoard);
//          profile.set('board', newBoard.name);
//          alertify.success(gettextCatalog.getString('Board {{name}} selected',  { name: utils.bold(newBoard.info.label) }));
//          tools.checkToolchain();
//        });
//      }
//      else {
//        profile.set('board', boards.selectBoard(profile.get('board')).name);
//        tools.checkToolchain();
//      }
//      $('html').attr('lang', profile.get('language'));
//        collections.sort();
//        profile.set('collection', collections.selectCollection(profile.get('collection')));
//        project.updateTitle(gettextCatalog.getString('Untitled'));
//        $('body').removeClass('waiting');
//    });
//  });
//});

export default appModule;

//import './directives/menuboard.js';
//import './directives/menutree.js';
//import './factories/joint.js';
//import './factories/node.js';
//import './factories/window.js';
//import './graphics/joint.command.js';
//import './graphics/joint.connectors.js';
//import './graphics/joint.routers.js';
//import './graphics/joint.selection.js';
//import './graphics/joint.shapes.js';
//import './services/blocks.js';
//import './services/boards.js';
//import './services/common.js';
//import './services/compiler.js';
//import './services/drivers.js';
//import './services/graph.js';
//import './services/profile.js';
//import './services/project.js';
//import './services/collections.js';
//import './services/shortcuts.js';
//import './services/tools.js';
//import './services/utils.js';
