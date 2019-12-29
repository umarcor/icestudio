"use strict";

import { util } from "jointjs";

export function iceILabelView (
  iceShapes
) {
  return iceShapes.Model.extend({
    markup:
      '<g class="rotatable">\
               <g class="scalable">\
                 <rect class="body" />\
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

    //<polygon  class="input-virtual-terminator" points="0 -5,0 34,20 16" style="fill:white;stroke:<%= port.fill %>;stroke-width:3" transform="translate(100 -15)"/>\
    defaults: util.deepSupplement(
      {
        type: "ice.Output",
        size: {
          width: 96,
          height: 64
        }
      },
      iceShapes.Model.prototype.defaults
    )
  });
};
