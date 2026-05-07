// ── ImageEditor ──

function ImageEditor({ src, shape, onSave, onCancel, initialScale, initialPos }) {
  const [scale, setScale] = useState(initialScale || 1);
  const [pos, setPos] = useState(initialPos || { x: 0, y: 0 });
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);

  const isCircle = shape === "circle";
  const isSquare = shape === "square";
  const cropW = (isCircle || isSquare) ? 160 : 320;
  const cropH = (isCircle || isSquare) ? 160 : 120;

  const onMouseDown = useCallback((e) => {
    e.preventDefault();
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onMouseMove = useCallback((e) => {
    if (!dragging.current) return;
    setPos(p => ({
      x: p.x + (e.clientX - lastPos.current.x),
      y: p.y + (e.clientY - lastPos.current.y),
    }));
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onMouseUp = useCallback(() => { dragging.current = false; }, []);

  const onTouchStart = useCallback((e) => {
    dragging.current = true;
    const t = e.touches[0];
    lastPos.current = { x: t.clientX, y: t.clientY };
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  // Must be non-passive to call preventDefault and prevent page scroll during drag
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e) => {
      if (!dragging.current) return;
      e.preventDefault();
      const t = e.touches[0];
      setPos(p => ({
        x: p.x + (t.clientX - lastPos.current.x),
        y: p.y + (t.clientY - lastPos.current.y),
      }));
      lastPos.current = { x: t.clientX, y: t.clientY };
    };
    el.addEventListener("touchmove", handler, { passive: false });
    return () => el.removeEventListener("touchmove", handler);
  }, []);


  const handleDone = () => {
    const img = containerRef.current?.querySelector('img');
    if (!img) { onSave({ scale, pos }); return; }
    const outputW = (isCircle || isSquare) ? 512 : 1200;
    const outputH = (isCircle || isSquare) ? 512 : 450;
    const sf = outputW / cropW;
    const baseScale = Math.max(cropW / img.naturalWidth, cropH / img.naturalHeight);
    const drawW = img.naturalWidth * baseScale * scale * sf;
    const drawH = img.naturalHeight * baseScale * scale * sf;
    const canvas = document.createElement('canvas');
    canvas.width = outputW;
    canvas.height = outputH;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, outputW / 2 + pos.x * sf - drawW / 2, outputH / 2 + pos.y * sf - drawH / 2, drawW, drawH);
    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
    onSave({ croppedDataUrl, scale, pos });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: 8 }}>
      <div style={{ fontSize: ".75rem", opacity: .4, marginBottom: 4 }}>drag to reposition · use slider to zoom</div>
      <div ref={containerRef} style={{
        width: cropW, height: cropH, borderRadius: isCircle ? "50%" : isSquare ? 14 : 12,
        overflow: "hidden", border: "2px solid rgba(255,255,255,.3)",
        cursor: "grab", position: "relative", background: "#000",
      }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onTouchEnd={() => { dragging.current = false; }}
      >
        <img src={src} alt="edit" draggable={false} crossOrigin="anonymous" style={{
          position: "absolute",
          left: "50%", top: "50%",
          transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px)) scale(${scale})`,
          minWidth: "100%", minHeight: "100%",
          objectFit: "cover", pointerEvents: "none", userSelect: "none",
        }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, width: cropW }}>
        <span style={{ fontSize: ".7rem", opacity: .4 }}>-</span>
        <input type="range" min="1" max="3" step="0.05" value={scale}
          onChange={e => setScale(parseFloat(e.target.value))}
          style={{ flex: 1, accentColor: "rgba(255,255,255,.5)" }} />
        <span style={{ fontSize: ".7rem", opacity: .4 }}>+</span>
        <span style={{ fontSize: ".7rem", opacity: .5, minWidth: 34, textAlign: "right" }}>{scale.toFixed(1)}x</span>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <div onClick={handleDone}
          style={{ padding: "8px 20px", borderRadius: 10, border: "1px solid rgba(255,255,255,.3)", fontSize: ".82rem", color: "#fff", cursor: "pointer" }}>
          done
        </div>
        <div onClick={onCancel}
          style={{ padding: "8px 20px", borderRadius: 10, border: "1px solid rgba(255,255,255,.15)", fontSize: ".82rem", color: "rgba(255,255,255,.5)", cursor: "pointer" }}>
          change image
        </div>
      </div>
    </div>
  );
}



