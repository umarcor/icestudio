"use strict";

import { util } from "jointjs";

export function iceOutput (
  iceShapes
) {
  return iceShapes.Model.extend({
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
