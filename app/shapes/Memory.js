"use strict";

import { util } from "jointjs";

export function iceMemory (
  iceShapes
) {
  return iceShapes.Model.extend({
    defaults: util.deepSupplement(
      {
        type: "ice.Memory",
        size: {
          width: 96,
          height: 104
        }
      },
      iceShapes.Model.prototype.defaults
    )
  });
};
