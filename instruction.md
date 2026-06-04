Build a production-quality live voting web app for an Oxford-style conference debate.

Context
Participants will arrive in the room, scan a QR code, and vote from their phones. They should be able to vote before the debate starts, continuously change their vote during the debate, and cast a final vote after the debate ends. The main screen in the room should update live in real time, but it must show only aggregate results. Do not display voter names, device IDs, or any participant-level information.

Core requirements
- The app supports a single live debate room at a time, with about 60 concurrent participants.
- The experience must be mobile-first, fast, simple, and reliable on unstable conference Wi-Fi.
- Participants join by scanning a QR code or opening a short link.
- Voting is anonymous.
- The public screen shows only totals and percentages.
- The organizer can create, start, pause, and end voting.
- The organizer can reset the room and export results.

Voting flow
Implement three phases:
1. Pre-debate vote
   - Participants cast their initial position before the debate starts.
2. Live debate vote
   - While the debate is running, participants can change their vote at any time.
   - Vote updates must appear instantly on the public screen.
3. Post-debate final vote
   - After the debate ends, participants cast a final vote.
   - Final vote is stored separately from the pre-debate and live phases.
   - Once closed, results are locked.

Privacy and display rules
- Never expose participant identities.
- Never show individual vote history on the public screen.
- Never show device IDs, names, or usernames to the audience.
- Public display must show only aggregate counts, percentages, and simple charts.
- Internal storage may keep anonymous vote records only as needed for correctness.

Pages
- /admin
  Organizer dashboard for creating and controlling the debate.
- /vote/[roomId]
  Mobile participant page opened from QR code.
- /screen/[roomId]
  Projected public display with aggregate live results.
- /results/[roomId]
  Read-only results page after voting ends.

Suggested stack
Use the simplest reliable modern stack:
- Next.js
- React
- TypeScript
- Tailwind CSS
- Socket.IO or WebSockets for realtime updates
- PostgreSQL
- Prisma
- QR code generation library

If a simpler implementation is more reliable for an MVP, choose reliability over complexity.

Data model
Create a clean schema for:
- DebateRoom
- DebatePhase
- VoteOption / Position
- AnonymousParticipantSession
- Vote
- VoteSnapshot or VoteHistory if needed

Behavior details
- One anonymous participant session per browser/device.
- A participant can change their vote within the same phase, but only one active vote per phase should count.
- Realtime updates should recalculate aggregate totals instantly.
- If the connection drops, the participant should reconnect automatically and retain their current state.
- The screen should never reveal who voted for what.
- Add basic validation for room codes and votes.
- Prevent duplicate or malformed submissions.
- Use optimistic UI where appropriate, but keep server-side truth authoritative.

Public screen requirements
- Large readable typography for projector use.
- Show debate title, phase status, current totals, and percentages.
- Include a clear visual chart such as bars or a donut.
- Smooth transitions when results change.
- Show whether voting is open, paused, or closed.
- Do not show any voter-level detail.

Admin requirements
- Create room with debate title, question, and answer options.
- Generate QR code and short join URL.
- Start and end each voting phase.
- Lock results after final voting.
- Reset room for a new session.
- Export aggregate results to CSV and JSON.

Implementation expectations
- Create a clean folder structure.
- Include seed/demo data for one sample debate.
- Include README with setup and run instructions.
- Include environment variable examples.
- Include database migration/schema.
- Add comments only where they help future maintenance.
- Keep the codebase maintainable and easy to extend.
- Make the app look polished and conference-ready.

Deployment target
Choose a deployment approach that keeps the app simple to run for an event organizer. Prefer a setup that can be hosted on a standard web platform with a managed database.

Acceptance criteria
- A participant can scan a QR code and vote in under 10 seconds.
- Votes update live on the screen when participants change their minds.
- The system supports roughly 60 concurrent participants without trouble.
- The screen shows only aggregate data.
- The app has clear phase separation: pre, live, final.
- The organizer can run the full debate from start to finish without technical help.

Before coding
- Pick the most reliable MVP architecture.
- Implement the simplest working version first.
- Make sure realtime voting, anonymity, and phase separation are correct before adding extras.
- If there is any ambiguity, choose the option that best fits a live conference setting.