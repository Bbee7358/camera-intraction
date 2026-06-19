export type HandednessLabel = "Left" | "Right" | "Unknown";
export type DisplayMode = "debug" | "art" | "hybrid";
export type FingerName = "thumb" | "index" | "middle" | "ring" | "pinky";

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
  fingers: FingerState[];
  indexFingerTip: LandmarkPoint;
  thumbTip: LandmarkPoint;
  thumbIndexDistance: number;
  pinch: boolean;
}

export interface FingerState {
  name: FingerName;
  label: string;
  tipIndex: number;
  isExtended: boolean;
  extension: number;
  tip: LandmarkPoint;
  canvasPosition: CanvasPoint;
  velocity: CanvasPoint;
  speed: number;
}

export interface TrackingFrame {
  timestamp: number;
  fps: number;
  hands: HandSnapshot[];
  mirrorEnabled: boolean;
  smoothingEnabled: boolean;
  displayMode: DisplayMode;
  cameraVisible: boolean;
  trailLength: number;
  lightIntensity: number;
}

export interface DownloadHandSnapshot {
  handedness: HandednessLabel;
  handednessScore: number;
  landmarks: LandmarkPoint[];
  rawLandmarks: LandmarkPoint[];
  fingers: FingerState[];
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
