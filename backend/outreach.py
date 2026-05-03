"""
Nexus — Outreach Feature  (NX.BE.OutreachModule)
Stories #1 (Outreach Message Guidance) & #7 (Outreach Readiness Check)

P4: template-based mock — no external AI call.
P5: swap only _call_ai() for the AWS Bedrock body shown in the dev spec (§15).

Architecture labels: NX.API.3 – NX.API.6
"""

import re

# ── Input constraints (shared by routes in app.py) ────────────
VALID_TONES = {"professional", "friendly", "formal"}
VALID_GOALS = {"job_inquiry", "networking", "advice", "collaboration"}
MAX_CUSTOM_NOTE = 200   # chars
MAX_DRAFT_CHARS = 500   # chars — AC-5

# ── Template data ──────────────────────────────────────────────
_TONE_OPENERS = {
    "professional": "I hope this message finds you well.",
    "friendly":     "Hope you're doing great!",
    "formal":       "I am writing to respectfully reach out.",
}

_TONE_CLOSERS = {
    "professional": "I would welcome the opportunity to connect at your convenience.",
    "friendly":     "Would love to chat if you have a few minutes!",
    "formal":       "I respectfully request a brief opportunity to connect.",
}

_GOAL_LINES = {
    "job_inquiry":   "I am very interested in opportunities on your team and believe my background aligns well.",
    "networking":    "I am eager to connect with professionals in your field and learn from your experience.",
    "advice":        "I would greatly appreciate any guidance you could offer about your career path.",
    "collaboration": "I think there may be a valuable opportunity for us to collaborate on shared interests.",
}

_TIPS = {
    "professional": [
        "Keep your message under 300 characters — shorter notes get a 3× higher reply rate.",
        "Mention a specific detail from their profile to show genuine interest.",
        "End with a low-commitment ask (e.g., 'Would you be open to a quick chat?').",
    ],
    "friendly": [
        "A warm tone works well for peers — avoid anything that feels transactional.",
        "Reference a shared interest or mutual connection if you have one.",
        "Keep it short; casual messages over 4 sentences can feel overwhelming.",
    ],
    "formal": [
        "State your purpose clearly in the first sentence.",
        "Avoid contractions and informal language.",
        "Close with a specific, actionable request.",
    ],
}

# 9 weighted criteria — AC-1 (Story #7 — Outreach Readiness Check)
_OUTREACH_CHECKS = [
    {
        "key": "experience", "label": "Has at least one role", "weight": 20,
        "tip": "Add your work experience to demonstrate your background.",
        "eval": lambda u: len(u.get("experience", [])) > 0,
    },
    {
        "key": "headline", "label": "Headline is descriptive", "weight": 15,
        "tip": "Write a headline with 5+ words describing your role and focus.",
        "eval": lambda u: len(u.get("headline", "").split()) >= 5,
    },
    {
        "key": "skills", "label": "5+ skills listed", "weight": 15,
        "tip": "List at least 5 skills so recruiters can find you by expertise.",
        "eval": lambda u: len(u.get("skills", [])) >= 5,
    },
    {
        "key": "photo", "label": "Profile photo present", "weight": 10,
        "tip": "Add a profile photo — profiles with photos get 14× more views.",
        "eval": lambda u: bool(u.get("photo")),
    },
    {
        "key": "about", "label": "About section filled in", "weight": 10,
        "tip": "Write 100+ characters in your About section to tell your story.",
        "eval": lambda u: len(u.get("about", "")) >= 100,
    },
    {
        "key": "education", "label": "Has education listed", "weight": 10,
        "tip": "Add your education to strengthen recruiter confidence.",
        "eval": lambda u: len(u.get("education", [])) > 0,
    },
    {
        "key": "connections", "label": "At least 10 connections", "weight": 10,
        "tip": "Grow to 10+ connections to signal an active, trusted profile.",
        "eval": lambda u: u.get("connections", 0) >= 10,
    },
    {
        "key": "open_to_work", "label": "Open-to-work signal set", "weight": 5,
        "tip": "Enable 'Open to Work' if you're job-hunting — it doubles recruiter contact.",
        "eval": lambda u: bool(u.get("openToWork") or u.get("open_to_work")),
    },
    {
        "key": "website", "label": "External link / portfolio", "weight": 5,
        "tip": "Add a portfolio or GitHub link to stand out from other candidates.",
        "eval": lambda u: bool(u.get("website")),
    },
]


# ── Private helpers ────────────────────────────────────────────

def _first_name(full_name):
    """Return the first token of a full name. NX.API.6"""
    parts = (full_name or "").strip().split()
    return parts[0] if parts else "there"


