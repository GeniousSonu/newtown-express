/**
 * deskCoordinates.ts
 *
 * Precise SVG coordinates for all 121 physical desks from the Newtown Express floor map:
 * - 14 desks in upper workstations: 206 through 219
 * - 105 desks in lower workstations: 101 through 205
 * - 2 executive cabins: MD ("MD") and Senior Manager ("MGR")
 */

export interface DeskCoordinate {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  textX: number;
  textY: number;
  zone: 'top' | 'bottom' | 'cabin';
}

export const DESK_COORDINATES: DeskCoordinate[] = [
  // ─── Top Workstations: Pods (206 to 219) ─────────────────
  // Pod 1
  { id: '207', x: 70, y: 190, w: 70, h: 48, textX: 105.0, textY: 219.0, zone: 'top' },
  { id: '208', x: 148, y: 190, w: 70, h: 48, textX: 183.0, textY: 219.0, zone: 'top' },
  { id: '206', x: 70, y: 250, w: 70, h: 48, textX: 105.0, textY: 279.0, zone: 'top' },
  { id: '209', x: 148, y: 250, w: 70, h: 48, textX: 183.0, textY: 279.0, zone: 'top' },
  // Pod 2
  { id: '211', x: 256, y: 190, w: 70, h: 48, textX: 291.0, textY: 219.0, zone: 'top' },
  { id: '212', x: 334, y: 190, w: 70, h: 48, textX: 369.0, textY: 219.0, zone: 'top' },
  { id: '210', x: 256, y: 250, w: 70, h: 48, textX: 291.0, textY: 279.0, zone: 'top' },
  { id: '213', x: 334, y: 250, w: 70, h: 48, textX: 369.0, textY: 279.0, zone: 'top' },
  // Pod 3
  { id: '215', x: 442, y: 190, w: 70, h: 48, textX: 477.0, textY: 219.0, zone: 'top' },
  { id: '214', x: 442, y: 250, w: 70, h: 48, textX: 477.0, textY: 279.0, zone: 'top' },
  // Pod 4
  { id: '216', x: 548, y: 190, w: 70, h: 48, textX: 583.0, textY: 219.0, zone: 'top' },
  { id: '219', x: 626, y: 190, w: 70, h: 48, textX: 661.0, textY: 219.0, zone: 'top' },
  { id: '217', x: 548, y: 250, w: 70, h: 48, textX: 583.0, textY: 279.0, zone: 'top' },
  { id: '218', x: 626, y: 250, w: 70, h: 48, textX: 661.0, textY: 279.0, zone: 'top' },

  // ─── Executive Cabins (MD and Senior Manager) ────────────
  { id: 'MD', x: 800, y: 540, w: 90, h: 56, textX: 845.0, textY: 574.0, zone: 'cabin' },
  { id: 'MGR', x: 1080, y: 540, w: 90, h: 56, textX: 1125.0, textY: 574.0, zone: 'cabin' },

  // ─── Bottom Workstations: Pod 1 (Triple Column: 101 to 121)
  { id: '101', x: 280, y: 900, w: 44, h: 32, textX: 302.0, textY: 921.0, zone: 'bottom' },
  { id: '114', x: 328, y: 900, w: 44, h: 32, textX: 350.0, textY: 921.0, zone: 'bottom' },
  { id: '115', x: 376, y: 900, w: 44, h: 32, textX: 398.0, textY: 921.0, zone: 'bottom' },
  { id: '102', x: 280, y: 944, w: 44, h: 32, textX: 302.0, textY: 965.0, zone: 'bottom' },
  { id: '113', x: 328, y: 944, w: 44, h: 32, textX: 350.0, textY: 965.0, zone: 'bottom' },
  { id: '116', x: 376, y: 944, w: 44, h: 32, textX: 398.0, textY: 965.0, zone: 'bottom' },
  { id: '103', x: 280, y: 988, w: 44, h: 32, textX: 302.0, textY: 1009.0, zone: 'bottom' },
  { id: '112', x: 328, y: 988, w: 44, h: 32, textX: 350.0, textY: 1009.0, zone: 'bottom' },
  { id: '117', x: 376, y: 988, w: 44, h: 32, textX: 398.0, textY: 1009.0, zone: 'bottom' },
  { id: '104', x: 280, y: 1032, w: 44, h: 32, textX: 302.0, textY: 1053.0, zone: 'bottom' },
  { id: '111', x: 328, y: 1032, w: 44, h: 32, textX: 350.0, textY: 1053.0, zone: 'bottom' },
  { id: '118', x: 376, y: 1032, w: 44, h: 32, textX: 398.0, textY: 1053.0, zone: 'bottom' },
  { id: '105', x: 280, y: 1076, w: 44, h: 32, textX: 302.0, textY: 1097.0, zone: 'bottom' },
  { id: '110', x: 328, y: 1076, w: 44, h: 32, textX: 350.0, textY: 1097.0, zone: 'bottom' },
  { id: '119', x: 376, y: 1076, w: 44, h: 32, textX: 398.0, textY: 1097.0, zone: 'bottom' },
  { id: '106', x: 280, y: 1120, w: 44, h: 32, textX: 302.0, textY: 1141.0, zone: 'bottom' },
  { id: '109', x: 328, y: 1120, w: 44, h: 32, textX: 350.0, textY: 1141.0, zone: 'bottom' },
  { id: '120', x: 376, y: 1120, w: 44, h: 32, textX: 398.0, textY: 1141.0, zone: 'bottom' },
  { id: '107', x: 280, y: 1164, w: 44, h: 32, textX: 302.0, textY: 1185.0, zone: 'bottom' },
  { id: '108', x: 328, y: 1164, w: 44, h: 32, textX: 350.0, textY: 1185.0, zone: 'bottom' },
  { id: '121', x: 376, y: 1164, w: 44, h: 32, textX: 398.0, textY: 1185.0, zone: 'bottom' },

  // ─── Bottom Workstations: Pod 2 (122 to 135) ─────────────
  { id: '128', x: 452, y: 900, w: 44, h: 32, textX: 474.0, textY: 921.0, zone: 'bottom' },
  { id: '129', x: 500, y: 900, w: 44, h: 32, textX: 522.0, textY: 921.0, zone: 'bottom' },
  { id: '127', x: 452, y: 944, w: 44, h: 32, textX: 474.0, textY: 965.0, zone: 'bottom' },
  { id: '130', x: 500, y: 944, w: 44, h: 32, textX: 522.0, textY: 965.0, zone: 'bottom' },
  { id: '126', x: 452, y: 988, w: 44, h: 32, textX: 474.0, textY: 1009.0, zone: 'bottom' },
  { id: '131', x: 500, y: 988, w: 44, h: 32, textX: 522.0, textY: 1009.0, zone: 'bottom' },
  { id: '125', x: 452, y: 1032, w: 44, h: 32, textX: 474.0, textY: 1053.0, zone: 'bottom' },
  { id: '132', x: 500, y: 1032, w: 44, h: 32, textX: 522.0, textY: 1053.0, zone: 'bottom' },
  { id: '124', x: 452, y: 1076, w: 44, h: 32, textX: 474.0, textY: 1097.0, zone: 'bottom' },
  { id: '133', x: 500, y: 1076, w: 44, h: 32, textX: 522.0, textY: 1097.0, zone: 'bottom' },
  { id: '123', x: 452, y: 1120, w: 44, h: 32, textX: 474.0, textY: 1141.0, zone: 'bottom' },
  { id: '134', x: 500, y: 1120, w: 44, h: 32, textX: 522.0, textY: 1141.0, zone: 'bottom' },
  { id: '122', x: 452, y: 1164, w: 44, h: 32, textX: 474.0, textY: 1185.0, zone: 'bottom' },
  { id: '135', x: 500, y: 1164, w: 44, h: 32, textX: 522.0, textY: 1185.0, zone: 'bottom' },

  // ─── Bottom Workstations: Pod 3 (136 to 149) ─────────────
  { id: '142', x: 568, y: 900, w: 44, h: 32, textX: 590.0, textY: 921.0, zone: 'bottom' },
  { id: '143', x: 616, y: 900, w: 44, h: 32, textX: 638.0, textY: 921.0, zone: 'bottom' },
  { id: '141', x: 568, y: 944, w: 44, h: 32, textX: 590.0, textY: 965.0, zone: 'bottom' },
  { id: '144', x: 616, y: 944, w: 44, h: 32, textX: 638.0, textY: 965.0, zone: 'bottom' },
  { id: '140', x: 568, y: 988, w: 44, h: 32, textX: 590.0, textY: 1009.0, zone: 'bottom' },
  { id: '145', x: 616, y: 988, w: 44, h: 32, textX: 638.0, textY: 1009.0, zone: 'bottom' },
  { id: '139', x: 568, y: 1032, w: 44, h: 32, textX: 590.0, textY: 1053.0, zone: 'bottom' },
  { id: '146', x: 616, y: 1032, w: 44, h: 32, textX: 638.0, textY: 1053.0, zone: 'bottom' },
  { id: '138', x: 568, y: 1076, w: 44, h: 32, textX: 590.0, textY: 1097.0, zone: 'bottom' },
  { id: '147', x: 616, y: 1076, w: 44, h: 32, textX: 638.0, textY: 1097.0, zone: 'bottom' },
  { id: '137', x: 568, y: 1120, w: 44, h: 32, textX: 590.0, textY: 1141.0, zone: 'bottom' },
  { id: '148', x: 616, y: 1120, w: 44, h: 32, textX: 638.0, textY: 1141.0, zone: 'bottom' },
  { id: '136', x: 568, y: 1164, w: 44, h: 32, textX: 590.0, textY: 1185.0, zone: 'bottom' },
  { id: '149', x: 616, y: 1164, w: 44, h: 32, textX: 638.0, textY: 1185.0, zone: 'bottom' },

  // ─── Bottom Workstations: Pod 4 (150 to 163) ─────────────
  { id: '156', x: 684, y: 900, w: 44, h: 32, textX: 706.0, textY: 921.0, zone: 'bottom' },
  { id: '157', x: 732, y: 900, w: 44, h: 32, textX: 754.0, textY: 921.0, zone: 'bottom' },
  { id: '155', x: 684, y: 944, w: 44, h: 32, textX: 706.0, textY: 965.0, zone: 'bottom' },
  { id: '158', x: 732, y: 944, w: 44, h: 32, textX: 754.0, textY: 965.0, zone: 'bottom' },
  { id: '154', x: 684, y: 988, w: 44, h: 32, textX: 706.0, textY: 1009.0, zone: 'bottom' },
  { id: '159', x: 732, y: 988, w: 44, h: 32, textX: 754.0, textY: 1009.0, zone: 'bottom' },
  { id: '153', x: 684, y: 1032, w: 44, h: 32, textX: 706.0, textY: 1053.0, zone: 'bottom' },
  { id: '160', x: 732, y: 1032, w: 44, h: 32, textX: 754.0, textY: 1053.0, zone: 'bottom' },
  { id: '152', x: 684, y: 1076, w: 44, h: 32, textX: 706.0, textY: 1097.0, zone: 'bottom' },
  { id: '161', x: 732, y: 1076, w: 44, h: 32, textX: 754.0, textY: 1097.0, zone: 'bottom' },
  { id: '151', x: 684, y: 1120, w: 44, h: 32, textX: 706.0, textY: 1141.0, zone: 'bottom' },
  { id: '162', x: 732, y: 1120, w: 44, h: 32, textX: 754.0, textY: 1141.0, zone: 'bottom' },
  { id: '150', x: 684, y: 1164, w: 44, h: 32, textX: 706.0, textY: 1185.0, zone: 'bottom' },
  { id: '163', x: 732, y: 1164, w: 44, h: 32, textX: 754.0, textY: 1185.0, zone: 'bottom' },

  // ─── Bottom Workstations: Pod 5 (164 to 177) ─────────────
  { id: '170', x: 800, y: 900, w: 44, h: 32, textX: 822.0, textY: 921.0, zone: 'bottom' },
  { id: '171', x: 848, y: 900, w: 44, h: 32, textX: 870.0, textY: 921.0, zone: 'bottom' },
  { id: '169', x: 800, y: 944, w: 44, h: 32, textX: 822.0, textY: 965.0, zone: 'bottom' },
  { id: '172', x: 848, y: 944, w: 44, h: 32, textX: 870.0, textY: 965.0, zone: 'bottom' },
  { id: '168', x: 800, y: 988, w: 44, h: 32, textX: 822.0, textY: 1009.0, zone: 'bottom' },
  { id: '173', x: 848, y: 988, w: 44, h: 32, textX: 870.0, textY: 1009.0, zone: 'bottom' },
  { id: '167', x: 800, y: 1032, w: 44, h: 32, textX: 822.0, textY: 1053.0, zone: 'bottom' },
  { id: '174', x: 848, y: 1032, w: 44, h: 32, textX: 870.0, textY: 1053.0, zone: 'bottom' },
  { id: '166', x: 800, y: 1076, w: 44, h: 32, textX: 822.0, textY: 1097.0, zone: 'bottom' },
  { id: '175', x: 848, y: 1076, w: 44, h: 32, textX: 870.0, textY: 1097.0, zone: 'bottom' },
  { id: '165', x: 800, y: 1120, w: 44, h: 32, textX: 822.0, textY: 1141.0, zone: 'bottom' },
  { id: '176', x: 848, y: 1120, w: 44, h: 32, textX: 870.0, textY: 1141.0, zone: 'bottom' },
  { id: '164', x: 800, y: 1164, w: 44, h: 32, textX: 822.0, textY: 1185.0, zone: 'bottom' },
  { id: '177', x: 848, y: 1164, w: 44, h: 32, textX: 870.0, textY: 1185.0, zone: 'bottom' },

  // ─── Bottom Workstations: Pod 6 (178 to 191) ─────────────
  { id: '184', x: 916, y: 900, w: 44, h: 32, textX: 938.0, textY: 921.0, zone: 'bottom' },
  { id: '185', x: 964, y: 900, w: 44, h: 32, textX: 986.0, textY: 921.0, zone: 'bottom' },
  { id: '183', x: 916, y: 944, w: 44, h: 32, textX: 938.0, textY: 965.0, zone: 'bottom' },
  { id: '186', x: 964, y: 944, w: 44, h: 32, textX: 986.0, textY: 965.0, zone: 'bottom' },
  { id: '182', x: 916, y: 988, w: 44, h: 32, textX: 938.0, textY: 1009.0, zone: 'bottom' },
  { id: '187', x: 964, y: 988, w: 44, h: 32, textX: 986.0, textY: 1009.0, zone: 'bottom' },
  { id: '181', x: 916, y: 1032, w: 44, h: 32, textX: 938.0, textY: 1053.0, zone: 'bottom' },
  { id: '188', x: 964, y: 1032, w: 44, h: 32, textX: 986.0, textY: 1053.0, zone: 'bottom' },
  { id: '180', x: 916, y: 1076, w: 44, h: 32, textX: 938.0, textY: 1097.0, zone: 'bottom' },
  { id: '189', x: 964, y: 1076, w: 44, h: 32, textX: 986.0, textY: 1097.0, zone: 'bottom' },
  { id: '179', x: 916, y: 1120, w: 44, h: 32, textX: 938.0, textY: 1141.0, zone: 'bottom' },
  { id: '190', x: 964, y: 1120, w: 44, h: 32, textX: 986.0, textY: 1141.0, zone: 'bottom' },
  { id: '178', x: 916, y: 1164, w: 44, h: 32, textX: 938.0, textY: 1185.0, zone: 'bottom' },
  { id: '191', x: 964, y: 1164, w: 44, h: 32, textX: 986.0, textY: 1185.0, zone: 'bottom' },

  // ─── Bottom Workstations: Pod 7 (192 to 205) ─────────────
  { id: '198', x: 1032, y: 900, w: 44, h: 32, textX: 1054.0, textY: 921.0, zone: 'bottom' },
  { id: '199', x: 1080, y: 900, w: 44, h: 32, textX: 1102.0, textY: 921.0, zone: 'bottom' },
  { id: '197', x: 1032, y: 944, w: 44, h: 32, textX: 1054.0, textY: 965.0, zone: 'bottom' },
  { id: '200', x: 1080, y: 944, w: 44, h: 32, textX: 1102.0, textY: 965.0, zone: 'bottom' },
  { id: '196', x: 1032, y: 988, w: 44, h: 32, textX: 1054.0, textY: 1009.0, zone: 'bottom' },
  { id: '201', x: 1080, y: 988, w: 44, h: 32, textX: 1102.0, textY: 1009.0, zone: 'bottom' },
  { id: '195', x: 1032, y: 1032, w: 44, h: 32, textX: 1054.0, textY: 1053.0, zone: 'bottom' },
  { id: '202', x: 1080, y: 1032, w: 44, h: 32, textX: 1102.0, textY: 1053.0, zone: 'bottom' },
  { id: '194', x: 1032, y: 1076, w: 44, h: 32, textX: 1054.0, textY: 1097.0, zone: 'bottom' },
  { id: '203', x: 1080, y: 1076, w: 44, h: 32, textX: 1102.0, textY: 1097.0, zone: 'bottom' },
  { id: '193', x: 1032, y: 1120, w: 44, h: 32, textX: 1054.0, textY: 1141.0, zone: 'bottom' },
  { id: '204', x: 1080, y: 1120, w: 44, h: 32, textX: 1102.0, textY: 1141.0, zone: 'bottom' },
  { id: '192', x: 1032, y: 1164, w: 44, h: 32, textX: 1054.0, textY: 1185.0, zone: 'bottom' },
  { id: '205', x: 1080, y: 1164, w: 44, h: 32, textX: 1102.0, textY: 1185.0, zone: 'bottom' },
];
