# EstateMate AI 🏡
### AI-Powered Real Estate Lead Management & Site-Visit Automation

EstateMate AI is a real-estate sales automation platform designed to help residential developers respond to enquiries faster, qualify prospective home buyers, schedule site visits without double booking, and connect serious buyers with the right sales executive.

The platform addresses a common challenge in real-estate sales: leads arrive through multiple channels, responses are delayed, and site visits are coordinated manually without reliable attendance tracking.

**Core objective:** Turn more enquiries into qualified leads and completed site visits through intelligent conversations, reliable scheduling, and actionable sales analytics.

---

## 📌 Problem Statement

Residential developers often receive enquiries through property portals, social media campaigns, websites, and offline advertisements. When these enquiries are managed through inboxes and spreadsheets, several problems arise:

- Delayed responses cause potential buyers to lose interest.
- Duplicate leads create unnecessary follow-ups.
- Sales teams lack a unified view of buyer conversations.
- Site visits are coordinated manually without centralized availability.
- Sales managers cannot reliably measure visit attendance or marketing performance.
- Important buyer context gets lost when a lead is transferred between employees.

EstateMate AI brings lead capture, AI-assisted qualification, site-visit scheduling, and sales handoff into one streamlined workflow.

## 🎯 Business Case

The project is designed around the following illustrative client scenario.

| Metric | Baseline |
|---|---:|
| Monthly leads | 3,000 |
| Monthly advertising and portal spend | ₹30 lakh |
| Average cost per lead | ₹1,000 |
| Median first response time | 14 hours |
| Leads not reached within 48 hours | 35% |
| Lead-to-site-visit conversion | 6% |
| Annual bookings | ₹180–220 crore |

Under the case-study assumptions, 1,050 leads per month are not reached within 48 hours, representing ₹10.5 lakh in monthly lead acquisition spend. This is an estimate of associated lead spend, not guaranteed recoverable revenue or profit.

### Target outcomes

- Reduce median first response time to under 5 minutes.
- Reduce leads not reached within 48 hours to below 5%.
- Improve lead-to-site-visit conversion from 6% to 8% within three months.
- Provide clear visibility into lead sources, visit attendance, and cost per visit.

These are target outcomes, not measured results.

---

## ✨ Key Features

### 1. Unified Lead Management

- Centralized lead list for enquiries from supported sources.
- Source attribution for property portals, social media ads, websites, and hoarding calls.
- Duplicate detection using normalized contact details and configurable matching rules.
- Lead profiles with buyer preferences, project interest, conversation history, and visit status.
- Lead status tracking to support timely follow-ups.

### 2. AI-Powered Buyer Assistant

- Web-based conversational assistant for prospective home buyers.
- English, Hindi, and Gujarati conversation support.
- Answers common questions using an administrator-maintained project fact sheet.
- Collects buyer preferences such as budget, preferred project, BHK configuration, and visit timing.
- Identifies qualified or interested buyers and prepares them for a sales handoff.
- Allows buyers to request a human sales executive at any time.

**Grounded AI:** The assistant should answer only from approved project facts. If information is unavailable, it must tell the buyer that a representative will confirm it and escalate the enquiry. It must not invent project details, quote final prices, or promise discounts.

### 3. Reliable Site-Visit Booking

- Displays available site-visit slots.
- Books a visit only when the selected slot is genuinely available.
- Prevents double booking through server-side availability checks and atomic database operations.
- Records the selected project, visit time, and booking status.
- Provides a project location pin and visit details.
- Supports reminders 24 hours and 2 hours before the visit.
- Tracks whether a buyer attended, cancelled, or missed a visit.

External messaging may initially be simulated during development.

### 4. Sales Executive Handoff

- Assigns a qualified lead to a named sales executive.
- Transfers the conversation history and AI-generated summary.
- Includes the buyer's budget, configuration preference, project interest, questions, and requested next steps.
- Supports human takeover whenever the buyer requests a person or the AI cannot safely answer.
- Flags uncertain or potentially incorrect conversations for sales-head review.

### 5. Sales Dashboard and Analytics

