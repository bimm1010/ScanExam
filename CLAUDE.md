# CLAUDE.md - ScanExam Project Guide

Welcome Claude Code to the **ScanExam** project. This document ensures you align with our specific workflows and "Đại Ca's" (The Boss) expectations.

## 🧠 CORE PHILOSOPHY: THE COUNCIL RULE (HỘI ĐỒNG TỨ TƯỚNG)
Before any code modification or implementation, you MUST follow the "Four Generals Council" protocol:
1.  **NO SILENT FIXES:** Never attempt to fix bugs or implement features without prior discussion.
2.  **INDEPENDENT PROPOSALS:** You are one member of the council. Propose your solution independently.
3.  **MULTILINGUAL DEBATE:** Compare your approach with other models (Gemini, Gemma, Qwen, Minimax). Analyze pros/cons.
4.  **CONSENSUS & APPROVAL:** Reach a single, unified plan. **WAIT FOR "ĐẠI CA" TO APPROVE** before touching code.
5.  **KHAU QUYET:** "Độc lập đề xuất, Thảo luận đa chiều, Thống nhất một phương án, Hỏi Đại Ca trước, Làm sau!"

## 🚀 GSD WORKFLOW INTEGRATION
This project uses the **get-shit-done (GSD)** framework for structured development:

### Agent Definitions
- `.claude/agents/scanexam-executor.md` - Plan executor (use when executing PLAN.md files)
- `.claude/agents/scanexam-planner.md` - Plan creator (use when creating new plans)
- `.claude/agents/scanexam-reviewer.md` - Code reviewer (use before committing)

### GSD Planning Structure
```
.planning/                    # GSD workflow root
├── config.json               # Project configuration
├── STATE.md                  # Current position & metrics
├── ROADMAP.md                # Phase roadmap (auto-generated)
└── phases/                   # Phase directories
    └── XX-name/
        ├── 01-PLAN.md        # Plan files
        └── 01-SUMMARY.md     # Execution summaries
```

### When to Use GSD
- **Large features (>2 tasks):** Create a PLAN.md in `.planning/phases/XX-name/`
- **Small changes (<2 tasks):** Direct implementation with proper commits
- **Before planning:** Read relevant agent definition (scanexam-planner.md or scanexam-executor.md)

## 📈 PROJECT PROGRESS (GSD MILESTONES)

### ✅ COMPLETED (DANG CHAY NGON)
- **Infrastructure:** Docker-compose (Django + React).
- **Frontend Core:** Feature-based architecture, TailwindCSS, App persistence.
- **Roster Management:** Excel upload, mapping, sheet selection.
- **Scanning Logic:** Image capture, rotation, OCR Worker integration.
- **Knowledge Base:** Graphify mapping (`graphify-out/`).
- **GSD Integration:** Custom agents, planning structure (2026-04-21).

### 🏗️ IN PROGRESS (DANG TRIEN KHAI)
- **AI Integration:** Llama Vision M4 API integration for exam analysis.
- **OCR Accuracy:** Improving `ocr.worker.ts` with Gemini fallback.
- **API Flow:** Full cycle from Scan to DB Verification.
- **Mobile UX:** Optimizing `MobileScanView.tsx`.

### 📅 BACKLOG (SAP LAM) - GSD Phases
- **Phase 1:** Advanced Analytics & Result Reporting
- **Phase 2:** Batch Processing for multiple papers
- **Phase 3:** Offline Mode with local storage caching

## 🛠 TECH STACK & TOOLS
- **Backend:** Python (Django), Gunicorn, Docker.
- **Frontend:** React (TypeScript), Vite, TailwindCSS.
- **OCR/AI:** Gemini API, Llama Vision M4, Tesseract.
- **Graphify:** Codebase mapping (`graphify-out/`).
- **Notes:** Obsidian (SAVE TO: `/mnt/c/Users/thanh/Documents/Obsidian Vault/`).

## 🚀 COMMON COMMANDS
- **Backend Dev:** `cd backend && python manage.py runserver`
- **Frontend Dev:** `cd frontend && npm run dev`
- **Rebuild Graph:** `python3 -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))"`

## 📏 CODING STANDARDS
- **Type Safety:** No `any`. Use interfaces in `frontend/src/types/index.ts`.
- **Composition:** Prefer composition and Hooks over inheritance.
- **Backend:** PEP 8, Fat Models, Thin Views.
- **Ref Rebuild:** Always run Graphify rebuild after file modifications:
  ```bash
  python3 -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))"
  ```

## 📋 GSD COMMIT CONVENTIONS
Follow GSD commit format for atomic, traceable commits:
```bash
# Feature commits
git commit -m "feat({phase}-{plan}): {concise description}

- {key change 1}
- {key change 2}
"

# Bug fixes
git commit -m "fix({phase}-{plan}): {concise description}

- Fixed {issue}
"

# Docs only
git commit -m "docs({phase}-{plan}): {description}"
```

---
*Remember: You are a Senior Engineer. Work smart, stay humble, and respect the Council.*
