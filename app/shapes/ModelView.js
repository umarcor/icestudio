"use strict";

import * as _ from "lodash/index.js";
import { dia, util, V } from "jointjs";

export function iceModelView () {
  return dia.ElementView.extend({
    template: "",

    initialize: function() {
      _.bindAll(this, "updateBox");
      dia.ElementView.prototype.initialize.apply(this, arguments);

      this.$box = $(util.template(this.template)());

      this.model.on("change", this.updateBox, this);
      this.model.on("remove", this.removeBox, this);

      this.updateBox();

      this.listenTo(this.model, "process:ports", this.update);
    },

    setupResizer: function() {
      // Resizer
      if (!this.model.get("disabled")) {
        this.resizing = false;
        this.resizer = this.$box.find(".resizer");
        this.resizer.css("cursor", "se-resize");
        this.resizer.on("mousedown", { self: this }, this.startResizing);
        $(document).on("mousemove", { self: this }, this.performResizing);
        $(document).on("mouseup", { self: this }, this.stopResizing);
      }
    },

    enableResizer: function() {
      if (!this.model.get("disabled")) {
        this.resizerDisabled = false;
        this.resizer.css("cursor", "se-resize");
      }
    },

    disableResizer: function() {
      if (!this.model.get("disabled")) {
        this.resizerDisabled = true;
        this.resizer.css("cursor", "move");
      }
    },

    apply: function() {},

    startResizing: function(event) {
      var self = event.data.self;

      if (self.resizerDisabled) {
        return;
      }

      self.model.graph.trigger("batch:start");

      self.resizing = true;
      self._clientX = event.clientX;
      self._clientY = event.clientY;
    },

    performResizing: function(event) {
      var self = event.data.self;

      if (!self.resizing || self.resizerDisabled) {
        return;
      }

      var type = self.model.get("type");
      var size = self.model.get("size");
      var state = self.model.get("state");
      var gridstep = 8;
      var minSize = { width: 64, height: 32 };
      if (type === "ice.Code" || type === "ice.Memory") {
        minSize = { width: 96, height: 64 };
      }

      var clientCoords = snapToGrid({ x: event.clientX, y: event.clientY });
      var oldClientCoords = snapToGrid({ x: self._clientX, y: self._clientY });

      var dx = clientCoords.x - oldClientCoords.x;
      var dy = clientCoords.y - oldClientCoords.y;

      var width = Math.max(size.width + dx, minSize.width);
      var height = Math.max(size.height + dy, minSize.height);

      if (width > minSize.width) {
        self._clientX = event.clientX;
      }

      if (height > minSize.height) {
        self._clientY = event.clientY;
      }

      self.model.resize(width, height);

      function snapToGrid(coords) {
        return {
          x: Math.round(coords.x / state.zoom / gridstep) * gridstep,
          y: Math.round(coords.y / state.zoom / gridstep) * gridstep
        };
      }
    },

    stopResizing: function(event) {
      var self = event.data.self;

      if (!self.resizing || self.resizerDisabled) {
        return;
      }

      self.resizing = false;
      self.model.graph.trigger("batch:stop");
    },

    render: function() {
      dia.ElementView.prototype.render.apply(this, arguments);
      this.paper.$el.append(this.$box);
      this.updateBox();
      return this;
    },

    renderPorts: function() {
      var $leftPorts = this.$(".leftPorts").empty();
      var $rightPorts = this.$(".rightPorts").empty();
      var $topPorts = this.$(".topPorts").empty();
      var $bottomPorts = this.$(".bottomPorts").empty();
      var portTemplate = _.template(this.model.portMarkup);
      var modelId = this.model.id;

      _.each(
        _.filter(this.model.ports, function(p) {
          return p.type === "left";
        }),
        function(port, index) {
          $leftPorts.append(
            V(portTemplate({ id: modelId, index: index, port: port })).node
          );
        }
      );
      _.each(
        _.filter(this.model.ports, function(p) {
          return p.type === "right";
        }),
        function(port, index) {
          $rightPorts.append(
            V(portTemplate({ id: modelId, index: index, port: port })).node
          );
        }
      );
      _.each(
        _.filter(this.model.ports, function(p) {
          return p.type === "top";
        }),
        function(port, index) {
          $topPorts.append(
            V(portTemplate({ id: modelId, index: index, port: port })).node
          );
        }
      );
      _.each(
        _.filter(this.model.ports, function(p) {
          return p.type === "bottom";
        }),
        function(port, index) {
          $bottomPorts.append(
            V(portTemplate({ id: modelId, index: index, port: port })).node
          );
        }
      );
    },

    update: function() {
      this.renderPorts();
      dia.ElementView.prototype.update.apply(this, arguments);
    },

    updateBox: function() {},

    removeBox: function(/*event*/) {
      this.$box.remove();
    },

    updateScrollStatus: function(status) {
      if (this.editor) {
        this.editor.renderer.scrollBarV.element.style.visibility = status
          ? ""
          : "hidden";
        this.editor.renderer.scrollBarH.element.style.visibility = status
          ? ""
          : "hidden";
        this.editor.renderer.scroller.style.right = 0;
        this.editor.renderer.scroller.style.bottom = 0;
      }
    }
  });
};
