"use strict";

import * as _ from "lodash/index.js";
import { dia, util } from "jointjs";
import * as sha1 from "sha1";

export function iceCodeView (
  iceShapes,
  WIRE_WIDTH,
  getCSSRule
) {
  return iceShapes.ModelView.extend({
    initialize: function() {
      _.bindAll(this, "updateBox");
      dia.ElementView.prototype.initialize.apply(this, arguments);

      var id = sha1(this.model.get("id"))
        .toString()
        .substring(0, 6);
      var editorLabel = "editor" + id;
      this.$box = $(
        util.template(
          '\
        <div class="code-block">\
          <div class="code-content"></div>\
          <div class="code-editor" id="' +
            editorLabel +
            '"></div>\
          <script>\
            var ' +
            editorLabel +
            ' = ace.edit("' +
            editorLabel +
            '");\
            ' +
            editorLabel +
            '.setTheme("ace/theme/chrome");\
            ' +
            editorLabel +
            ".setHighlightActiveLine(false);\
            " +
            editorLabel +
            ".setHighlightGutterLine(false);\
            " +
            editorLabel +
            ".setAutoScrollEditorIntoView(true);\
            " +
            editorLabel +
            ".renderer.setShowGutter(true);\
            " +
            editorLabel +
            ".renderer.$cursorLayer.element.style.opacity = 0;\
            " +
            editorLabel +
            '.session.setMode("ace/mode/verilog");\
          </script>\
          <div class="resizer"/></div>\
        </div>\
        '
        )()
      );

      this.editorSelector = this.$box.find(".code-editor");
      this.contentSelector = this.$box.find(".code-content");
      this.nativeDom = {
        box: this.$box[0],
        // rule: getCSSRule('.ace_folding-enabled > .ace_gutter-cell'),
        editorSelector: this.$box[0].querySelectorAll(".code-editor"),
        contentSelector: this.$box[0].querySelectorAll(".code-content")
      };

      this.model.on("change", this.updateBox, this);
      this.model.on("remove", this.removeBox, this);

      this.listenTo(this.model, "process:ports", this.update);
      dia.ElementView.prototype.initialize.apply(this, arguments);

      // Prevent paper from handling pointerdown.
      this.editorSelector.on("mousedown click", function(event) {
        event.stopPropagation();
      });

      this.updateBox();
      this.updating = false;
      this.prevZoom = 0;
      this.deltas = [];
      this.counter = 0;
      this.timer = null;
      var undoGroupingInterval = 200;

      var self = this;
      this.editor = ace.edit(this.editorSelector[0]);
      this.updateScrollStatus(false);
      this.editor.$blockScrolling = Infinity;
      this.editor.commands.removeCommand("undo");
      this.editor.commands.removeCommand("redo");
      this.editor.commands.removeCommand("touppercase");
      this.editor.session.on("change", function(delta) {
        if (!self.updating) {
          // Check consecutive-change interval
          if (Date.now() - self.counter < undoGroupingInterval) {
            clearTimeout(self.timer);
          }
          // Update deltas
          self.deltas = self.deltas.concat([delta]);
          // Launch timer
          self.timer = setTimeout(function() {
            var deltas = JSON.parse(JSON.stringify(self.deltas));
            // Set deltas
            self.model.set("deltas", deltas);
            // Reset deltas
            self.deltas = [];
            // Set data.code
            self.model.attributes.data.code = self.editor.session.getValue();
          }, undoGroupingInterval);
          // Reset counter
          self.counter = Date.now();
        }
      });
      this.editor.on("focus", function() {
        self.updateScrollStatus(true);
        $(document).trigger("disableSelected");
        self.editor.setHighlightActiveLine(true);
        self.editor.setHighlightGutterLine(true);
        // Show cursor
        self.editor.renderer.$cursorLayer.element.style.opacity = 1;
      });
      this.editor.on("blur", function() {
        self.updateScrollStatus(false);
        var selection = self.editor.session.selection;
        if (selection) {
          selection.clearSelection();
        }
        self.editor.setHighlightActiveLine(false);
        self.editor.setHighlightGutterLine(false);
        // Hide cursor
        self.editor.renderer.$cursorLayer.element.style.opacity = 0;
      });
      this.editor.on("paste", function(e) {
        if (e.text.startsWith('{"hwstudio":')) {
          // Prevent paste blocks
          e.text = "";
        }
      });
      this.editor.on("mousewheel", function(event) {
        // Stop mousewheel event propagation when target is active
        if (
          document.activeElement.parentNode.id === self.editorSelector.attr("id")
        ) {
          // Enable only scroll
          event.stopPropagation();
        } else {
          // Enable only zoom
          event.preventDefault();
        }
      });
      this.setupResizer();
      this.apply({ ini: true });
    },

    applyValue: function(opt) {
      this.updating = true;
      var dontselect = false;
      var data = this.model.get("data");
      var deltas = this.model.get("deltas");
      opt = opt || {};
      switch (opt.attribute) {
        case "deltas":
          if (deltas) {
            var changes = [
              {
                group: "doc",
                deltas: deltas
              }
            ];
            if (opt.undo) {
              this.editor.session.undoChanges(changes, dontselect);
            } else {
              this.editor.session.redoChanges(changes, dontselect);
            }
          }
          break;
        case "data":
          break;
        default:
          break;
      }
      if (opt.ini) {
        this.editor.session.setValue(data.code);
      } else {
        // Set data.code
        this.model.attributes.data.code = this.editor.session.getValue();
      }
      setTimeout(
        function(self) {
          self.updating = false;
        },
        10,
        this
      );
    },

    apply: function(opt) {
      this.applyValue(opt);
      if (this.editor) {
        this.editor.resize();
      }
    },

    setAnnotation: function(codeError) {
      this.editor.gotoLine(codeError.line);
      var annotations = this.editor.session.getAnnotations();
      annotations.push({
        row: codeError.line - 1,
        column: 0,
        text: codeError.msg,
        type: codeError.type
      });
      this.editor.session.setAnnotations(annotations);

      var self = this;
      var state = this.model.get("state");
      var annotationSize = Math.round(15 * state.zoom) + "px";
      setTimeout(function() {
        self.$box
          .find(".ace_error")
          .css("background-size", annotationSize + " " + annotationSize);
        self.$box
          .find(".ace_warning")
          .css("background-size", annotationSize + " " + annotationSize);
        self.$box
          .find(".ace_info")
          .css("background-size", annotationSize + " " + annotationSize);
      }, 0);
    },

    clearAnnotations: function() {
      this.editor.session.clearAnnotations();
    },

    update: function() {
      this.renderPorts();
      this.editor.setReadOnly(this.model.get("disabled"));
      dia.ElementView.prototype.update.apply(this, arguments);
    },

    updateBox: function() {
      var pendingTasks = [];
      var i, j, port, portDefault, tokId, paths, rects, dome, anotations;
      var bbox = this.model.getBBox();
      var data = this.model.get("data");
      var state = this.model.get("state");
      var rules = this.model.get("rules");
      var leftPorts = this.model.get("leftPorts");
      var rightPorts = this.model.get("rightPorts");
      var modelId = this.model.id;
      var editorUpdated = false;
      // Set font size
      if (this.editor) {
        if (this.prevZoom !== state.zoom) {
          editorUpdated = true;
          this.prevZoom = state.zoom;
          // Scale editor
          for (i = 0; i < this.nativeDom.editorSelector.length; i++) {
            pendingTasks.push({
              e: this.nativeDom.editorSelector[i],
              property: "margin",
              value: 7 * state.zoom + "px"
            });
            pendingTasks.push({
              e: this.nativeDom.editorSelector[i],
              property: "border-radius",
              value: 5 * state.zoom + "px"
            });
            pendingTasks.push({
              e: this.nativeDom.editorSelector[i],
              property: "border-width",
              value: state.zoom + 0.5
            });
          }
          // Scale annotations
          var annotationSize = Math.round(15 * state.zoom) + "px";
          anotations = this.$box[0].querySelectorAll(".ace_error");
          for (i = 0; i < anotations.length; i++) {
            pendingTasks.push({
              e: anotations[i],
              property: "background-size",
              value: annotationSize + " " + annotationSize
            });
          }
          anotations = this.$box[0].querySelectorAll(".ace_warning");
          for (i = 0; i < anotations.length; i++) {
            pendingTasks.push({
              e: anotations[i],
              property: "background-size",
              value: annotationSize + " " + annotationSize
            });
          }
          anotations = this.$box[0].querySelectorAll(".ace_info");
          for (i = 0; i < anotations.length; i++) {
            pendingTasks.push({
              e: anotations[i],
              property: "background-size",
              value: annotationSize + " " + annotationSize
            });
          }
          // Scale padding
          anotations = this.$box[0].querySelectorAll(".ace_text-layer");
          for (i = 0; i < anotations.length; i++) {
            pendingTasks.push({
              e: anotations[i],
              property: "padding",
              value: "0px " + Math.round(4 * state.zoom) + "px"
            });
          }
          //var rule = getCSSRule('.ace_folding-enabled > .ace_gutter-cell');
        }
        //    this.editor.resize();
      }
      // Set ports width
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

      // Render content
      for (i = 0; i < this.nativeDom.contentSelector.length; i++) {
        pendingTasks.push({
          e: this.nativeDom.contentSelector[i],
          property: "left",
          value: Math.round((bbox.width / 2.0) * (state.zoom - 1)) + "px"
        });
        pendingTasks.push({
          e: this.nativeDom.contentSelector[i],
          property: "top",
          value: Math.round((bbox.height / 2.0) * (state.zoom - 1)) + "px"
        });
        pendingTasks.push({
          e: this.nativeDom.contentSelector[i],
          property: "width",
          value: Math.round(bbox.width) + "px"
        });
        pendingTasks.push({
          e: this.nativeDom.contentSelector[i],
          property: "height",
          value: Math.round(bbox.height) + "px"
        });
        pendingTasks.push({
          e: this.nativeDom.contentSelector[i],
          property: "transform",
          value: "scale(" + state.zoom + ")"
        });
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
      if (this.editor) {
        if (editorUpdated) {
          this.editor.setFontSize(Math.round(aceFontSize * state.zoom));
          this.editor.renderer.$cursorLayer.$padding = Math.round(4 * state.zoom);
        }
        this.editor.resize();
      }
      return pendingTasks;
    }
  });
};
