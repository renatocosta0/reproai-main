# Cycle tracking, ovulation and continuous monitoring

This module adds menstrual-cycle tracking, daily signs, cycle-aware alerts,
scheduled monitoring and an expanded Apple Health / Health Connect import.
Every rule states its evidence status: **[Validated]** (guideline or validated
method), **[Heuristic]** (team rule built on established physiology) or
**[Proposed]** (hypothesis, never used for clinical alerts).

## Data model (migration `20261125210000_add_cycle_tracking`)

| Table / column | Purpose |
| --- | --- |
| `MenstrualCycle` | One row per cycle (day 1 = first day of real flow). Derived fields (`cycleLengthDays`, `periodLengthDays`, `ovulationDate`, `ovulationMethod`, `lutealPhaseDays`, `regularityStatus`, `status`) are recomputed whenever the next period, a log or a temperature changes. |
| `DailyCycleLog` | One row per person per calendar day: flow, cervical mucus, LH test, basal temperature + confounder, sleep, water, symptoms, mood, notes and an optional private intimacy log. `symptoms`, `mood`, `notes` and `intimacy` are encrypted at rest (`src/lib/encryption.ts`). |
| `Patient.trackingMode` | `TRYING_TO_CONCEIVE`, `HEALTH_TRACKING`, `HORMONAL_CONTRACEPTION`, `POSTPARTUM`, `PERIMENOPAUSE`. The last three pause ovulation predictions and anovulation / cycle alerts. |

The migration is additive. For an existing database run `npx prisma migrate deploy`
then `npx prisma generate` (see `prisma/migrations/README.md`).

New consent purposes: `CYCLE_TRACKING` (default on, like wearables) and
`INTIMATE_LOGS` (default off). The intimacy log is never returned to clinicians,
partners or any calculation; clinicians never receive notes.

## Rules (`src/lib/cycle.ts`, pure and unit-tested)

| Rule | Status | Detail |
| --- | --- | --- |
| Cycle length / bleeding limits | [Validated] FIGO AUB System 1 (2018) | Short < 24 d, long > 38 d, bleeding > 8 d, variation > 7 d (9 d if ≤ 25 or ≥ 42 y), amenorrhoea > 90 d. Two or more abnormal cycles, variation, or amenorrhoea → clinician follow-up (P1); a single one → patient advice (P2). |
| Ovulation confirmation | [Validated] Roetzer / Sensiplan 3-over-6 | Per cycle, fever (≥ 37.8 °C) and days marked ill / short night / alcohol / travel are excluded. Ovulation = day before the first raised reading. |
| LH and mucus | [Heuristic] | First positive LH of the last surge + 1 day ("probable"); Billings mucus peak ("possible"). They open the fertile window prospectively and corroborate the temperature rule. |
| Luteal phase | [Validated threshold, debated significance] ASRM 2021 | Next period − ovulation (temperature or LH). < 10 d in ≥ 2 cycles → P1 and pathway `LUTEAL-SHORT`. |
| Anovulation | [Validated rule] | ≥ 2 completed cycles in a row with ≥ 10 valid temperatures and no rise → P1. Period starts are now the cycle boundaries for the temperature alert. |
| Fertile window | [Validated] Wilcox 1995 / ACOG | O − 5 to O + 1. Expected length: exponential average (α 0.4) of the last 6 cycles (≥ 3 needed, otherwise 28 d, low confidence); luteal estimate = personal median of confirmed cycles (10–17), else 14. With cycle SD > 4 d or PCOS the calendar pin is hidden ("variable-cycle mode"). |
| PMS-type pattern | [Heuristic] ACOG timing | Symptoms on ≥ 2 of the 5 days before a period and ≤ 1 day on cycle days 5–13, in ≥ 2 cycles. Shown as a pattern, never a PMS/PMDD diagnosis. |
| Lab timing | [Validated practice] | FSH, LH, estradiol: cycle day 2–4. Progesterone: 5–9 days after ovulation. Shown in the clinician overlay. |
| Personal baselines | [Proposed] | 7-day vs 28-day mean ± 2 SD for sleep, resting heart rate and HRV. Weekly patient summary only. |

New labs (`src/lib/labs.ts`): LH, estradiol, mid-luteal progesterone, TSH, free T4,
prolactin, HbA1c, fasting insulin, vitamin D, with upper and lower reference limits
and pathway rules `LAB-TSH`, `LAB-PRL`, `LAB-HBA1C`, `LAB-P4`, `LAB-VITD`.

## Alert levels

| Level | Where | Opens follow-up? |
| --- | --- | --- |
| P1 | `[Cycle signal]` and `[Wearable signal]` follow-ups + `CareNotification` to the case clinicians | Yes, one per source and case; refreshed, and closed automatically (audited) when the signal settles and no clinician has acted. |
| P2 | Pathway options (`RF-CYCLE`, `BBT-MONO`, `OPT-SLEEP`, lab rules) | No |
| P3 | Gentle reminders (`CYCLE_REMINDER`), at most 2 a week and 1 a day | No |

## Scheduled jobs

| Endpoint | Suggested schedule | Work |
| --- | --- | --- |
| `POST /api/jobs/daily` | 02:00 GST daily | Recompute cycles and cycle alerts, re-run the temperature analysis, P3 reminders, "results due for review" (trying to conceive, no AMH / semen result in 6 months) to clinicians. |
| `POST /api/jobs/weekly` | Sunday 03:00 GST | Personal baselines and the weekly patient summary. |

Both require `Authorization: Bearer $CRON_SECRET` and are disabled when
`CRON_SECRET` is unset. Example (Azure Functions timer, GitHub Actions or cron):

```sh
curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/jobs/daily
```

End-of-cycle work runs immediately when a new period is recorded.

## Apple Health / Health Connect

Imported (with `WEARABLES` consent): basal temperature and sleep as before, plus
resting heart rate (LOINC 40443-4), HRV SDNN (80404-7), sleeping wrist temperature
(`wrist-temperature`, Apple Watch Series 8+, kept separate from 8310-5), steps
(55423-8), exercise minutes and water. Passive signals are reduced to one summary
per day on import and are **context only**: never used to confirm ovulation or to
raise alerts until validated (see the research plan). The Capacitor health plugin
does not expose HealthKit cycle-tracking types (menstrual flow, mucus, ovulation
tests), so those are logged in ReproAI.

## Screens

* Patient: **My cycle** (`/patient/cycle`) — cycle wheel, next period / fertile
  window with method and confidence, one-tap daily log, calendar, FIGO / ovulation /
  PMS insights, cycle history with corrections and back-fill, watch signals, and
  tracking-mode selection. A cycle-day tile on Today links to it.
* Clinician: **Cycles & lab timing** inside each female member's record — cycles
  aligned at day 1 with BBT, ovulation markers, period / fertile / luteal bands,
  hormone samples placed on their cycle day, a timing table and an endocrine and
  metabolic panel (TSH, free T4, prolactin, FSH/LH/E2, progesterone, HbA1c,
  insulin, vitamin D).
