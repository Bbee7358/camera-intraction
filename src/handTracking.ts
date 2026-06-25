import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import type { HandednessLabel, HandSnapshot, LandmarkPoint } from "./types";

const WASM_ASSET_PATH =
  "/mediapipe/wasm";
const MODEL_ASSET_PATH = "/mediapipe/models/hand_landmarker.task";

export const MAX_HANDS = 2;
export const PINCH_DISTANCE_THRESHOLD = 0.07;
const SMOOTHING_ALPHA = 0.35;

type MediaPipeCategory = {
  categoryName?: string;
  displayName?: string;
  score?: number;
};

export class HandTrackingService {
  private landmarker: HandLandmarker | null = null;
  private smoother = new LandmarkSmoother();

  async initialize(): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(WASM_ASSET_PATH);

    try {
      this.landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_ASSET_PATH,
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: MAX_HANDS,
      });
    } catch {
      this.landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_ASSET_PATH,
          delegate: "CPU",
        },
        runningMode: "VIDEO",
        numHands: MAX_HANDS,
      });
    }
  }

  detect(
    video: HTMLVideoElement,
    timestampMs: number,
    smoothingEnabled: boolean,
  ): HandSnapshot[] {
    if (!this.landmarker) {
      return [];
    }

    const result = this.landmarker.detectForVideo(video, timestampMs);
    const hands = result.landmarks.map((landmarks, index) => {
      const category = result.handednesses[index]?.[0] as
        | MediaPipeCategory
        | undefined;
      return createHandSnapshot(
        index,
        normalizeHandedness(category),
        category?.score ?? 0,
        landmarks.map(toLandmarkPoint),
      );
    });

    if (!smoothingEnabled) {
      this.smoother.reset();
      return hands;
    }

    return this.smoother.smooth(hands);
  }
}

function createHandSnapshot(
  id: number,
  handedness: HandednessLabel,
  handednessScore: number,
  landmarks: LandmarkPoint[],
  rawLandmarks: LandmarkPoint[] = landmarks,
): HandSnapshot {
  const thumbTip = landmarks[4] ?? emptyLandmark();
  const indexFingerTip = landmarks[8] ?? emptyLandmark();
  const thumbIndexDistance = distance3D(thumbTip, indexFingerTip);

  return {
    id,
    handedness,
    handednessScore,
    landmarks,
    rawLandmarks,
    thumbTip,
    indexFingerTip,
    thumbIndexDistance,
    pinch: thumbIndexDistance <= PINCH_DISTANCE_THRESHOLD,
  };
}

function normalizeHandedness(category?: MediaPipeCategory): HandednessLabel {
  const label = category?.categoryName ?? category?.displayName ?? "Unknown";

  if (label === "Left" || label === "Right") {
    return label;
  }

  return "Unknown";
}

function toLandmarkPoint(landmark: LandmarkPoint): LandmarkPoint {
  return {
    x: landmark.x,
    y: landmark.y,
    z: landmark.z,
    visibility: landmark.visibility,
    presence: landmark.presence,
  };
}

function distance3D(a: LandmarkPoint, b: LandmarkPoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function emptyLandmark(): LandmarkPoint {
  return { x: 0, y: 0, z: 0 };
}

class LandmarkSmoother {
  private previousHands: HandSnapshot[] = [];

  smooth(hands: HandSnapshot[]): HandSnapshot[] {
    if (hands.length === 0) {
      this.reset();
      return [];
    }

    const usedPrevious = new Set<number>();
    const smoothedHands = hands.map((hand, handIndex) => {
      const previousIndex = this.findPreviousHand(hand, handIndex, usedPrevious);
      const previous = previousIndex === -1 ? undefined : this.previousHands[previousIndex];

      if (previousIndex !== -1) {
        usedPrevious.add(previousIndex);
      }

      if (!previous || previous.landmarks.length !== hand.landmarks.length) {
        return hand;
      }

      const smoothedLandmarks = hand.landmarks.map((landmark, index) =>
        lerpLandmark(previous.landmarks[index], landmark, SMOOTHING_ALPHA),
      );

      return createHandSnapshot(
        hand.id,
        hand.handedness,
        hand.handednessScore,
        smoothedLandmarks,
        hand.rawLandmarks,
      );
    });

    this.previousHands = smoothedHands;
    return smoothedHands;
  }

  reset(): void {
    this.previousHands = [];
  }

  private findPreviousHand(
    hand: HandSnapshot,
    fallbackIndex: number,
    usedPrevious: Set<number>,
  ): number {
    let bestIndex = -1;
    let bestDistance = Number.POSITIVE_INFINITY;

    this.previousHands.forEach((previous, index) => {
      if (usedPrevious.has(index) || previous.handedness !== hand.handedness) {
        return;
      }

      const distance = distance3D(previous.landmarks[0], hand.landmarks[0]);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });

    if (bestIndex !== -1 && bestDistance < 0.2) {
      return bestIndex;
    }

    if (!usedPrevious.has(fallbackIndex) && this.previousHands[fallbackIndex]) {
      return fallbackIndex;
    }

    return -1;
  }
}

function lerpLandmark(
  previous: LandmarkPoint,
  current: LandmarkPoint,
  alpha: number,
): LandmarkPoint {
  return {
    x: previous.x + (current.x - previous.x) * alpha,
    y: previous.y + (current.y - previous.y) * alpha,
    z: previous.z + (current.z - previous.z) * alpha,
    visibility: current.visibility,
    presence: current.presence,
  };
}
