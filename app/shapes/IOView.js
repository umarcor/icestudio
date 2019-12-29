"use strict";

import * as _ from "lodash/index.js";
import { dia, util } from "jointjs";
import * as sha1 from "sha1";

export function iceIOView (
  iceShapes,
  WIRE_WIDTH,
  subModuleActive
) {
  return iceShapes.ModelView.extend({
    initialize: function() {
      _.bindAll(this, "updateBox");
      dia.ElementView.prototype.initialize.apply(this, arguments);

      this.id = sha1(this.model.get("id"))
        .toString()
        .substring(0, 6);
      var comboId = "combo" + this.id;
      var virtual = this.model.get("data").virtual || this.model.get("disabled");

      var selectCode = "";
      var selectScript = "";
      var data = this.model.get("data");
      var name = data.name + (data.range || "");

      if (data.pins) {
        for (var i in data.pins) {
          selectCode += '<select id="' + comboId + data.pins[i].index + '"';
          selectCode += 'class="select2" i="' + i + '">';
          selectCode += "</select>";

          selectScript += '$("#' + comboId + data.pins[i].index + '").select2(';
          selectScript +=
            '{placeholder: "", allowClear: true, dropdownCssClass: "bigdrop",';
          // Match only words that start with the selected search term
          // http://stackoverflow.com/questions/31571864/select2-search-match-only-words-that-start-with-search-term
          selectScript += "matcher: function(params, data) {";
          selectScript += '  params.term = params.term || "";';
          selectScript +=
            "  if (data.text.toUpperCase().indexOf(params.term.toUpperCase()) == 0) { return data; }";
          selectScript += "  return false; } });";
        }
      }

      this.$box = $(
        util.template(
          '\
        <div class="io-block">\
          <div class="io-virtual-content' +
            (virtual ? "" : " hidden") +
            '">\
            <div class="header">\
              <label>' +
            name +
            '</label>\
              <svg viewBox="0 0 12 18"><path d="M-1 0 l10 8-10 8" fill="none" stroke-width="2" stroke-linejoin="round"/>\
            </div>\
          </div>\
          <div class="io-fpga-content' +
            (virtual ? " hidden" : "") +
            '">\
            <div class="header">\
              <label>' +
            name +
            '</label>\
              <svg viewBox="0 0 12 18"><path d="M-1 0 l10 8-10 8" fill="none" stroke-width="2" stroke-linejoin="round"/>\
            </div>\
            <div>' +
            selectCode +
            "</div>\
            <script>" +
            selectScript +
            "</script>\
          </div>\
        </div>\
        "
        )()
      );

      this.virtualContentSelector = this.$box.find(".io-virtual-content");
      this.fpgaContentSelector = this.$box.find(".io-fpga-content");
      this.headerSelector = this.$box.find(".header");
      this.nativeDom = {
        box: this.$box[0],
        virtualContentSelector: this.$box[0].querySelectorAll(
          ".io-virtual-content"
        ),
        fpgaContentSelector: this.$box[0].querySelectorAll(".io-fpga-content")
      };

      this.model.on("change", this.updateBox, this);
      this.model.on("remove", this.removeBox, this);

      this.listenTo(this.model, "process:ports", this.update);
      dia.ElementView.prototype.initialize.apply(this, arguments);

      // Prevent paper from handling pointerdown.
      var self = this;
      var selector = this.$box.find(".select2");
      selector.on("mousedown click", function(event) {
        event.stopPropagation();
      });
      selector.on("change", function(event) {
        if (!self.updating) {
          var target = $(event.target);
          var i = target.attr("i");
          var name = target.find("option:selected").text();
          var value = target.val();
          var data = JSON.parse(JSON.stringify(self.model.get("data")));
          if (name !== null && value !== null) {
            data.pins[i].name = name;
            data.pins[i].value = value;
            self.model.set("data", data);
          }
        }
      });

      this.updateBox();

      this.updating = false;

      // Apply data
      if (!this.model.get("disabled")) {
        this.applyChoices();
        this.applyValues();
        this.applyShape();
      }
      this.applyClock();
    },

    applyChoices: function() {
      var data = this.model.get("data");
      if (data.pins) {
        for (var i in data.pins) {
          this.$box
            .find("#combo" + this.id + data.pins[i].index)
            .empty()
            .append(this.model.get("choices"));
        }
      }
    },

    applyValues: function() {
      this.updating = true;
      var data = this.model.get("data");
      for (var i in data.pins) {
        var index = data.pins[i].index;
        var value = data.pins[i].value;
        var name = data.pins[i].name;
        var comboId = "#combo" + this.id + index;
        var comboSelector = this.$box.find(
          comboId + " option:contains(" + name + ")"
        );
        if (comboSelector) {
          // Select by pin name
          comboSelector.attr("selected", true);
        } else {
          // If there was a pin rename use the pin value
          comboSelector = this.$box.find(comboId);
          comboSelector.val(value).change();
        }
      }
      this.updating = false;
    },

    applyShape: function() {
      var data = this.model.get("data");
      var name = data.name + (data.range || "");
      var virtual = data.virtual || this.model.get("disabled") || subModuleActive;
      var $label = this.$box.find("label");

      $label.text(name || "");

      if (virtual) {
        // Virtual port (green)
        this.fpgaContentSelector.addClass("hidden");

        this.virtualContentSelector.removeClass("hidden");
        if (typeof data.blockColor !== "undefined") {
          if (typeof data.oldBlockColor !== "undefined") {
            this.virtualContentSelector.removeClass(
              "color-" + data.oldBlockColor
            );
          }
          this.virtualContentSelector.addClass("color-" + data.blockColor);
        }
        this.model.attributes.size.height = 64;
      } else {
        // FPGA I/O port (yellow)
        this.virtualContentSelector.addClass("hidden");
        this.fpgaContentSelector.removeClass("hidden");
        if (data.pins) {
          this.model.attributes.size.height = 32 + 32 * data.pins.length;
        }
      }
    },

    applyClock: function() {
      if (this.model.get("data").clock) {
        this.$box.find("svg").removeClass("hidden");
      } else {
        this.$box.find("svg").addClass("hidden");
      }
    },

    clearValues: function() {
      this.updating = true;
      var name = "";
      var value = "0";
      var data = JSON.parse(JSON.stringify(this.model.get("data")));
      for (var i in data.pins) {
        var index = data.pins[i].index;
        var comboId = "#combo" + this.id + index;
        var comboSelector = this.$box.find(comboId);
        comboSelector.val(value).change();
        data.pins[i].name = name;
        data.pins[i].value = value;
      }
      this.model.set("data", data);
      this.updating = false;
    },

    apply: function() {
      this.applyChoices();
      this.applyValues();
      this.applyShape();
      this.applyClock();
      this.render();
    },

    update: function() {
      this.renderPorts();
      dia.ElementView.prototype.update.apply(this, arguments);
    },
    pendingRender: false,
    updateBox: function() {
      var pendingTasks = [];
      var i, j, port;
      var bbox = this.model.getBBox();
      var data = this.model.get("data");
      var state = this.model.get("state");
      var rules = this.model.get("rules");
      var leftPorts = this.model.get("leftPorts");
      var rightPorts = this.model.get("rightPorts");
      var modelId = this.model.id;
      var portDefault, tokId, dome;
      var paths, rects;
      var width = WIRE_WIDTH * state.zoom;

      var pwires = this.$el[0].getElementsByClassName("port-wire");
      for (i = 0; i < pwires.length; i++) {
        pendingTasks.push({
          e: pwires[i],
          property: "stroke-width",
          value: width + "px"
        });
      }
      // Set buses
      var nwidth = width * 3;
      tokId = "port-wire-" + modelId + "-";
      for (i = 0; i < leftPorts.length; i++) {
        port = leftPorts[i];
        if (port.size > 1) {
          dome = document.getElementById(tokId + port.id);

          pendingTasks.push({
            e: dome,
            property: "stroke-width",
            value: nwidth + "px"
          });
        }
      }

      for (i = 0; i < rightPorts.length; i++) {
        port = rightPorts[i];
        if (port.size > 1) {
          dome = document.getElementById(tokId + port.id);

          pendingTasks.push({
            e: dome,
            property: "stroke-width",
            value: nwidth + "px"
          });
        }
      }
      // Render rules
      if (data && data.ports && data.ports.in) {
        tokId = "port-default-" + modelId + "-";
        for (i = 0; i < data.ports.in.length; i++) {
          port = data.ports.in[i];
          portDefault = document.getElementById(tokId + port.name);
          if (
            portDefault !== null &&
            rules &&
            port.default &&
            port.default.apply
          ) {
            pendingTasks.push({
              e: portDefault,
              property: "display",
              value: "inline"
            });

            paths = portDefault.querySelectorAll("path");
            for (j = 0; j < paths.length; j++) {
              pendingTasks.push({
                e: paths[j],
                property: "stroke-width",
                value: width + "px"
              });
            }

            rects = portDefault.querySelectorAll("rect");
            for (j = 0; j < rects.length; j++) {
              pendingTasks.push({
                e: rects[j],
                property: "stroke-width",
                value: state.zoom + "px"
              });
            }
          } else {
            pendingTasks.push({
              e: portDefault,
              property: "display",
              value: "none"
            });
          }
        }
      }
      var virtualtopOffset = 24;

      for (i = 0; i < this.nativeDom.virtualContentSelector.length; i++) {
        pendingTasks.push({
          e: this.nativeDom.virtualContentSelector[i],
          property: "left",
          value: Math.round((bbox.width / 2.0) * (state.zoom - 1)) + "px"
        });
        pendingTasks.push({
          e: this.nativeDom.virtualContentSelector[i],
          property: "top",
          value:
            Math.round(
              ((bbox.height - virtualtopOffset) / 2.0) * (state.zoom - 1) +
                (virtualtopOffset / 2.0) * state.zoom
            ) + "px"
        });
        pendingTasks.push({
          e: this.nativeDom.virtualContentSelector[i],
          property: "width",
          value: Math.round(bbox.width) + "px"
        });
        pendingTasks.push({
          e: this.nativeDom.virtualContentSelector[i],
          property: "height",
          value: Math.round(bbox.height - virtualtopOffset) + "px"
        });
        pendingTasks.push({
          e: this.nativeDom.virtualContentSelector[i],
          property: "transform",
          value: "scale(" + state.zoom + ")"
        });
      }
      // Render io FPGA content
      var fpgaTopOffset = data.name || data.range || data.clock ? 0 : 24;

      for (i = 0; i < this.nativeDom.fpgaContentSelector.length; i++) {
        pendingTasks.push({
          e: this.nativeDom.fpgaContentSelector[i],
          property: "left",
          value: Math.round((bbox.width / 2.0) * (state.zoom - 1)) + "px"
        });
        pendingTasks.push({
          e: this.nativeDom.fpgaContentSelector[i],
          property: "top",
          value:
            Math.round(
              ((bbox.height - fpgaTopOffset) / 2.0) * (state.zoom - 1) +
                (fpgaTopOffset / 2.0) * state.zoom
            ) + "px"
        });
        pendingTasks.push({
          e: this.nativeDom.fpgaContentSelector[i],
          property: "width",
          value: Math.round(bbox.width) + "px"
        });
        pendingTasks.push({
          e: this.nativeDom.fpgaContentSelector[i],
          property: "height",
          value: Math.round(bbox.height - fpgaTopOffset) + "px"
        });
        pendingTasks.push({
          e: this.nativeDom.fpgaContentSelector[i],
          property: "transform",
          value: "scale(" + state.zoom + ")"
        });
      }
      if (data.name || data.range || data.clock) {
        this.headerSelector.removeClass("hidden");
      } else {
        this.headerSelector.addClass("hidden");
      }

      // Render block
      pendingTasks.push({
        e: this.nativeDom.box,
        property: "left",
        value: Math.round(bbox.x * state.zoom + state.pan.x) + "px"
      });
      pendingTasks.push({
        e: this.nativeDom.box,
        property: "top",
        value: Math.round(bbox.y * state.zoom + state.pan.y) + "px"
      });
      pendingTasks.push({
        e: this.nativeDom.box,
        property: "width",
        value: Math.round(bbox.width * state.zoom) + "px"
      });
      pendingTasks.push({
        e: this.nativeDom.box,
        property: "height",
        value: Math.round(bbox.height * state.zoom) + "px"
      });

      i = pendingTasks.length;
      for (i = 0; i < pendingTasks.length; i++) {
        if (pendingTasks[i].e !== null) {
          pendingTasks[i].e.style[pendingTasks[i].property] =
            pendingTasks[i].value;
        }
      }
      return pendingTasks;
    },

    drawPendingTasks: function(tasks) {
      var i = tasks.length;
      for (i = 0; i < tasks.length; i++) {
        if (this.tasks[i].e !== null) {
          tasks[i].e.style[tasks[i].property] = tasks[i].value;
        }
      }
    },

    removeBox: function() {
      // Close select options on remove
      this.$box.find("select").select2("close");
      this.$box.remove();
    }
  });
};
