// ── ImageEditor (cropperjs v1 wrapper) ──

function ImageEditor({ src, shape, onSave, onCancel, initialScale, initialPos }) {
  const imgRef = useRef(null);
  const cropperRef = useRef(null);
  const readyRatioRef = useRef(1);
  const [zoom, setZoom] = useState(1);

  const isCircle = shape === "circle";
  const isSquare = shape === "square";
  const outputW = (isCircle || isSquare) ? 512 : 1200;
  const outputH = (isCircle || isSquare) ? 512 : 450;
  const boxW = (isCircle || isSquare) ? 280 : 320;
  const boxH = (isCircle || isSquare) ? 280 : 120;

  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;
    const cropper = new window.Cropper(el, {
      aspectRatio: outputW / outputH,
      viewMode: 1,
      dragMode: "move",
      cropBoxResizable: false,
      cropBoxMovable: false,
      background: false,
      autoCropArea: 1,
      ready() {
        const d = cropper.getCanvasData();
        readyRatioRef.current = d.width / d.naturalWidth;
        if (initialScale && initialScale > 1) {
          cropper.zoomTo(readyRatioRef.current * initialScale);
          setZoom(initialScale);
        }
      },
    });
    cropperRef.current = cropper;
    const onZoom = (e) => setZoom(+(e.detail.ratio / readyRatioRef.current).toFixed(2));
    el.addEventListener("zoom", onZoom);
    return () => { el.removeEventListener("zoom", onZoom); cropper.destroy(); };
  }, [src]);

  const handleDone = () => {
    const canvas = cropperRef.current.getCroppedCanvas({ width: outputW, height: outputH });
    onSave({ croppedDataUrl: canvas.toDataURL("image/jpeg", 0.92), scale: zoom, pos: { x: 0, y: 0 } });
  };

  const handleZoom = (e) => {
    const v = parseFloat(e.target.value);
    setZoom(v);
    cropperRef.current?.zoomTo(readyRatioRef.current * v);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: 8 }}>
      <div style={{ fontSize: ".75rem", opacity: .4, marginBottom: 4 }}>drag to reposition · use slider to zoom</div>
      <div className={isCircle ? "crop-circle" : undefined}
        style={{ width: boxW, height: boxH, background: "#000" }}>
        <img ref={imgRef} src={src} alt="edit" crossOrigin="anonymous"
          style={{ display: "block", maxWidth: "100%" }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, width: boxW }}>
        <span style={{ fontSize: ".7rem", opacity: .4 }}>-</span>
        <input type="range" min="1" max="3" step="0.05" value={zoom} onChange={handleZoom}
          style={{ flex: 1, accentColor: "rgba(255,255,255,.5)" }} />
        <span style={{ fontSize: ".7rem", opacity: .4 }}>+</span>
        <span style={{ fontSize: ".7rem", opacity: .5, minWidth: 34, textAlign: "right" }}>{zoom.toFixed(1)}x</span>
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
