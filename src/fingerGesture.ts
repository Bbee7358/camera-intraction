import type {
  CanvasPoint,
  FingerName,
  FingerState,
  HandSnapshot,
  LandmarkPoint,
} from "./types";

interface FingerDefinition {
  name: FingerName;
  label: string;
  tipIndex: number;
  jointIndexes: [number, number, number, number];
}

const FINGER_DEFINITIONS: FingerDefinition[] = [
  {
    name: "thumb",
    label: "Thumb",
    tipIndex: 4,
    jointIndexes: [4, 3, 2, 0],
  },
  {
    name: "index",
    label: "Index",
    tipIndex: 8,
    jointIndexes: [8, 7, 6, 5],
  },
  {
    name: "middle",
    label: "Middle",
    tipIndex: 12,
    jointIndexes: [12, 11, 10, 9],
  },
  {
    name: "ring",
    label: "Ring",
    tipIndex: 16,
    jointIndexes: [16, 15, 14, 13],
  },
  {
    name: "pinky",
    label: "Pinky",
    tipIndex: 20,
    jointIndexes: [20, 19, 18, 17],
  },
];

const STRAIGHT_ANGLE_DEGREES = 150;
const THUMB_STRAIGHT_ANGLE_DEGREES = 138;
const EXTENSION_DISTANCE_RATIO = 1.08;
const THUMB_DISTANCE_RATIO = 1.04;

export class FingerGestureAnalyzer {
  private previousTips = new Map<string, CanvasPoint>();
  private previousTimestamp = 0;

  analyzeHands(
    hands: HandSnapshot[],
    timestampMs: number,
    width: number,
    height: number,
    mirrorEnabled: boolean,
  ): HandSnapshot[] {
    const deltaSeconds = Math.max(
      1 / 120,
      (timestampMs - this.previousTimestamp) / 1000,
    );
    const activeKeys = new Set<string>();

    const analyzedHands = hands.map((hand, handIndex) => {
      const fingers = FINGER_DEFINITIONS.map((definition) => {
        const finger = analyzeFinger(hand, definition, width, height, mirrorEnabled);
        const key = `${hand.handedness}-${handIndex}-${definition.name}`;
        const previous = this.previousTips.get(key) ?? finger.canvasPosition;

        activeKeys.add(key);
        this.previousTips.set(key, finger.canvasPosition);

        return {
          ...finger,
          velocity: {
            x: (finger.canvasPosition.x - previous.x) / deltaSeconds,
            y: (finger.canvasPosition.y - previous.y) / deltaSeconds,
          },
          speed:
            distance2D(finger.canvasPosition, previous) /
            deltaSeconds,
        };
      });

      return {
        ...hand,
        fingers,
      };
    });

    for (const key of this.previousTips.keys()) {
      if (!activeKeys.has(key)) {
        this.previousTips.delete(key);
      }
    }

    this.previousTimestamp = timestampMs;
    return analyzedHands;
  }

  reset(): void {
    this.previousTips.clear();
    this.previousTimestamp = 0;
  }
}

export function getExtendedFingerLabels(hand: HandSnapshot): string[] {
  return hand.fingers
    .filter((finger) => finger.isExtended)
    .map((finger) => finger.label);
}

function analyzeFinger(
  hand: HandSnapshot,
  definition: FingerDefinition,
  width: number,
  height: number,
  mirrorEnabled: boolean,
): FingerState {
  const landmarks = hand.landmarks;
  const [tipIndex, distalIndex, proximalIndex, rootIndex] = definition.jointIndexes;
  const tip = landmarks[tipIndex] ?? emptyLandmark();
  const distal = landmarks[distalIndex] ?? tip;
  const proximal = landmarks[proximalIndex] ?? distal;
  const root = landmarks[rootIndex] ?? proximal;
  const wrist = landmarks[0] ?? root;
  const extension =
    definition.name === "thumb"
      ? getThumbExtension(tip, distal, proximal, wrist)
      : getFingerExtension(tip, distal, proximal, root, wrist);

  return {
    name: definition.name,
    label: definition.label,
    tipIndex: definition.tipIndex,
    isExtended: extension >= 0.5,
    extension,
    tip,
    canvasPosition: toCanvasPoint(tip, width, height, mirrorEnabled),
    velocity: { x: 0, y: 0 },
    speed: 0,
  };
}

function getFingerExtension(
  tip: LandmarkPoint,
  dip: LandmarkPoint,
  pip: LandmarkPoint,
  mcp: LandmarkPoint,
  wrist: LandmarkPoint,
): number {
  const tipDistance = distance3D(tip, wrist);
  const pipDistance = distance3D(pip, wrist);
  const distanceScore = smoothstep(
    EXTENSION_DISTANCE_RATIO,
    EXTENSION_DISTANCE_RATIO + 0.22,
    tipDistance / Math.max(pipDistance, 0.0001),
  );
  const pipAngle = angleDegrees(mcp, pip, tip);
  const dipAngle = angleDegrees(pip, dip, tip);
  const angleScore = smoothstep(128, STRAIGHT_ANGLE_DEGREES, (pipAngle + dipAngle) / 2);

  return clamp(distanceScore * 0.45 + angleScore * 0.55, 0, 1);
}

function getThumbExtension(
  tip: LandmarkPoint,
  ip: LandmarkPoint,
  mcp: LandmarkPoint,
  wrist: LandmarkPoint,
): number {
  const tipDistance = distance3D(tip, wrist);
  const ipDistance = distance3D(ip, wrist);
  const distanceScore = smoothstep(
    THUMB_DISTANCE_RATIO,
    THUMB_DISTANCE_RATIO + 0.28,
    tipDistance / Math.max(ipDistance, 0.0001),
  );
  const thumbAngle = angleDegrees(wrist, mcp, tip);
  const jointAngle = angleDegrees(mcp, ip, tip);
  const angleScore = smoothstep(
    118,
    THUMB_STRAIGHT_ANGLE_DEGREES,
    (thumbAngle + jointAngle) / 2,
  );

  return clamp(distanceScore * 0.5 + angleScore * 0.5, 0, 1);
}

export function toCanvasPoint(
  landmark: LandmarkPoint,
  width: number,
  height: number,
  mirrorEnabled: boolean,
): CanvasPoint {
  return {
    x: (mirrorEnabled ? 1 - landmark.x : landmark.x) * width,
    y: landmark.y * height,
  };
}

function angleDegrees(a: LandmarkPoint, b: LandmarkPoint, c: LandmarkPoint): number {
  const ab = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  const cb = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };
  const dot = ab.x * cb.x + ab.y * cb.y + ab.z * cb.z;
  const abLength = Math.hypot(ab.x, ab.y, ab.z);
  const cbLength = Math.hypot(cb.x, cb.y, cb.z);
  const cosine = dot / Math.max(abLength * cbLength, 0.0001);

  return (Math.acos(clamp(cosine, -1, 1)) * 180) / Math.PI;
}

function distance2D(a: CanvasPoint, b: CanvasPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function distance3D(a: LandmarkPoint, b: LandmarkPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function emptyLandmark(): LandmarkPoint {
  return { x: 0, y: 0, z: 0 };
}
