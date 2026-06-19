export type HandednessLabel = "Left" | "Right" | "Unknown";
export type DisplayMode = "debug" | "art" | "hybrid";

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
  displayMode: DisplayMode;
  cameraVisible: boolean;
}

export interface HandInteraction {
  id: string;
  handedness: HandednessLabel;
  indexFingerTip: CanvasPoint;
  thumbTip: CanvasPoint;
  pinchPoint: CanvasPoint;
  isPinching: boolean;
  velocity: CanvasPoint;
  speed: number;
}

export interface WordSceneSettings {
  softness: number;
  elasticity: number;
  mass: number;
  splitSensitivity: number;
}

export interface WordObject {
  id: string;
  text: string;
  characters: string[];
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  rotation: number;
  angularVelocity: number;
  mass: number;
  softness: number;
  elasticity: number;
  grabbedBy: string | null;
  isSplit: boolean;
  deformationAmount: number;
  lastForce: number;
  width: number;
  height: number;
  personality: "default" | "nervous" | "bouncy" | "lonely" | "evasive";
}

export interface CharacterObject {
  id: string;
  char: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  angularVelocity: number;
  mass: number;
  grabbedBy: string | null;
  deformationAmount: number;
  lastForce: number;
  width: number;
  height: number;
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
