# Claude Impact Lab: UCI × SoCal Affordable Housing

**Saturday, November 7, 2026 · Paul Merage School of Business, UC Irvine**

One day. One equation that does not balance: what a family can afford to pay, plus public subsidy,
plus fundraising, minus the cost to create the home. In Orange County the cost side wins by six
figures per home. Small teams build a working prototype with Claude that helps close the gap.

Organized by Claude Community Orange County with the UCI Center for Real Estate. Sponsor: EyeOn
Automations.

**First hackathon?** You do not need a team, an idea or coding experience to start. Read
[your first hackathon](docs/first-hackathon.md). Two minutes.

## One link for everything

**<https://claudesocal.com/uci-impact-lab>**

| On the hub | What it is |
|---|---|
| `#teams` | Register your team (by 10:00 AM) |
| `#submit` | The submission form (due 2:30 PM) |
| `#credits` | Your Claude API credits |

## Bring

- A laptop and its charger
- A free [GitHub](https://github.com/signup) account. One per team is enough to start
- A Claude account at [claude.ai](https://claude.ai)
- Event credits: $100 in Claude API credits per person (API only, not Claude.ai). The claim link is on the hub at 9:15 AM. Claim using your Org ID from [console.anthropic.com](https://console.anthropic.com), not your Claude.ai ID. One claim per person. Credits are tied to the email you registered with, so people who registered on the day may not get them

Wi-Fi: UCI-guest.

## The day

| Time | What |
|---|---|
| 8:15 AM | Check-in and breakfast |
| 9:00 AM | Kickoff in the auditorium. The lanes are revealed |
| 9:30 AM | Anthropic build workshop, in the auditorium |
| By 10:00 AM | Register your team on the hub (`#teams`) |
| 10:00 AM | Go to the room your team picked |
| Around noon | Lunch |
| **2:30 PM** | **Submissions due.** Hub form, public repo and a 30-second video. Anthropic Q&A for anyone who wants it |
| 3:00 PM | Finalists announced. They present live in the auditorium |
| 4:00 PM | Judges deliberate |
| 4:15 PM | Winners and photos |

## The three lanes

Teams of up to 5, ideally one of each role: builder/engineer, creative/designer,
communicator/presenter, organizer/facilitator. Solo is fine to start: the hub's team board shows
teams with open seats and the roles they want. Each team picks a room on the hub (rooms fill up as teams register), goes there, and picks one
lane together. Any lane works in any room.

| | Lane | The question | Who is stuck |
|---|---|---|---|
| 1 | [**Find it**](lanes/1-find-it/README.md) | Where can the next affordable home go? | An acquisitions lead with no GIS team, a congregation with an underused lot, city housing staff |
| 2 | [**Clear it**](lanes/2-clear-it/README.md) | How do we turn four years into two? | A nonprofit project manager, a small builder, a homeowner adding an ADU, a city permit tech |
| 3 | [**Fund it**](lanes/3-fund-it/README.md) | Does it pencil, and who closes the gap? | A nonprofit finance lead, a development director, a donor, a city housing analyst |

Each lane page has the problem, who is stuck, the open question, a few ideas to get you thinking
(not a spec) and a list of data to start from. Build what your team thinks will help.

New to this field? The short [background](docs/background.md) and the [glossary](docs/glossary.md)
cover the equation, the laws and the terms you will hear.

## Your first 15 minutes

1. **Get the files.** Use this repo as a template for your team, or download it as a ZIP.
   [Getting started](docs/getting-started.md) shows both, and three ways to work with Claude:
   in the browser, in the desktop app, or in a terminal.
2. **Claim your credits** from the hub (`#credits`) once the link is up at 9:15 AM.
3. **Register your team** on the hub (`#teams`) by 10:00 AM.
4. **Name one real user.** Write down who they are and what their day looks like before and after.
   Then open your lane's data list and look at what is there.

## The rules

1. **Name one real user** and show their before and after.
2. **Live demo.** Show what you built working, not just slides. A working rough tool beats a
   polished pitch.
3. **Show your sources.** Cite the law, the dataset or the assumption. If you made a number up,
   label it.
4. **Public or provided data only.** Do not scrape at a volume that gets a city site to block us.
   Do not use private plans or blueprints without permission. No personal information about real
   tenants, buyers or residents.
5. **Bend the brief if it serves the goal.** Teams may go outside the lanes as long as the result
   helps get more affordable homes built in Southern California.

The full version, with the reasons, is in [ground rules](docs/ground-rules.md).

## Submit by 2:30 PM

One per team:

- the submission form at [claudesocal.com/uci-impact-lab](https://claudesocal.com/uci-impact-lab) (`#submit`)
- a public GitHub repo with a README
- a 30-second video made with Claude's help

[How to submit](docs/submission.md).

## Judging

Judges first shortlist from all submissions. Finalists present live in the auditorium. Each
finalist is scored from 1 to 5 in four areas. The areas have equal weight.

| Area | The question |
|---|---|
| **Impact** | Would a real nonprofit or city use this next month? |
| **Works** | Does the live demo work? Working beats polished |
| **Rigor** | Are sources and assumptions shown? Are made-up numbers labelled? |
| **Creativity** | Is it a new and useful way in? |

Prizes: overall 1st, 2nd and 3rd, plus a winner in each lane. A live demo is required for
finalists. Slides alone do not place. More in [judging](docs/judging.md).

## Help

- **About the day, the repo or your setup:** find an organizer.
- **About your lane:** ask in your breakout room.
- **Stuck on setup:** ask early. Nobody should lose the morning to an install.
- **Something looks like real personal information:** stop and tell an organizer right away.

## What is in this repo

```text
README.md            this page
CLAUDE.md            instructions Claude Code reads when you open this repo
docs/
  first-hackathon.md   what to expect if this is your first one
  getting-started.md   get the files, set up Claude
  ground-rules.md      the rules in full
  submission.md        what to hand in and how
  judging.md           how winners are picked
  background.md        the $0 equation and the laws, in two pages
  glossary.md          the terms you will hear
lanes/
  1-find-it/     problem, ideas, data/DATA-SOURCES.md
  2-clear-it/    problem, ideas, data/DATA-SOURCES.md
  3-fund-it/     problem, ideas, data/DATA-SOURCES.md, a synthetic example deal
templates/TEAM-README.md          the README your team's repo needs
```

## License

Code in this repo is released under the [MIT License](LICENSE). The brief, lane pages and glossary
text are dedicated to the public domain (CC0). Third-party data, laws and documents linked here
stay under their own terms.

Teams own what they build. See [ground rules](docs/ground-rules.md).
