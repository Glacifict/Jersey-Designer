# Jersey Designer (Desktop)

Application desktop (Tauri 2 + React) pour créer un maillot de football : couleur, motif, logo et sponsor. Cible principale : Windows 11 on ARM (aarch64).

## Prérequis (Windows 11 ARM)

- Node.js + npm
- Rust toolchain `aarch64-pc-windows-msvc`
- Visual Studio Build Tools 2022/2026 avec charge de travail "Desktop development with C++" (ARM64)

## Développement

```powershell
cd jersey-app
npm install
npm run tauri:dev
```

## Build production (Windows ARM64)

```powershell
cd jersey-app
# Dans un Developer Command Prompt ARM64 :
npm run tauri:build
```

Les installateurs sont générés dans :

```
src-tauri/target/release/bundle/msi/
src-tauri/target/release/bundle/nsis/
```

## Utilisation

- Couleurs : principale, motif, bordures, col.
- Motif : rayures verticales, fines rayures, bandes horizontales, deux moitiés, quarts, écharpe.
- Logo : import d'image + position/taille.
- Sponsor : texte (couleur/taille/position) ou image sponsor.
- Export : bouton "Exporter PNG" (enregistré dans le dossier Téléchargements).