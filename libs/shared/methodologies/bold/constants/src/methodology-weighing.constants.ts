import { DocumentEventScaleType } from '@carrot-fndn/shared/methodologies/bold/types';

export { DocumentEventScaleType } from '@carrot-fndn/shared/methodologies/bold/types';

export const WEIGHING_SCALE_TYPE_DESCRIPTION: Map<
  DocumentEventScaleType,
  string
> = new Map([
  [
    DocumentEventScaleType.BIN_SCALE,
    'Weighs waste or recycling bins before collection. Often integrated with smart waste management systems.',
  ],
  [
    DocumentEventScaleType.CONVEYOR_BELT_SCALE,
    'Weighing system integrated into conveyor belts to measure bulk material flow. Used in mining, agriculture, and recycling facilities.',
  ],
  [
    DocumentEventScaleType.FLOOR_SCALE,
    'Heavy-duty platform scale placed on the ground for large items, pallets, or bins. Common in warehouses, distribution centers, and material recovery facilities.',
  ],
  [
    DocumentEventScaleType.FORKLIFT_SCALE,
    'Built into forklift systems to weigh materials as they are lifted. Helps streamline weight measurement in material handling.',
  ],
  [
    DocumentEventScaleType.HANGING_OR_CRANE_SCALE,
    'Suspended scale for weighing items lifted by a crane or hoist. Used for scrap metal, industrial equipment, and large bags of materials.',
  ],
  [
    DocumentEventScaleType.ONBOARD_TRUCK_SCALE,
    'Integrated into trucks or trailers to monitor load weight dynamically. Used in bulk material transport, waste collection, and fleet management.',
  ],
  [
    DocumentEventScaleType.PALLET_SCALE,
    'Designed for weighing pallets, often integrated with forklifts or hand trucks. Used in shipping and receiving logistics.',
  ],
  [
    DocumentEventScaleType.PORTABLE_AXLE_WEIGHER,
    'Portable pads placed under truck axles to measure individual wheel or axle weights. Useful for mobile logistics operations and compliance with weight regulations.',
  ],
  [
    DocumentEventScaleType.PRECISION_OR_BENCH_SCALE,
    'Small-scale weighing used for packages, lab analysis, or small waste fractions. Common in shipping logistics and quality control.',
  ],
  [
    DocumentEventScaleType.WEIGHBRIDGE,
    'Large platform scales for weighing entire vehicles before and after loading. Used in recycling centers, landfills, and bulk material transport.',
  ],
]);
