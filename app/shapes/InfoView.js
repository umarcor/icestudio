"use strict";

import * as _ from "lodash/index.js";
import { dia, util } from "jointjs";
import * as sha1 from "sha1";
import * as marked from "marked";
import * as openurl from "openurl";
import * as emoji from "node-emoji";

export function iceInfoView (
  iceShapes,
  aceFontSize
) {
  return iceShapes.ModelView.extend({
    initialize: function() {
      _.bindAll(this, "updateBox");
      dia.ElementView.prototype.initialize.apply(this, arguments);

      var id = sha1(this.model.get("id"))
        .toString()
        .substring(0, 6);
      var editorLabel = "editor" + id;
      var readonly = this.model.get("data").readonly;
      this.$box = $(
        util.template(
          '\
        <div class="info-block">\
          <div class="info-render markdown-body' +
            (readonly ? "" : " hidden") +
            '"></div>\
          <div class="info-content' +
            (readonly ? " hidden" : "") +
            '"></div>\
          <div class="info-editor' +
            (readonly ? " hidden" : "") +
            '" id="' +
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
            ".setShowPrintMargin(false);\
            " +
            editorLabel +
            ".setAutoScrollEditorIntoView(true);\
            " +
            editorLabel +
            ".renderer.setShowGutter(false);\
            " +
            editorLabel +
            ".renderer.$cursorLayer.element.style.opacity = 0;\
            " +
            editorLabel +
            '.session.setMode("ace/mode/markdown");\
          </script>\
          <div class="resizer"/></div>\
        </div>\
        '
        )()
      );

      this.renderSelector = this.$box.find(".info-render");
      this.editorSelector = this.$box.find(".info-editor");
      this.contentSelector = this.$box.find(".info-content");

      this.model.on("change", this.updateBox, this);
      this.model.on("remove", this.removeBox, this);

      // Prevent paper from handling pointerdown.
      this.editorSelector.on("mousedown click", function(event) {
        event.stopPropagation();
      });

      this.updateBox();
      this.updating = false;
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
            self.model.attributes.data.info = self.editor.session.getValue();
          }, undoGroupingInterval);
          // Reset counter
          self.counter = Date.now();
        }
      });
      this.editor.on("focus", function() {
        self.updateScrollStatus(true);
        $(document).trigger("disableSelected");
        self.editor.setHighlightActiveLine(true);
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

      // Apply data
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
        this.editor.session.setValue(data.info);
      } else {
        // Set data.info
        this.model.attributes.data.info = this.editor.session.getValue();
      }
      setTimeout(
        function(self) {
          self.updating = false;
        },
        10,
        this
      );
    },

    applyReadonly: function() {
      var readonly = this.model.get("data").readonly;
      if (readonly) {
        this.$box.addClass("info-block-readonly");
        this.renderSelector.removeClass("hidden");
        this.editorSelector.addClass("hidden");
        this.contentSelector.addClass("hidden");
        this.disableResizer();
        // Clear selection
        var selection = this.editor.session.selection;
        if (selection) {
          selection.clearSelection();
        }
        this.applyText();
      } else {
        this.$box.removeClass("info-block-readonly");
        this.renderSelector.addClass("hidden");
        this.editorSelector.removeClass("hidden");
        this.contentSelector.removeClass("hidden");
        this.enableResizer();
      }
    },

    applyText: function() {
      var data = this.model.get("data");
      var markdown = data.text || data.info || "";

      // Replace emojis
      markdown = markdown.replace(/(:.*:)/g, function(match) {
        return emoji.emojify(match, null, function(code, name) {
          var source =
            "https://github.global.ssl.fastly.net/images/icons/emoji/" +
            name +
            ".png";
          return (
            ' <object data="' +
            source +
            '" type="image/png" width="20" height="20">' +
            code +
            "</object>"
          );
        });
      });

      // Apply Marked to convert from Markdown to HTML
      this.renderSelector.html(marked(markdown));

      // Render task list
      this.renderSelector.find("li").each(function(index, element) {
        replaceCheckboxItem(element);
      });

      function replaceCheckboxItem(element) {
        listIterator(element);
        var child = $(element)
          .children()
          .first()[0];
        if (child && child.localName === "p") {
          listIterator(child);
        }
      }

      function listIterator(element) {
        var $el = $(element);
        var label = $el
          .clone()
          .children()
          .remove("il, ul")
          .end()
          .html();
        var detached = $el.children("il, ul");

        if (/^\[\s\]/.test(label)) {
          $el.html(renderItemCheckbox(label, "")).append(detached);
        } else if (/^\[x\]/.test(label)) {
          $el.html(renderItemCheckbox(label, "checked")).append(detached);
        }
      }

      function renderItemCheckbox(label, checked) {
        label = label.substring(3);
        return '<input type="checkbox" ' + checked + "/>" + label;
      }

      this.renderSelector.find("a").each(function(index, element) {
        element.onclick = function(event) {
          event.preventDefault();
          openurl.open(element.href);
        };
      });
    },

    apply: function(opt) {
      this.applyValue(opt);
      this.applyReadonly();
      this.updateBox();
      if (this.editor) {
        this.editor.resize();
      }
    },

    render: function() {
      dia.ElementView.prototype.render.apply(this, arguments);
      this.paper.$el.append(this.$box);
      this.updateBox();
      return this;
    },

    update: function() {
      this.editor.setReadOnly(this.model.get("disabled"));
      dia.ElementView.prototype.update.apply(this, arguments);
    },

    updateBox: function() {
      var bbox = this.model.getBBox();
      var state = this.model.get("state");
      var data = this.model.get("data");

      if (data.readonly) {
        // Scale render
        this.renderSelector.css({
          left: Math.round((bbox.width / 2.0) * (state.zoom - 1)),
          top: Math.round((bbox.height / 2.0) * (state.zoom - 1)),
          width: Math.round(bbox.width),
          height: Math.round(bbox.height),
          transform: "scale(" + state.zoom + ")",
          "font-size": aceFontSize + "px"
        });
      } else if (this.editor) {
        // Scale editor
        this.editorSelector.css({
          margin: 7 * state.zoom,
          "border-radius": 5 * state.zoom,
          "border-width": state.zoom + 0.5
        });
        // Scale padding
        this.$box
          .find(".ace_text-layer")
          .css("padding", "0px " + Math.round(4 * state.zoom) + "px");
        // Scale font size
        this.editor.setFontSize(Math.round(aceFontSize * state.zoom));
        // Scale cursor
        this.editor.renderer.$cursorLayer.$padding = Math.round(4 * state.zoom);
        this.editor.resize();
      }

      // Render content
      this.contentSelector.css({
        left: Math.round((bbox.width / 2.0) * (state.zoom - 1)),
        top: Math.round((bbox.height / 2.0) * (state.zoom - 1)),
        width: Math.round(bbox.width),
        height: Math.round(bbox.height),
        transform: "scale(" + state.zoom + ")"
      });

      // Render block
      this.$box.css({
        left: bbox.x * state.zoom + state.pan.x,
        top: bbox.y * state.zoom + state.pan.y,
        width: bbox.width * state.zoom,
        height: bbox.height * state.zoom
      });
    },

    removeBox: function(/*event*/) {
      // Remove delta to allow Session Value restore
      delete this.model.attributes.data.delta;
      this.$box.remove();
    }
  });
};
