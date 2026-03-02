import time

def _ts(offset_ms):
    """Return timestamp in milliseconds, offset from now."""
    return int(time.time() * 1000) - offset_ms

CURRENT_USER = {
    "id": 1,
    "name": "Alex Johnson",
    "firstName": "Alex",
    "lastName": "Johnson",
    "pronouns": "he/him",
    "headline": "Senior Software Engineer at Google | Full Stack Developer | Open Source Enthusiast",
    "location": "San Francisco Bay Area",
    "industry": "Technology",
    "connections": 847,
    "followers": 1203,
    "profileViews": 234,
    "postImpressions": 1891,
    "avatarColor": "#0F5DBD",
    "coverGradient": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    "about": "Passionate software engineer with 8+ years of experience building scalable web applications and distributed systems. I specialize in full-stack development with expertise in React, Node.js, and cloud infrastructure.\n\nCurrently at Google, I work on developer tools that help millions of engineers ship better code faster. Previously built fintech platforms at Stripe and Airbnb.\n\nI'm deeply passionate about open source, contributing to projects like React and VS Code. When I'm not coding, I mentor junior engineers and speak at tech conferences.\n\n💡 Always open to connecting with fellow engineers, founders, and innovators.",
    "openToWork": True,
    "openToWorkTypes": ["Full-time", "Remote", "Hybrid"],
    "isPremium": True,
    "email": "alex.johnson@gmail.com",
    "phone": "+1 (415) 234-5678",
    "website": "https://alexjohnson.dev",
    "birthday": "March 15",
    "experience": [
        {"id": 1, "title": "Senior Software Engineer", "company": "Google", "companyLogo": "🔵", "location": "Mountain View, CA", "type": "Full-time", "startDate": "Jan 2022", "endDate": None, "current": True, "description": "Leading the development of developer productivity tools used by 50,000+ engineers internally. Architected a new CI/CD pipeline system that reduced build times by 40%. Mentoring a team of 4 junior engineers.", "skills": "React, TypeScript, Go, Kubernetes, GCP"},
        {"id": 2, "title": "Software Engineer II", "company": "Stripe", "companyLogo": "💜", "location": "San Francisco, CA", "type": "Full-time", "startDate": "Jun 2019", "endDate": "Dec 2021", "current": False, "description": "Built core payment processing features handling $100B+ in transactions annually. Led the migration of legacy PHP services to Go microservices. Improved payment success rates by 3% through ML-based routing.", "skills": "Go, Python, React, PostgreSQL, Kafka"},
        {"id": 3, "title": "Frontend Engineer", "company": "Airbnb", "companyLogo": "🏠", "location": "San Francisco, CA", "type": "Full-time", "startDate": "Aug 2017", "endDate": "May 2019", "current": False, "description": "Developed new host dashboard features serving 4M+ hosts worldwide. Implemented performance optimizations reducing page load time by 60%. Built the accessibility features bringing the site to WCAG 2.1 AA compliance.", "skills": "React, JavaScript, CSS, GraphQL"},
        {"id": 4, "title": "Software Engineering Intern", "company": "Microsoft", "companyLogo": "🪟", "location": "Redmond, WA", "type": "Internship", "startDate": "Jun 2016", "endDate": "Aug 2016", "current": False, "description": "Built features for Azure DevOps used by enterprise customers.", "skills": "C#, .NET, Azure"}
    ],
    "education": [
        {"id": 1, "school": "Massachusetts Institute of Technology", "degree": "Bachelor of Science", "field": "Computer Science and Engineering", "startYear": "2013", "endYear": "2017", "grade": "3.9 GPA", "activities": "ACM, HackMIT organizer, Robotics Club", "description": "Thesis: Distributed Systems for Real-time Collaborative Editing"},
        {"id": 2, "school": "Harvard Extension School", "degree": "Certificate", "field": "Data Science", "startYear": "2020", "endYear": "2021", "grade": None, "activities": None, "description": None}
    ],
    "skills": [
        {"name": "React.js", "endorsements": 87, "category": "Frontend"},
        {"name": "TypeScript", "endorsements": 72, "category": "Languages"},
        {"name": "Node.js", "endorsements": 65, "category": "Backend"},
        {"name": "Go", "endorsements": 54, "category": "Languages"},
        {"name": "Kubernetes", "endorsements": 48, "category": "DevOps"},
        {"name": "System Design", "endorsements": 91, "category": "Engineering"},
        {"name": "Python", "endorsements": 63, "category": "Languages"},
        {"name": "GraphQL", "endorsements": 41, "category": "Backend"},
        {"name": "PostgreSQL", "endorsements": 38, "category": "Databases"},
        {"name": "AWS", "endorsements": 55, "category": "Cloud"},
        {"name": "Redis", "endorsements": 33, "category": "Databases"},
        {"name": "Docker", "endorsements": 59, "category": "DevOps"}
    ],
    "certifications": [
        {"name": "AWS Solutions Architect Professional", "org": "Amazon Web Services", "issueDate": "Mar 2023", "expDate": "Mar 2026", "credentialId": "AWS-SAP-2023-AJ"},
        {"name": "Certified Kubernetes Administrator", "org": "CNCF", "issueDate": "Jan 2022", "expDate": "Jan 2025", "credentialId": "CKA-2022-001"},
        {"name": "Google Professional Cloud Developer", "org": "Google Cloud", "issueDate": "Sep 2022", "expDate": "Sep 2024", "credentialId": "GCP-PCD-AJ-22"}
    ],
    "languages": [
        {"name": "English", "proficiency": "Native"},
        {"name": "Spanish", "proficiency": "Professional working proficiency"},
        {"name": "Mandarin", "proficiency": "Elementary proficiency"}
    ],
    "recommendations": [
        {"id": 1, "author": {"id": 3, "name": "Sarah Chen", "headline": "VP of Engineering at Stripe", "avatarColor": "#E67E22"}, "relationship": "Sarah managed Alex directly", "date": "November 2021", "text": "Alex is one of the most talented engineers I've had the pleasure of managing. His technical depth is remarkable — he could debug the most complex distributed systems issues with ease. But what truly sets him apart is his ability to communicate complex ideas simply and his genuine care for his teammates' growth. He would be an asset to any engineering organization."},
        {"id": 2, "author": {"id": 7, "name": "Marcus Williams", "headline": "Senior SWE at Meta", "avatarColor": "#2C3E50"}, "relationship": "Marcus worked with Alex on the same team", "date": "January 2022", "text": "I worked with Alex for 2+ years at Stripe and can wholeheartedly recommend him. He's the person everyone wants reviewing their code — thorough, constructive, and always finding the elegant solution. His work on the payment routing system was genuinely impressive and had measurable impact on conversion rates company-wide."}
    ],
    "accomplishments": {
        "courses": ["Machine Learning by Stanford", "Distributed Systems", "Advanced Algorithms"],
        "projects": [
            {"name": "OpenCodeReview", "description": "Open source AI-powered code review tool with 8K GitHub stars", "url": "https://github.com/alexj/opencodereview"},
            {"name": "DistributedCache", "description": "High-performance distributed caching library for Go", "url": "https://github.com/alexj/distcache"}
        ],
        "publications": [
            {"title": "Scaling Microservices at Stripe", "publication": "InfoQ", "date": "2021"}
        ],
        "honors": [
            {"title": "Google Spot Award", "issuer": "Google", "date": "2023", "description": "For outstanding contribution to developer productivity"},
            {"title": "Stripe Hack Week Winner", "issuer": "Stripe", "date": "2020"}
        ],
        "testScores": [{"name": "GRE", "score": "340/340", "date": "2017"}],
        "organizations": [{"name": "IEEE Computer Society", "role": "Member"}]
    },
    "interests": {
        "companies": [3, 4, 5, 6],
        "groups": [1, 2, 4],
        "schools": ["MIT", "Stanford"],
        "newsletters": ["Software Engineering Daily", "The Pragmatic Engineer"]
    }
}

