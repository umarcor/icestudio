"use strict";

import { util } from "jointjs";

export function iceInput (
  iceShapes
) {
  return iceShapes.Model.extend({
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
