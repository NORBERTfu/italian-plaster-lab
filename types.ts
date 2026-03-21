export enum Space {
  INDOOR_WALL = 'INDOOR_WALL',
  OUTDOOR_WALL = 'OUTDOOR_WALL',
  FLOOR = 'FLOOR',
  BATHROOM = 'BATHROOM',
  FURNITURE = 'FURNITURE'
}

export enum Sheen {
  GLOSSY = 'GLOSSY',
  MATTE = 'MATTE'
}

export enum Texture {
  SMOOTH = 'SMOOTH',
  ROUGH = 'ROUGH'
}

export enum Method {
  PRO = 'PRO', // Connected material + labor
  DIY = 'DIY'  // Material only
}

export interface UserInfo {
  name: string;
  email: string;
  phone: string;
}

export interface Product {
  id: string;
  name: string;
  category: 'Ancient Plaster' | 'Lime Paint';
  description: string;
  spaces: Space[];
  sheen: Sheen;
  texture: Texture;
  method: Method;
  pricePerPing: number; // TWD
  features: string[];
  purchaseUrl?: string; // Optional URL for direct purchase
}

export interface WizardState {
  step: number;
  userInfo: UserInfo;
  selectedSpace: Space | null;
  selectedSheen: Sheen | null;
  selectedTexture: Texture | null;
  selectedMethod: Method | null;
}