USERS = [
    {"id": 2, "name": "Priya Patel", "headline": "Product Manager at Meta | Former Consultant | MBA Wharton", "location": "New York, NY", "industry": "Technology", "connections": 1203, "mutualConnections": 23, "isConnected": True, "isPending": False, "isFollowing": True, "isPremium": False, "avatarColor": "#E67E22", "about": "Product leader with 6+ years building consumer products at scale. Passionate about user research and data-driven decision making.", "experience": [{"title": "Senior PM", "company": "Meta", "startDate": "2021", "current": True}], "skills": ["Product Strategy", "User Research", "SQL", "Roadmapping"]},
    {"id": 3, "name": "Sarah Chen", "headline": "VP of Engineering at Stripe | ex-Google | Speaker | Author", "location": "San Francisco, CA", "industry": "Technology", "connections": 4521, "mutualConnections": 45, "isConnected": True, "isPending": False, "isFollowing": True, "isPremium": True, "avatarColor": "#E67E22", "about": "Engineering leader with 15+ years building high-scale systems.", "experience": [{"title": "VP Engineering", "company": "Stripe", "startDate": "2020", "current": True}], "skills": ["Engineering Management", "System Design", "Go", "Distributed Systems"]},
    {"id": 4, "name": "David Kim", "headline": "Data Scientist at Netflix | ML Researcher | PhD Stanford", "location": "Los Gatos, CA", "industry": "Technology", "connections": 892, "mutualConnections": 12, "isConnected": False, "isPending": True, "isFollowing": False, "isPremium": True, "avatarColor": "#16A085", "about": "Machine learning engineer specializing in recommendation systems and NLP.", "experience": [{"title": "Senior Data Scientist", "company": "Netflix", "startDate": "2020", "current": True}], "skills": ["Python", "TensorFlow", "PyTorch", "SQL", "Statistics"]},
    {"id": 5, "name": "Michelle Rodriguez", "headline": "UX Design Lead at Apple | Human-Centered Design | Speaker", "location": "Cupertino, CA", "industry": "Technology", "connections": 2341, "mutualConnections": 8, "isConnected": False, "isPending": False, "isFollowing": True, "isPremium": False, "avatarColor": "#DD2590", "about": "Design leader passionate about creating intuitive and accessible experiences for everyone.", "experience": [{"title": "Design Lead", "company": "Apple", "startDate": "2019", "current": True}], "skills": ["Figma", "User Research", "Prototyping", "Design Systems", "Accessibility"]},
    {"id": 6, "name": "James Thompson", "headline": "Engineering Manager at Amazon | AWS | 3x Founder | Investor", "location": "Seattle, WA", "industry": "Technology", "connections": 3102, "mutualConnections": 17, "isConnected": False, "isPending": False, "isFollowing": False, "isPremium": True, "avatarColor": "#2C3E50", "about": "Technical leader with 12 years experience in distributed systems and cloud infrastructure.", "experience": [{"title": "Engineering Manager", "company": "Amazon", "startDate": "2018", "current": True}], "skills": ["AWS", "Java", "Microservices", "Team Leadership"]},
    {"id": 7, "name": "Marcus Williams", "headline": "Senior Software Engineer at Meta | React Core Team", "location": "Menlo Park, CA", "industry": "Technology", "connections": 1876, "mutualConnections": 34, "isConnected": True, "isPending": False, "isFollowing": True, "isPremium": False, "avatarColor": "#2C3E50", "about": "Open source enthusiast and React contributor. Building the future of web.", "experience": [{"title": "Senior SWE", "company": "Meta", "startDate": "2020", "current": True}], "skills": ["React", "JavaScript", "Open Source", "TypeScript"]},
    {"id": 8, "name": "Aisha Okafor", "headline": "Startup Founder & CEO | Forbes 30 Under 30 | Building EdTech", "location": "Austin, TX", "industry": "Education Technology", "connections": 5430, "mutualConnections": 9, "isConnected": False, "isPending": False, "isFollowing": True, "isPremium": True, "avatarColor": "#915907", "about": "Serial entrepreneur building tools to democratize quality education globally.", "experience": [{"title": "CEO & Co-Founder", "company": "EduAI", "startDate": "2021", "current": True}], "skills": ["Entrepreneurship", "Product", "Fundraising", "EdTech"]},
    {"id": 9, "name": "Ryan Park", "headline": "DevOps Engineer at Spotify | Kubernetes | Terraform | CI/CD", "location": "Stockholm, Sweden", "industry": "Technology", "connections": 743, "mutualConnections": 6, "isConnected": False, "isPending": False, "isFollowing": False, "isPremium": False, "avatarColor": "#6B46C1", "about": "Infrastructure engineer passionate about reliability and developer experience.", "experience": [{"title": "Senior DevOps Engineer", "company": "Spotify", "startDate": "2021", "current": True}], "skills": ["Kubernetes", "Terraform", "AWS", "Docker", "Python"]},
    {"id": 10, "name": "Lisa Zhang", "headline": "Product Designer at Figma | Ex-Dropbox | Design Systems Expert", "location": "San Francisco, CA", "industry": "Technology", "connections": 1654, "mutualConnections": 21, "isConnected": False, "isPending": False, "isFollowing": True, "isPremium": False, "avatarColor": "#8F5849", "about": "Designing products that help teams collaborate and create better together.", "experience": [{"title": "Product Designer", "company": "Figma", "startDate": "2022", "current": True}], "skills": ["Design Systems", "Figma", "UI/UX", "User Testing"]},
    {"id": 11, "name": "Carlos Mendez", "headline": "Head of Growth at Notion | Previously HubSpot | Growth Hacker", "location": "San Francisco, CA", "industry": "Technology", "connections": 2890, "mutualConnections": 14, "isConnected": False, "isPending": False, "isFollowing": False, "isPremium": True, "avatarColor": "#E67E22", "about": "Growth marketing professional helping B2B SaaS companies scale from 0 to 100M+ users.", "experience": [{"title": "Head of Growth", "company": "Notion", "startDate": "2021", "current": True}], "skills": ["Growth Marketing", "SEO", "Analytics", "Product-Led Growth"]},
    {"id": 12, "name": "Emma Wilson", "headline": "Software Engineer at Shopify | Ruby | E-commerce | Remote", "location": "Toronto, Canada", "industry": "Technology", "connections": 623, "mutualConnections": 5, "isConnected": False, "isPending": False, "isFollowing": False, "isPremium": False, "avatarColor": "#16A085", "about": "Backend engineer specializing in scalable e-commerce platforms.", "experience": [{"title": "Software Engineer", "company": "Shopify", "startDate": "2020", "current": True}], "skills": ["Ruby", "Rails", "PostgreSQL", "React"]},
    {"id": 13, "name": "Raj Gupta", "headline": "CTO at FinTech Startup | ex-Goldman Sachs | Blockchain Pioneer", "location": "New York, NY", "industry": "Financial Services", "connections": 3421, "mutualConnections": 11, "isConnected": False, "isPending": False, "isFollowing": True, "isPremium": True, "avatarColor": "#0F5DBD", "about": "Building the next generation of financial infrastructure on blockchain.", "experience": [{"title": "CTO", "company": "CryptoFinance Inc.", "startDate": "2022", "current": True}], "skills": ["Blockchain", "Solidity", "DeFi", "System Architecture"]},
    {"id": 14, "name": "Sophie Martin", "headline": "Data Engineer at Databricks | Apache Spark | MLOps", "location": "Amsterdam, Netherlands", "industry": "Technology", "connections": 912, "mutualConnections": 7, "isConnected": False, "isPending": False, "isFollowing": False, "isPremium": False, "avatarColor": "#DD2590", "about": "Building data pipelines that power ML at scale.", "experience": [{"title": "Senior Data Engineer", "company": "Databricks", "startDate": "2021", "current": True}], "skills": ["Apache Spark", "Python", "SQL", "MLOps", "Airflow"]},
    {"id": 15, "name": "Tyler Brooks", "headline": "Frontend Architect at Vercel | Next.js Core | Web Performance", "location": "Remote", "industry": "Technology", "connections": 4102, "mutualConnections": 28, "isConnected": False, "isPending": False, "isFollowing": True, "isPremium": False, "avatarColor": "#2C3E50", "about": "Working on the edge of web performance. Next.js contributor.", "experience": [{"title": "Frontend Architect", "company": "Vercel", "startDate": "2021", "current": True}], "skills": ["Next.js", "React", "Web Performance", "TypeScript", "Edge Computing"]},
    {"id": 16, "name": "Nina Kowalski", "headline": "Security Engineer at CrowdStrike | Ethical Hacker | Bug Bounty", "location": "Warsaw, Poland", "industry": "Cybersecurity", "connections": 1543, "mutualConnections": 4, "isConnected": False, "isPending": False, "isFollowing": False, "isPremium": False, "avatarColor": "#6B46C1", "about": "Defending organizations from cyber threats through offensive security.", "experience": [{"title": "Senior Security Engineer", "company": "CrowdStrike", "startDate": "2020", "current": True}], "skills": ["Penetration Testing", "Python", "OSCP", "Cloud Security"]},
    {"id": 17, "name": "Kevin O'Brien", "headline": "Recruiter at Nexus | Connecting Top Tech Talent | ex-Google Recruiter", "location": "New York, NY", "industry": "Staffing & Recruiting", "connections": 7823, "mutualConnections": 31, "isConnected": True, "isPending": False, "isFollowing": True, "isPremium": True, "avatarColor": "#915907", "about": "Passionate about connecting great people with great opportunities in tech.", "experience": [{"title": "Senior Technical Recruiter", "company": "Nexus", "startDate": "2022", "current": True}], "skills": ["Technical Recruiting", "Sourcing", "Nexus Recruiter"]},
    {"id": 18, "name": "Ana Souza", "headline": "ML Engineer at OpenAI | NLP Research | LLMs | Author", "location": "San Francisco, CA", "industry": "Artificial Intelligence", "connections": 8902, "mutualConnections": 19, "isConnected": False, "isPending": False, "isFollowing": True, "isPremium": True, "avatarColor": "#DD2590", "about": "Working on aligning large language models with human values. Researcher and engineer.", "experience": [{"title": "ML Engineer", "company": "OpenAI", "startDate": "2022", "current": True}], "skills": ["Python", "PyTorch", "NLP", "Transformers", "RLHF"]},
    {"id": 19, "name": "Jake Anderson", "headline": "iOS Engineer at Uber | Swift | Mobile Architecture | ex-Lyft", "location": "San Francisco, CA", "industry": "Technology", "connections": 934, "mutualConnections": 16, "isConnected": False, "isPending": False, "isFollowing": False, "isPremium": False, "avatarColor": "#E67E22", "about": "Mobile engineer building apps used by millions of riders and drivers daily.", "experience": [{"title": "Senior iOS Engineer", "company": "Uber", "startDate": "2021", "current": True}], "skills": ["Swift", "iOS", "UIKit", "SwiftUI", "Xcode"]},
    {"id": 20, "name": "Patricia Moore", "headline": "VP Product at Salesforce | Ex-Oracle | Enterprise Software | Speaker", "location": "San Francisco, CA", "industry": "Technology", "connections": 5671, "mutualConnections": 22, "isConnected": False, "isPending": False, "isFollowing": False, "isPremium": True, "avatarColor": "#16A085", "about": "Building enterprise software that helps businesses grow and operate efficiently.", "experience": [{"title": "VP Product Management", "company": "Salesforce", "startDate": "2019", "current": True}], "skills": ["Product Management", "Enterprise Software", "CRM", "Salesforce Platform"]},
    {"id": 21, "name": "Hiroshi Tanaka", "headline": "Principal Engineer at Sony | Embedded Systems | C++ | Robotics", "location": "Tokyo, Japan", "industry": "Technology", "connections": 1231, "mutualConnections": 3, "isConnected": False, "isPending": False, "isFollowing": False, "isPremium": False, "avatarColor": "#915907", "about": "Building intelligent systems at the hardware-software boundary.", "experience": [{"title": "Principal Software Engineer", "company": "Sony", "startDate": "2017", "current": True}], "skills": ["C++", "Embedded Systems", "Robotics", "RTOS", "Computer Vision"]}
]
