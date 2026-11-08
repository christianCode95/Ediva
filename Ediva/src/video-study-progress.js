export function getVideoStudyProgress(video) {
  const duration = video?.duration
  if (!Number.isFinite(duration) || duration <= 0) {
    return { percent: 0, canAdvance: false }
  }

  const ranges = []
  const played = video.played
  if (Number.isSafeInteger(played?.length) && played.length >= 0) {
    for (let index = 0; index < played.length; index += 1) {
      try {
        const rangeStart = played.start(index)
        const rangeEnd = played.end(index)
        if (!Number.isFinite(rangeStart) || !Number.isFinite(rangeEnd)) continue
        const start = Math.max(0, Math.min(duration, rangeStart))
        const end = Math.max(0, Math.min(duration, rangeEnd))
        if (end > start) ranges.push({ start, end })
      } catch {
        // Ignore an interval that became unavailable while the player updated.
      }
    }
  }

  ranges.sort((left, right) => left.start - right.start)
  let watchedSeconds = 0
  let coveredUntil = 0
  for (const { start, end } of ranges) {
    if (end > coveredUntil) {
      watchedSeconds += end - Math.max(start, coveredUntil)
      coveredUntil = end
    }
  }

  const threshold = duration - Math.min(10, duration * 0.05)
  return {
    percent: Math.min(100, Math.floor((watchedSeconds / duration) * 100)),
    canAdvance: !video.seeking
      && Number.isFinite(video.currentTime)
      && video.currentTime >= threshold
      && watchedSeconds >= threshold,
  }
}
