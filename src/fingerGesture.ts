import type {
  CanvasPoint,
  HandInteraction,
  HandSnapshot,
  LandmarkPoint,
} from "./types";

export class HandInteractionTracker {
  private previousPinchPoints = new Map<string, CanvasPoint>();
  private previousTimestamp = 0;

  getInteractions(
    hands: HandSnapshot[],
    timestampMs: number,
    width: number,
    height: number,
    mirrorEnabled: boolean,
  ): HandInteraction[] {
    const deltaSeconds = Math.max(
      1 / 120,
      (timestampMs - this.previousTimestamp) / 1000,
    );
    const activeIds = new Set<string>();

    const interactions = hands.map((hand, index) => {
      const id = `${hand.handedness}-${index}`;
      const indexFingerTip = toCanvasPoint(
        hand.indexFingerTip,
        width,
        height,
        mirrorEnabled,
      );
      const thumbTip = toCanvasPoint(hand.thumbTip, width, height, mirrorEnabled);
      const pinchPoint = midpoint(indexFingerTip, thumbTip);
      const previous = this.previousPinchPoints.get(id) ?? pinchPoint;
      const velocity = {
        x: (pinchPoint.x - previous.x) / deltaSeconds,
        y: (pinchPoint.y - previous.y) / deltaSeconds,
      };

      activeIds.add(id);
      this.previousPinchPoints.set(id, pinchPoint);

      return {
        id,
        handedness: hand.handedness,
        indexFingerTip,
        thumbTip,
        pinchPoint,
        isPinching: hand.pinch,
        velocity,
        speed: Math.hypot(velocity.x, velocity.y),
      };
    });

    for (const id of this.previousPinchPoints.keys()) {
      if (!activeIds.has(id)) {
        this.previousPinchPoints.delete(id);
      }
    }

    this.previousTimestamp = timestampMs;
    return interactions;
  }

  reset(): void {
    this.previousPinchPoints.clear();
    this.previousTimestamp = 0;
  }
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

function midpoint(a: CanvasPoint, b: CanvasPoint): CanvasPoint {
  return {
    x: (a.x + b.x) * 0.5,
    y: (a.y + b.y) * 0.5,
  };
}
