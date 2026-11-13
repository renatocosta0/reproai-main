Bloco 1 (Imagem 1)
inception42
Brain Health Agent Lab
FROM PROTOTYPE TO PRODUCTION
Demo home
How it works
Clinical workspace
Multicognitive Studio
Review & plan
Validation dashboard
Clinic visit & record
Patient monitoring
Documentation
LOCAL RESEARCH PROTOTYPE
Dr. Nanea Ekelaka
Senior Applied AI Scientist, Inception42
Hack24DB | 4 November 2026
Agent & visit edition · v3.2

Home -- Back 06 Patient monitoring
Play ready demo Next page →
Dated encounter records
3
Patient-specific history
Signals awaiting review
4
Acknowledgement is not resolution
Outstanding follow-up tasks
2
1 overdue · administrative status
Latest adjusted change
-2.13
Illustrative completion units
What to review first
Reported difficulty with familiar daily tasks. Read the observations alongside this concern, the assessment conditions and unresolved information.
02 CHANGE
Two charts. Two different questions.
What was recorded at each encounter, and how did each calculation compare with its baseline?
Synthetic monitoring demonstration. Updates when opened or refreshed; no continuous sensor feed, background notification, hospital connection or automated care action. Reviews are saved in this browser only.
OBSERVED TASK RESULT
Recorded observations over time
10
7/10
6/10
5/10
0
1 10-07 2 10-21 3 11-04
Hover, focus or tap a point for full encounter details.
Each point is the current observation from one dated encounter, out of 10—not an average or disease-risk score. Missing results have no point. Line joins only comparable encounters on different dates.
Up to eight most recent encounters are plotted. Numbers match the full table below. Dates: MM-DD.
ILLUSTRATIVE BASELINE COMPARISON
Adjusted change at each encounter
1 -0.63
0
-1.13
-2.13
-4
1 10-07 2 10-21 3 11-04
Hover, focus or tap a point for full encounter details.
Each dot is that encounter's adjusted change; each vertical line is its illustrative 95% interval. Zero means no change beyond the assumed practice gain. Shared baselines or overlapping observations are not independent evidence. Overlapping intervals do not test whether visits differ.
Up to eight most recent encounters are plotted. Numbers match the full table below. Dates: MM-DD.

Bloco 2 (Imagem 2)
inception42
Brain Health Agent Lab
FROM PROTOTYPE TO PRODUCTION
Demo home
How it works
Clinical workspace
Multicognitive Studio
Review & plan
Validation dashboard
Clinic visit & record
Patient monitoring
Documentation
LOCAL RESEARCH PROTOTYPE
Dr. Nanea Ekelaka
Senior Applied AI Scientist, Inception42
Hack24DB | 4 November 2026
Agent & visit edition · v3.2

BRAIN HEALTH REVIEW ASSISTANT
Synthetic cases · local only Sign out Guide me عربي
Home -- Back 07 Documentation
Play ready demo Next page →
07 / DOCUMENTATION
Explore the workflow.
An interactive guide to the agents, calculations and clinician checkpoints. Scroll through the infographic or use its links to explore the prototype.
Expand infographic
INCEPTION42 · HACK2SKILL LECTURE · 4 NOVEMBER 2026
Brain Health Agent Lab
How the workflow runs
A fictional patient's clinic visit, from arrival to one documented electronic record. Agents prepare the information, a formula tool calculates the change, GPT-5.5 explains the result, and a clinician makes the decision.
7
named agents, each with a tool and a stated limit (plus 1 human review role)
6
inspectable stages with explicit gates
2
fictional patients · SYN-P001 to P005
0
human decision point: the clinician approves
0
scores written by an LLM. All numbers come from the tool
v3.2 · Agent & visit edition
brainagent.hack2skill.netlify.app
@inception42.ai sign-in
Live GPT-5.5 tool calling
English / عربي
4 Studio activities · logged separately

Bloco 3 (Imagem 3)
14
named agents, each with a tool and a stated limit (plus 1 human review role)
12
inspectable stages with explicit gates
5
fictional patients · SYN-P001 to P005
1
human decision point: the clinician approves
0
scores written by an LLM. All numbers come from the tool
v3.2 · Agent & visit edition
brainagent.hack2skill.netlify.app
@inception42.ai sign-in
Live GPT-5.5 tool calling
English / عربي
4 Studio activities · logged separately
THE WORKFLOW IN 6 STEPS
Prepare the information. Keep the clinician in control.
This is the short version of page 05 (Clinic visit & record). Every step is logged, and a failed gate stops all later clinical work.
Arrive
Reception opens a demo encounter for a fictional patient.
Visit Coordinator
Check
The patient's permission, the safety flag, missing data, sensory access and protocol are each checked as a gate.
Rule agents
Calculate
A versioned formula tool computes change from the personal baseline.
Scoring Agent
Explain
GPT-5.5 calls the tool, then explains the result in English and Arabic.
GPT-5.5 · optional
Decide
The clinician reviews the contributing factors, chooses a route and approves the plan.
Human
Document
One dated record, including charts and an audit trail, exportable as HTML, JSON or PDF.
Visit Record Agent

Bloco 4 (Imagem 4)
THE WORKFLOW IN 6 STEPS
Prepare the information. Keep the clinician in control.
This is the short version of page 05 (Clinic visit & record). Every step is logged, and a failed gate stops all later clinical work.
Arrive
Reception opens a demo encounter for a fictional patient.
Visit Coordinator
Check
The patient's permission, the safety flag, missing data, sensory access and protocol are each checked as a gate.
Rule agents
Calculate
A versioned formula tool computes change from the personal baseline.
Scoring Agent
Explain
GPT-5.5 calls the tool, then explains the result in English and Arabic.
GPT-5.5 · optional
Decide
The clinician reviews the contributing factors, chooses a route and approves the plan.
Human
Document
One dated record, including charts and an audit trail, exportable as HTML, JSON or PDF.
Visit Record Agent
BOUNDED AGENTIC ARCHITECTURE
One coordinator. Four lanes of responsibility.
The Visit Coordination Agent runs each stage in a fixed order. It reads the current state, calls one tool, checks the result and hands off to the next stage. It can never approve care by itself.
STAGES 01-04 · RULES
Consent, Safety, Context & Quality
STAGES 05-09 · ASSISTANCE
Care Pathway, Model Liaison, Evidence
THE COORDINATOR
Visit Coordination

Bloco 5 (Imagem 5)
Visit Coordination Agent
Fixed order · explicit gates · every step recorded
State Tool Clinician
STAGES 01-04 · RULES
Consent, Safety, Context & Quality
Check access. Stop or hold when needed. Unknowns stay null.
STAGES 05-09 · ASSISTANCE
Care Pathway, Model Liaison, Evidence
Contributor prompts, source IDs, model output or null.
STAGES 10-12 · HUMAN OVERSIGHT
Clinician → plan → follow-up
Approval required. Evaluation always recorded.

