export interface Point {
  x: number;
  y: number;
}

export interface Dimensions {
  width: number;
  height: number;
}

export interface CutoutData {
  points: Point[]; // Normalized 0-1 points
  textureUrl: string; // The original image source (or cropped version)
  aspectRatio: number;
}

export enum AppMode {
  UPLOAD = 'UPLOAD',
  DRAW = 'DRAW',
  VIEW_3D = 'VIEW_3D'
}

export interface ProjectData {
  version: number;
  cutoutData: CutoutData;
  settings: {
    thickness: number;
    extrusionColor: string;
    bevelEnabled: boolean;
    bevelSize: number;
    isIso: boolean;
    fov: number;
    lightIntensity: number;
    lightColor: string;
  };
}
