// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { CalibrationData, loadCalibrationData } from "./CalibrationData";
import { LaserCorrection, Model } from "./VelodyneTypes";

const ROTATION_RESOLUTION = 0.01; // [deg]
const ROTATION_MAX_UNITS = 36000; // [deg/100]
const VLP16_DSR_TOFFSET = 2.304; // [µs]
const VLP16_FIRING_TOFFSET = 55.296; // [µs]
const HDL32E_DSR_TOFFSET = 1.152; // [µs]
const HDL32E_FIRING_TOFFSET = 46.08; // [µs]
const VLS128_DSR_TOFFSET = 2.665; // [µs]
const VLS128_FIRING_TOFFSET = 53.5; // [µs]

// Takes a calibration data file as input and computes cached lookup tables for
// use in online point cloud conversion
export class Calibration {
  declare readonly model: Model;
  declare readonly laserCorrections: LaserCorrection[];
  declare readonly distanceResolution: number; // [m]
  declare readonly timingOffsets: number[][];
  declare readonly sinRotTable: number[];
  declare readonly cosRotTable: number[];
  declare readonly vls128LaserAzimuthCache: number[];

  constructor(model: Model, calibrationData: CalibrationData = loadCalibrationData(model)) {
    this.model = model;
    this.laserCorrections = calibrationData.lasers.map((v) => {
      return {
        laserId: v.laser_id,
        rotCorrection: v.rot_correction,
        vertCorrection: v.vert_correction,
        distCorrection: v.dist_correction,
        twoPtCorrectionAvailable: v.two_pt_correction_available ?? false,
        distCorrectionX: v.dist_correction_x,
        distCorrectionY: v.dist_correction_y,
        vertOffsetCorrection: v.vert_offset_correction,
        horizOffsetCorrection: v.horiz_offset_correction,
        maxIntensity: v.max_intensity ?? 255,
        minIntensity: v.min_intensity ?? 0,
        focalDistance: v.focal_distance,
        focalSlope: v.focal_slope,
        cosRotCorrection: Math.cos(v.rot_correction),
        sinRotCorrection: Math.sin(v.rot_correction),
        cosVertCorrection: Math.cos(v.vert_correction),
        sinVertCorrection: Math.sin(v.vert_correction),
      };
    });
    this.distanceResolution = calibrationData.distance_resolution;
    this.timingOffsets = Calibration.BuildTimingsFor(model);

    // Set up cached values for sin and cos of all the possible headings
    this.cosRotTable = Array<number>(ROTATION_MAX_UNITS);
    this.sinRotTable = Array<number>(ROTATION_MAX_UNITS);
    for (let i = 0; i < ROTATION_MAX_UNITS; i++) {
      const rotation = deg2rad(ROTATION_RESOLUTION * i);
      this.cosRotTable[i] = Math.cos(rotation);
      this.sinRotTable[i] = Math.sin(rotation);
    }

    this.vls128LaserAzimuthCache = Array<number>(16).fill(0);
    const VLS128_CHANNEL_TDURATION = 2.665; // [µs] Corresponds to one laser firing
    const VLS128_SEQ_TDURATION = 53.3; // [µs] A set of laser firings including recharging
    for (let i = 0; i < 16; i++) {
      this.vls128LaserAzimuthCache[i] =
        (VLS128_CHANNEL_TDURATION / VLS128_SEQ_TDURATION) * (i + i / 8);
    }
  }

  // Build a timing table with cells for each channel (laser)
  static BuildTimingsFor(model: Model): number[][] {
    const block1 = (x: number, _y: number) => x;
    const block16 = (x: number, y: number) => x * 2 + y / 16;
    const point1 = (_x: number, y: number) => y;
    const point2 = (_x: number, y: number) => y / 2;
    const point16 = (_x: number, y: number) => y % 16;
    switch (model) {
      case Model.VLP16:
      case Model.VLP16HiRes: {
        const full = VLP16_FIRING_TOFFSET;
        const single = VLP16_DSR_TOFFSET;
        return Calibration.BuildTimings(12, 32, full, single, 0, block16, point16);
      }
      case Model.VLP32C: {
        const full = VLP16_FIRING_TOFFSET;
        const single = VLP16_DSR_TOFFSET;
        return Calibration.BuildTimings(12, 32, full, single, 0, block1, point2);
      }
      case Model.HDL32E: {
        const full = HDL32E_FIRING_TOFFSET;
        const single = HDL32E_DSR_TOFFSET;
        return Calibration.BuildTimings(12, 32, full, single, 0, block1, point2);
      }
      case Model.VLS128: {
        const full = VLS128_FIRING_TOFFSET;
        const single = VLS128_DSR_TOFFSET;
        return Calibration.BuildTimings(3, 17, full, single, -8.7, block1, point1);
      }
      default:
        return [];
    }
  }

  static BuildTimings(
    rows: number,
    cols: number,
    fullFiringUs: number, // [µs]
    singleFiringUs: number, // [µs]
    offsetUs: number, // [µs]
    block: IndexCalc,
    point: IndexCalc,
  ): number[][] {
    const fullFiring = fullFiringUs * 1e-6;
    const singleFiring = singleFiringUs * 1e-6;
    const offset = offsetUs * 1e-6;
    return Array(rows)
      .fill(0)
      .map((_row, x) =>
        Array(cols)
          .fill(0)
          .map((_col, y) => fullFiring * block(x, y) + singleFiring * point(x, y) + offset),
      );
  }
}

type IndexCalc = (x: number, y: number) => number;

function deg2rad(degrees: number): number {
  return degrees * (Math.PI / 180);
}
