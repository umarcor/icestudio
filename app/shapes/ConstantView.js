"use strict";

import { util } from "jointjs";

export function iceConstantView (
  iceShapes,
  WIRE_WIDTH
) {
  return iceShapes.ModelView.extend({
    initialize: function() {
      _.bindAll(this, "updateBox");
      dia.ElementView.prototype.initialize.apply(this, arguments);

      this.$box = $(
        util.template(
          '\
        <div class="constant-block">\
          <div class="constant-content">\
            <div class="header">\
              <label></label>\
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 9.78"><path d="M2.22 4.44h3.56V3.11q0-.73-.52-1.26-.52-.52-1.26-.52t-1.26.52q-.52.52-.52 1.26v1.33zM8 5.11v4q0 .28-.2.47-.19.2-.47.2H.67q-.28 0-.48-.2Q0 9.38 0 9.11v-4q0-.28.2-.47.19-.2.47-.2h.22V3.11q0-1.28.92-2.2Q2.72 0 4 0q1.28 0 2.2.92.91.91.91 2.2v1.32h.22q.28 0 .48.2.19.2.19.47z"/></svg>\
            </div>\
            <input class="constant-input"></input>\
          </div>\
        </div>\
        '
        )()
      );

      this.inputSelector = this.$box.find(".constant-input");
      this.contentSelector = this.$box.find(".constant-content");
      this.headerSelector = this.$box.find(".header");

      this.model.on("change", this.updateBox, this);
      this.model.on("remove", this.removeBox, this);

      this.listenTo(this.model, "process:ports", this.update);
      dia.ElementView.prototype.initialize.apply(this, arguments);

      // Prevent paper from handling pointerdown.
      this.inputSelector.on("mousedown click", function(event) {
        event.stopPropagation();
      });

      this.updateBox();

      this.updating = false;

      var self = this;
      this.inputSelector.on("input", function(event) {
        if (!self.updating) {
          var target = $(event.target);
          var data = JSON.parse(JSON.stringify(self.model.get("data")));
          data.value = target.val();
          self.model.set("data", data);
        }
      });
      this.inputSelector.on("paste", function(event) {
        var data = event.originalEvent.clipboardData.getData("text");
        if (data.startsWith('{"hwstudio":')) {
          // Prevent paste blocks
          event.preventDefault();
        }
      });

      // Apply data
      this.apply();
    },

    apply: function() {
      this.applyName();
      this.applyLocal();
      this.applyValue();
    },

    applyName: function() {
      var name = this.model.get("data").name;
      this.$box.find("label").text(name);
    },

    applyLocal: function() {
      if (this.model.get("data").local) {
        this.$box.find("svg").removeClass("hidden");
      } else {
        this.$box.find("svg").addClass("hidden");
      }
    },

    applyValue: function() {
      this.updating = true;
      if (this.model.get("disabled")) {
        this.inputSelector.css({ "pointer-events": "none" });
      }
      var value = this.model.get("data").value;
      this.inputSelector.val(value);
      this.updating = false;
    },

    update: function() {
      this.renderPorts();
      dia.ElementView.prototype.update.apply(this, arguments);
    },

    updateBox: function() {
      var bbox = this.model.getBBox();
      var data = this.model.get("data");
      var state = this.model.get("state");
      var pendingTasks = [];
      // Set wire width
      var width = WIRE_WIDTH * state.zoom;
      var pwires = this.$el[0].getElementsByClassName("port-wire");
      var i;
      for (i = 0; i < pwires.length; i++) {
        pendingTasks.push({
          e: pwires[i],
          property: "stroke-width",
          value: width + "px"
        });
      }
      // Render content
      var topOffset = data.name || data.local ? 0 : 24;
      var contentSel = this.$box[0].querySelectorAll(".constant-content");
      for (i = 0; i < contentSel.length; i++) {
        pendingTasks.push({
          e: contentSel[i],
          property: "left",
          value: Math.round((bbox.width / 2.0) * (state.zoom - 1)) + "px"
        });
        pendingTasks.push({
          e: contentSel[i],
          property: "top",
          value:
            Math.round(
              ((bbox.height + topOffset) / 2.0) * (state.zoom - 1) + topOffset
            ) + "px"
        });
        pendingTasks.push({
          e: contentSel[i],
          property: "width",
          value: Math.round(bbox.width) + "px"
        });
        pendingTasks.push({
          e: contentSel[i],
          property: "height",
          value: Math.round(bbox.height - topOffset) + "px"
        });
        pendingTasks.push({
          e: contentSel[i],
          property: "transform",
          value: "scale(" + state.zoom + ")"
        });
      }
      if (data.name || data.local) {
        this.headerSelector.removeClass("hidden");
      } else {
        this.headerSelector.addClass("hidden");
      }

      // Render block
      pendingTasks.push({
        e: this.$box[0],
        property: "left",
        value: Math.round(bbox.x * state.zoom + state.pan.x) + "px"
      });
      pendingTasks.push({
        e: this.$box[0],
        property: "top",
        value: Math.round(bbox.y * state.zoom + state.pan.y) + "px"
      });
      pendingTasks.push({
        e: this.$box[0],
        property: "width",
        value: Math.round(bbox.width * state.zoom) + "px"
      });
      pendingTasks.push({
        e: this.$box[0],
        property: "height",
        value: Math.round(bbox.height * state.zoom) + "px"
      });

      i = pendingTasks.length;
      //  pendingTasks= pendingTasks.reverse();
      for (i = 0; i < pendingTasks.length; i++) {
        if (pendingTasks[i].e !== null) {
          pendingTasks[i].e.style[pendingTasks[i].property] =
            pendingTasks[i].value;
        }
      }
      return pendingTasks;
    }
  });
};
