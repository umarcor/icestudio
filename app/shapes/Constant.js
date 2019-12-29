"use strict";

import { util } from "jointjs";

export function iceConstant (
  iceShapes
) {
  return iceShapes.Model.extend({
    defaults: util.deepSupplement(
      {
        type: "ice.Constant",
        size: {
          width: 96,
          height: 64
        }
      },
      iceShapes.Model.prototype.defaults
    )
  });
};
