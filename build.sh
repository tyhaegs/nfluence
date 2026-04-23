#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
OUT="$DIR/campaigns/index.html"

FILES=(
  "$DIR/nfluenceData.jsx"
  "$DIR/ImageEditor.jsx"
  "$DIR/CampaignCore.jsx"
  "$DIR/AppViews.jsx"
  "$DIR/NfluenceApp.jsx"
)

for f in "${FILES[@]}"; do
  if [[ ! -f "$f" ]]; then
    echo "ERROR: missing $f" >&2
    exit 1
  fi
done

strip_imports_exports() {
  sed '/^[[:space:]]*import /d; /^[[:space:]]*export /d'
}

COMBINED=""
for f in "${FILES[@]}"; do
  COMBINED+=$'\n'"$(strip_imports_exports < "$f")"
done

cat > "$OUT" <<HTMLEOF
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Nfluence</title>
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script>
    window.SUPABASE_URL = "https://xynujmscxjxbfivylfne.supabase.co";
    window.SUPABASE_ANON_KEY = "sb_publishable_WgxWdFozCUuUbWAUy9VKTQ_zbxdyvxE";
    window.STRIPE_PUBLISHABLE_KEY = "pk_test_51TPR393hA44QTwx3TBSDjGESyhj3t92yOnxpdPcNihIeEMrGad5IGlCqofuGBlZLBzPqizhFZGwhkIoU3UKexSp100GWhkF9cM";
  </script>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
const { useState, useEffect, useRef, useCallback, useMemo } = React;
${COMBINED}
ReactDOM.createRoot(document.getElementById('root')).render(<NfluenceApp />);
  </script>
</body>
</html>
HTMLEOF

echo "Built $OUT ($(wc -l < "$OUT") lines)"
