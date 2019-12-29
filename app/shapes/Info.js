"use strict";

import { util } from "jointjs";

export function iceInfo (
  iceShapes
) {
  return iceShapes.Model.extend({
    defaults: util.deepSupplement(
      {
        type: "ice.Info",
        size: {
          width: 400,
          height: 256
        }
      },
      iceShapes.Model.prototype.defaults
    )
  });
};
