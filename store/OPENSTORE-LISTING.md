# OpenStore listing notes — Sweet Pop

Source: OpenStore submit page + UBports "Releasing your app on OpenStore" training module.
Flow: log in → Submit App → fill **Presentation / Discovery / Info** tabs → upload the click → new revision → Publish = Yes.

## Must match the package
- **App name:** `sweetpop.sweetpopteam`  (= `name` in manifest.json.in)
- **Title:** `Sweet Pop`               (= `title` in manifest.json.in)
- **Version:** bump `version` in manifest.json.in before every upload.
- **Upload:** `build/all/app/sweetpop.sweetpopteam_1.0.0_all.click` (architecture `all`, framework `ubuntu-touch-24.04-1.x`).

## Presentation
**Tagline:** Offline candy match-3 puzzle with 120 levels.

**Description:**
Swap jelly candies, match three or more and clear each level's goal: reach a score, collect candies, break ice and crates, or bring cherries down.
- 120 levels with 12 board shapes and 24 changing backgrounds
- Special candies (striped, wrapped, colour bomb) and combos
- Leftover moves turn into bonus fireworks to earn up to 3 stars
- Easy / Normal / Hard difficulty
- Relaxing music that changes every 10 levels, with separate volume sliders
- Works 100% offline: no ads, no tracking, no purchases, no network access
- Arabic and English, screen stays on while playing

**Tested on:** Fairphone 4, Ubuntu Touch 24.04-1.x (arm64). Not tested on other devices. Portrait only.

**Screenshots:** `store/screenshot-1…5` (up to 5 allowed).
**Changelog:** leave empty for the first submission. For later releases, e.g. "1.0.1 – <what changed>".

## Discovery
- **Category:** Games
- **Keywords:** puzzle, match-3, candy, offline, casual, arcade
- **NSFW:** No

## Info
- **License:** choose one (MIT / GPLv3 / Apache 2.0 …) — or "Not open source". Needs your decision.
- **Source URL:** link to your public repository (required to get a source-reviewed, trusted listing).
- **Support URL:** the repository's issue tracker.
- Donation / video URL: optional.

## Notes for reviewers (paste if asked)
> Sweet Pop is an HTML5/JS game shown in a QML `WebView` (Morph.Web, falling back to QtWebEngine). It loads only local files and makes no network requests.
> AppArmor policy groups: `webview` (render the game), `audio` (music/effects), `keep-display-on` (screen stays on during play). No unconfined access, no background services, nothing needing manual review.
> Tested on Fairphone 4 (arm64), Ubuntu Touch 24.04-1.x. Build: `clickable build`.

## Content policy check
No sexual content, violence, gambling, real-money transactions, malware or data collection → complies with the OpenStore content policy.