Bloco 6 (Imagem 6)
Choose a fictional case to replay its run. A stop or hold skips the later clinical stages, but stage 12 (evaluation and equity audit) is always recorded.
Leila SYN-P002 · function concern
Maya SYN-P001 · routine
Omar SYN-P003 · hearing
Sam SYN-P004 · missing data
Noor SYN-P005 · sudden confusion
No permission any case
Replay
01 Permission
Consent & Access
PASSED
02 Immediate safety
Safety Triage
PASSED
03 Risk context
Clinical Context
PASSED
04 Access & quality
Data Quality & Access
PASSED
05 Baseline & protocol
Assessment Protocol
PASSED
06 Change analysis
Cognitive Change Scoring
PASSED
07 Prevention & access
Care Pathway
PENDING
08 Optional model
Specialist Model Liaison
PENDING
09 Evidence & report
Evidence & Documentation
PENDING
10 Clinician review
Human decision
PENDING
11 Follow-up & practice
Follow-up Coordination
PENDING
12 Evaluation & equity
Quality & Equity Audit
PENDING
Rules
Scoring
Assistance
Human oversight
Running...
The coordinator executes one tool per stage.
See the calculation in page 01 →
STAGE 06 · COGNITIVE CHANGE SCORING AGENT
Compare each person with their own baseline.
Leila's five comparable auditory observations (completions out of 10). Visits 1–3 form the baseline and

Bloco 7 (Imagem 7)
Choose a fictional case to replay its run. A stop or hold skips the later clinical stages, but stage 12 (evaluation and equity audit) is always recorded.
Leila SYN-P002 · function concern
Maya SYN-P001 · routine
Omar SYN-P003 · hearing
Sam SYN-P004 · missing data
Noor SYN-P005 · sudden confusion
No permission any case
Replay
01 Permission
Consent & Access
PASSED
02 Immediate safety
Safety Triage
PASSED
03 Risk context
Clinical Context
PASSED
04 Access & quality
Data Quality & Access
PASSED
05 Baseline & protocol
Assessment Protocol
PASSED
06 Change analysis
Cognitive Change Scoring
PASSED
07 Prevention & access
Care Pathway
PASSED
08 Optional model
Specialist Model Liaison
SKIPPED
09 Evidence & report
Evidence & Documentation
PASSED
10 Clinician review
Human decision
AWAITING HUMAN
11 Follow-up & practice
Follow-up Coordination
HELD
12 Evaluation & equity
Quality & Equity Audit
PASSED
Rules
Scoring
Assistance
Human oversight
Review-ready — clinician review
z = -4.02 and a reported change in daily function → suggested route: qualified clinical review. Stage 10 waits for the human, and follow-up stays held until approval. (Stage 8 is skipped because no specialist model was requested.)
See the calculation in page 01 →
STAGE 06 · COGNITIVE CHANGE SCORING AGENT
Compare each person with their own baseline.

Bloco 8 (Imagem 8)
07 Prevention & access
Care Pathway
PASSED
08 Optional model
Specialist Model Liaison
SKIPPED
09 Evidence & report
Evidence & Documentation
PASSED
10 Clinician review
Human decision
AWAITING HUMAN
11 Follow-up & practice
Follow-up Coordination
HELD
12 Evaluation & equity
Quality & Equity Audit
PASSED
Rules
Scoring
Assistance
Human oversight
Review-ready — clinician review
z = -4.02 and a reported change in daily function → suggested route: qualified clinical review. Stage 10 waits for the human, and follow-up stays held until approval. (Stage 8 is skipped because no specialist model was requested.)
See the calculation in page 01 →
STAGE 06 · COGNITIVE CHANGE SCORING AGENT
Compare each person with their own baseline.
Leila's five comparable auditory observations (completions out of 10). Visits 1–3 form the baseline and visits 4 and 5 (today) are the follow-up. The same JavaScript tool runs in the browser and on the server, and a Python reference version is checked against it in tests.
TOOL CHANGE_GROUPEDMEANS - GROUPED-MEANS 1.5

Bloco 9 (Imagem 9)
✓ verify session ✓ fixed case ID ✓ gates passed
Request 1: must call calculate_cognitive_change
tool_call { values: [8,7,7,6,5] }
✓ validate args → execute versioned formula
result { adjusted: -2.13, z: -4.02, CI: }
Request 2: tool result + explanation schema
Authenticated
Requires a confirmed @inception42.ai identity session and a same-origin JSON POST.
Fixed inputs
Accepts only fixed fictional case IDs. Arbitrary notes and real records are rejected.
Validated
Tool arguments are checked and the explanation must pass a schema check (EN + AR).
Fails visibly
If the call fails, the record shows a labelled scripted explanation. A failed call is never labelled as live AI.
Open page 05 · saved visit records →
STAGES 10–12 · VISIT RECORD AGENT
One visit. One record. Every handoff documented.
The clinician role reviews the contributing factors, the information gaps and the evidence, then approves. Only then is the follow-up task prepared. The record is saved in this browser and can be exported.

Bloco 10 (Imagem 10)
Requires a confirmed @inception42.ai identity session and a same-origin JSON POST.
Accepts only fixed fictional case IDs. Arbitrary notes and real records are rejected.
Tool arguments are checked and the explanation must pass a schema check (EN + AR).
If the call fails, the record shows a labelled scripted explanation. A failed call is never labelled as live AI.
Open page 05 · saved visit records →
STAGES 10–12 · VISIT RECORD AGENT
One visit. One record. Every handoff documented.
The clinician role reviews the contributing factors, the information gaps and the evidence, then approves. Only then is the follow-up task prepared. The record is saved in this browser and can be exported.
Clinician review (human)
Choose the factors to discuss and the care route, acknowledge the limitations, and type a reviewer name. This is demonstration sign-off, not an authenticated clinical signature. The scripted reviewer "Dr Amal" is clearly labelled as fictional.
Follow-up Coordination Agent
Creates a 14-day follow-up task with a due date. It stays pending: nothing is booked and no message is sent.
Quality & Equity Audit Agent
Records the gates, tool calls, versions and outcomes. The cohort-level metrics (48 synthetic records, ICC, Wilson CIs) are on page 04.
Open page 04 · Validation dashboard →
Visit Record Agent
Closes the encounter and saves it to the browser library. It can be reopened after a refresh.
INCEPTION42 · BRAIN HEALTH AGENT LAB
Electronic visit record
Synthetic teaching record · not a hospital EHR
Patient ID SYN-P002 · Leila, 72
Visit ID VIS-YYMMDD-XXXXXXX
Visit date Asia/Dubai date stamp
Follow-up: Daily function change

Bloco 11 (Imagem 11)
Quality & Equity Audit Agent
Records the gates, tool calls, versions and outcomes. The cohort-level metrics (48 synthetic records, ICC, Wilson CIs) are on page 04.
Open page 04 · Validation dashboard →
Visit Record Agent
Closes the encounter and saves it to the browser library. It can be reopened after a refresh.
Practice Coaching Agent (separate)
Runs the four Studio activities in a separate Studio log, with observation and practice labelled. Practice results never change a clinical score.
Observations
4 historical + today's 5th
Adjusted change · z
-2.13 · -4.02
Explanation
Live GPT-5.5 or labelled scripted text
Route
Qualified clinical review
Follow-up
14 days · pending, not booked
Summaries
Clinician note + EN / AR plans
Audit
Timestamped handoff timeline
View HTML report
Complete JSON
Print / PDF
Try an activity in page 02 · Studio →
PAGE 02 · MULTICOGNITIVE STUDIO · PRACTICE COACHING AGENT
Four activities, four cognitive targets. Benefit not yet proven.
Each activity is designed to engage one cognitive domain, using what the person sees, hears or does. The prototype records what happened during each round. It does not claim that the activities improve memory, attention or flexibility, because the published evidence is mixed and these tasks are not validated.
How to read the labels: RUNS IN PROTOTYPE · SIMULATED / SYNTHETIC · PROPOSED FOR PRODUCTION · EVIDENCE STATUS

