# Hướng dẫn sử dụng GSD (Get Sh*t Done)

## Tổng quan

GSD là framework để tổ chức development theo **phases** và **plans** có cấu trúc.

---

## BẮT ĐẦU

### Khi nào cần tạo Plan?

| Loại công việc | Action |
|---------------|--------|
| Feature lớn (>2 tasks) | Tạo PLAN.md |
| Bug fix đơn giản | Direct commit |
| Refactor nhỏ | Direct commit |

### Workflow cơ bản

```
1. THINK          2. PLAN          3. EXECUTE        
   Analyze         Create            Implement       
   Research       PLAN.md           Commit          
                                    Verify          
                                    SUMMARY.md      
```

---

## TẠO PLAN MỚI

### Bước 1: Tạo Phase Directory

```bash
mkdir -p .planning/phases/01-ai-integration
```

### Bước 2: Tạo Plan File

Tạo file `.planning/phases/01-ai-integration/01-PLAN.md`:

```markdown
---
phase: "01"
plan: "01"
name: "Gemini API Enhancement"
type: "standard"
---

# Gemini API Enhancement

## Objective

Thêm retry logic và error handling cho Gemini API calls.

## Tasks

### Task 1: Add Retry Logic

<files>
- backend/api/views.py
</files>

<action>
1. Import tenacity hoặc tự implement retry
2. Wrap call_gemini_native() với exponential backoff
3. Retry 3 lần với delays: 1s, 2s, 4s
4. Log retries
</action>

<verify>
<automated>grep -q "retry" backend/api/views.py</automated>
</verify>

<done>
API calls retry automatically on failures
</done>

## Success Criteria

- [ ] Retry logic implemented
- [ ] Rate limit handled
- [ ] Errors logged
```

---

## TASK ANATOMY

Mỗi task cần 4 phần:

1. **files** - Files liên quan
2. **action** - Implementation steps  
3. **verify** - Verification command
4. **done** - Acceptance criteria

---

## COMMIT CONVENTIONS

```bash
git commit -m "feat(01-01): description

- key change 1
- key change 2"
```

| Type | Khi nào |
|------|---------|
| feat | New feature |
| fix | Bug fix |
| test | Test only |
| refactor | Cleanup |
| docs | Documentation |

---

## DEVIATION RULES

| Rule | Trigger | Action |
|------|---------|--------|
| R1: Auto-fix bugs | Code doesn't work | Fix inline |
| R2: Auto-add | Missing critical | Add inline |
| R3: Auto-fix blocking | Blocks task | Fix inline |
| R4: Ask | Architectural change | STOP |

---

## FILE STRUCTURE

```
.planning/
├── config.json
├── STATE.md
└── phases/
    └── 01-name/
        ├── 01-PLAN.md
        └── 01-SUMMARY.md
```

---

## QUICK REFERENCE

- **scanexam-executor.md**: Execute plans
- **scanexam-planner.md**: Create plans  
- **scanexam-reviewer.md**: Review code

