# 🔬 Immunology Atlas & Tumor POV 🎮

[![React](https://img.shields.io/badge/React-18.x-61dafb?logo=react&logoColor=black)](https://reactjs.org/)
[![Three.js](https://img.shields.io/badge/Three.js-r160-black?logo=three.js)](https://threejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)
[![AlphaFold](https://img.shields.io/badge/AlphaFold-Database-0284c7)](https://alphafold.ebi.ac.uk/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An interactive, scientific **3D Immunology Atlas** designed like a high-tech "3D Pokédex" for the human immune system — paired with a built-in **Tumor POV First-Person Shooter (CS-Style)** minigame where you pilot immune cells to battle inside the tumor microenvironment!

---

## ✨ Features

### 1. 🗂️ 3D Pokédex-Style Immunology Atlas
- **Sleek Minimalist Aesthetic**: Clean scientific layout on pure white (`#FFFFFF`) with subtle soft shadows and responsive card interactions.
- **Procedural 3D Cell Viewer**: Dynamic, procedurally-generated 3D cell morphologies (Macrophage, CD4⁺ T Cell, CD8⁺ Cytotoxic T Cell, NK Cell, B Cell, Plasma Cell, Dendritic Cell, Neutrophil, Mast Cell, and more) rendered in real time with Three.js / React Three Fiber.
- **Custom Vector Cell Icons**: Handcrafted SVG icons matching authentic microscopic features for every immune cell lineage.
- **Comprehensive Surface Markers & Transcription Factors**: 69+ verified immune markers (CD3, CD4, CD8, CCR5, CXCR4, CD19, CD56, FoxP3, T-bet, RORγt, etc.) mapped directly to UniProt entries.

### 2. 🧬 Molecular Zoom (AlphaFold 3D Structures)
- Click on any immune marker or transcription factor tag to slide in the **Molecular Zoom** panel.
- Live 3D protein structure viewer powered by 3Dmol.js, fetching predicted coordinates directly from the **AlphaFold EBI Database** (with automatic fallback to cartoon/ribbon rendering).

### 3. 🎯 Genetic Pathogenicity (AlphaMissense Integration)
- Visualizes missense variant vulnerability and functional impact across critical domains.
- Color-coded heatmap bar (Benign $\rightarrow$ Ambiguous $\rightarrow$ Pathogenic) with contextual biological explanations.

### 4. 🌐 Allen Institute for Immunology Integration
- Deep-links directly to single-cell reference data and expression profiles from the **Allen Immune Health Atlas**.

---

## 🎮 Tumor POV: First-Person Immune Combat Game

Step directly into the perspective of an immune cell inside a solid tumor tissue!

### 🕹️ Controls (Counter-Strike Style)
| Key | Action |
|---|---|
| **Mouse / Left Click** | Look / Fire (Hit **Nucleus** for $2\times$ Critical Hit!) |
| **W, A, S, D** | Move forward / left / backward / right |
| **Shift** | Sprint |
| **Space** | Jump |
| **R** | Reload ammunition |
| **Q** | **Anti-PD-1 Immunotherapy**: Resets T-cell exhaustion |
| **Esc** | Pause game / Release mouse pointer |

### 🔬 Biological Combat Mechanics
- **Cell-Specific Biological Weaponry**:
  - **CD8⁺ Cytotoxic T Cell**: High-velocity Perforin / Granzyme burst.
  - **NK (Natural Killer) Cell**: "Missing-Self" detection ($1.5\times$ damage against MHC-I-deficient tumor cells).
  - **Th1 Helper T Cell**: IFN-$\gamma$ cytokine emitter (forces stealth tumor cells to re-express MHC-I).
  - **Mast Cell**: Granule burst (area-of-effect suppression).
  - **Macrophage & Neutrophil**: Phagocytic acid stream & reactive oxygen species (ROS).
- **Tumor Microenvironment (TME) Obstacles**:
  - **PD-L1 Immune Checkpoint Exhaustion**: Prolonged proximity to tumor cells increases exhaustion and lowers firing rate. Press **Q** to deploy anti-PD-1 checkpoint blockade!
  - **MHC-I Low (Stealth) Mutants**: Tumor cells that evade conventional T-cell recognition.
  - **Cancer Stem Cell (CSC) Boss**: High-durability boss that continuously spawns new tumor cells until neutralized.
- **Full Tactical HUD**: CS-inspired mini-radar, kill-feed, crosshair bloom, health/exhaustion bars, and procedural WebAudio sound effects.

---

## 🚀 Getting Started

### Option A: Standalone Single-File (No Installation Needed)
Simply open `dist/index.html` in any modern web browser (Chrome, Edge, Firefox, Safari).
The entire React app, Three.js 3D engines, molecular viewer, sound engine, and styles are inlined into a single self-contained ~2 MB HTML file.

### Option B: Run Locally with Node.js

```bash
# Clone the repository
git clone https://github.com/Jeremy4884/Immunology-Atlas.git
cd Immunology-Atlas

# Install dependencies
npm install

# Start local development server
npm run dev
```

Open `http://localhost:5173` in your browser.

### Option C: Build Standalone HTML

```bash
npm run build
```
The output file will be generated at `dist/index.html`.

---

## 📂 Project Structure

```
immunology-atlas/
├── dist/
│   └── index.html                # Self-contained standalone build (~2 MB)
├── scripts/
│   └── verify-uniprot.mjs        # UniProt & AlphaFold validation script
├── src/
│   ├── components/
│   │   ├── CellIcon.tsx          # Custom SVG biological cell icons
│   │   ├── CellViewer.tsx        # 3D procedural cell model (Three.js / R3F)
│   │   ├── DataPanel.tsx         # Right data panel (Markers, TFs, Allen links)
│   │   ├── HelpTip.tsx           # Contextual scientific help popovers
│   │   ├── MoleculePanel.tsx     # AlphaFold 3Dmol.js molecular structure viewer
│   │   ├── PathogenicityPanel.tsx# AlphaMissense pathogenicity visualizer
│   │   └── Sidebar.tsx           # Pokédex-style cell category navigator
│   ├── data/
│   │   ├── cells.ts              # 69+ verified immune proteins & taxonomy
│   │   └── pathogenicity.ts      # AlphaMissense vulnerability scores
│   ├── game/
│   │   ├── TumorGame.tsx         # Three.js First-Person PointerLock FPS engine
│   │   ├── weapons.ts            # Biological weapons, enemy types & mechanics
│   │   ├── sfx.ts                # WebAudio procedural synthesizer
│   │   └── game.css              # CS-style HUD & tactical overlays
│   ├── App.tsx                   # Main layout & Tumor POV launcher
│   ├── index.css                 # Clean scientific styling & design system
│   └── main.tsx                  # Application bootstrap
├── package.json
├── tsconfig.json
└── vite.config.ts                # Configured with vite-plugin-singlefile
```

---

## 📚 References & Scientific Sources
- **UniProt Knowledgebase**: Protein accession mapping for surface markers & transcription factors.
- **AlphaFold Protein Structure Database**: 3D structural predictions (DeepMind / EMBL-EBI).
- **AlphaMissense**: Catalog of human missense variant effect predictions.
- **Allen Institute for Immunology**: Human Immune Health Atlas reference frameworks.
- **Janeway's Immunobiology (10th Ed.)**: Cellular immunology & tumor microenvironment defense mechanisms.

---

## 📄 License
MIT License. Created with ❤️ for science and gaming enthusiasts.
