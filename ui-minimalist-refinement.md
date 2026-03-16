## 🎨 DESIGN COMMITMENT: TACTILE MINIMALIST (LIQUID GLASS PRO MAX)

- **Geometry**: Squircle (24px - 32px) for a soft yet professional tech feel.
- **Typography**: `font-black` for giant headers, `font-medium` for UI elements (Slate-900).
- **Palette**: **Slate + Rose + Gold** (Bans Purple/Indigo ✅). Sophisticated, low-saturation.
- **Effects**: Softer `backdrop-blur` (16px) with 1px **Raw Borders** (White/20) for depth.
- **Topological Choice**: Center-Staggered layout (L-R-C-L) for rhythmic text flow.
- **Cliché Liquidation**: Removed the "Standard Split" and Magenta-heavy AI gradients.

## Tech Stack
- CSS: Tailwind v4 patterns (custom utilities).
- Animation: Framer Motion.
- Icons: Lucide React.

## Task Breakdown

### Phase 1: Global Style Update
- [ ] **Task 1: Refine `index.css`**
  - **Agent**: `frontend-specialist`
  - **Action**: Update global gradient, glass panel intensities, and define a new `squircle-btn` utility. 
  - **Input**: `index.css`
  - **Output**: Updated `index.css` with sophisticated tokens.
  - **Verify**: Inspect background and panel transparency.

### Phase 2: Component Refinement
- [ ] **Task 2: Update Layout and Buttons in `App.tsx`**
  - **Agent**: `frontend-specialist`
  - **Action**: Apply new classes to main header and common layout elements.
  - **Input**: `App.tsx`, `Layout.tsx`
  - **Verify**: Visual check of spacing and typography.

- [ ] **Task 3: Refine Feature Components**
  - **Agent**: `frontend-specialist`
  - **Action**: Propagate the minimalist style to `UploadStep`, `SheetSelectionStep`, etc.
  - **Input**: Files in `features/`
  - **Verify**: Consistent button styling across all steps.

## Phase X: Final Verification
- [ ] Run `python .agent/scripts/checklist.py .`
- [ ] Visual audit for accessibility (contrast) and "wow" factor.
