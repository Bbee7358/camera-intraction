export type HandednessLabel = "Left" | "Right" | "Unknown";

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
