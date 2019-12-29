"use strict";

import * as _ from "lodash/index.js";
import { util } from "jointjs";

export function iceModel (
  basicShapes,
  WIRE_WIDTH
) {
  return basicShapes.Generic.extend({
    markup:
      '<g class="rotatable">\
               <g class="scalable">\
                 <rect class="body"/>\
               </g>\
               <g class="leftPorts disable-port"/>\
               <g class="rightPorts"/>\
               <g class="topPorts disable-port"/>\
               <g class="bottomPorts"/>\
             </g>',
    portMarkup:
      '<g class="port port<%= index %>">\
                   <g class="port-default" id="port-default-<%= id %>-<%= port.id %>">\
                      <path/><rect/>\
                   </g>\
                   <path class="port-wire" id="port-wire-<%= id %>-<%= port.id %>"/>\
                   <text class="port-label"/>\
                   <circle class="port-body"/>\
                 </g>',

    defaults: util.deepSupplement(
      {
        type: "ice.Model",
        size: {
          width: 1,
          height: 1
        },
        leftPorts: [],
        rightPorts: [],
        topPorts: [],
        bottomPorts: [],
        attrs: {
          ".": {
            magnet: false
          },
          ".body": {
            width: 1,
            height: 1,
            stroke: "none"
          },
          ".port-body": {
            r: 16,
            opacity: 0
          },
          ".leftPorts .port-body": {
            pos: "left",
            type: "input",
            magnet: false
          },
          ".rightPorts .port-body": {
            pos: "right",
            type: "output",
            magnet: true
          },
          ".topPorts .port-body": {
            pos: "top",
            type: "input",
            magnet: false
          },
          ".bottomPorts .port-body": {
            pos: "bottom",
            type: "output",
            magnet: true
          },
          ".port-label": {
            fill: "#777"
          },
          ".port-wire": {
            stroke: "#777",
            "stroke-width": WIRE_WIDTH
          },
          ".port-default": {
            display: "none"
          },
          ".port-default rect": {
            x: "-32",
            y: "-8",
            width: "16",
            height: "16",
            rx: "3",
            ry: "3",
            stroke: "#777",
            "stroke-width": 1,
            fill: "#FBFBC9"
          },
          ".port-default path": {
            d: "M 0 0 L -20 0",
            stroke: "#777",
            "stroke-width": WIRE_WIDTH
          }
        }
      },
      basicShapes.Generic.prototype.defaults
    ),

    initialize: function() {
      this.updatePortsAttrs();
      this.processPorts();
      this.trigger("process:ports");
      this.on(
        "change:size change:leftPorts change:rightPorts change:topPorts change:bottomPorts",
        this.updatePortsAttrs,
        this
      );
      this.constructor.__super__.constructor.__super__.initialize.apply(
        this,
        arguments
      );
    },

    updatePortsAttrs: function(/*eventName*/) {
      if (this._portSelectors) {
        var newAttrs = _.omit(this.get("attrs"), this._portSelectors);
        this.set("attrs", newAttrs, { silent: true });
      }

      var attrs = {};
      this._portSelectors = [];

      _.each(
        ["left", "right"],
        function(type) {
          var port = type + "Ports";
          _.each(
            this.get(port),
            function(portName, index, ports) {
              var portAttributes = this.getPortAttrs(
                portName,
                index,
                ports.length,
                "." + port,
                type,
                this.get("size").height
              );
              this._portSelectors = this._portSelectors.concat(
                _.keys(portAttributes)
              );
              _.extend(attrs, portAttributes);
            },
            this
          );
        },
        this
      );

      _.each(
        ["top", "bottom"],
        function(type) {
          var port = type + "Ports";
          _.each(
            this.get(port),
            function(portName, index, ports) {
              var portAttributes = this.getPortAttrs(
                portName,
                index,
                ports.length,
                "." + port,
                type,
                this.get("size").width
              );
              this._portSelectors = this._portSelectors.concat(
                _.keys(portAttributes)
              );
              _.extend(attrs, portAttributes);
            },
            this
          );
        },
        this
      );

      this.attr(attrs, { silent: true });
    },

    getPortAttrs: function(port, index, total, selector, type, length) {
      var attrs = {};
      var gridsize = 8;
      var gridunits = length / gridsize;

      var portClass = "port" + index;
      var portSelector = selector + ">." + portClass;
      var portLabelSelector = portSelector + ">.port-label";
      var portWireSelector = portSelector + ">.port-wire";
      var portBodySelector = portSelector + ">.port-body";
      var portDefaultSelector = portSelector + ">.port-default";

      var portColor =
        typeof this.attributes.data.blockColor !== "undefined"
          ? this.attributes.data.blockColor
          : "lime";

      attrs[portSelector] = {
        ref: ".body"
      };

      attrs[portLabelSelector] = {
        text: port.label
      };

      attrs[portWireSelector] = {};

      attrs[portBodySelector] = {
        port: {
          id: port.id,
          type: type,
          fill: portColor
        }
      };

      attrs[portDefaultSelector] = {
        display: port.default && port.default.apply ? "inline" : "none"
      };

      if (type === "leftPorts" || type === "topPorts") {
        attrs[portSelector]["pointer-events"] = "none";
        attrs[portWireSelector]["pointer-events"] = "none";
      }

      var offset = port.size && port.size > 1 ? 4 : 1;
      var position = Math.round(((index + 0.5) / total) * gridunits) / gridunits;

      switch (type) {
        case "left":
          attrs[portSelector]["ref-x"] = -8;
          attrs[portSelector]["ref-y"] = position;
          attrs[portLabelSelector]["dx"] = 4;
          attrs[portLabelSelector]["y"] = -5 - offset;
          attrs[portLabelSelector]["text-anchor"] = "end";
          attrs[portWireSelector]["y"] = position;
          attrs[portWireSelector]["d"] = "M 0 0 L 8 0";
          break;
        case "right":
          attrs[portSelector]["ref-dx"] = 8;
          attrs[portSelector]["ref-y"] = position;
          attrs[portLabelSelector]["dx"] = -4;
          attrs[portLabelSelector]["y"] = -5 - offset;
          attrs[portLabelSelector]["text-anchor"] = "start";
          attrs[portWireSelector]["y"] = position;
          attrs[portWireSelector]["d"] = "M 0 0 L -8 0";
          break;
        case "top":
          attrs[portSelector]["ref-y"] = -8;
          attrs[portSelector]["ref-x"] = position;
          attrs[portLabelSelector]["dx"] = -4;
          attrs[portLabelSelector]["y"] = -5 - offset;
          attrs[portLabelSelector]["text-anchor"] = "start";
          attrs[portLabelSelector]["transform"] = "rotate(-90)";
          attrs[portWireSelector]["x"] = position;
          attrs[portWireSelector]["d"] = "M 0 0 L 0 8";
          break;
        case "bottom":
          attrs[portSelector]["ref-dy"] = 8;
          attrs[portSelector]["ref-x"] = position;
          attrs[portLabelSelector]["dx"] = 4;
          attrs[portLabelSelector]["y"] = -5 - offset;
          attrs[portLabelSelector]["text-anchor"] = "end";
          attrs[portLabelSelector]["transform"] = "rotate(-90)";
          attrs[portWireSelector]["x"] = position;
          attrs[portWireSelector]["d"] = "M 0 0 L 0 -8";
          break;
      }

      return attrs;
    }
  });
};
