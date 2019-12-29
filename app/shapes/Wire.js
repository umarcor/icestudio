"use strict";

import { dia, util } from "jointjs";

export function iceWire (
  WIRE_WIDTH
) {
  return dia.Link.extend({
    markup: [
      '<path class="connection" d="M 0 0 0 0"/>',
      '<path class="connection-wrap" d="M 0 0 0 0"/>',
      '<path class="marker-source" d="M 0 0 0 0"/>',
      '<path class="marker-target" d="M 0 0 0 0"/>',
      '<g class="labels"/>',
      '<g class="marker-vertices"/>',
      '<g class="marker-bifurcations"/>',
      '<g class="marker-arrowheads"/>',
      '<g class="link-tools"/>'
    ].join(""),

    labelMarkup: [
      '<g class="label hidden">',
      '<rect x="-8" y="-6" width="16" height="12" rx="2" ry="2" fill="white" stroke="#777"/>',
      '<text fill="#555"/>',
      "</g>"
    ].join(""),

    bifurcationMarkup: [
      '<g class="marker-bifurcation-group" transform="translate(<%= x %>, <%= y %>)">',
      '<circle class="marker-bifurcation" idx="<%= idx %>" r="<%= r %>" fill="#777"/>',
      "</g>"
    ].join(""),

    arrowheadMarkup: [
      '<g class="marker-arrowhead-group marker-arrowhead-group-<%= end %>">',
      '<circle class="marker-arrowhead" end="<%= end %>" r="8"/>',
      "</g>"
    ].join(""),

    toolMarkup: [
      '<g class="link-tool">',
      '<g class="tool-remove" event="remove">',
      '<circle r="8" />',
      '<path transform="scale(.6) translate(-16, -16)" d="M24.778,21.419 19.276,15.917 24.777,10.415 21.949,7.585 16.447,13.087 10.945,7.585 8.117,10.415 13.618,15.917 8.116,21.419 10.946,24.248 16.447,18.746 21.948,24.248z" />',
      "<title>Remove link</title>",
      "</g>",
      "</g>"
    ].join(""),

    vertexMarkup: [
      '<g class="marker-vertex-group" transform="translate(<%= x %>, <%= y %>)">',
      '<circle class="marker-vertex" idx="<%= idx %>" r="8" />',
      '<path class="marker-vertex-remove-area" idx="<%= idx %>" transform="scale(.8) translate(5, -33)" d="M16,5.333c-7.732,0-14,4.701-14,10.5c0,1.982,0.741,3.833,2.016,5.414L2,25.667l5.613-1.441c2.339,1.317,5.237,2.107,8.387,2.107c7.732,0,14-4.701,14-10.5C30,10.034,23.732,5.333,16,5.333z"/>',
      '<path class="marker-vertex-remove" idx="<%= idx %>" transform="scale(.6) translate(11.5, -39)" d="M24.778,21.419 19.276,15.917 24.777,10.415 21.949,7.585 16.447,13.087 10.945,7.585 8.117,10.415 13.618,15.917 8.116,21.419 10.946,24.248 16.447,18.746 21.948,24.248z">',
      "<title>Remove vertex</title>",
      "</path>",
      "</g>"
    ].join(""),

    defaults: util.deepSupplement(
      {
        type: "ice.Wire",
        labels: [{
            position: 0.5,
            attrs: {
              text: {
                text: "",
                y: "4px",
                "font-weight": "bold",
                "font-size": "11px",
                "text-anchor": "middle"
              }
            }
        }],
        attrs: {
          ".connection": {
            "stroke-width": WIRE_WIDTH,
            stroke: "#777"
          }
        },
        router: { name: "ice" },
        connector: { name: "ice" }
      },
      dia.Link.prototype.defaults
    )
  });
};
