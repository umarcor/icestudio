import "jointjs/dist/joint.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "select2/dist/css/select2.min.css";
import "alertifyjs/build/css/alertify.min.css";
import "alertifyjs/build/css/themes/default.min.css";

import $ from "jquery";
window.$ = window.JQuery = window.jQuery = $;

import angular from "angular";
//window.angular = angular;

import "angular-route/angular-route.js";
import "angular-gettext/dist/angular-gettext.min.js";
import "jquery-resize/jquery.ba-resize.min.js";
import "underscore/underscore.js";
import "backbone/backbone.js";
import * as _ from "lodash/index.js";
import {
  connectors,
  dia,
  g,
  routers,
  shapes,
  ui,
  util,
  V
} from "jointjs/dist/joint.js";

import "angular-ui-bootstrap/dist/ui-bootstrap-tpls.js";
import "bootstrap/dist/js/bootstrap.js";
import "select2/dist/js/select2.full.js";
import "ace-builds/src-min-noconflict/ace.js";
import "ace-builds/src-min-noconflict/theme-chrome.js";
import "ace-builds/src-min-noconflict/mode-verilog.js";
import "async/dist/async.min.js";
import "svg-pan-zoom/dist/svg-pan-zoom.min.js";
import * as alertify from "alertifyjs/build/alertify.js";

import copy from "fast-copy";
const fastCopy = copy;

export {
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
}
