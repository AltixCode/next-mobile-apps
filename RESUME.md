# Resume point — 2026-09-15, paused for a Mac restart

Everything below is on disk and survives a restart. Nothing is mid-flight.

## HushTunnel iOS — one command from unblocking the submission

**A signed App Store IPA is built and waiting**, version 1.0 build 568, made
with the **release** Xcode 27A266a (not a beta):

```
/Volumes/ExtremePro/Dev/HushTunnel-iOS-Client/build/output/HushTunnel.ipa   (44 MB)
```

Upload it with:

```bash
eval "$(grep -E '^export (APP_STORE_CONNECT_[A-Z0-9_]+|ASC_[A-Z0-9_]+)=' ~/.zshrc)"
cd /Volumes/ExtremePro/Dev/HushTunnel-iOS-Client
xcrun altool --upload-app --type ios --file build/output/HushTunnel.ipa \
  --apiKey "$APP_STORE_CONNECT_API_KEY_KEY_ID" \
  --apiIssuer "$APP_STORE_CONNECT_API_KEY_ISSUER_ID"
```

Then in App Store Connect select build 568 for version 1.0 and submit.

### What was wrong and what was fixed

| Blocker | Cause | State |
|---|---|---|
| "Build is using a beta version of Xcode" | The workflow checked `/Applications/Xcode-beta.app` **first**, so every build used Xcode 27A5252f, a beta seed. Nothing failed — the archive signed, uploaded and showed VALID; only submission was blocked. | Fixed in `ios-release.yml`; it now picks the first non-beta Xcode and fails loudly if only betas exist. |
| "Screenshot uploads in progress" | Two iPad PNGs were in `FAILED` with `IMAGE_ALPHA_NOT_ALLOWED` — App Store screenshots may not carry an alpha channel. | Flattened and re-uploaded; all now `COMPLETE`. |
| 2.3.3 Accurate Metadata | **Both** screenshot sets led with the sign-in screen — on iPhone the file was even named `01_home_screen.png`, which is why it was missed. | Sign-in shots deleted from both sets. |
| 2.3.3, second cause | An iPad shot read "In-app purchases are not available yet" while the description advertises in-app subscription management. | Removed; the VPN disclosure screen took its place. |
| Inaccurate keyword | Keywords claimed `wireguard`. The only occurrence of WireGuard in the codebase is mock data in a SwiftUI preview; the app uses VLESS-Reality. | Replaced with `reality` and `no logs`. |
| Archive failed locally | The committed `Libbox.xcframework` is a **headers-only stub** with no Mach-O, and both workflow guards tested for `Info.plist` rather than the binary — so the source-build fallback never ran and the link failed with "framework 'Libbox' not found". | Guards fixed; a real 122 MB Libbox is built and in place (gitignored). |

Screenshots now on the listing:

- iPhone 6.5: dashboard, server locations
- iPad Pro 11: dashboard, VPN disclosure

### Still needs a person

- **The CI runner machine has no release Xcode** — only `Xcode-beta.app`, in both
  `/Applications` and `/Volumes/Macintosh HD/Applications`. Until a release Xcode
  is installed there, `ios-release.yml` will stop with a clear error rather than
  produce a rejectable build. Local builds on this machine work.
- The description says "global edge locations"; the app currently lists two
  (Netherlands, Moldova). Worth softening, but it is a marketing call.

## The twelve new apps

Repos, identifiers and services are all provisioned. Build work has started on
app 1.

| Done | Detail |
|---|---|
| 12 repos in `AltixCode` | scaffold aligned to `docs/agents/18-app-lifecycle.md` — `remove_ads`, lifetime-only, 14 locales, 186 shared tests |
| 12 bundle ids | registered in App Store Connect |
| 12 RevenueCat projects | iOS + Android apps, `remove_ads` entitlement, `default` offering, `$rc_lifetime` package; ASC API key attached and re-read to confirm it stored |
| 24 AdMob apps | 2 per app |
| 72 AdMob ad units | banner + interstitial + rewarded per platform |
| 120 repo secrets | 10 release identifiers in each of the 12 repos, plus `EXPO_TOKEN` |
| Loopwits engines | Rulers, Duo, OneLine + daily mapping — 141 tests, all uniquely solvable |

Identifier records: `admob-ids.tsv`, `admob-adunits.tsv`, `revenuecat-ids.tsv`,
and `/Volumes/ExtremePro/Dev/.admob-ids/<slug>.env`.

### Next, in order

1. Loopwits UI: hub, three play screens, archive, stats; game i18n keys.
2. `npm run verify`, then `verify:device` on simulator + emulator.
3. Repeat per app — apps 2–4 share a generate-and-verify core with Loopwits.
4. App Store Connect records: **needs a login**, the session was expired.
5. Play Console records: create app → upload an AAB → then the product.
6. AdMob GDPR + US-states consent messages: **must be published by hand**, or
   the SDK has no message to present and serves no ads in the EEA.

### Known gaps

- A stray duplicate RevenueCat project named "Loopwits" (`projf8cc9e68`) exists;
  the one in use is `projc63c253e`. `rc` has no project-delete command, so it
  needs removing in the dashboard.
- No app has had a device pass yet. Every gate in each `HANDOFF.md` is still ⬜.
