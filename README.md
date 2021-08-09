# @foxglove/velodyne-cloud

> _TypeScript library for converting Velodyne LIDAR packet data to point clouds_

## Introduction

[Velodyne](https://velodynelidar.com/) LIDAR hardware broadcasts a steady stream of UDP packets representing laser scan data. These raw packets need to be converted to point clouds using calibration data specific to each hardware model. This TypeScript library provides best-effort detection of Velodyne hardware model from analyzing packets and includes calibration data to automatically convert raw data into a 3D point cloud representation.

This library is used in [Foxglove Studio](https://foxglove.dev/) to convert [velodyne_msgs/VelodyneScan](http://docs.ros.org/en/indigo/api/velodyne_msgs/html/msg/VelodyneScan.html) ROS messages to [sensor_msgs/PointCloud2](http://docs.ros.org/en/melodic/api/sensor_msgs/html/msg/PointCloud2.html) messages.

## Usage

```Typescript
import {
  Calibration,
  PointCloud,
  PointFieldDataType,
  RawPacket,
  Transformer
} from "@foxglove/velodyne-cloud";

type VelodynePacket = {
  stamp: { sec: number, nsec: number };
  data: Uint8Array;
};

// NOTE: Use the packetRate() function to determine how many packets are needed
// to create a full 360 degree scan

function createPointCloud(packets: VelodynePacket[]) {
  if (packets.length === 0) return undefined;

  const firstPacket = new RawPacket(packets[0].data);
  const model = firstPacket.inferModel();
  if (model == undefined) return undefined;

  const stamp = firstPacket.timestamp();
  const maxPoints = RawPacket.MAX_POINTS_PER_PACKET * packets.length;
  const cloud = new PointCloud({ stamp, maxPoints });
  const transformer = new Transformer(new Calibration(model));

  for (const packet of packets) {
    transformer.unpack(new RawPacket(packet.data), stamp, undefined, cloud);
  }

  cloud.trim();

  console.log(
    `Created ${cloud.width}x${cloud.height} dense little endian point cloud data. ` +
    `${cloud.data.byteLength} bytes total with ${cloud.point_step} byte point step, ` +
    `${cloud.row_step} byte row step, and the following fields:`
  );
  for (const field of cloud.fields) {
    console.log(
      `  [${field.name}] offset=${field.offset}, ` +
      `datatype=${PointFieldDataType[field.datatype]}, ` +
      `count=${field.count}`
    );
  }
}
```

## License

@foxglove/velodyne-cloud is licensed under [MIT License](https://opensource.org/licenses/MIT).

## Releasing

1. Run `yarn version --[major|minor|patch]` to bump version
2. Run `git push && git push --tags` to push new tag
3. GitHub Actions will take care of the rest

## Stay in touch

Join our [Slack channel](https://foxglove.dev/join-slack) to ask questions, share feedback, and stay up to date on what our team is working on.
