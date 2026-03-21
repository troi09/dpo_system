import { useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { Paintbrush2 } from "lucide-react";

/**
 * Canvas-based signature pad.
 * Expose ref methods: getDataUrl(), isEmpty(), clear()
 */
const SignaturePad = forwardRef(function SignaturePad(
  { height = 150, disabled = false, style = {} },
  ref
) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);

  useImperativeHandle(ref, () => ({
    getDataUrl: () => canvasRef.current?.toDataURL("image/png") ?? null,
    isEmpty: () => {
      const canvas = canvasRef.current;
      if (!canvas) return true;
      const ctx = canvas.getContext("2d");
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      return !Array.from(data).some((v) => v !== 0);
    },
    clear: () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const onStart = (e) => {
    if (disabled) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const { x, y } = getPos(e, canvas);
    drawing.current = true;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const onMove = (e) => {
    if (!drawing.current || disabled) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const { x, y } = getPos(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const onEnd = (e) => {
    e.preventDefault();
    drawing.current = false;
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div style={{ position: "relative", display: "inline-block", width: "100%", cursor: disabled ? "default" : "crosshair", userSelect: "none" }}>
      <canvas
        ref={canvasRef}
        width={600}
        height={height}
        draggable={false}
        className={disabled ? "sig-pad-canvas--disabled" : "sig-pad-canvas"}
        style={{
          border: "1px solid #ccc",
          borderRadius: 4,
          touchAction: "none",
          userSelect: "none",
          width: "100%",
          display: "block",
          background: "#fafafa",
          ...style,
        }}
        onMouseDown={onStart}
        onMouseMove={onMove}
        onMouseUp={onEnd}
        onMouseLeave={onEnd}
        onTouchStart={onStart}
        onTouchMove={onMove}
        onTouchEnd={onEnd}
      />
      {!disabled && (
        <button
          type="button"
          onClick={handleClear}
          title="Clear signature"
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            width: 28,
            height: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#fafafa",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            color: "#64748b",
            padding: 0,
            transition: "background 0.15s ease, color 0.15s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#fee2e2"; e.currentTarget.style.color = "#dc2626"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.85)"; e.currentTarget.style.color = "#64748b"; }}
        >
          <Paintbrush2 size={14} strokeWidth={1.8} style={{ transform: "scaleY(-1)" }} />
        </button>
      )}
    </div>
  );
});

export default SignaturePad;
