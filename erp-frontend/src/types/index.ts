export type ThemeId =
  | 'light'
  | 'dark'
  | 'sunrise'
  | 'forest'
  | 'ocean'
  | 'rose'
  | 'amber'
  | 'lavender'
  | 'slate'
  | 'mint';

export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role?: string;
  faceImage?: string;
  localizedDisplayNames?: Partial<Record<string, string>>;
  hasFaceLogin?: boolean;
  hasPasskey?: boolean;
}

export interface ModuleItem {
  id: number;
  name: string;
  icon: string;
  subMenus?: string[];
}

export interface WorkspaceTab {
  id: string;
  kind: 'module' | 'profile';
  moduleId: number;
  moduleName: string;
  moduleIcon: string;
  subMenus: string[];
  activeSubMenu: string;
}

export interface NotificationItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration: number;
  startTime: number;
}
