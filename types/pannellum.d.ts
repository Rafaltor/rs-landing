interface ProductHotspotArgs {
  title: string;
  price: string;
  image: string;
  href: string;
}

interface NavHotspotArgs {
  direction: "left" | "right" | "down";
  label: string;
  href?: string;
  sceneId?: string;
}

interface PannellumHotSpot {
  id?: string;
  pitch: number;
  yaw: number;
  type?: string;
  text?: string;
  URL?: string;
  sceneId?: string;
  scale?: boolean;
  cssClass?: string;
  createTooltipFunc?: (hotSpotDiv: HTMLElement, args: unknown) => void;
  createTooltipArgs?: unknown;
  clickHandlerFunc?: (event: MouseEvent, args?: unknown) => void;
  clickHandlerArgs?: unknown;
  /** Présent sur les hotspots runtime après création DOM (Pannellum). */
  div?: HTMLElement;
}

interface PannellumSceneConfig {
  type: string;
  panorama: string;
  autoLoad?: boolean;
  autoRotate?: number | boolean;
  compass?: boolean;
  showZoomCtrl?: boolean;
  showFullscreenCtrl?: boolean;
  mouseZoom?: boolean;
  hfov?: number;
  pitch?: number;
  yaw?: number;
  hotSpotDebug?: boolean;
  hotSpots?: PannellumHotSpot[];
}

interface PannellumTourConfig {
  default: {
    firstScene: string;
    sceneFadeDuration?: number;
  };
  scenes: Record<string, PannellumSceneConfig>;
}

interface PannellumViewer {
  destroy: () => void;
  setHfov?: (hfov: number, animated?: boolean) => void;
  getPitch?: () => number;
  getYaw?: () => number;
  getHfov?: () => number;
  getCanvas?: () => HTMLCanvasElement;
  getContainer?: () => HTMLElement;
  isLoaded?: () => boolean;
  isOrientationSupported?: () => boolean;
  isOrientationActive?: () => boolean;
  startOrientation?: () => void;
  stopOrientation?: () => void;
  addHotSpot?: (hotSpot: PannellumHotSpot, sceneId?: string) => void;
  removeHotSpot?: (hotSpotId: string, sceneId?: string) => void;
  /** Config de la scène active (contient `hotSpots`, pas `scenes`). */
  getConfig?: () => PannellumSceneConfig;
  setUpdate?: (enabled: boolean) => void;
  on?: (event: string, handler: (...args: unknown[]) => void) => PannellumViewer;
  off?: (event: string, handler: (...args: unknown[]) => void) => PannellumViewer;
}

interface PannellumStatic {
  viewer: (
    container: string | HTMLElement,
    config: PannellumTourConfig,
  ) => PannellumViewer;
}

interface Window {
  pannellum?: PannellumStatic;
}
