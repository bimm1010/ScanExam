# ScanExercise Core Development Plan (v1)

## Overview
Finalizing the student score automation system with a focus on accuracy, stability, and premium UI.

## Success Criteria
- [ ] 100% accurate extraction from standard Vietnamese school rosters.
- [ ] Export to Excel maintains 90%+ styling from original template.
- [ ] Validated on Mobile, Tablet, and Desktop.

## Tech Stack
- Frontend: React (Vite) + Tailwind + Framer Motion.
- Backend: Django + Gemini Vision + JSON Response.
- Tools: Antigravity Kit (20 agents, 36 skills).

## Task Breakdown

### Phase 1: Core Logic Optimization
- [ ] **Task 1: Advanced Fuzzy Matching**
  - **Agent**: `backend-specialist` + `debugger`
  - **Input**: Extracted name, Roster list
  - **Output**: Best match index or high-confidence score
  - **Verify**: Test with abbreviated names like "Ng. H. B. An"

### Phase 2: Professional Export
- [ ] **Task 2: Styled Excel Export**
  - **Agent**: `frontend-specialist`
  - **Input**: Matched scores, Original Excel Blob
  - **Output**: Downloadable .xlsx with preserved formatting
  - **Verify**: Compare exported file with original for color/font parity

### Phase 3: Multi-device Verification
- [ ] **Task 3: E2E Network Testing**
  - **Agent**: `test-engineer`
  - **Input**: URL (Local IP)
  - **Output**: Successful scan/match on mobile/tablet browser
  - **Verify**: No UI cutoffs or logic breaks on touch devices

## 🏁 Phase X: Final Verification
- [ ] Run `python .agent/scripts/checklist.py .`
- [ ] Verify Triple-AI Alliance sign-off.
