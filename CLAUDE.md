# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A single-file static web app (`index.html`) that guides the user through a physio exercise routine. No build step, no dependencies, no package manager — open `index.html` directly in a browser.

## Architecture

Everything lives in `index.html`: styles, markup, and a vanilla JS script block.

### Screens

Three screens are toggled by `showScreen(id)`, which hides/shows elements by ID:

| ID | Description |
|----|-------------|
| `day-screen` | Home — pick Day 1 (Plyometrics) or Day 2 (Strength) |
| `list-screen` | Exercise list for the selected day |
| `exercise-screen` | Active exercise view with timer or rep counter |

Navigation: `selectDay()` → `renderList()` → `goToExercise(index)` → `render()`. Back navigation: `prev()`, `goHome()` (→ list), `goToDayPicker()` (→ day picker).

### Routine data

Two routines (`day1`, `day2`) live in the `routines` object. Both spread in a shared `mobility` array at the end. Each exercise object has:

| Field | Type | Purpose |
|-------|------|---------|
| `title` | string | Display name |
| `desc` | string | Coaching cue |
| `main` | string | Reps/duration label (non-timed exercises) |
| `timer` | number | Countdown seconds per set (timed exercises) |
| `sets` | number | Number of sets (required when `timer` is set) |
| `countReps` | boolean | Show the tap-to-count rep button |
| `link` | string | YouTube URL — auto-converted to embed by `toEmbedUrl()` |

`main` and `timer`/`sets` are mutually exclusive.

### Timer state machine

`timerState` drives the timer button label and behaviour:

```
idle → running → resting → running → ... → done
         ↓           ↓
       paused     (skip rest)
         ↓
       running
```

States: `"idle"` | `"running"` | `"paused"` | `"resting"` | `"done"`. `REST_SECONDS` (default 5) controls the rest period between sets. `startRest()` / `finishRest()` manage transitions in and out of rest.

### Audio

Web Audio API (`AudioContext`) plays short tones via `playTone()`:
- `playSetComplete()` — two-note chime after each set
- `playAllSetsComplete()` — four-note ascending chord when all sets finish
- `playGo()` — two-note rising cue at the start of each new set after rest

`getAudioContext()` lazily creates and caches the context (required by browsers before a user gesture).

### Key state variables

| Variable | Purpose |
|----------|---------|
| `routine` | Active array of exercise objects for the chosen day |
| `activeDay` | `"day1"` or `"day2"` |
| `i` | Current exercise index |
| `currentSet` | Current set number (1-based) |
| `repCount` | Tap counter for rep exercises |
| `intervalId` | `setInterval` handle — always cleared before starting a new interval |
| `timerState` | See timer state machine above |
| `remainingTime` | Seconds left in current countdown |
