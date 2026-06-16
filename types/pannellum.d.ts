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
  isOrientationSupported?: () => boolean;
  isOrientationActive?: () => boolean;
  startOrientation?: () => void;
  stopOrientation?: () => void;
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
