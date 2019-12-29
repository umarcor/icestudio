"use strict";

import * as _ from "lodash/index.js";

export function iceGenericView (
  iceShapes,
  WIRE_WIDTH
) {
  return iceShapes.ModelView.extend({
    // Image comments:
    // - img: fast load, no interactive
    // - object: slow load, interactive
    // - inline SVG: fast load, interactive, but...
    //               old SVG files have no viewBox, therefore no properly resize
    //               Inkscape adds this field saving as "Optimize SVG" ("Enable viewboxing")

    template:
      '\
    <div class="generic-block">\
      <div class="generic-content">\
        <div class="img-container"><img></div>\
        <label></label>\
        <span class="tooltiptext"></span>\
      </div>\
    </div>\
    ',

    events: {
      mouseover: "mouseovercard",
      mouseout: "mouseoutcard",
      mouseup: "mouseupcard",
      mousedown: "mousedowncard"
    },

    enter: false,

    mouseovercard: function(event /*, x, y*/) {
      if (event && event.which === 0) {
        // Mouse button not pressed
        this.showTooltip();
      }
    },

    mouseoutcard: function(/*event, x, y*/) {
      this.hideTooltip();
    },

    mouseupcard: function(/*event, x, y*/) {},

    mousedowncard: function(/*event, x, y*/) {
      this.hideTooltip();
    },

    showTooltip: function() {
      if (this.tooltip) {
        if (!this.openTimeout) {
          this.openTimeout = setTimeout(
            function() {
              this.tooltiptext.css("visibility", "visible");
            }.bind(this),
            2000
          );
        }
      }
    },

    hideTooltip: function() {
      if (this.tooltip) {
        if (this.openTimeout) {
          clearTimeout(this.openTimeout);
          this.openTimeout = null;
        }
        this.tooltiptext.css("visibility", "hidden");
      }
    },

    initialize: function() {
      iceShapes.ModelView.prototype.initialize.apply(this, arguments);

      this.tooltip = this.model.get("tooltip");
      this.tooltiptext = this.$box.find(".tooltiptext");

      this.tooltiptext.text(this.tooltip);

      if (this.tooltip.length > 13) {
        this.tooltiptext.addClass("tooltip-medium");
        this.tooltiptext.removeClass("tooltip-large");
      } else if (this.tooltip.length > 20) {
        this.tooltiptext.addClass("tooltip-large");
        this.tooltiptext.removeClass("tooltip-medium");
      } else {
        this.tooltiptext.removeClass("tooltip-medium");
        this.tooltiptext.removeClass("tooltip-large");
      }

      if (this.model.get("config")) {
        this.$box.find(".generic-content").addClass("config-block");
      }

      // Initialize content
      this.initializeContent();
    },

    initializeContent: function() {
      var image = this.model.get("image");
      var label = this.model.get("label");
      var ports = this.model.get("leftPorts");

      var imageSelector = this.$box.find("img");
      var labelSelector = this.$box.find("label");

      if (image) {
        // Render img
        imageSelector.attr("src", "data:image/svg+xml," + image);

        // Render SVG
        //imageSelector.append(decodeURI(image));

        imageSelector.removeClass("hidden");
        labelSelector.addClass("hidden");
      } else {
        // Render label
        labelSelector.html(label);
        labelSelector.removeClass("hidden");
        imageSelector.addClass("hidden");
      }

      // Render clocks
      this.$box.find(".clock").remove();
      var n = ports.length;
      var gridsize = 8;
      var height = this.model.get("size").height;
      var contentSelector = this.$box.find(".generic-content");
      for (var i in ports) {
        var port = ports[i];
        if (port.clock) {
          var top =
            Math.round(((parseInt(i) + 0.5) * height) / n / gridsize) * gridsize -
            9;
          contentSelector.append(
            '\
            <div class="clock" style="top: ' +
              top +
              'px;">\
              <svg width="12" height="18"><path d="M-1 0 l10 8-10 8" fill="none" stroke="#555" stroke-width="1.2" stroke-linejoin="round"/>\
            </div>'
          );
        }
      }
    },
    updateBox: function() {
      var pendingTasks = [];
      var i, port;
      var bbox = this.model.getBBox();
      var data = this.model.get("data");
      var state = this.model.get("state");
      var rules = this.model.get("rules");
      var leftPorts = this.model.get("leftPorts");
      var rightPorts = this.model.get("rightPorts");
      var modelId = this.model.id;

      // Render ports width
      var width = WIRE_WIDTH * state.zoom;
      var pwires = this.$el[0].getElementsByClassName("port-wire");
      for (i = 0; i < pwires.length; i++) {
        pendingTasks.push({
          e: pwires[i],
          property: "stroke-width",
          value: width + "px"
        });
      }
      var nwidth = width * 3;
      var tokId = "port-wire-" + modelId + "-";
      var dome;
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
      var portDefault, paths, rects, j;

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

      var gcontent = this.$box[0].querySelectorAll(".generic-content");

      for (i = 0; i < gcontent.length; i++) {
        pendingTasks.push({
          e: gcontent[i],
          property: "left",
          value: Math.round((bbox.width / 2.0) * (state.zoom - 1)) + "px"
        });
        pendingTasks.push({
          e: gcontent[i],
          property: "top",
          value: Math.round((bbox.height / 2.0) * (state.zoom - 1)) + "px"
        });
        pendingTasks.push({
          e: gcontent[i],
          property: "width",
          value: Math.round(bbox.width) + "px"
        });
        pendingTasks.push({
          e: gcontent[i],
          property: "height",
          value: Math.round(bbox.height) + "px"
        });
        pendingTasks.push({
          e: gcontent[i],
          property: "transform",
          value: "scale(" + state.zoom + ")"
        });
      }

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
