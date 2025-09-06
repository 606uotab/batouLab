# BRANDING.md — BatouLab
## Identité
- Nom: **BatouLab**
- Tagline: Interface desktop légère multi-IA
- Mascotte: oie minimaliste (noir & blanc)

## Typographies
- Primaire: Montserrat (Bold pour titres, Light pour sous-titres)
- Fallbacks: Inter, system-ui, Arial, sans-serif

## Palette
- Noir: #000000
- Blanc: #FFFFFF
- Gris clair: #F5F5F5
- Gris moyen: #888888
- Gris anthracite: #222222

## Tokens CSS (thème)
:root {
  --bl-bg: #FFFFFF;
  --bl-fg: #000000;
  --bl-muted: #888888;
  --bl-border: #2222221a;
  --bl-accent: #000000;
  color-scheme: light dark;
}
@media (prefers-color-scheme: dark) {
  :root { --bl-bg: #000000; --bl-fg: #FFFFFF; --bl-border: #FFFFFF1a; --bl-muted: #F5F5F5; }
}

## Icônes et tailles
- App icon: 512 / 256 / 128 / 64 / 32 px (SVG + PNG)
- Favicon: `favicon.png` (provisoire, remplacer par oie SVG)

## Accessibilité
- Contraste AA minimum
- Taille mini du sous-titre: 12px desktop
