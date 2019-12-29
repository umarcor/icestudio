"use strict";

import { util } from "jointjs";

export function iceGeneric (
  iceShapes
) {
  return iceShapes.Model.extend({
    defaults: util.deepSupplement(
      {
        type: "ice.Generic"
      },
      iceShapes.Model.prototype.defaults
    )
  });
};
