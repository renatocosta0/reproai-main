# ReproAI demo video: story script (about 4 minutes, English)

One story, told around one person. **Act 1** is Reem, on her phone. A short **handover** carries her record and her choices to her doctor. **Act 2** is the doctor's day on the desktop: the panel, alerts and triage, population insight, the copilot, the governed next step, the model, and the release. **Act 3** returns to Reem's phone. The **close** is the evidence and the pilot ask.

Pacing: the model, the copilot, and alerts and triage get the most time; the rest is mentioned quickly.
All people are fictional; all data is synthetic. No performance claims, no "fertility score", no "diagnose". Each `> ` line is one narration paragraph (one voice clip); the order below is the order of the film.

### What the judges see, beat by beat

| Judging criterion | Beats | Brief |
| --- | --- | --- |
| Health impact and clinical relevance | 1 Reem not yet trying · 8 who needs advice earlier · 15 options in time | "earlier" |
| Technical depth and architecture | 4b device import with provenance · 10 copilot (retrieve, cite, verify) · 11 governed agent · 12 deterministic model with provenance | R2 |
| Working solution and demo quality | the whole film is the live app, phone and desktop | |
| Responsible AI, safety and governance | 4 consent · 12 "not validated yet" · 13 refuses to guess · 14 clinician sign-off · 7 alert to the team, not the patient | R2, R5 |
| Scalability and deployment readiness | 4b manual/Bluetooth readings; native Apple Health and Health Connect client implemented but not device-validated · 17 FHIR export, LLM in the UAE | |
| Commercial viability and path to pilot | 6 the clinician's panel · 17 measures · 18 pilot ask | R4, R6 |

Requirements: R1 trajectory (15) · R2 plain language and missing data (12, 13, 15) · R3 options (9, 15) · R4 clinician and population view (6–8) · R5 consent and purpose limits (4) · R6 evidence of earlier action (7, 17).

---

## Act 1 · Reem (phone)

**1 · Meet Reem** · card, then Reem's phone (Today)
> This is Reem. She's thirty-one, lives in Abu Dhabi, and isn't trying to conceive yet. Like most people, she'd usually learn about her reproductive potential only once she was trying, or struggling. ReproAI changes when that conversation starts.

**2 · The invitation** · the invitation email on her phone
> At a routine visit, her doctor invites her. There's no open sign-up: the invitation arrives by email, discreet, in English and Arabic.

**3 · What only she knows** · phone, About me
> Reem answers what only she knows: her cycle, her history, her plans. She's curious about egg freezing, so she says so. Her lab results will come from the clinic, never typed in by her.

**4 · Her choices** · phone, Privacy and consent (a switch turned on and back off)
> Then she decides who sees what. Her care team, her lab results, her partner, anonymous statistics: each is her choice, and she can change it at any time. Her data is never used for employment or insurance.

**4b · Her devices** · phone, Health tracking: the Bluetooth thermometer panel, and where each reading came from
> Her temperature and sleep can be entered by hand or read from a standard Bluetooth thermometer. ReproAI also has a native Apple Health and Health Connect import; if the phone has no readings or access, it offers manual entry. Every saved reading keeps its source.

## Handover

**5 · To her doctor** · animated bridge, phone to desktop
> Her answers, and her choices, travel with her record to her doctor.

## Act 2 · The doctor (desktop)

**6 · The panel** · clinician dashboard
> Her doctor starts with the whole panel: who's in care, who's waiting for a first result, which drafts need review, and which alerts are open.

**7 · Alerts and triage** · follow-up board
> Alerts come from people's own readings. Here, another patient's temperature has shown no sustained rise for weeks. ReproAI raises a follow-up for the care team, not an alarm for the patient, and tracks it from alert, to appointment, to closed. If nothing is booked within fourteen days, it's flagged as lost.

**8 · Who needs advice earlier** · population insight
> Population insight shows which groups would benefit from earlier advice, found by the same cited rules patients see, with small groups hidden so no one is singled out.

**9 · Reem's record** · Reem's case: verified labs, preservation trigger
> In Reem's record, every result shows its source and date. Because she mentioned egg freezing, a preservation discussion is flagged, citing the Thiqa guideline.

**10 · The copilot** · clinical copilot on Reem's case
> The doctor asks the clinical copilot what to cover with Reem. It answers only from her record and the guidance library, and every sentence is checked against its source.

**11 · The next step, governed** · Propose next action, then approve
> It can also propose the next step, with its reasons. Nothing happens until the doctor approves. Then a follow-up opens, and every step is logged.

**12 · The model** · run the assessment: inputs with provenance, estimate with its range, factors
> Then the doctor runs the assessment. The model is deterministic and literature-derived: no AI writes the numbers. It shows the inputs it used and where each came from, an estimate with its range, and the factors that moved it, for the clinician only. It isn't clinically validated yet, and it says so.

**13 · When data is missing** · Layla's case
> When a required result is missing, it refuses to guess, and names the test that's needed.

**14 · The release** · note, then approve and release
> Nothing reaches Reem until the doctor writes a note, in plain language, and approves it.

## Act 3 · Back to Reem (phone)

**15 · What Reem sees** · phone, her trajectory and options
> Back on her phone, Reem sees how her picture is changing: her egg reserve, typical for her age, her doctor's note, and options to discuss, each with its source. Not a score, and not a diagnosis.

**16 · In her language** · phone, Arabic, then the assistant
> She can read it in Arabic, and ask questions. If the answer isn't in the guidance, the assistant says so.

## Close

**17 · What we measure** · evidence page
> For the health system, ReproAI exports standard FHIR records, its language model already runs in the UAE, and it measures what matters: the days from a first signal to counselling, referral follow-through, and who we reach, with honest intervals.

**18 · The ask** · pilot card, then end card
> ReproAI is ready for a pilot: one primary-care cluster and one fertility centre, for six months. We're looking for that partner. Earlier signals, the right next step, with the clinician in control.

---

Recording writes to the shared database and is cleaned up afterwards: one released assessment and any draft for Reem, one follow-up for Reem, assistant and copilot chats, and the consent switch is left as it was.
