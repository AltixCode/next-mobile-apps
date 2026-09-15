# Mobile Portfolio Agent Instructions

This directory contains six independent Expo React Native applications. Read this file and `mobile_apps.md` before changing code. Each app has its own git repository, `package.json`, `HANDOFF.md`, and `.github/workflows/deploy.yml`.

## Applications

| Directory | Product | Bundle / package identifier |
| --- | --- | --- |
| `netpulse` | Network diagnostic auditor | `com.altixcode.netpulse` |
| `scribezero` | On-device voice memo transcription | `com.altixcode.scribezero` |
| `signpure` | Vector signature extractor and vault | `com.altixcode.signpure` |
| `redactpro` | Pixel-scrubbing document redactor | `com.altixcode.redactpro` |
| `storychop` | Social video story/reel cutter | `com.altixcode.storychop` |
| `packpixel` | Batch image resizer and SKU labeler | `com.altixcode.packpixel` |

## Operating rules

- Work in one app repository at a time. Inspect its local `AGENTS.md`, `HANDOFF.md`, git status, package scripts, and existing components before editing.
- Preserve unrelated uncommitted changes. Never reset, force-push, delete broad paths, or overwrite generated native projects without a clear reason.
- Read the entire `mobile_apps.md`; it is the visual and architecture brief. Use existing UI primitives and feature components before creating new ones.
- Keep screens modern, calm, intuitive, and product-specific. Avoid generic template styling, crowded cards, unexplained icons, weak hierarchy, raw hex colors scattered through views, and controls that look tappable but do nothing.
- Use semantic theme tokens for backgrounds, surfaces, borders, text, primary actions, status colors, and dark/light mode. Keep raw color values in the central theme only.
- Use `SafeAreaView` or `useSafeAreaInsets()` on every screen. Respect notches, status bars, home indicators, keyboard, and edge-to-edge Android navigation.
- Support Dynamic Type/font scaling. Do not set `allowFontScaling={false}` for normal content.
- Every interactive target must be at least 44x44 pt on iOS and 48x48 dp on Android. Use real layout size or `hitSlop`, and provide visible pressed/focused/disabled states.
- Use accessible labels and roles for icon-only controls. Haptic feedback should be used for meaningful actions where the platform supports it.
- Keep route files thin and reuse existing components. Do not put raw network requests inside components; use the project service/API layer.
- Never hardcode API keys, credentials, signing certificates, service-account JSON, or private URLs. Do not print secrets in logs.

## Required review and test process

For each app:

1. Read the app brief, current handoff, git diff, navigation, stores/services, and all primary screens. Identify the main user journey and its loading, empty, error, disabled, permission-denied, success, and purchase/restore states.
2. Review the visual design at narrow phone, large phone, and tablet-like widths. Check hierarchy, spacing, typography, contrast, safe areas, keyboard behavior, dynamic theme, touch targets, and accidental clipping/overflow.
3. Test the real native app on both platforms:
   - iOS Simulator on the macOS ARM64 machine.
   - Android Emulator on the Linux x64 machine when available; otherwise document the exact environment blocker.
   - Exercise the complete primary flow, back navigation, cancellation, invalid/empty input, permission denial, retry/recovery, and subscription purchase/restore failure paths.
   - Capture screenshots for meaningful states and inspect runtime logs. There must be no uncaught exceptions or unexplained red screens.
4. Run project checks from the app directory, using the package manager and lockfile already present:
   ```bash
   <package-manager> typecheck
   npx expo export --platform ios
   npx expo export --platform android
   ```
   Run relevant unit/integration tests if present. Do not add a test framework only to manufacture superficial coverage; add meaningful tests for pure engines and state transitions when the project has no coverage.
5. Fix defects found in the UI and functionality. Keep changes focused and do not rewrite working native architecture just for stylistic preference.
6. Re-run all affected checks, inspect `git diff --check`, review the final diff, and commit/push only the app changes that are verified. Never commit `ios/`, `android/`, build output, credentials, simulator data, or environment files unless the repository explicitly requires them.
7. Update that app's `HANDOFF.md` with the timestamp, commit/ref, changed scope, exact commands and results, device/simulator coverage, runner used, store status, and remaining blockers. Use `UNKNOWN` for unverified external state. Use `READY_FOR_SUBMISSION` only when the relevant local and external checks are actually verified.

## Runner and workflow policy

- Self-hosted runners are the default. Use `[self-hosted, linux, x64]` for Android, Gradle, Linux tests, Expo exports that do not need Apple tooling, and release assembly.
- Use `[self-hosted, macOS, ARM64]` only for iOS/Xcode/CocoaPods, Apple signing, TestFlight, StoreKit, and iOS Simulator work.
- GitHub-hosted runners are backup capacity only. Any fallback must be an explicit manual-dispatch choice: `ubuntu-24.04` for Linux/Android and `macos-14` for iOS.
- iOS and Android jobs must be independent and run in parallel because they use different machines. A release job may depend on both platform jobs after artifacts are collected.
- Keep a repository-scoped concurrency group with `cancel-in-progress: false` so one app does not consume multiple runner slots for duplicate releases. Serialize jobs that share one runner.
- Linux workflows must not reference `/Users/ata`, `/opt/homebrew`, `security`, Fastlane, or macOS-only paths. Use OpenJDK 17 and explicitly provision the Android SDK/platform/build tools/NDK required by the project.
- Play publishing uses the `PLAY_STORE_SERVICE_ACCOUNT_JSON` GitHub secret, written only to `$RUNNER_TEMP`. App Store Connect credentials must be runner-local or supplied as secrets. Store app creation is owner-managed unless explicitly requested.
- Normal pushes may build and package without uploading to stores. Store uploads must be explicitly enabled and skipped uploads must produce a clear warning in logs and the handoff.
- Required build/export commands must fail on errors. Do not hide failures with `|| true`.

## Definition of done

An app is complete only when its primary experience is visually coherent and intuitive on both platforms, the complete user journey has been exercised, relevant runtime logs are clean, typecheck and platform exports pass, workflow runner placement is correct, and `HANDOFF.md` accurately records evidence and blockers.
