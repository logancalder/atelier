declare module "vanta/dist/vanta.rings.min" {
  const factory: (options: Record<string, unknown>) => { destroy: () => void };
  export default factory;
}

declare module "vanta/dist/vanta.halo.min" {
  const factory: (options: Record<string, unknown>) => { destroy: () => void };
  export default factory;
}

interface Window {
  THREE?: typeof import("three");
}
