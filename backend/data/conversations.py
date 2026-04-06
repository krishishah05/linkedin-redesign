import time

def _ts(offset_ms):
    return int(time.time() * 1000) - offset_ms

def get_conversations():
    """Return conversations with dynamic timestamps."""
    return [
        {
            "id": 1,
            "ownerId": 1,
            "participant": {"id": 3, "name": "Sarah Chen", "headline": "VP of Engineering at Stripe | ex-Google | Speaker | Author", "avatarColor": "#E67E22", "isOnline": True},
            "unreadCount": 2,
            "lastMessage": "That sounds like a great approach! Let me know how the interview goes",
            "lastTimestamp": _ts(30 * 60000),
            "isOnline": True,
            "messages": [
                {"id": 1, "senderId": 3, "text": "Hi Alex! Congrats on the System Design talk at GopherCon — really impressive presentation!", "timestamp": _ts(3 * 3600000), "isRead": True},
                {"id": 2, "senderId": 1, "text": "Thank you Sarah! That means a lot coming from you. Your work on distributed transactions at Stripe was a big inspiration.", "timestamp": _ts(int(2.5 * 3600000)), "isRead": True},
                {"id": 3, "senderId": 3, "text": "We're actually looking for a Staff Engineer on my team. Your background is exactly what we need. Would you be open to a conversation?", "timestamp": _ts(2 * 3600000), "isRead": True},
                {"id": 4, "senderId": 1, "text": "I'd be very interested! Though I should mention I'm currently happy at Google, I'm always open to hearing about great opportunities.", "timestamp": _ts(90 * 60000), "isRead": True},
                {"id": 5, "senderId": 3, "text": "Totally understandable. I think once you hear about what we're building you'll be excited. Can we set up a 30-min call this week?", "timestamp": _ts(60 * 60000), "isRead": True},
                {"id": 6, "senderId": 1, "text": "Sure! I'm free Thursday afternoon or Friday morning.", "timestamp": _ts(45 * 60000), "isRead": True},
                {"id": 7, "senderId": 3, "text": "Thursday 3pm PT works. I'll send a calendar invite. In the meantime, here's a rough idea of what the role involves: leading our API infrastructure team (12 engineers), defining the technical roadmap for next-gen payment rails, and working closely with the CTO.", "timestamp": _ts(35 * 60000), "isRead": False},
                {"id": 8, "senderId": 3, "text": "That sounds like a great approach! Let me know how the interview goes", "timestamp": _ts(30 * 60000), "isRead": False}
            ]
        },
        {
            "id": 2,
            "ownerId": 1,
            "participant": {"id": 2, "name": "Priya Patel", "headline": "Product Manager at Meta | Former Consultant | MBA Wharton", "avatarColor": "#E67E22", "isOnline": False},
            "unreadCount": 0,
            "lastMessage": "Will do! Thanks for the feedback on the PRD.",
            "lastTimestamp": _ts(2 * 3600000),
            "isOnline": False,
            "messages": [
                {"id": 1, "senderId": 2, "text": "Hey Alex! Congrats on your latest article — it went viral", "timestamp": _ts(5 * 3600000), "isRead": True},
                {"id": 2, "senderId": 1, "text": "Haha thanks! I was surprised. People seem to really resonate with the scalability patterns.", "timestamp": _ts(int(4.5 * 3600000)), "isRead": True},
                {"id": 3, "senderId": 2, "text": "Could I get your eyes on a PRD I'm writing? It's about improving our API developer experience and I think you'd have great input.", "timestamp": _ts(4 * 3600000), "isRead": True},
                {"id": 4, "senderId": 1, "text": "Of course! Send it over.", "timestamp": _ts(int(3.5 * 3600000)), "isRead": True},
                {"id": 5, "senderId": 2, "text": "Will do! Thanks for the feedback on the PRD.", "timestamp": _ts(2 * 3600000), "isRead": True}
            ]
        },
        {
            "id": 3,
            "ownerId": 1,
            "participant": {"id": 17, "name": "Kevin O'Brien", "headline": "Recruiter at Nexus | Connecting Top Tech Talent | ex-Google Recruiter", "avatarColor": "#915907", "isOnline": True},
            "unreadCount": 1,
            "lastMessage": "The package is $280K base + $150K RSU/year. Open to discussion!",
            "lastTimestamp": _ts(4 * 3600000),
            "isOnline": True,
            "messages": [
                {"id": 1, "senderId": 17, "text": "Hi Alex! I'm a recruiter at Nexus and I came across your profile. We're hiring a Staff Engineer for our Feed Ranking team and you'd be a perfect fit.", "timestamp": _ts(6 * 3600000), "isRead": True},
                {"id": 2, "senderId": 1, "text": "Thanks Kevin! What's the role focused on?", "timestamp": _ts(int(5.5 * 3600000)), "isRead": True},
                {"id": 3, "senderId": 17, "text": "Great question! The Feed Ranking team owns the algorithm that determines what 900M members see in their feed. You'd be working on ML-driven ranking, A/B experimentation at massive scale, and real-time personalization.", "timestamp": _ts(5 * 3600000), "isRead": True},
                {"id": 4, "senderId": 17, "text": "The package is $280K base + $150K RSU/year. Open to discussion!", "timestamp": _ts(4 * 3600000), "isRead": False}
            ]
        },
        {
            "id": 4,
            "ownerId": 1,
            "participant": {"id": 7, "name": "Marcus Williams", "headline": "Senior Software Engineer at Meta | React Core Team", "avatarColor": "#2C3E50", "isOnline": False},
            "unreadCount": 0,
            "lastMessage": "I'll open a PR tomorrow. Excited to collaborate!",
            "lastTimestamp": _ts(1 * 24 * 3600000),
            "isOnline": False,
            "messages": [
                {"id": 1, "senderId": 7, "text": "Alex! I'm working on a React RFC for a new concurrent rendering pattern and I'd love to co-author it with you given your work on the Google performance tools.", "timestamp": _ts(2 * 24 * 3600000), "isRead": True},
                {"id": 2, "senderId": 1, "text": "That sounds awesome! I've been thinking about similar patterns for large component trees. What's your current approach?", "timestamp": _ts(int(1.5 * 24 * 3600000)), "isRead": True},
                {"id": 3, "senderId": 7, "text": "I'll open a PR tomorrow. Excited to collaborate!", "timestamp": _ts(1 * 24 * 3600000), "isRead": True}
            ]
        },
        {
            "id": 5,
            "ownerId": 1,
            "participant": {"id": 18, "name": "Ana Souza", "headline": "ML Engineer at OpenAI | NLP Research | LLMs | Author", "avatarColor": "#DD2590", "isOnline": True},
            "unreadCount": 3,
            "lastMessage": "Would you want to do a podcast episode on this? I think the audience would love it",
            "lastTimestamp": _ts(45 * 60000),
            "isOnline": True,
            "messages": [
                {"id": 1, "senderId": 18, "text": "Alex, your comment on my post about LLM evaluation was so well-articulated. Have you published anything on this topic?", "timestamp": _ts(3 * 3600000), "isRead": True},
                {"id": 2, "senderId": 1, "text": "Not yet but it's been on my mind. The gap between benchmark performance and real-world utility is something I encounter constantly building with LLMs.", "timestamp": _ts(int(2.5 * 3600000)), "isRead": True},
                {"id": 3, "senderId": 18, "text": "Would you want to do a podcast episode on this? I think the audience would love it", "timestamp": _ts(45 * 60000), "isRead": False}
            ]
        }
    ]
