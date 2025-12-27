# Changelog v1.2.0 (2025-12-27)

## Summary
Introduced "Media Awareness" capabilities, allowing the agent to detect, analyze, and control audio and video elements on web pages.

## New Features
- ✅ **Media Inspection**: Added `browser_get_media_summary` to list all audio/video elements with detailed state (paused, muted, time, buffer).
- ✅ **Audio Analysis**: Added `browser_get_audio_analysis` to "hear" the page output using FFT analysis (volume levels, silence detection, active frequencies).
- ✅ **Media Control**: Added `browser_control_media` to play, pause, mute, unmute, and seek media elements using standard selectors.
