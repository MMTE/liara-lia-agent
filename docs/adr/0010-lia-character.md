# ADR-0010: The agent is Lia (لیا) — character mascot with mood postures

## Status
Accepted 2026-08-22 — product-owner decision.

## Context
The assistant was prototyped under the working name «لیری» (Liri). Liara the company is
named after Liara T'Soni (Mass Effect); the agent therefore takes the character's own
name: **Lia — لیا**. The product owner generated a set of 3D character avatars
(`lia-picture-assets/`, 2048×2048 PNG badges, dark-blue circular gradient) in distinct
postures. The widget already models assistant moods (`idle/thinking/warning/success`).

## Decision
1. **Rename** every user-facing occurrence of the agent name: لیری→لیا, Liri→Lia
   (UI copy, embed bubble/panel, ask-button, README/CHANGELOG forward sections).
   Platform name «لیارا» (Liara) is NEVER touched. Code identifiers follow the clean
   cutover: `src/components/liri/`→`src/components/lia/`, `LiriWidget`→`LiaWidget`,
   `window.Liri`→`window.Lia`, `liri-prefill`→`lia-prefill` (embed.js + panel listener,
   atomically — same commit), `AskLiri.jsx`→`AskLia.jsx` (+ `PATCHES.md` update).
   `STORAGE_KEY "liara-agent-chat"` is unchanged (session continuity).
2. **Character mascot with posture mapping** (512px derivatives in `public/lia/`,
   compressed from the raw set; raw `lia-picture-assets/` stays untracked):

   | Mood | Asset | Used when |
   |---|---|---|
   | idle | `lia.png` | resting, home state, bubble |
   | thinking | `lia thinking.png` | agent working / streaming |
   | warning | `lia alert.png` | approval plan pending |
   | success | `lia aha.png` | verified fix / turn complete |
   | error (new mood) | `lia worried.png` | error banner state |

3. Mascot renders the posture image (circular badge); mood ring retained as accent.
   `embed.js` bubble uses the idle badge from the agent origin.
4. **Palette** (product-owner directive, 2026-08-22): the agent UI adopts Liara's real
   design colors — accent `#00D4FF` (their dashboard cyan-teal), surfaces `#121212` /
   `#1E1E1E`, borders `#282828`–`#2E2E2E`, text `#EEEEEE`/`#B1B6BE` — replacing the
   prototype-era violet/navy tokens. Applies to the agent app's CSS vars, embed.js, and
   the docs-site ask-button; Liara's own stylesheets stay untouched.

## Consequences
+ Distinct personality; mood legible at a glance; Mass Effect homage lands with judges.
+ Asset budget controlled (512px PNGs ≈ 150–400KB; only the five used postures ship).
− Public `window.Liri` API renamed before any external consumer exists (safe window).
− `aha 2/3` variants unused (kept in raw assets for future states).
