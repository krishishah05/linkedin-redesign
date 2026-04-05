from .users import CURRENT_USER, USERS
from .companies import COMPANIES
from .jobs import JOBS
from .groups import GROUPS
from .courses import COURSES
from .misc import NEWS, INVITATIONS, HASHTAGS
from .posts import get_posts
from .conversations import get_conversations
from .notifications import NOTIFICATIONS
from .events import get_events


def get_user_by_id(user_id):
    uid = int(user_id)
    if uid == 1:
        return CURRENT_USER
    return next((u for u in USERS if u["id"] == uid), None)


def get_company_by_id(company_id):
    return next((c for c in COMPANIES if c["id"] == int(company_id)), None)


def get_job_by_id(job_id):
    return next((j for j in JOBS if j["id"] == int(job_id)), None)


def get_group_by_id(group_id):
    return next((g for g in GROUPS if g["id"] == int(group_id)), None)


def get_conversation_by_id(conv_id, conversations):
    return next((c for c in conversations if c["id"] == int(conv_id)), None)
