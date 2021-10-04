// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

export enum PointFieldDataType {
  INT8 = 1,
  UINT8 = 2,
  INT16 = 3,
  UINT16 = 4,
  INT32 = 5,
  UINT32 = 6,
  FLOAT32 = 7,
  FLOAT64 = 8,
}

export type PointField = {
  name: string;
  offset: number;
  datatype: PointFieldDataType;
  count: number;
};

export type Point = {
  x: number;
  y: number;
  z: number;
  distance: number;
  intensity: number;
  ring: number;
  azimuth: number;
  deltaNs: number;
};

/**
 * PointCloud construction options
 */
export type PointCloudOptions = {
  /**
   * Timestamp of the first scan data in this PointCloud, represented as a
   * floating point number of seconds since the epoch.
   */
  stamp: number;
  /**
   * Maximum number of points this PointCloud will store.
   */
  maxPoints: number;
};

export const POINT_STEP = 28;

export class PointCloud {
  declare readonly stamp: number;
  declare readonly fields: PointField[];
  declare readonly height: number;
  declare width: number;
  declare readonly is_bigendian: boolean;
  declare readonly point_step: number;
  declare row_step: number;
  declare data: Uint8Array;
  declare readonly is_dense: boolean;

  #view: DataView;

  constructor({ stamp, maxPoints }: PointCloudOptions) {
    this.stamp = stamp;
    this.fields = [
      { name: "x", offset: 0, datatype: PointFieldDataType.FLOAT32, count: 1 },
      { name: "y", offset: 4, datatype: PointFieldDataType.FLOAT32, count: 1 },
      { name: "z", offset: 8, datatype: PointFieldDataType.FLOAT32, count: 1 },
      { name: "distance", offset: 12, datatype: PointFieldDataType.FLOAT32, count: 1 },
      { name: "intensity", offset: 16, datatype: PointFieldDataType.FLOAT32, count: 1 },
      { name: "ring", offset: 20, datatype: PointFieldDataType.UINT16, count: 1 },
      { name: "azimuth", offset: 22, datatype: PointFieldDataType.UINT16, count: 1 },
      { name: "delta_ns", offset: 24, datatype: PointFieldDataType.UINT32, count: 1 },
    ];
    this.height = 1;
    this.width = 0;
    this.is_bigendian = false;
    this.point_step = POINT_STEP;
    this.row_step = 0;
    this.data = new Uint8Array(maxPoints * POINT_STEP);
    this.is_dense = true;

    this.#view = new DataView(this.data.buffer, this.data.byteOffset, this.data.byteLength);
  }

  // Add a 3D point to the point cloud and increment the internal data pointer
  addPoint(
    x: number,
    y: number,
    z: number,
    distance: number,
    intensity: number,
    ring: number,
    azimuth: number,
    deltaNs: number, // [ns] Time when this laser was fired relative to the start of the scan
  ): void {
    const offset = this.width * POINT_STEP;
    this.#view.setFloat32(offset + 0, x, true);
    this.#view.setFloat32(offset + 4, y, true);
    this.#view.setFloat32(offset + 8, z, true);
    this.#view.setFloat32(offset + 12, distance, true);
    this.#view.setFloat32(offset + 16, intensity, true);
    this.#view.setUint16(offset + 20, ring, true);
    this.#view.setUint16(offset + 22, azimuth, true);
    this.#view.setUint32(offset + 24, deltaNs, true);
    this.width++;
    this.row_step = this.width * POINT_STEP;
  }

  // Retrieve a 3D point from this point cloud
  point(index: number): Point {
    const offset = index * POINT_STEP;
    return {
      x: this.#view.getFloat32(offset + 0, true),
      y: this.#view.getFloat32(offset + 4, true),
      z: this.#view.getFloat32(offset + 8, true),
      distance: this.#view.getFloat32(offset + 12, true),
      intensity: this.#view.getFloat32(offset + 16, true),
      ring: this.#view.getUint16(offset + 20, true),
      azimuth: this.#view.getUint16(offset + 22, true),
      deltaNs: this.#view.getUint32(offset + 24, true),
    };
  }

  // Truncate `data` down to the number of points that have been written so far
  trim(): void {
    this.data = new Uint8Array(this.data.buffer, this.data.byteOffset, this.row_step);
  }
}
