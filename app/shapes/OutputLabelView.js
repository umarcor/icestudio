"use strict";

import { util } from "jointjs";

export function iceOLabelView (
  iceShapes
) {
  return iceShapes.Model.extend({
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

    //<polygon points="1 0,15 15,0 30,30 30,30 0" style="fill:lime;stroke-width:1" transform="translate(-122 -15)"/>\
    defaults: util.deepSupplement(
      {
        type: "ice.Input",
        size: {
          width: 96,
          height: 64
        }
      },
      iceShapes.Model.prototype.defaults
    )
  });
};