- Total leads and leads by source.
- Median first-response time.
- Leads awaiting follow-up and leads not reached within 48 hours.
- Site visits booked and completed.
- Visit show-up rate.
- Lead-to-visit conversion rate.
- Cost per lead and cost per attended visit by source.

Metrics should be calculated from recorded events and actual marketing spend where available, rather than hard-coded demo values.

### 6. Administrative Controls

- Maintain approved project facts and FAQs.
- Manage site-visit availability and slot capacity.
- Configure project information and registration details.
- Review flagged AI conversations.
- Manage sales assignments and monitor booking activity.

---

## 🔄 End-to-End Workflow

1. **Lead arrives:** An enquiry enters through a supported source and receives a source tag.
2. **Duplicate check:** The system checks whether the buyer already has a matching lead record.
3. **First response:** The AI assistant responds promptly and offers help in the buyer's preferred language.
4. **Qualification:** The assistant asks about budget, BHK preference, project interest, and other relevant needs.
5. **Grounded answers:** Project questions are answered using the approved fact sheet. Missing information is escalated.
6. **Visit scheduling:** The buyer selects an available slot, which the backend validates before confirming the booking.
7. **Confirmation and reminders:** The visit is recorded, and scheduled reminders are sent through the configured messaging mechanism.
8. **Sales handoff:** The assigned executive receives the conversation summary and relevant buyer details.
9. **Attendance tracking:** The visit outcome is recorded for reporting.
10. **Analytics:** The dashboard aggregates response, conversion, attendance, and source-cost metrics.

---

## 🧠 AI Agent Design

EstateMate AI uses an AI assistant connected to controlled backend tools instead of allowing the model to make unrestricted changes.

```text
Buyer Message
      |
      v
Language Detection / Conversation
      |
      v
Fact-Sheet Grounding
      |
      v
Buyer Qualification
      |
      +---- Missing / uncertain fact ----> Human Handoff
      |
      +---- Buyer requests a person ----> Human Handoff
      |
      v
Buyer requests a site visit
      |
      v
Booking Tool
      |
      +---- Slot unavailable -----------> Offer another slot
      |
      +---- Slot available -------------> Confirm booking
      |
      v
Save Visit + Schedule Reminders
      |
      v
Assign Sales Executive + Chat Summary
```

### Booking safety and concurrency

The AI assistant must never assume a slot is available simply because it appeared in an earlier conversation.

The booking tool must:

- Recheck availability on the server.
- Validate the requested slot and project.
- Use a database transaction and appropriate locking or uniqueness constraints.
- Confirm success only after the booking has been committed.
- Return an unavailable response if another buyer books the slot first.
- Offer alternative available slots without fabricating availability.

The language model proposes actions; the backend remains the authority for bookings and business rules.

---

## 🛠️ Technology Stack

The implementation should reflect the technologies actually present in the repository.

### Frontend
- React.js
- Vite
- JavaScript
- Tailwind CSS, where used
- Axios for API communication

### Backend
- Python
- FastAPI
- Pydantic for request and response validation
- SQLAlchemy for database access

### Database
- PostgreSQL

### AI and Automation
- LLM-powered conversational assistant
- Approved project fact-sheet retrieval
- Booking tool with server-side validation
- Scheduled reminders and human handoff

### Development and Deployment
- Git and GitHub
- Vercel for the frontend
- Render for the backend

AI providers, reminder infrastructure, and deployment services should be listed as implemented integrations only after they are configured and working.

---

## 🖥️ Core Application Screens

The core deliverable can be organized into approximately eight focused screens.

| Screen | Purpose |
|---|---|
| 1. Lead List | Unified enquiries, source tags, statuses, and duplicate indicators |
| 2. Lead Details | Buyer preferences, contact history, and follow-up information |
| 3. AI Buyer Chat | Multilingual qualification and grounded answers |
| 4. Site-Visit Booking | Available slots, booking confirmation, and location details |
| 5. Sales Handoff | Assigned executive, conversation summary, and next steps |
| 6. Sales Dashboard | Response times, conversions, attendance, and source performance |
| 7. Fact-Sheet Editor | Approved project facts and FAQs |
| 8. Slot Management | Visit availability, capacity, and scheduling controls |

The buyer-facing experience should be mobile-first, calm, and minimal, with clear typography, restrained colors, and an uncomplicated booking flow.

