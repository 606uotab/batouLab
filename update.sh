#!/usr/bin/env bash
set -euo pipefail

# Se placer à la racine du projet
if [ -d "batouLab/src" ]; then cd batouLab; fi
[ -d "src" ] || { echo "Erreur: lance depuis la racine (contenant src/)."; exit 1; }

TS=$(date +%s)
BK="backup_${TS}"
mkdir -p "${BK}/src/components"
mkdir -p "${BK}/src"

# Sauvegardes minimales
[ -f src/styles.css ] && cp -p src/styles.css "${BK}/src/styles.css"
for f in src/components/ChatWithHistory.tsx src/components/ChatLite.tsx src/App.tsx src/main.tsx; do
  [ -f "$f" ] && { mkdir -p "${BK}/$(dirname "$f")"; cp -p "$f" "${BK}/$f"; }
done

# 1) Supprime toute marque UI "batouLab ..." injectée dans l'en-tête React
#    et les imports/utilisations de APP_VERSION où qu'ils soient.
shopt -s nullglob
for f in src/components/*.tsx src/*.tsx; do
  # enlève <div className="brand"> ... </div>
  sed -i.bak -E 's#<div className="brand">[^<]*</div>##g' "$f" || true
  # enlève une éventuelle interpolation {APP_VERSION} dans un noeud texte
  sed -i.bak -E 's#\{APP_VERSION\}##g' "$f" || true
  # enlève l import APP_VERSION de ../version ou ./version
  sed -i.bak -E '/import[[:space:]]*\{[[:space:]]*APP_VERSION[[:space:]]*\}[[:space:]]*from[[:space:]]*["'\''](\.\.\/|\.\/)version["'\''];?/d' "$f" || true
done

# 2) Stylise le halo de focus (argent) et supprime le bleu par défaut
CSS='src/styles.css'
if [ -f "${CSS}" ]; then
  # ajoute des variables si non présentes
  if ! grep -q -- "--focus" "${CSS}"; then
    printf "\n:root{ --focus:#c0c0c0; }\n" >> "${CSS}"
  fi
  cat >> "${CSS}" <<'EOF'

/* === Focus halo argent (inputs & textarea) === */
.input:focus, .textarea:focus, .model-toggle:focus, .model-pill:focus, .linkbtn:focus {
  outline: none !important;
  box-shadow: 0 0 0 2px var(--focus) !important;
  border-color: var(--focus) !important;
}
EOF
fi

echo "OK. Sauvegarde: ${BK}"
echo "Supprimé: marque UI dans TSX + import APP_VERSION"
echo "Halo focus: argent appliqué (.input, .textarea, .model-toggle, .model-pill, .linkbtn)"
echo "Relance: npm run tauri dev"