Bloco 12 (Imagem 12)
Try an activity in page 02 · Studio →
PAGE 02 · MULTICOGNITIVE STUDIO · PRACTICE COACHING AGENT
Four activities, four cognitive targets. Benefit not yet proven.
Each activity is designed to engage one cognitive domain, using what the person sees, hears or does. The prototype records what happened during each round. It does not claim that the activities improve memory, attention or flexibility, because the published evidence is mixed and these tasks are not validated.
How to read the labels: RUNS IN PROTOTYPE · SIMULATED / SYNTHETIC · PROPOSED FOR PRODUCTION · EVIDENCE STATUS
Piano sequence
Memory · sequencing
Notes C, E, G and A are shown, played or both, and the person repeats the order on keys 1–4.
See Hear See + Hear Respond
Visual attention
Selective attention
Find every ★ among distracting shapes, then submit.
See Respond
Rule switching
Flexibility
Answer by SHAPE or COLOUR as the rule changes between trials.
See Respond
Recorded: the rule, the stimulus, the response and response time for each trial, and correct trials out of total.
Everyday recall
Self-reported recall
Learn everyday words, hide them, type what is remembered, then complete a self-check.
See Remember Respond
Every round is labelled fixed observation (constant difficulty) or adaptive practice (the level moves up one step after a round that meets that activity's success rule and down one step otherwise, within levels 1–4). Visual and auditory versions are never treated as interchangeable. RUNS IN PROTOTYPE

Bloco 13 (Imagem 13)
Try an activity in page 02 · Studio →
PAGE 02 · MULTICOGNITIVE STUDIO · PRACTICE COACHING AGENT
Four activities, four cognitive targets. Benefit not yet proven.
Each activity is designed to engage one cognitive domain, using what the person sees, hears or does. The prototype records what happened during each round. It does not claim that the activities improve memory, attention or flexibility, because the published evidence is mixed and these tasks are not validated.
How to read the labels: RUNS IN PROTOTYPE · SIMULATED / SYNTHETIC · PROPOSED FOR PRODUCTION · EVIDENCE STATUS
Piano sequence
Memory · sequencing
Notes C, E, G and A are shown, played or both, and the person repeats the order on keys 1–4.
See Hear See + Hear Respond
Visual attention
Selective attention
Find every ★ among distracting shapes, then submit.
See Respond
Rule switching
Flexibility
Answer by SHAPE or COLOUR as the rule changes between trials.
See Respond
Recorded: the rule, the stimulus, the response and response time for each trial, and correct trials out of total.
Everyday recall
Self-reported recall
Learn everyday words, hide them, type what is remembered, then complete a self-check.
See Remember Respond
Recorded: the free-recall test and the self-reported checklist. It is not scored independently.
Every round is labelled fixed observation (constant difficulty) or adaptive practice (the level moves up one step after a round that meets that activity's success rule and down one step otherwise, within levels 1–4). Visual and auditory versions are never treated as interchangeable. RUNS IN PROTOTYPE

Bloco 14 (Imagem 14)
Home -- Back 03 How the agents work
Play ready demo Next page →
01-04 / RULES
Consent, Safety & Context Agents
Check access. Stop or hold when needed.
05-09 / SCORING AGENT
Cognitive Change Scoring Agent
Personal baseline, practice adjustment, uncertainty.
THE COORDINATOR
Visit Coordination Agent
State → tool → check → handoff
Fixed order. Explicit gates. Every step recorded.
07-09 / ASSISTANCE
Evidence & Documentation Agent
Contributor prompts, source IDs, model or null.
10-12 / HUMAN OVERSIGHT
Clinician → plan → follow-up
Approval required. Evaluation always recorded.
Visit Coordination Agent
Inspectable role
Working now: a deterministic, incremental 12-stage state machine. Each next stage click executes one tool. Upstream stops and holds skip later clinical stages; stage 12 always records the outcome. Review pauses release until a human decision.
Production: a durable workflow service with typed contracts, authenticated checkpoints, recovery, audit and a staffed review queue.
01
Scoring agent calls tools
Requests the formula tool, checks its output, and explains the scores.
02
Scoring Agent explains
Live, tool-grounded explanation in the visit simulation; model status stays visible.
03
Rules gate
Permission, safety, access and evidence checks.
04
Clinicians decide
Interpretation, care route and the plan for the person.
Follow the lecture demo

01 Inspect the orchestrator and tools.

01 Run Leila's five-visit case through 12 stages.

03 Review contributors, choose a plan, approve; show English and Arabic summaries.

02 Try the visual piano task; inspect its separate log.

04 Filter 48 synthetic records by language.

01 Show Noor's stop and Omar's hold.
A research prototype, with honest boundaries
Fictional cases and simulated review. Scoring Agent can explain verified tool results when connected. Demo electronic visit records are saved in this browser and can be exported; no hospital EHR is connected. The measurements and Arabic test require validation before clinical use.
Clinical pilot path: co-design → local measurement validation → approved integrations and staffed review → monitored pilot. Sources R1–R9 and the formula are available below.
SCRIPTED LECTURE DEMO · 1 / 4
The coordinator connects the workflow
Agents prepare and explain information. The clinician retains the assessment and decision.
Speed
Replay
Exit playback

Bloco 15 (Imagem 15)
inception42
Brain Health Agent Lab · Inception42
4 November 2026
5
Challenge requirements and demo coverage
1 Culturally valid, accessible
Arabic/English instructions; hearing concern holds the auditory case
Simulated
Arabic not yet validated
2 Longitudinal change
Personal baseline vs follow-up, practice-adjusted, with uncertainty
Working in demo
Synthetic calibration
3 Integrated risk context
Sleep, metabolic, mood, lifestyle, function, family history; genomics needs its own permission
Simulated
No combined risk score
4 Prevention and timely care
Treatable-contributor prompts, care routes, bilingual summary
Working in demo
Clinician chooses
5 Safety and oversight
Sudden change bypasses routine work. Care actions require approval.
Working in demo
Approval simulated
6 Local validation
Sensitivity/specificity with 95% CI, ICC, referral burden, by subgroup
Working in demo
48 synthetic records

Bloco 16 (Imagem 16)
inception42
Brain Health Agent Lab · Inception42
4 November 2026
6
Who does what: clear roles
Cognitive Change Scoring Agent
Calls the versioned formula tool; checks and explains change and uncertainty.
GPT-5.5 explains
Calls the scoring tool, then explains its output in English and Arabic. Other agent roles are scripted.
Safety & quality agents gate
Permission, safety, access and evidence checks can stop or hold the case.
Clinicians decide
Interpretation, referral and the plan for the person.
The Visit Coordination Agent connects these roles. Clinical decisions stay with the clinician.

Bloco 17 (Imagem 17)
inception42
Brain Health Agent Lab · Inception42
4 November 2026
8
The Brain Health Review Assistant
AGENT ARCHITECTURE · scripted roles; optional live GPT-5.5 scoring explanation
Person & care partner
Concerns · onset · function
Record context (synthetic)
Medicines · results · risk context
Observation history (synthetic)
Instrument · language · conditions
Consent, Safety & Accessibility Agents
Urgent concern → immediate human handoff
Visit Coordination Agent
Tracks state · calls tools · pauses · requests review
Clinical Context Agent
Authored fields (demo)
Cognitive Change Scoring Agent
Code scores · GPT explains
Evidence & Documentation Agent
Care Pathway Agent prompts
Specialist Model Liaison Agent
Validated estimate or null
Source-linked review draft
What changed · contributors · gaps · actions
HUMAN APPROVAL GATE
Clinician reviews & decides
Choose route and activities · approve or return
Visit Record Agent
Patient ID · date · charts · local save
Plan for the person
Arabic / English
Follow-up Coordination Agent
Pending local task · no booking
STATUS IN THE PROTOTYPE
Working: code + optional GPT
Scripted agents & review
Specialist prediction: null
PARALLEL RESEARCH MODULE
Practice Coaching Agent
Piano sequence · visual attention · rule switching · recall
Studio logs stay separate from clinical scores.
All layers: consent · access · provenance · audit

Bloco 18 (Imagem 18)
inception42
Brain Health Agent Lab · Inception42
4 November 2026
9
The Visit Coordination Agent
ONE CASE, 12 STAGES · AGENT ROLES; CLINICIAN REVIEW IS A HUMAN STEP
01 Consent & Access Agent
passed
02 Safety Triage Agent
passed
03 Clinical Context Agent
passed
04 Data Quality & Accessibility Agent
passed
05 Assessment Protocol Agent
passed
06 Cognitive Change Scoring Agent
passed
07 Care Pathway Agent
passed
08 Specialist Model Liaison Agent
skipped
09 Evidence & Documentation Agent
passed
10 Clinician Review · human
awaiting
11 Follow-up Coordination Agent
held
12 Quality & Equity Audit Agent
passed
IT DOES
Track state, with input, output and reason
Delegate bounded agent/tool tasks in order
Skip later clinical stages on a stop or hold
Await clinician approval; always record stage 12
IT NEVER
Diagnoses or invents a score
Chooses its own path or skips a gate
Approves its own report or acts externally

Bloco 19 (Imagem 19)
inception42
Brain Health Agent Lab · Inception42
4 November 2026
10
Illustrative workflow: one case, end to end
LEILA'S VISIT · diagram labels shortened; full agent names on slides 9 and 11
Person & clinic
1 Arrival & consent
4 prior observations + today
Runs in the prototype
Simulated in the prototype
Proposed for production
Visit Coordination Agent
2 Gate checks
Permission · safety · access
Fixed order. A failed gate stops or holds the case; later stages are marked "skipped".
6 Draft, then pause
Stage 10, awaiting
8 Resume
Only after approval
Agent tool calls
3 Context Agent
Authorised fields + sources
4 Scoring Agent
Adjusted -2.13 · z -4.02
5 Evidence Agent
Approved sources → IDs
Models & data
LLM extraction
To fixed schema (proposed)
Code + GPT-5.5
Code scores; GPT explains
Retrieval index
Approved corpus (proposed)
Clinician
Review remains a human step. Full playback labels its fictional clinician actor; manual mode waits for your review.
7 Review & decide
Contributors · route · approve
Records & follow-up
Draft checkpoints save locally. Review releases the demo plan; nothing is sent or booked. One dated visit record is retained.
9 Visit Record Agent
ID · date · summary · charts
Quality & Equity Audit Agent · stage 12: every step logged with input, output, version and reason, even after a stop or hold

Bloco 20 (Imagem 20)
inception42
Brain Health Agent Lab · Inception42
4 November 2026
11
What each agent does
AGENT / HUMAN ROLE | WHAT IT DOES | DEMO TODAY | PRODUCTION (PROPOSED)
Consent & Access Agent / Safety Triage Agent
Decides whether and how the case proceeds
Working in demo
Rules on fictional flags
Consent, identity, local urgent protocol
Clinical Context Agent
Authorised context with provenance
Simulated
Copies authored fields
FHIR read + language-model extraction with sources
Cognitive Change Scoring Agent
Calls formula tool; explains verified change
Working in demo
Code scores; optional live GPT-5.5 explanation
Versioned code, local norms, validated thresholds
Evidence & Documentation Agent / Care Pathway Agent
Prevention prompts, sources, draft
Simulated
Curated references R1-R7
Retrieval from approved corpus, citation checks
Specialist Model Liaison Agent
Optional target-specific estimate
Not connected
Returns null with a reason
Validated models only, same contract
Clinician Review · human
Review route and activities; approve or return
Simulated
Manual review or labelled scripted actor
Authenticated sign-off; staffed queue
Follow-up Coordination Agent / Quality & Equity Audit Agent
Track next step; measure performance
Working in demo
Local tasks; audit; 48-record evaluation
Care-system task queue; subgroup monitoring

Bloco 21 (Imagem 21)
inception42
Brain Health Agent Lab · Inception42
4 November 2026
12
Five gates decide the path
No permission
STOP
No case data accessed. Gate event recorded.
Sudden change
STOP
Routine work bypassed; urgent human handoff
Missing context or hearing concern
HOLD
Audiology discussion; separate visual baseline
Evidence unavailable
HOLD
Report held; measurements kept
No clinician approval
WAIT
Draft held for review. No care action released.
Underneath every gate: an unavailable value stays null. A missing value never becomes zero.
The Safety Triage Agent checks a supplied flag. It does not detect sudden change; "no flag" is not clinical clearance.

Bloco 22 (Imagem 22)
inception42
Brain Health Agent Lab · Inception42
4 November 2026
15
Five cases, five paths
M
Maya, 63
All gates pass
Adjusted -0.13 · z -0.25
Routine follow-up · no numerical flag
L
Leila, 72
New difficulty with daily tasks
Adjusted -2.13 · z -4.02
Qualified review
O
Omar, 68
Hearing concern, auditory task
No cross-mode substitution
Held · audiology · visual baseline
S
Sam, 58
Missing visit and context
No change estimate
Held · complete context
N
Noor, 77
Sudden confusion reported
Routine work bypassed
Stopped · urgent handoff
Fictional cases; synthetic calibration (SD 1.5, reliability 0.85, practice gain 0.3). Demonstration routes, not clinical thresholds.

Bloco 23 (Imagem 23)
inception42
Brain Health Agent Lab · Inception42
4 November 2026
16
Practice Coaching Agent: Multicognitive Studio
Piano sequence
See or hear notes, repeat the order
Memory · sequencing
See Hear Play
Visual attention
Find targets among distractors
Selective attention
See
Rule switching
Switch between shape and colour rules
Flexibility
See
Everyday recall
Learn words; self-report recall before checklist
Self-reported recall
See Remember
Observation ≠ practice
Fixed observation and adaptive practice are labelled separately in the Studio log. Domains are research targets, not validated scores.
Kept out of the case
Studio logs never change the clinical route. Visual and auditory are not interchangeable.
Evidence is mixed
No significant piano advantage in R5 (n = 268). One flexibility outcome favoured piano in R6. Neither validates this activity.

Bloco 24 (Imagem 24)
inception42
Brain Health Agent Lab · Inception42
4 November 2026
19
Quality & Equity Audit Agent: evaluation
Completion
Who finishes, and who cannot
Test-retest reliability
ICC(A,1), same task and scale
Sensitivity & specificity
With 95% Wilson intervals
Meaningful change
Change flag vs reference change
False-referral burden
Referrals judged unnecessary
Time to assessment
From flag to clinical assessment
Every metric by language, age and education
Runs today on 48 synthetic records. It shows the calculations work, not performance. Reference labels must come from independent qualified assessment.
Assistant quality (pilot plan)
Source accuracy, unsupported advice, missed information, preparation time and clinician workload.

Bloco 25 (Imagem 25)
inception42
Brain Health Agent Lab · Inception42
4 November 2026
22
From prototype stack to production stack
LAYER | PROTOTYPE TODAY | PRODUCTION CANDIDATE
Interface
Company login; English/Arabic; offline demo
Accessible web/tablet app; right-to-left Arabic
Orchestration
Visit Coordination Agent; 12 gated stages
Durable workflow engine; typed state, checkpoints, audit
Measurement
Scoring Agent + formula; synthetic calibration
Versioned, tested scoring; local norms; validated thresholds
Language models
Optional GPT-5.5 tool call + explanation
Approved Arabic-capable endpoint; schema-checked outputs
Evidence
Curated references R1–R9
Clinician-approved corpus with citation checks
Integration
Fictional cases; no hospital EHR connection
Authorised record API (FHIR where supported); partner agreement required
Oversight
Manual demo review or scripted clinician actor
Authenticated sign-off; staffed review queue
Operations
Visit Record Agent: dated record, charts, export
Audit, monitoring, rollback; agreed hosting and data residency

Bloco 26 (Imagem 26)
inception42
Brain Health Agent Lab · Inception42
4 November 2026
24
Key takeaways
From demo to something a health system can pilot.
AI-native. Human-led.
TRY THE PROTOTYPE
Brain Health Agent Lab
Fictional visits · optional live GPT-5.5 · @inception42.ai sign-in
Narrow job, clear owners
Named agents call bounded tools. Clinicians own clinical decisions.
AI inside the gates
Agents work within gates; clinicians decide the care.
Tool-grounded numbers
Scoring Agent calls code; GPT explains. Uncertainty stays visible; missing stays null.
Evaluate from day one
Measure clinical performance by subgroup and evaluate assistant quality.

Bloco 27 (Imagem 27)
inception42
Brain Health Agent Lab
FROM PROTOTYPE TO PRODUCTION
Demo home
How it works
Clinical workspace
Multicognitive Studio
Review & plan
Validation dashboard
Clinic visit & record
Patient monitoring
Documentation
LOCAL RESEARCH PROTOTYPE
Dr. Nanea Ekelaka
Senior Applied AI Scientist, Inception42
Hack24DB | 4 November 2026
Agent & visit edition · v3.2

BRAIN HEALTH REVIEW ASSISTANT
Synthetic cases · local only Sign out Guide me عربي
Home -- Back Demo home
Play ready demo Next page →
INCEPTION42 · HACK2SKILL
A clearer picture.
A prepared clinician.
Follow one person through an agent-assisted brain-health review—from the first concern to a documented visit.
Play the complete demo
Load ready case · no typing →
About 2 minutes · pause or skip at any time · fictional case and scripted clinician
01 Person & context
02 Tools & evidence
VISIT COORDINATION AGENT
Prepare.
Explain.
Document.
Clinician decides
03 Clinician review
04 One visit record
MEET YOUR LECTURE CASE
L
Leila, 72 · SYN-P002
Reported difficulty with familiar daily tasks. Five supplied observations. Questions still to clarify.
Fully prepared teaching case
ONE WORKFLOW · SEVEN VIEWS
Explore the platform, one page at a time.
Pause motion
00 / EXPLORE
How the agents work
See the coordinator, tools and clinician checkpoint.
01 / EXPLORE
Before the consultation
Watch agents organise the concern, context, gaps and calculated change.
02 / EXPLORE
Cognitive activities
Watch four scripted activities and what a clinician could observe.

Bloco 28 (Imagem 28)
inception42
Brain Health Agent Lab
FROM PROTOTYPE TO PRODUCTION
Demo home
How it works
Clinical workspace
Multicognitive Studio
Review & plan
Validation dashboard
Clinic visit & record
Patient monitoring
Documentation
LOCAL RESEARCH PROTOTYPE
Dr. Nanea Ekelaka
Senior Applied AI Scientist, Inception42
Hack24DB | 4 November 2026
Agent & visit edition · v3.2

Home -- Back Demo home
Play ready demo Next page →
A clearer picture.
A prepared clinician.
Follow one person through an agent-assisted brain-health review—from the first concern to a documented visit.
Play the complete demo
Load ready case · no typing →
About 2 minutes · pause or skip at any time · fictional case and scripted clinician
01 Person & context
02 Tools & evidence
VISIT COORDINATION AGENT
Prepare.
Explain.
Document.
Clinician decides
03 Clinician review
04 One visit record
MEET YOUR LECTURE CASE
L
Leila, 72 · SYN-P002
Reported difficulty with familiar daily tasks. Five supplied observations. Questions still to clarify.
Fully prepared teaching case
ONE WORKFLOW · SEVEN VIEWS
Explore the platform, one page at a time.
Pause motion
00 / EXPLORE
How the agents work
See the coordinator, tools and clinician checkpoint.
01 / EXPLORE
Before the consultation
Watch agents organise the concern, context, gaps and calculated change.
02 / EXPLORE
Cognitive activities
Watch four scripted activities and what a clinician could observe.
03 / EXPLORE
Clinician review
Open an editable, prefilled demonstration assessment and plan.
04 / EXPLORE
Evaluation & uncertainty
Explore 48 synthetic records, denominators and subgroup filters.
05 / EXPLORE
One documented visit
Inspect the saved summary, charts, activity appendix and follow-up.

Bloco 29 (Imagem 29)
inception42
Brain Health Agent Lab
FROM PROTOTYPE TO PRODUCTION
Demo home
How it works
Clinical workspace
Multicognitive Studio
Review & plan
Validation dashboard
Clinic visit & record
Patient monitoring
Documentation
LOCAL RESEARCH PROTOTYPE
Dr. Nanea Ekelaka
Senior Applied AI Scientist, Inception42
Hack24DB | 4 November 2026
Agent & visit edition · v3.2

Home -- Back 00 How the agents work
Play ready demo Next page →
01
Scoring agent calls tools
Requests the formula tool, checks its output, and explains the scores.
02
Scoring Agent explains
Live, tool-grounded explanation in the visit simulation; model status stays visible.
03
Rules gate
Permission, safety, access and evidence checks.
04
Clinicians decide
Interpretation, care route and the plan for the person.
Follow the lecture demo

01 Inspect the orchestrator and tools.

01 Run Leila's five-visit case through 12 stages.

03 Review contributors, choose a plan, approve; show English and Arabic summaries.

02 Try the visual piano task; inspect its separate log.

04 Filter 48 synthetic records by language.

01 Show Noor's stop and Omar's hold.
A research prototype, with honest boundaries
Fictional cases and simulated review. Scoring Agent can explain verified tool results when connected. Demo electronic visit records are saved in this browser and can be exported; no hospital EHR is connected. The measurements and Arabic test require validation before clinical use.
Clinical pilot path: co-design → local measurement validation → approved integrations and staffed review → monitored pilot. Sources R1–R9 and the formula are available below.
Agents named for the work they do
Inspect each role, its tool and its limit. The clinician remains a human decision-maker.
Visit Coordination Agent
Consent & Access Agent
Safety Triage Agent
Clinical Context Agent
Data Quality & Accessibility Agent
Assessment Protocol Agent
Cognitive Change Scoring Agent
Care Pathway Agent
Specialist Model Liaison Agent
Not connected
Evidence & Documentation Agent
Follow-up Coordination Agent
Quality & Equity Audit Agent
Visit Record Agent
Practice Coaching Agent
Teaching references R1–R9 · lecture slide 25
Brain Health Agent Lab · Inception42 lecture branding · Dr. Nanea Ekelaka · Hack24DB · 4 November 2026
Teaching prototype with fictional cases. Visit records persist in this browser; export a copy for sharing. Live Scoring Agent receives only fixed fictional case data. No hospital EHR, real patient data, referrals or messages.

Bloco 30 (Imagem 30)
inception42
Brain Health Agent Lab
FROM PROTOTYPE TO PRODUCTION
Demo home
How it works
Clinical workspace
Multicognitive Studio
Review & plan
Validation dashboard
Clinic visit & record
Patient monitoring
Documentation
LOCAL RESEARCH PROTOTYPE
Dr. Nanea Ekelaka
Senior Applied AI Scientist, Inception42
Hack24DB | 4 November 2026
Agent & visit edition · v3.2

Home -- Back Demo home
Play ready demo Next page →
review—from the first concern to a documented visit.
Play the complete demo
Load ready case · no typing →
About 2 minutes · pause or skip at any time · fictional case and scripted clinician
03 Clinician review
Clinician decides
04 One visit record
Summary · charts · follow-up
MEET YOUR LECTURE CASE
L
Leila, 72 · SYN-P002
Reported difficulty with familiar daily tasks. Five supplied observations. Questions still to clarify.
Fully prepared teaching case
ONE WORKFLOW · SEVEN VIEWS
Explore the platform, one page at a time.
Pause motion
00 / EXPLORE
How the agents work
See the coordinator, tools and clinician checkpoint.
01 / EXPLORE
Before the consultation
Watch agents organise the concern, context, gaps and calculated change.
02 / EXPLORE
Cognitive activities
Watch four scripted activities and what a clinician could observe.
03 / EXPLORE
Clinician review
Open an editable, prefilled demonstration assessment and plan.
04 / EXPLORE
Evaluation & uncertainty
Explore 48 synthetic records, denominators and subgroup filters.
05 / EXPLORE
One documented visit
Inspect the saved summary, charts, activity appendix and follow-up.
06 / EXPLORE
Patient monitoring
Follow dated encounters, explain concern flags and inspect pending follow-up.

Bloco 31 (Imagem 31)
inception42
Brain Health Agent Lab
FROM PROTOTYPE TO PRODUCTION
Demo home
How it works
Clinical workspace
Multicognitive Studio
Review & plan
Validation dashboard
Clinic visit & record
Patient monitoring
Documentation
LOCAL RESEARCH PROTOTYPE
Dr. Nanea Ekelaka
Senior Applied AI Scientist, Inception42
Hack24DB | 4 November 2026
Agent & visit edition · v3.2

Home -- Back 01 Before the consultation
Play ready demo Next page →
Choose a fictional case
Leila · 72 · daily-function concern
Simulate permission to access this fictional case
Before you see the patient
Prepared summary · fictional case
Leila · 72 · Supplied case information; not yet confirmed by a clinician.
Reason for review
Reported difficulty with familiar daily tasks
What changed
Everyday functioning · supplied: New difficulty with familiar daily tasks
Repeated observations · change summary: Baseline 7.33 → follow-up 5.50. Illustrative adjusted change -2.13, z -4.02.
Synthetic observations and calibration; these numbers are not a diagnosis.
What could affect interpretation
Supplied context: Sleep: Recent disruption Mood: Not formally assessed.
Assessment conditions: auditory same simulated device. Comparable protocol is selected in this simulation. No hearing difficulty is reported; this is supplied information.
Missing information: Medication list requires confirmation; Mood not formally assessed; Recent metabolic results not supplied; Family history requires clarification.
What needs clarification today
• What has changed in familiar tasks, when did it start, and what examples can the person or care partner give?
• What sleep, medication, mood or access information needs confirming today?
• Were the observation conditions comparable, and which missing information can be clarified today?
The assistant prepares the information I need before the consultation, with gaps made visible.
ILLUSTRATED AGENT WORKFLOW · SCRIPTED CASE
From information to a review-ready draft
INPUT
Five supplied observations
8, 7, 7, 6, 5 · completions / 10
STAGE 12 / 12
Quality & Equity Audit Agent
Evaluation & equity
OUTPUT
Workflow and limitations documented
Inspectable result · no autonomous care action
01 02 03 04 05 06 07 08 09 10 11 12
Always record evaluation, including stops and holds. No case demographics accessed without permission.
Inspect supporting details
Edit clinician review draft →

Bloco 32 (Imagem 32)
inception42
Brain Health Agent Lab
FROM PROTOTYPE TO PRODUCTION
Demo home
How it works
Clinical workspace
Multicognitive Studio
Review & plan
Validation dashboard
Clinic visit & record
Patient monitoring
Documentation
LOCAL RESEARCH PROTOTYPE
Dr. Nanea Ekelaka
Senior Applied AI Scientist, Inception42
Hack24DB | 4 November 2026
Agent & visit edition · v3.2

Home -- Back 01 Before the consultation
Play ready demo Next page →
Reason for review
Reported difficulty with familiar daily tasks
What changed
Everyday functioning · supplied: New difficulty with familiar daily tasks
Repeated observations · change summary: Baseline 7.33 → follow-up 5.50. Illustrative adjusted change -2.13, z -4.02.
Synthetic observations and calibration; these numbers are not a diagnosis.
What could affect interpretation
Supplied context: Sleep: Recent disruption Mood: Not formally assessed.
Assessment conditions: auditory same simulated device. Comparable protocol is selected in this simulation. No hearing difficulty is reported; this is supplied information.
Missing information: Medication list requires confirmation; Mood not formally assessed; Recent metabolic results not supplied; Family history requires clarification.
What needs clarification today
• What has changed in familiar tasks, when did it start, and what examples can the person or care partner give?
• What sleep, medication, mood or access information needs confirming today?
• Were the observation conditions comparable, and which missing information can be clarified today?
The assistant prepares the information I need before the consultation, with gaps made visible.
ILLUSTRATED AGENT WORKFLOW · SCRIPTED CASE
From information to a review-ready draft
INPUT
Five supplied observations
8, 7, 7, 6, 5 · completions / 10
STAGE 12 / 12
Quality & Equity Audit Agent
Evaluation & equity
OUTPUT
Workflow and limitations documented
Inspectable result · no autonomous care action
01 02 03 04 05 06 07 08 09 10 11 12
Always record evaluation, including stops and holds. No case demographics accessed without permission.
Inspect supporting details
Edit clinician review draft →

Bloco 33 (Imagem 33)
inception42
Brain Health Agent Lab
FROM PROTOTYPE TO PRODUCTION
Demo home
How it works
Clinical workspace
Multicognitive Studio
Review & plan
Validation dashboard
Clinic visit & record
Patient monitoring
Documentation
LOCAL RESEARCH PROTOTYPE
Dr. Nanea Ekelaka
Senior Applied AI Scientist, Inception42
Hack24DB | 4 November 2026
Agent & visit edition · v3.2

BRAIN HEALTH REVIEW ASSISTANT
Synthetic cases · local only Sign out Guide me عربي
Home -- Back 03 Clinician review
Play ready demo Next page →
03 / REVIEW & PLAN · SLIDES 8, 10, 11
Prepared by the assistant.
Decided by the clinician.
No typing needed for the lecture
Load the fictional clinician's complete draft, then show the scripted decision. Manual review remains editable.
Load prefilled demo review
Show scripted decision
Draft — awaiting clinician review. Select contributors and a plan before approval. The suggested route is not a clinical decision.
Before you see the patient
Prepared summary · fictional case
Leila · 72 · Supplied case information; not yet confirmed by a clinician.
Reason for review
Reported difficulty with familiar daily tasks
What changed
Everyday functioning · supplied: New difficulty with familiar daily tasks
Repeated observations · change summary: Baseline 7.33 → follow-up 5.50. Illustrative adjusted change -2.13, z -4.02.
Synthetic observations and calibration; these numbers are not a diagnosis.
What could affect interpretation
Supplied context: Sleep: Recent disruption Mood: Not formally assessed.
Assessment conditions: auditory same simulated device. Comparable protocol is selected in this simulation. No hearing difficulty is reported; this is supplied information.
Missing information: Medication list requires confirmation; Mood not formally assessed; Recent metabolic results not supplied; Family history requires clarification.
Editable clinician review draft
Simulated clinician review
Your editable review draft
The summary and gaps are prefilled from the supplied case for you to confirm or correct. In manual review, your assessment and next step start blank; the lecture demo uses labelled scripted examples. Edits do not overwrite the supplied case or the calculated results.
Confirm or correct the summary
Leila, 72, has reported difficulty with familiar daily tasks. Supplied repeated observations fell from a baseline average of 7.33 to 5.50 out of 10.
What still needs clarification
Clarify onset, examples and impact of daily-task difficulty with Leila and her care partner. Confirm medicines, mood, recent sleep disruption, metabolic results and relevant family history.
Your assessment
Simulated clinician assessment: the reported functional change warrants qualified review. The illustrative task calculation supports discussion but does not establish a diagnosis. The activity examples are scripted teaching material, separate from the clinical calculation.
Agreed next step
Scripted agreed plan: arrange qualified review of the reported concern, clarify the missing context and discuss accessible assessment conditions. Record an illustrative 14-day follow-up task; no appointment or referral is actually sent.
I confirmed or corrected the summary.
The clinician can see where the information came from, correct it and document their own decision.
Choose contributors to discuss
Review sleep and recent disruption [R1, R2]
Reconcile medicines with a qualified clinician [R2]
Clarify mood and emotional wellbeing [R2, R4]
Review hearing, vision and access needs [R2]

Bloco 34 (Imagem 34)
inception42
Brain Health Agent Lab
FROM PROTOTYPE TO PRODUCTION
Demo home
How it works
Clinical workspace
Multicognitive Studio
Review & plan
Validation dashboard
Clinic visit & record
Patient monitoring
Documentation
LOCAL RESEARCH PROTOTYPE
Dr. Nanea Ekelaka
Senior Applied AI Scientist, Inception42
Hack24DB | 4 November 2026
Agent & visit edition · v3.2

Home -- Back 03 Clinician review
Play ready demo Next page →
Lecture evidence: one flexibility outcome favoured piano. No broad prevention claim.
R7 · LIVES PROJECT (2020). Multidomain lifestyle interventions and global cognition.
Research on structured multidomain interventions; not evidence for this activity or an individual treatment prescription.
Review metabolic and vascular context [R4]
Clarify daily function with the person and care partner [R2, R3]
Discuss suitable lifestyle support and preferences [R4, R7]
Reviewed contributors, gaps and accessibility needs.
Choose the care route
Qualified clinical review
Review note / rationale (required if changing route)
Scripted teaching example: review the source-linked findings and clarify the listed contributors. The interval is illustrative, not a recommendation.
Optional research activities, separate from the case
Piano sequence
Visual attention
Rule switching
Everyday recall
Not a treatment prescription or proven prevention programme. Selection never adds Studio responses to the case.
Follow-up interval chosen by reviewer (days)
14
Demonstration reviewer name
Dr Amal · fictional clinician
Reviewed the findings, references and limitations. This is simulated sign-off, not clinical authentication.
Approve simulated plan
Return for revision
Brain Health Agent Lab · Inception42 lecture branding · Dr. Nanea Ekelaka · Hack24DB · 4 November 2026
Teaching prototype with fictional cases. Visit records persist in this browser; export a copy for sharing. Live Scoring Agent receives only fixed fictional case data. No hospital EHR, real patient data, referrals or messages.

Bloco 35 (Imagem 35)
inception42
Brain Health Agent Lab
FROM PROTOTYPE TO PRODUCTION
Demo home
How it works
Clinical workspace
Multicognitive Studio
Review & plan
Validation dashboard
Clinic visit & record
Patient monitoring
Documentation
LOCAL RESEARCH PROTOTYPE
Dr. Nanea Ekelaka
Senior Applied AI Scientist, Inception42
Hack24DB | 4 November 2026
Agent & visit edition · v3.2

Home -- Back 04 Evaluation & uncertainty
Play ready demo Next page →
04 / VALIDATION DASHBOARD · SLIDE 19
Evaluate the measurement.
Inspect who it works for.
48 fixed synthetic records demonstrate the calculations, not clinical performance. Filter by language, age and education; inspect denominators and uncertainty.
Language
All languages
Age
All ages
Education
All education groups
Download simple reporting guide
Export reporting checklist .JSON
DECIDE-AI · 2022
How to interpret and audit this report
This report separates the supplied case information, calculated results and demonstration reviewer's decisions.
Synthetic teaching demonstration. No live clinical evaluation is represented. DECIDE-AI informs the reporting structure; this is not a claim of compliance, clinical validity, safety or regulatory approval.
Not measured in this demo: clinical benefit, patient harm, formal usability, workload and clinician learning curves. Workflow counts are not clinical study outcomes.
Inspect all 27 DECIDE-AI items and remaining evidence gaps
Reporting reference: Vasey et al. DECIDE-AI, BMJ 2022;377:e070904 · Table 2, p. 7. Consult the original checklist and explanatory appendix when reporting an actual study.
48 / 48 synthetic records · 43 complete · 5 incomplete
Export filtered data & metrics
Completion
89.6%
Sensitivity
78.9%
Specificity
70.8%

Bloco 36 (Imagem 36)
inception42
Brain Health Agent Lab
FROM PROTOTYPE TO PRODUCTION
Demo home
How it works
Clinical workspace
Multicognitive Studio
Review & plan
Validation dashboard
Clinic visit & record
Patient monitoring
Documentation
LOCAL RESEARCH PROTOTYPE
Dr. Nanea Ekelaka
Senior Applied AI Scientist, Inception42
Hack24DB | 4 November 2026
Agent & visit edition · v3.2

Home -- Back 04 Evaluation & uncertainty
Play ready demo Next page →
48 / 48 synthetic records · 43 complete · 5 incomplete
Export filtered data & metrics
Completion
89.6%
95% Wilson CI: 77.8–95.5%
43 / 48 complete / selected
Sensitivity
78.9%
95% Wilson CI: 56.7–91.5%
15 / 19 true positives / reference positive
Specificity
70.8%
95% Wilson CI: 50.8–85.1%
17 / 24 true negatives / reference negative
Test-retest reliability
0.965
ICC(A,1) · 43 paired observations
Same task and scale; absolute agreement.
False-referral burden
31.8%
95% Wilson CI: 16.4–52.7%
7 / 22 reference negative / referred
Time to assessment
15.9 days
Mean among 21 assessed referrals.
1 referred record lacks an assessment time. Synthetic intervals, not real care performance.
Meaningful change · confusion matrix
Reference +
Reference -
Flag +
TP 15
FP 7
Flag -
FN 4
TN 17
Agreement: 74.4% (32 / 43) · Referral rate: 51.2%
Change flag vs independently authored fictional reference labels. In a study, labels must come from independent qualified assessment. Incomplete records are excluded from classification metrics and retained in completion counts.
What the pilot still needs to measure
Source accuracy · unsupported advice · missed information · preparation time · clinician workload. These are proposed measures, not measured in this demo.
ICC(A,1): two-way absolute-agreement, single measurement; paired same-task counts on the same 0–10 scale. Wilson 95% intervals use each metric's displayed denominator. Small subgroups are unstable; no real fairness claim is supported.
Inspect the filtered synthetic records

Bloco 37 (Imagem 37)
inception42
Brain Health Agent Lab
FROM PROTOTYPE TO PRODUCTION
Demo home
How it works
Clinical workspace
Multicognitive Studio
Review & plan
Validation dashboard
Clinic visit & record
Patient monitoring
Documentation
LOCAL RESEARCH PROTOTYPE
Dr. Nanea Ekelaka
Senior Applied AI Scientist, Inception42
Hack24DB | 4 November 2026
Agent & visit edition · v3.2

BRAIN HEALTH REVIEW ASSISTANT
Synthetic cases · local only Sign out Guide me عربي
Home -- Back 05 One documented visit
Play ready demo Next page →
05 / CLINIC VISIT & ELECTRONIC VISIT RECORD
From arrival
to one complete visit record.
Follow a fictional patient through the clinic. Watch agents delegate tools, explain findings, hand off to a clinician, and document the encounter with its date and patient ID.
Lecture-ready encounter
A complete case, scripted clinician notes, charts and activity appendix are prepared for you.
Run ready demonstration
Open complete example report
Fictional cases only
Connected scoring agent available · lecture demo ready
Patient arriving today
Leila · SYN-P002 · function concern
Scoring agent explanation
Scripted simulation · no API call
Playback pace
Guided · readable steps
Simulate permission to use this fictional case for the visit
Include a clearly labelled, scripted clinician actor for a complete demonstration
Optional gate tests
Run full visit
Next step
Pause
Resume
Today is a follow-up encounter: four historical observations plus today's fifth observation. Dates for the fictional history are generated for this demonstration. Scripted approval is never real clinical sign-off.
Before you see the patient
Prepared summary · fictional case
Leila · 72 · Supplied case information; not yet confirmed by a clinician.

Bloco 38 (Imagem 38)
inception42
Brain Health Agent Lab
FROM PROTOTYPE TO PRODUCTION
Demo home
How it works
Clinical workspace
Multicognitive Studio
Review & plan
Validation dashboard
Clinic visit & record
Patient monitoring
Documentation
LOCAL RESEARCH PROTOTYPE
Dr. Nanea Ekelaka
Senior Applied AI Scientist, Inception42
Hack24DB | 4 November 2026
Agent & visit edition · v3.2

Home -- Back 06 Patient monitoring
Play ready demo Next page →
Authorised example series ending 2026-11-04; evaluated as of 2026-11-04. These prototypes are separate from saved clinic visits.
inception42
BRAIN HEALTH · MONITORING
PATIENT MONITORING AGENT · RULE-BASED DEMONSTRATION
L
Leila, 72 · SYN-P002
As of 2026-11-04 · Latest encounter: 2026-11-04 · Source: Authored longitudinal example
01 Overview
02 Change
03 Review priorities
04 Timeline
05 Evidence
Present report
Print / save PDF
Synthetic teaching demonstration · authored records, illustrative calculations and simulated review.
01 OVERVIEW
See the result. Keep the context.
One patient's recorded observations, reported concerns and unfinished follow-up.
LATEST RECORDED TASK RESULT
5 / 10
New difficulty with familiar daily tasks
Read the result in context
Task observations, reported everyday function and unfinished follow-up belong together. The report does not establish the cause of a change.
Latest encounter · 2026-11-04
Dated encounter records
3
Patient-specific history
Signals awaiting review
4
Acknowledgement is not resolution
Outstanding follow-up tasks
2
1 overdue · administrative status
Latest adjusted change
-2.13
Illustrative completion units

Bloco 39 (Imagem 39)
inception42
Brain Health Agent Lab
FROM PROTOTYPE TO PRODUCTION
Demo home
How it works
Clinical workspace
Multicognitive Studio
Review & plan
Validation dashboard
Clinic visit & record
Patient monitoring
Documentation
LOCAL RESEARCH PROTOTYPE
Dr. Nanea Ekelaka
Senior Applied AI Scientist, Inception42
Hack24DB | 4 November 2026
Agent & visit edition · v3.2

Home -- Back 06 Patient monitoring
Play ready demo Next page →
01 OVERVIEW
See the result. Keep the context.
One patient's recorded observations, reported concerns and unfinished follow-up.
LATEST RECORDED TASK RESULT
5 / 10
New difficulty with familiar daily tasks
Read the result in context
Task observations, reported everyday function and unfinished follow-up belong together. The report does not establish the cause of a change.
Latest encounter · 2026-11-04
Dated encounter records
3
Patient-specific history
Signals awaiting review
4
Acknowledgement is not resolution
Outstanding follow-up tasks
2
1 overdue · administrative status
Latest adjusted change
-2.13
Illustrative completion units
What to review first
Reported difficulty with familiar daily tasks. Read the observations alongside this concern, the assessment conditions and unresolved information.
02 CHANGE
Two charts. Two different questions.
What was recorded at each encounter, and how did each calculation compare with its baseline?
Synthetic monitoring demonstration. Updates when opened or refreshed; no continuous sensor feed, background notification, hospital connection or automated care action. Reviews are saved in this browser only.
OBSERVED TASK RESULT
Recorded observations over time
10
7/10
6/10
ILLUSTRATIVE BASELINE COMPARISON
Adjusted change at each encounter
1 -0.63
0
-1.13
-2.13