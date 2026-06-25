import type {
  CanvasPoint,
  HandSnapshot,
  ZoomHandPoint,
  ZoomState,
} from "./types";

export const MIN_ZOOM_SCALE = 0.5;
export const MAX_ZOOM_SCALE = 4.0;
export const ZOOM_SMOOTHING = 0.18;

export class ZoomController {
  private state: ZoomState = {
    isActive: false,
    hasBothHands: false,
    bothHandsPinching: false,
    baseDistance: null,
    currentDistance: null,
    committedScale: 1,
    targetScale: 1,
    currentScale: 1,
    statusMessage: "Show both hands",
  };

  update(handPoints: ZoomHandPoint[]): ZoomState {
    const pair = getZoomPair(handPoints);
    const hasBothHands = pair !== null;
    const bothHandsPinching = Boolean(pair?.every((hand) => hand.isPinching));
    const currentDistance = pair ? distance(pair[0].indexFingerTip, pair[1].indexFingerTip) : null;

    if (!hasBothHands) {
      this.finishZoom();
      this.state = {
        ...this.state,
        hasBothHands,
        bothHandsPinching: false,
        currentDistance: null,
        statusMessage: "Show both hands",
      };
      return this.smoothState();
    }

    if (!bothHandsPinching) {
      this.finishZoom();
      this.state = {
        ...this.state,
        hasBothHands,
        bothHandsPinching,
        currentDistance,
        statusMessage: "Pinch with both hands to zoom",
      };
      return this.smoothState();
    }

    if (!this.state.isActive || !this.state.baseDistance) {
      this.state = {
        ...this.state,
        isActive: true,
        hasBothHands,
        bothHandsPinching,
        baseDistance: Math.max(currentDistance ?? 1, 1),
        currentDistance,
        targetScale: this.state.committedScale,
        statusMessage: "ZOOM ACTIVE",
      };
      return this.smoothState();
    }

    const ratio = Math.max(currentDistance ?? this.state.baseDistance, 1) / this.state.baseDistance;
    const targetScale = clamp(
      this.state.committedScale * ratio,
      MIN_ZOOM_SCALE,
      MAX_ZOOM_SCALE,
    );

    this.state = {
      ...this.state,
      hasBothHands,
      bothHandsPinching,
      currentDistance,
      targetScale,
      statusMessage: "ZOOM ACTIVE",
    };
    return this.smoothState();
  }

  getState(): ZoomState {
    return this.state;
  }

  reset(): void {
    this.state = {
      ...this.state,
      isActive: false,
      baseDistance: null,
      currentDistance: null,
      committedScale: 1,
      targetScale: 1,
      currentScale: 1,
      statusMessage: "Show both hands",
    };
  }

  private finishZoom(): void {
    if (!this.state.isActive) {
      return;
    }

    this.state = {
      ...this.state,
      isActive: false,
      baseDistance: null,
      committedScale: clamp(this.state.targetScale, MIN_ZOOM_SCALE, MAX_ZOOM_SCALE),
    };
  }

  private smoothState(): ZoomState {
    this.state = {
      ...this.state,
      currentScale:
        this.state.currentScale +
        (this.state.targetScale - this.state.currentScale) * ZOOM_SMOOTHING,
    };
    return this.state;
  }
}

export function createZoomHandPoints(
  hands: HandSnapshot[],
  width: number,
  height: number,
  mirrorEnabled: boolean,
): ZoomHandPoint[] {
  return hands.map((hand, index) => ({
    id: `${hand.handedness}-${index}`,
    handedness: hand.handedness,
    indexFingerTip: toCanvasPoint(hand.indexFingerTip, width, height, mirrorEnabled),
    thumbTip: toCanvasPoint(hand.thumbTip, width, height, mirrorEnabled),
    isPinching: hand.pinch,
    pinchDistance: hand.thumbIndexDistance,
  }));
}

function getZoomPair(handPoints: ZoomHandPoint[]): [ZoomHandPoint, ZoomHandPoint] | null {
  if (handPoints.length < 2) {
    return null;
  }

  const left = handPoints.find((hand) => hand.handedness === "Left");
  const right = handPoints.find((hand) => hand.handedness === "Right");

  if (left && right) {
    return [left, right];
  }

  const sorted = [...handPoints].sort((a, b) => a.indexFingerTip.x - b.indexFingerTip.x);
  return [sorted[0], sorted[1]];
}

function toCanvasPoint(
  point: { x: number; y: number },
  width: number,
  height: number,
  mirrorEnabled: boolean,
): CanvasPoint {
  return {
    x: (mirrorEnabled ? 1 - point.x : point.x) * width,
    y: point.y * height,
  };
}

function distance(a: CanvasPoint, b: CanvasPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
