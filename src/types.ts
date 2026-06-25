export type HandednessLabel = "Left" | "Right" | "Unknown";

export interface CanvasPoint {
  x: number;
  y: number;
}

export interface LandmarkPoint {
  x: number;
  y: number;
  z: number;
  visibility?: number;
  presence?: number;
}

export interface HandSnapshot {
  id: number;
  handedness: HandednessLabel;
  handednessScore: number;
  landmarks: LandmarkPoint[];
  rawLandmarks: LandmarkPoint[];
  indexFingerTip: LandmarkPoint;
  thumbTip: LandmarkPoint;
  thumbIndexDistance: number;
  pinch: boolean;
}

export interface TrackingFrame {
  timestamp: number;
  fps: number;
  hands: HandSnapshot[];
  mirrorEnabled: boolean;
  smoothingEnabled: boolean;
}

export interface ZoomHandPoint {
  id: string;
  handedness: HandednessLabel;
  indexFingerTip: CanvasPoint;
  thumbTip: CanvasPoint;
  isPinching: boolean;
  pinchDistance: number;
}

export interface ZoomState {
  isActive: boolean;
  hasBothHands: boolean;
  bothHandsPinching: boolean;
  baseDistance: number | null;
  currentDistance: number | null;
  committedScale: number;
  targetScale: number;
  currentScale: number;
  statusMessage: string;
}

export interface DownloadHandSnapshot {
  handedness: HandednessLabel;
  handednessScore: number;
  landmarks: LandmarkPoint[];
  rawLandmarks: LandmarkPoint[];
  indexFingerTip: LandmarkPoint;
  thumbTip: LandmarkPoint;
  thumbIndexDistance: number;
  pinch: boolean;
}

export interface DownloadPayload {
  timestamp: number;
  isoTime: string;
  fps: number;
  mirrorEnabled: boolean;
  smoothingEnabled: boolean;
  hands: DownloadHandSnapshot[];
}
