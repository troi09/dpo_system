import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const REQUIREMENTS = [
  "8 characters",
  "1 uppercase",
  "1 lowercase",
  "1 number",
  "1 special character",
];

const TOOLTIP_WIDTH = 210;
const GAP = 10;

const BORDER = "#b91c1c";
const BG = "#fff1f2";
const TITLE_COLOR = "#7f1d1d";
const TEXT_COLOR = "#991b1b";

function useAutoDismiss(active, persistent = false, duration = 2000) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (persistent) return;
    if (!active) { setVisible(false); return; }
    setVisible(true);
    const t = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(t);
  }, [active, persistent, duration]);
  return persistent ? active : visible;
}

function useTooltipPos(active, anchorRef, side) {
  const [pos, setPos] = useState(null);
  const [actualSide, setActualSide] = useState(side);

  useIsoLayoutEffect(() => {
    if (!active || !anchorRef?.current) { setPos(null); return undefined; }

    const recompute = () => {
      const rect = anchorRef.current.getBoundingClientRect();
      const isMobile = window.innerWidth <= 640;

      if (isMobile) {
        setActualSide("bottom");
        setPos({ position: "fixed", top: rect.bottom + GAP, left: Math.max(8, rect.left), width: Math.min(TOOLTIP_WIDTH, window.innerWidth - 16) });
        return;
      }

      if (side === "left" && rect.left - TOOLTIP_WIDTH - GAP >= 8) {
        setActualSide("left");
        setPos({ position: "fixed", top: rect.top + rect.height / 2, left: rect.left - TOOLTIP_WIDTH - GAP, width: TOOLTIP_WIDTH, transform: "translateY(-50%)" });
        return;
      }

      setActualSide("right");
      setPos({ position: "fixed", top: rect.top + rect.height / 2, left: Math.min(rect.right + GAP, window.innerWidth - TOOLTIP_WIDTH - 8), width: TOOLTIP_WIDTH, transform: "translateY(-50%)" });
    };

    recompute();
    window.addEventListener("resize", recompute);
    window.addEventListener("scroll", recompute, true);
    return () => {
      window.removeEventListener("resize", recompute);
      window.removeEventListener("scroll", recompute, true);
    };
  }, [active, anchorRef, side]);

  return [pos, actualSide];
}

function TooltipShell({ pos, actualSide, children }) {
  const arrowBase = { position: "absolute", width: 8, height: 8, background: BG, transform: "rotate(45deg)" };
  const arrowStyle =
    actualSide === "left"  ? { ...arrowBase, right: -5, top: "50%", marginTop: -4, borderTop: `1px solid ${BORDER}`, borderRight: `1px solid ${BORDER}` }
    : actualSide === "right" ? { ...arrowBase, left: -5, top: "50%", marginTop: -4, borderBottom: `1px solid ${BORDER}`, borderLeft: `1px solid ${BORDER}` }
    : { ...arrowBase, top: -5, left: 16, borderTop: `1px solid ${BORDER}`, borderLeft: `1px solid ${BORDER}` };

  const content = (
    <div style={{ ...pos, zIndex: 9999, background: BG, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 13px", boxShadow: "0 6px 20px rgba(0,0,0,0.10)", pointerEvents: "none", userSelect: "none" }}>
      <span style={{ position: "absolute", ...arrowStyle }} />
      {children}
    </div>
  );

  return typeof document !== "undefined" ? createPortal(content, document.body) : content;
}

/** Requirements tooltip — shown when the password field is focused */
export default function PasswordChecklist({ focused = false, anchorRef, side = "right", persistent = false }) {
  const visible = useAutoDismiss(focused, persistent);
  const [pos, actualSide] = useTooltipPos(visible, anchorRef, side);
  if (!visible || !pos) return null;

  return (
    <TooltipShell pos={pos} actualSide={actualSide}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: TITLE_COLOR, marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Minimum password requirements:
      </div>
      {REQUIREMENTS.map((req) => (
        <div key={req} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: TEXT_COLOR, padding: "2px 0" }}>
          <span style={{ width: 4, height: 4, borderRadius: "50%", background: BORDER, flexShrink: 0 }} />
          {req}
        </div>
      ))}
    </TooltipShell>
  );
}

/** Error tooltip — shown when show=true with a custom message */
export function ErrorTooltip({ show = false, message, anchorRef, side = "right", persistent = false }) {
  const visible = useAutoDismiss(show, persistent);
  const [pos, actualSide] = useTooltipPos(visible, anchorRef, side);
  if (!visible || !pos) return null;

  return (
    <TooltipShell pos={pos} actualSide={actualSide}>
      <div style={{ fontSize: 12.5, color: TEXT_COLOR, fontWeight: 600 }}>{message}</div>
    </TooltipShell>
  );
}
