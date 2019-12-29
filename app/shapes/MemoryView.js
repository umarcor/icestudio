"use strict";

import * as _ from "lodash/index.js";
import { dia, util } from "jointjs";

import * as sha1 from "sha1";

export function iceMemoryView (
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
        <div class="memory-block">\
          <div class="memory-content">\
            <div class="header">\
              <label></label>\
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 9.78"><path d="M2.22 4.44h3.56V3.11q0-.73-.52-1.26-.52-.52-1.26-.52t-1.26.52q-.52.52-.52 1.26v1.33zM8 5.11v4q0 .28-.2.47-.19.2-.47.2H.67q-.28 0-.48-.2Q0 9.38 0 9.11v-4q0-.28.2-.47.19-.2.47-.2h.22V3.11q0-1.28.92-2.2Q2.72 0 4 0q1.28 0 2.2.92.91.91.91 2.2v1.32h.22q.28 0 .48.2.19.2.19.47z"/></svg>\
            </div>\
          </div>\
          <div class="memory-editor" id="' +
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
            '.setOption("firstLineNumber", 0);\
            ' +
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
            '.renderer.$gutter.style.background = "#F0F0F0";\
            ' +
            editorLabel +
            '.session.setMode("ace/mode/verilog");\
          </script>\
          <div class="resizer"/></div>\
        </div>\
        '
        )()
      );

      this.editorSelector = this.$box.find(".memory-editor");
      this.contentSelector = this.$box.find(".memory-content");
      this.headerSelector = this.$box.find(".header");
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
            // Set data.list
            self.model.attributes.data.list = self.editor.session.getValue();
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

    apply: function(opt) {
      this.applyName();
      this.applyLocal();
      this.applyValue(opt);
      this.applyFormat();
      if (this.editor) {
        this.editor.resize();
      }
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
        this.editor.session.setValue(data.list);
      } else {
        // Set data.list
        this.model.attributes.data.list = this.editor.session.getValue();
      }
      setTimeout(
        function(self) {
          self.updating = false;
        },
        10,
        this
      );
    },

    applyFormat: function() {
      this.updating = true;
      var self = this;
      var data = this.model.get("data");
      var radix = data.format;
      this.editor.session.gutterRenderer = {
        getWidth: function(session, lastLineNumber, config) {
          return lastLineNumber.toString().length * config.characterWidth;
        },
        getText: function(session, row) {
          var text = row.toString(radix).toUpperCase();
          var config = self.editor.renderer.layerConfig;
          var size = config.lastRow.toString(radix).length;
          while (text.length < size) {
            text = "0" + text;
          }
          return (radix === 16 ? "0x" : "") + text;
        }
      };
      this.editor.renderer.setShowGutter(false);
      this.editor.renderer.setShowGutter(true);
      this.updating = false;
    },

    update: function() {
      this.renderPorts();
      this.editor.setReadOnly(this.model.get("disabled"));
      dia.ElementView.prototype.update.apply(this, arguments);
    },

    updateBox: function() {
      var bbox = this.model.getBBox();
      var data = this.model.get("data");
      var state = this.model.get("state");
      // Set font size
      if (this.editor) {
        if (this.prevZoom !== state.zoom) {
          this.prevZoom = state.zoom;
          // Scale editor
          this.editorSelector.css({
            top: 24 * state.zoom,
            margin: 7 * state.zoom,
            "border-radius": 5 * state.zoom,
            "border-width": state.zoom + 0.5
          });
          // Scale padding
          this.$box
            .find(".ace_text-layer")
            .css("padding", "0px " + Math.round(4 * state.zoom) + "px");
          // Scale gutters
          var rule = getCSSRule(".ace_folding-enabled > .ace_gutter-cell");
          if (rule) {
            rule.style.paddingLeft = Math.round(19 * state.zoom) + "px";
            rule.style.paddingRight = Math.round(13 * state.zoom) + "px";
          }
          // Scale font size
          this.editor.setFontSize(Math.round(aceFontSize * state.zoom));
          // Scale cursor
          this.editor.renderer.$cursorLayer.$padding = Math.round(4 * state.zoom);
        }
        this.editor.resize();
      }

      // Set wire width
      var width = WIRE_WIDTH * state.zoom;
      this.$(".port-wire").css("stroke-width", width);

      // Render content
      var topOffset = data.name || data.local ? 0 : 24;
      this.contentSelector.css({
        left: Math.round((bbox.width / 2.0) * (state.zoom - 1)),
        top: Math.round(
          ((bbox.height + topOffset) / 2.0) * (state.zoom - 1) + topOffset
        ),
        width: Math.round(bbox.width),
        height: Math.round(bbox.height - topOffset),
        transform: "scale(" + state.zoom + ")"
      });

      if (data.name || data.local) {
        this.headerSelector.removeClass("hidden");
      } else {
        this.headerSelector.addClass("hidden");
      }

      // Render block
      this.$box.css({
        left: bbox.x * state.zoom + state.pan.x,
        top: bbox.y * state.zoom + state.pan.y,
        width: bbox.width * state.zoom,
        height: bbox.height * state.zoom
      });
    }
  });
};
