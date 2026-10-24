type Point = readonly [number, number, number];

export function random(index: number, salt: number) {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

// Original low-resolution continent outlines, only for a decorative globe.
const continents = [
  [
    [-168, 70],
    [-125, 73],
    [-95, 80],
    [-54, 53],
    [-60, 44],
    [-82, 24],
    [-90, 16],
    [-105, 23],
    [-126, 50],
    [-160, 58],
  ],
  [
    [-81, 12],
    [-64, 10],
    [-48, -3],
    [-35, -8],
    [-46, -25],
    [-56, -40],
    [-69, -56],
    [-75, -23],
  ],
  [
    [-18, 35],
    [10, 38],
    [35, 30],
    [51, 12],
    [42, -12],
    [31, -35],
    [17, -34],
    [7, -5],
    [-16, 15],
  ],
  [
    [-10, 36],
    [-10, 58],
    [30, 72],
    [73, 75],
    [120, 72],
    [178, 62],
    [150, 45],
    [131, 31],
    [108, 5],
    [78, 8],
    [68, 27],
    [40, 34],
    [30, 44],
  ],
  [
    [112, -12],
    [138, -10],
    [154, -26],
    [146, -39],
    [115, -34],
  ],
  [
    [-53, 59],
    [-22, 69],
    [-32, 83],
    [-57, 80],
  ],
  [
    [46, -13],
    [50, -16],
    [48, -26],
    [43, -24],
  ],
];

function isLand(longitude: number, latitude: number) {
  return continents.some((polygon) => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i],
        [xj, yj] = polygon[j];
      if (
        yi > latitude !== yj > latitude &&
        longitude < ((xj - xi) * (latitude - yi)) / (yj - yi) + xi
      )
        inside = !inside;
    }
    return inside;
  });
}

export function createParticleTargets(count: number) {
  const brain = new Float32Array(count * 3);
  const bulb = new Float32Array(count * 3),
    globe = new Float32Array(count * 3);
  const mark = new Float32Array(count * 3),
    seed = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    const a = random(i, 1),
      b = random(i, 2),
      c = random(i, 3);
    const theta = a * Math.PI * 2,
      y = b * 2 - 1;
    const radius = Math.sqrt(1 - y * y);
    const x = radius * Math.cos(theta),
      z = radius * Math.sin(theta);
    const side = i % 2 ? -1 : 1;
    // Sulci are continuous warped bands, not independent positional jitter.
    const groove = Math.sin(
      theta * 11 + y * 15 + 1.8 * Math.sin(y * 7 + theta * 2),
    );
    const fold =
      1 -
      0.085 * Math.exp(-groove * groove * 24) +
      0.025 * Math.sin(theta * 23 + y * 29);
    const lateral = side * (0.035 + (1 + x) * 0.29 * fold);
    const sagittal = z * 0.82 * fold;
    // The base atlas is a profile. rotY=-pi/2 exposes both hemispheres.
    let neural: Point = [sagittal, y * 0.6 * fold + 0.16 + 0.035 * z, -lateral];
    // Cerebellum and descending brainstem give the surface a recognizable base.
    if (c < 0.13)
      neural = [
        -0.34 + x * 0.3,
        -0.34 + y * 0.21,
        -side * (0.08 + Math.abs(z) * 0.29),
      ];
    if (c < 0.035)
      neural = [
        -0.12 + b * 0.22 + Math.cos(theta) * 0.065,
        -0.38 - b * 0.47,
        Math.sin(theta) * 0.085,
      ];
    brain.set(neural, i * 3);

    let bulbY: number, bulbRadius: number;
    if (b < 0.76) {
      const t = b / 0.76;
      bulbY = -0.74 + t * 1.04;
      bulbRadius = Math.sqrt(Math.max(0, 1 - (t * 1.8 - 1) ** 2)) * 0.5;
      bulbRadius *= 1 - 0.58 * Math.max(0, (t - 0.65) / 0.35);
    } else if (b < 0.87) {
      bulbY = 0.3 + ((b - 0.76) / 0.11) * 0.14;
      bulbRadius = 0.17;
    } else {
      bulbY = 0.44 + ((b - 0.87) / 0.13) * 0.26;
      bulbRadius =
        (0.17 + 0.024 * Math.cos(bulbY * 150)) *
        (1 - 0.45 * Math.max(0, (bulbY - 0.64) / 0.06));
    }
    const bulbX = Math.cos(theta) * bulbRadius;
    bulb.set([bulbX, -bulbY, Math.sin(theta) * bulbRadius], i * 3);

    const latitude = (Math.asin(y) * 180) / Math.PI;
    const longitude = a * 360 - 180;
    globe.set(
      [
        Math.sin(theta) * radius * 0.72,
        y * 0.72,
        -Math.cos(theta) * radius * 0.72,
      ],
      i * 3,
    );

    // Three extruded triangles echo the existing Antonio Neto header symbol.
    const piece = i % 3;
    const u = Math.sqrt(a),
      v = b;
    const triangleX = -0.3 * (1 - u) + 0.3 * u * (1 - v) - 0.3 * u * v;
    const triangleY = -0.3 * (1 - u) + 0.3 * u * v;
    const offsets = [
      [0.0, -0.29],
      [-0.31, 0.0],
      [0.29, 0.29],
    ];
    mark.set(
      [
        triangleX + offsets[piece][0],
        triangleY + offsets[piece][1],
        (c - 0.5) * 0.24,
      ],
      i * 3,
    );
    seed.set(
      [
        random(i, 4),
        random(i, 5),
        random(i, 6),
        isLand(longitude, latitude) ? 1 : 0,
      ],
      i * 4,
    );
  }
  return { brain, bulb, globe, mark, seed };
}
