// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { add, complete, cycle, suite } from "benny";

import { Calibration } from "../Calibration";
import { PointCloud } from "../PointCloud";
import { MAX_POINTS_PER_PACKET, RawPacket } from "../RawPacket";
import { Transformer } from "../Transformer";
import { Model } from "../VelodyneTypes";
import { HDL32E_PACKET1 } from "../fixtures/packets";

void suite(
  "Transformer",
  add("unpack HDL32E", () => {
    const calibration = new Calibration(Model.HDL32E);
    const transform = new Transformer(calibration);
    const raw = new RawPacket(HDL32E_PACKET1);
    const maxPoints = MAX_POINTS_PER_PACKET * 100;
    return async () => {
      const cloud = new PointCloud({ stamp: 0, maxPoints });
      for (let j = 0; j < 100; j++) {
        transform.unpack(raw, 0, 0, cloud);
      }
    };
  }),
  cycle(),
  complete(),
);
