# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A single-file static web app (`index.html`) that guides the user through a physio exercise routine. No build step, no dependencies, no package manager — open `index.html` directly in a browser.

## Architecture

Everything lives in `index.html`:

- **Routine data** — a `routine` array of exercise objects. Each exercise has `title`, `desc`, and either `main` (a display string for reps/duration) or `timer` + `sets` (for timed exercises with auto-countdown).
- **Timer logic** — `startTimer()` counts down using `setInterval`, auto-repeats for the number of sets, then resets `currentSet`.
- **Navigation** — `next()` advances `i` through the routine array (wraps to 0 at the end); `render()` updates the DOM.
