"use client";

import { useEffect, useRef, useState } from "react";

type VantaEffect = { destroy: () => void };
type VantaFactory = (options: Record<string, unknown>) => VantaEffect;

let workspaceHasOpened = false;

export function VantaBackground({ variant, className = "" }: { variant: "rings" | "halo"; className?: string }) {
  const element = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(variant === "rings" && workspaceHasOpened);

  useEffect(() => {
    let effect: VantaEffect | undefined;
    let cancelled = false;
    let revealTimer: number | undefined;

    async function mountEffect() {
      if (!element.current) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        revealTimer = window.setTimeout(() => setReady(true), 180);
        return;
      }

      const THREE = await import("three");
      window.THREE = THREE;
      const effectModule = variant === "rings"
        ? await import("vanta/dist/vanta.rings.min")
        : await import("vanta/dist/vanta.halo.min");
      const factory = effectModule.default as VantaFactory;

      if (cancelled || !element.current) return;
      effect = factory(
        variant === "rings"
          ? {
              el: element.current,
              THREE,
              mouseControls: false,
              touchControls: false,
              gyroControls: false,
              backgroundColor: 0xf7f6f2,
              color: 0x7d8d7d,
              scale: 1.25,
              scaleMobile: 1,
            }
          : {
              el: element.current,
              THREE,
              mouseControls: true,
              touchControls: true,
              gyroControls: false,
              backgroundColor: 0x151814,
              baseColor: 0x536b59,
              color2: 0xc5a266,
              amplitudeFactor: 0.9,
              ringFactor: 1,
              rotationFactor: 0.24,
              size: 1.1,
              speed: 0.18,
              xOffset: 0.08,
              yOffset: -0.04,
              scale: 1,
              scaleMobile: 1,
            },
      );
      revealTimer = window.setTimeout(() => {
        if (!cancelled) {
          if (variant === "rings") workspaceHasOpened = true;
          setReady(true);
        }
      }, 320);
    }

    mountEffect().catch(() => {
      // The CSS fallback remains visible if WebGL is unavailable.
      if (!cancelled) {
        if (variant === "rings") workspaceHasOpened = true;
        setReady(true);
      }
    });

    return () => {
      cancelled = true;
      if (revealTimer) window.clearTimeout(revealTimer);
      effect?.destroy();
    };
  }, [variant]);

  return (
    <>
      <div ref={element} className={`vanta-background vanta-${variant} ${className}`} aria-hidden="true" />
      <div className="vanta-loading" data-variant={variant} data-ready={ready || (variant === "rings" && workspaceHasOpened)} aria-hidden={ready}>
        <div className="loader-mark">A</div>
        <div className="loader-rule"><span /></div>
        <p>{variant === "halo" ? "Opening Atelier" : "Preparing your desk"}</p>
      </div>
    </>
  );
}