---

## 🔒 Privacy, Compliance, and Responsible AI

### RERA-aware project information

- Display applicable project registration details in promotional material.
- Do not make claims beyond approved and registered project information.
- Avoid unverified claims about pricing, returns, amenities, or availability.
- Require human confirmation for final prices and discounts.

### DPDP Act 2023 and consent

- Collect and use buyer contact information for clearly stated purposes.
- Record consent where required before initiating contact.
- Honor opt-outs and prevent further promotional contact where applicable.
- Minimize personal data collection and restrict access by role.
- Apply appropriate retention, access, and security controls.

### WhatsApp integration

WhatsApp messaging can be added as a subsequent integration. It should respect opt-in requirements, approved message templates where applicable, and opt-out requests. Until the integration is configured, messages and delivery can be simulated for the core demonstration.

These controls should be validated against applicable legal requirements before production use.

---

## 🧪 Sample Data

The demonstration dataset can include the following illustrative leads.

| Lead ID | Name | Source | Project | Preference | Visit status |
|---|---|---|---|---|---|
| LD-58210 | Hardik Patel | Property portal | Project 1 | 3 BHK | Booked |
| LD-58211 | Nidhi Shah | Social media ad | Project 2 | 2 BHK | Not booked |
| LD-58224 | Kavita Joshi | Hoarding call | Project 2 | 2 BHK | Visited |

Sample bookings, timestamps, projects, and contact details should be clearly identified as demo data. Seed records must not be represented as real customer enquiries or verified property offers.

---

## 🚀 Local Setup

### Prerequisites

- Node.js and npm
- Python 3
- PostgreSQL
- Git

### 1. Clone the repository

```bash
git clone https://github.com/Mohitkr09/Estate_AI.git
cd Estate_AI
```

### 2. Start the frontend

```bash
cd client
npm install
```

Create `client/.env` with the backend URL:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Run the development server:

```bash
npm run dev
```

### 3. Start the backend

Open a separate terminal:

```powershell
cd server
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Configure the environment variables required by the application, including the database connection and any required AI credentials. Keep secrets out of source control.

Start FastAPI:

```bash
uvicorn main:app --reload
```

This command assumes the application instance is named `app` in `main.py`. Adjust it to match the actual backend entry point.

API documentation is available at:

`http://127.0.0.1:8000/docs`

---

## ☁️ Deployment Architecture

The intended production architecture is:

- **Frontend:** Vercel
- **Backend:** Render
- **Database:** Managed PostgreSQL

The frontend must point to the deployed backend URL. The backend must allow the deployed frontend origin through CORS, use production secrets, and connect to the production database.

A deployment should be considered complete only after authentication, lead creation, AI responses, booking concurrency, reminders, and analytics have been tested against the production environment.

---

## 📊 Success Metrics

The project will be evaluated against these case-study targets:

| Metric | Baseline | Target |
|---|---:|---:|
| Median first-response time | 14 hours | Under 5 minutes |
| Leads not reached within 48 hours | 35% | Under 5% |
| Lead-to-site-visit conversion | 6% | 8% within 3 months |

These targets describe the desired business impact. Actual performance should be measured after deployment using recorded lead and visit events.

---

## 🗺️ Six-Week Delivery Plan

| Week | Milestone |
|---|---|
| 1 | Requirements, data model, authentication, and lead ingestion |
| 2 | Lead list, duplicate checks, and buyer profiles |
| 3 | Grounded AI chat and buyer qualification |
| 4 | Transaction-safe booking, slot management, and reminders |
| 5 | Sales handoff, dashboard, and administrative controls |
| 6 | Testing, security review, deployment, and demonstration |

## 🤝 Development Principles

- Keep the interface focused and mobile-friendly.
- Treat the backend as the source of truth for booking availability.
- Keep AI responses grounded in approved project facts.
- Preserve conversation context during human handoff.
- Measure business outcomes using recorded events.
- Separate sample data from genuine leads and verified projects.

## 📄 License

No license has been specified. Add a `LICENSE` file before distributing this project under an open-source license.

---

**EstateMate AI** — responding faster, qualifying smarter, and turning more real-estate enquiries into site visits.