def sanitize_text(value, max_length):
    """
    Strip HTML tags and control characters from user-supplied strings,
    then truncate to max_length. Called by routes before passing to
    business logic to prevent injection into templates / LLM prompts (NX.TF.11).
    """
    if not isinstance(value, str):
        return ""
    cleaned = re.sub(r"<[^>]+>", "", value)          # strip HTML tags
    cleaned = re.sub(r"[\x00-\x1f\x7f]", "", cleaned) # strip control chars
    return cleaned.strip()[:max_length]


def _call_ai(prompt):
    """
    NX.API.5 — single swap point for AI dispatch.
    P4: returns the assembled template string directly (no external call).
    P5: replace this body with the boto3 Bedrock call from §15 of the dev spec.
    """
    return prompt


# ── Public functions ───────────────────────────────────────────

def generate_outreach_message(sender, recipient, context):
    """
    NX.API.3 — Story #1 (Outreach Message Guidance)
    Build a personalised outreach draft plus tips and alternative openers.

    Args:
        sender    — CURRENT_USER dict
        recipient — resolved user dict for the target person
        context   — { tone, goal, custom_note } already validated by the route

    Returns dict: { draft, char_count, tone, tips, alternatives }
    """
    tone        = context["tone"]
    goal        = context["goal"]
    custom_note = context.get("custom_note", "")

    sender_first    = _first_name(sender.get("name", ""))
    recipient_first = _first_name(recipient.get("name", ""))

    exp     = recipient.get("experience") or []
    role    = exp[0].get("title",   "your field")   if exp else "your field"
    company = exp[0].get("company", "your company") if exp else "your company"

    details     = context.get("details", {})
    their_field = details.get("field", "").strip()
    sender_role = details.get("yourRole", "").strip()
    company_d   = details.get("company", "").strip()
    role_d      = details.get("role", "").strip()
    extra_ctx   = details.get("context", "").strip()

    goal_line = _GOAL_LINES[goal]
    # Inject specific details into goal line
    if their_field:
        goal_line = goal_line.replace("your career path", f"your work in {their_field}")
        goal_line = goal_line.replace("your field", their_field)
        goal_line = goal_line.replace("in your field", f"in {their_field}")
        goal_line = goal_line.replace("opportunities on your team", f"opportunities in {their_field}" + (f" at {company_d}" if company_d else ""))
    if role_d and company_d and goal in ("job_inquiry",):
        goal_line = f"I am very interested in the {role_d} role at {company_d} and believe my background aligns well."
    elif role_d and goal in ("job_inquiry",):
        goal_line = f"I am very interested in the {role_d} opportunity and believe my background aligns well."
    elif company_d and goal in ("job_inquiry", "networking"):
        goal_line += f" I'm particularly drawn to the work happening at {company_d}."

    body = (
        f"Hi {recipient_first},\n\n"
        f"{_TONE_OPENERS[tone]} I'm {sender_first}"
        + (f", {sender_role}" if sender_role else "") + f". "
        f"{goal_line}"
    )
    if extra_ctx:
        body += f" {extra_ctx}"
    if custom_note and custom_note not in (extra_ctx or ""):
        body += f" {custom_note}"
    body += f"\n\n{_TONE_CLOSERS[tone]}\n\n— {sender_first}"

    draft = _call_ai(body)[:MAX_DRAFT_CHARS]

    return {
        "draft":        draft,
        "char_count":   len(draft),
        "tone":         tone,
        "tips":         _TIPS.get(tone, _TIPS["professional"]),
        "alternatives": [
            f"Hi {recipient_first}, I came across your work as {role} at {company} and would love to connect.",
            f"Hey {recipient_first} — your background in {role} really caught my attention!",
        ],
    }


def compute_outreach_readiness(user):
    """
    NX.API.4 — Story #7 (Outreach Readiness Check)
    Score a user's profile completeness against 9 weighted criteria.

    Args:
        user — resolved user dict

    Returns dict: { score, max_score, level, can_message, breakdown, top_tips }
    """
    score     = 0
    breakdown = []
    missed    = []

    for check in _OUTREACH_CHECKS:
        try:
            met = bool(check["eval"](user))
        except Exception:
            met = False

        if met:
            score += check["weight"]
        else:
            missed.append(check)

        breakdown.append({
            "key":    check["key"],
            "label":  check["label"],
            "weight": check["weight"],
            "met":    met,
            "tip":    None if met else check["tip"],
        })

    # highest-weight unmet items first — AC-3
    top_tips = [
        c["tip"]
        for c in sorted(missed, key=lambda x: x["weight"], reverse=True)[:3]
    ]

    level = "ready" if score >= 75 else ("almost_ready" if score >= 50 else "not_ready")

    return {
        "score":       score,
        "max_score":   100,
        "level":       level,
        "can_message": score >= 60,   # AC-4
        "breakdown":   breakdown,
        "top_tips":    top_tips,
    }
