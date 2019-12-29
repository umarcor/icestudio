"use strict";

import { util } from "jointjs";

export function iceCode (
  iceShapes
) {
  return iceShapes.Model.extend({
    defaults: util.deepSupplement(
      {
        type: "ice.Code",
        size: {
          width: 384,
          height: 256
        }
      },
      iceShapes.Model.prototype.defaults
    )
  });
};
