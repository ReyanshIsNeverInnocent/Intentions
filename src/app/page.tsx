"use client";

import {
  AudioLines,
  Heart,
  Pause,
  Play,
  Repeat,
  Search,
  Shuffle,
  SkipBack,
  SkipForward,
  Settings2,
  Volume1,
  Volume2,
  VolumeX,
  X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  EMPTY_LYRIC_LINE,
  PLAYER_BRAND_TAGLINE,
  PLAYER_FOOTER_NOTE,
  PLAYER_LIKED_TRACKS_STORAGE_KEY,
  PLAYER_SETTINGS_STORAGE_KEY
} from "@/config/player";
import { tracks } from "@/data/tracks";
import type { LyricLine, Track } from "@/types/music";

type PropsWithTrack = { track: Track };

const CROSSFADE_SECONDS = [0, 2, 4, 6, 8] as const;
type CrossfadeSeconds = (typeof CROSSFADE_SECONDS)[number];
type MusicFilter = "original" | "warm" | "bass" | "bright";

type PlayerSettings = {
  saveLikedSongs: boolean;
  crossfadeSeconds: CrossfadeSeconds;
  musicFilter: MusicFilter;
};

const DEFAULT_SETTINGS: PlayerSettings = {
  saveLikedSongs: true,
  crossfadeSeconds: 4,
  musicFilter: "original"
};

type AudioGraph = {
  context: AudioContext;
  deckGains: [GainNode, GainNode];
  masterGain: GainNode;
  filters: [BiquadFilterNode, BiquadFilterNode, BiquadFilterNode];
};

const MUSIC_FILTERS: Record<MusicFilter, { label: string; gains: [number, number, number] }> = {
  original: { label: "Original", gains: [0, 0, 0] },
  warm: { label: "Warm", gains: [3, 1, -2] },
  bass: { label: "Bass boost", gains: [6, 1, 0] },
  bright: { label: "Bright", gains: [-1, 1, 4] }
};

function isMusicFilter(value: unknown): value is MusicFilter {
  return value === "original" || value === "warm" || value === "bass" || value === "bright";
}

function applyMusicFilter(graph: AudioGraph, preset: MusicFilter) {
  const [low, mid, high] = graph.filters;
  const [lowGain, midGain, highGain] = MUSIC_FILTERS[preset].gains;
  const now = graph.context.currentTime;
  low.gain.setTargetAtTime(lowGain, now, 0.04);
  mid.gain.setTargetAtTime(midGain, now, 0.04);
  high.gain.setTargetAtTime(highGain, now, 0.04);
}

function normalizeSettings(value: unknown): PlayerSettings {
  if (typeof value !== "object" || value === null) return DEFAULT_SETTINGS;
  const saved = value as Record<string, unknown>;
  const crossfadeSeconds = CROSSFADE_SECONDS.find((seconds) => seconds === saved.crossfadeSeconds);
  return {
    saveLikedSongs: typeof saved.saveLikedSongs === "boolean" ? saved.saveLikedSongs : DEFAULT_SETTINGS.saveLikedSongs,
    crossfadeSeconds: crossfadeSeconds ?? DEFAULT_SETTINGS.crossfadeSeconds,
    musicFilter: isMusicFilter(saved.musicFilter) ? saved.musicFilter : DEFAULT_SETTINGS.musicFilter
  };
}

function parseLrc(content: string): LyricLine[] {
  return content.replace(/^\uFEFF/, "").replace(/\r/g, "").trimEnd().split("\n").map((line) => {
    if (!line.trim()) return { time: null, text: EMPTY_LYRIC_LINE };
    const match = line.match(/^\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\](.*)$/);
    if (!match) return { time: null, text: line.trim() };
    const minutes = Number(match[1]);
    const seconds = Number(match[2]);
    const fraction = match[3] ? Number(`0.${match[3]}`) : 0;
    return {
      time: minutes * 60 + seconds + fraction,
      text: match[4].trim() || EMPTY_LYRIC_LINE
    };
  });
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
}

function CoverArt({ track }: PropsWithTrack) {
  return <img className="cover-art" src={track.cover} alt={`${track.album} album cover`} draggable={false} />;
}

type LyricsTextProps = {
  lines: LyricLine[];
  currentTime: number;
  duration: number;
  loading: boolean;
  error: string;
  compact?: boolean;
  onSeek?: (time: number) => void;
};

function LyricsText({ lines, currentTime, duration, loading, error, compact = false, onSeek }: LyricsTextProps) {
  const activeLineRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  let activeIndex = -1;
  lines.forEach((line, index) => {
    if (line.time !== null && line.time <= currentTime) activeIndex = index;
  });

  useEffect(() => {
    if (compact) return;
    const container = scrollRef.current;
    const activeLine = activeLineRef.current;
    if (!container || !activeLine) return;
    const containerRect = container.getBoundingClientRect();
    const lineRect = activeLine.getBoundingClientRect();
    const top = container.scrollTop + lineRect.top - containerRect.top - container.clientHeight / 2 + lineRect.height / 2;
    container.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }, [activeIndex, compact, lines.length]);

  if (loading) return <p className="lyrics-empty">Getting the words...</p>;
  if (error) return <p className="lyrics-empty">{error}</p>;
  if (!lines.length) return <p className="lyrics-empty">Lyrics aren&apos;t here for this one yet.</p>;

  const start = compact && activeIndex >= 0 ? Math.max(0, activeIndex - 1) : 0;
  const visibleLines = compact ? lines.slice(start, start + 3) : lines;

  return (
    <div className={`lyrics-scroll${compact ? " compact" : ""}`} ref={scrollRef}>
      <div className="lyrics-lines">
        {visibleLines.map((line, index) => {
          const lineIndex = start + index;
          const isActive = lineIndex === activeIndex;
          const isSeparator = line.text === EMPTY_LYRIC_LINE;
          const lineState = isActive ? " active" : lineIndex < activeIndex && !isSeparator ? " past" : " future";
          return (
            <button
              type="button"
              className={`lyrics-line${isSeparator ? " separator" : lineState}`}
              key={`${line.time ?? "gap"}-${lineIndex}`}
              ref={isActive ? activeLineRef : null}
              aria-current={isActive ? "true" : undefined}
              aria-label={line.time !== null ? `Seek to ${line.text}` : undefined}
              disabled={line.time === null || isSeparator}
              onClick={() => {
                if (line.time !== null) onSeek?.(line.time);
              }}
            >
              <span className="lyric-content">{line.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function HomePage() {
  const [currentId, setCurrentId] = useState(tracks[0].id);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(tracks[0].duration);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.75);
  const [isMuted, setIsMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [query, setQuery] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [likesReady, setLikesReady] = useState(false);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<PlayerSettings>(DEFAULT_SETTINGS);
  const [settingsReady, setSettingsReady] = useState(false);
  const [lyricLines, setLyricLines] = useState<LyricLine[]>([]);
  const [lyricsLoading, setLyricsLoading] = useState(Boolean(tracks[0].lyricsFile));
  const [lyricsError, setLyricsError] = useState("");
  const [notice, setNotice] = useState("");
  const audioRefs = useRef<[HTMLAudioElement | null, HTMLAudioElement | null]>([null, null]);
  const activeDeckRef = useRef<0 | 1>(0);
  const audioGraphRef = useRef<AudioGraph | null>(null);
  const transitionTimerRef = useRef<number | null>(null);
  const transitionIdRef = useRef(0);
  const transitioningRef = useRef(false);

  const currentTrack = tracks.find((track) => track.id === currentId) ?? tracks[0];
  const visibleTracks = useMemo(() => {
    const term = query.trim().toLowerCase();
    return tracks.filter((track) =>
      (!favoritesOnly || likedIds.includes(track.id)) &&
      (!term || `${track.title} ${track.artist} ${track.album}`.toLowerCase().includes(term))
    );
  }, [favoritesOnly, likedIds, query]);

  const ensureAudioGraph = useCallback(() => {
    if (audioGraphRef.current) return audioGraphRef.current;
    const firstAudio = audioRefs.current[0];
    const secondAudio = audioRefs.current[1];
    if (!firstAudio || !secondAudio || !window.AudioContext) {
      throw new Error("Web Audio is not available in this browser.");
    }

    const context = new window.AudioContext();
    const deckGains: [GainNode, GainNode] = [context.createGain(), context.createGain()];
    const filters: [BiquadFilterNode, BiquadFilterNode, BiquadFilterNode] = [
      context.createBiquadFilter(),
      context.createBiquadFilter(),
      context.createBiquadFilter()
    ];
    const masterGain = context.createGain();
    filters[0].type = "lowshelf";
    filters[0].frequency.value = 180;
    filters[1].type = "peaking";
    filters[1].frequency.value = 1000;
    filters[1].Q.value = 0.8;
    filters[2].type = "highshelf";
    filters[2].frequency.value = 4000;
    filters[0].connect(filters[1]);
    filters[1].connect(filters[2]);
    filters[2].connect(masterGain);
    masterGain.connect(context.destination);

    [firstAudio, secondAudio].forEach((audio, index) => {
      const source = context.createMediaElementSource(audio);
      source.connect(deckGains[index]);
      deckGains[index].connect(filters[0]);
      deckGains[index].gain.value = index === activeDeckRef.current ? 1 : 0;
      audio.volume = 1;
    });

    const graph = { context, deckGains, masterGain, filters };
    masterGain.gain.value = isMuted ? 0 : volume;
    applyMusicFilter(graph, settings.musicFilter);
    audioGraphRef.current = graph;
    return graph;
  }, [isMuted, settings.musicFilter, volume]);

  const cancelTransition = useCallback((keepDeck: 0 | 1) => {
    transitionIdRef.current += 1;
    transitioningRef.current = false;
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }

    const graph = audioGraphRef.current;
    const now = graph?.context.currentTime ?? 0;
    audioRefs.current.forEach((audio, index) => {
      if (index !== keepDeck) audio?.pause();
      const gain = graph?.deckGains[index].gain;
      if (gain && graph) {
        gain.cancelScheduledValues(now);
        gain.setValueAtTime(index === keepDeck ? 1 : 0, now);
      }
    });
  }, []);

  const getRelativeTrack = useCallback((direction: 1 | -1) => {
    const index = tracks.findIndex((track) => track.id === currentId);
    if (shuffle && direction === 1 && tracks.length > 1) {
      const choices = tracks.filter((track) => track.id !== currentId);
      return choices[Math.floor(Math.random() * choices.length)];
    }
    return tracks[(index + direction + tracks.length) % tracks.length];
  }, [currentId, shuffle]);

  const switchToTrack = useCallback(async (track: Track, requestedFadeSeconds: number) => {
    const fromDeck = activeDeckRef.current;
    const toDeck: 0 | 1 = fromDeck === 0 ? 1 : 0;
    const fromAudio = audioRefs.current[fromDeck];
    const toAudio = audioRefs.current[toDeck];
    if (!fromAudio || !toAudio) return;

    const shouldFade = requestedFadeSeconds > 0 && !fromAudio.paused;
    cancelTransition(fromDeck);
    const transitionId = ++transitionIdRef.current;
    transitioningRef.current = true;
    let graph: AudioGraph;
    try {
      graph = ensureAudioGraph();
      await graph.context.resume();
    } catch {
      if (transitionId === transitionIdRef.current) {
        transitioningRef.current = false;
        setNotice("Audio controls couldn't start in this browser. Try reloading the page.");
      }
      return;
    }
    if (transitionId !== transitionIdRef.current) return;

    toAudio.pause();
    toAudio.src = track.audio;
    toAudio.load();
    const now = graph.context.currentTime;
    graph.deckGains[toDeck].gain.cancelScheduledValues(now);
    graph.deckGains[toDeck].gain.setValueAtTime(0, now);

    try {
      await toAudio.play();
    } catch {
      if (transitionId === transitionIdRef.current) {
        transitioningRef.current = false;
        setIsPlaying(!fromAudio.paused);
        setNotice(`Couldn't play ${track.title}. Check the audio file in public/audio.`);
      }
      return;
    }
    if (transitionId !== transitionIdRef.current) {
      toAudio.pause();
      return;
    }

    activeDeckRef.current = toDeck;
    setCurrentId(track.id);
    setCurrentTime(toAudio.currentTime);
    setDuration(Number.isFinite(toAudio.duration) && toAudio.duration > 0 ? toAudio.duration : track.duration);
    setIsPlaying(true);
    setNotice("");

    const availableDuration = Number.isFinite(toAudio.duration) && toAudio.duration > 0
      ? toAudio.duration
      : requestedFadeSeconds;
    const fadeSeconds = shouldFade ? Math.min(requestedFadeSeconds, availableDuration) : 0;
    if (fadeSeconds > 0) {
      const fadeStart = graph.context.currentTime;
      const fadeEnd = fadeStart + fadeSeconds;
      const fromGain = graph.deckGains[fromDeck].gain;
      const toGain = graph.deckGains[toDeck].gain;
      fromGain.cancelScheduledValues(fadeStart);
      fromGain.setValueAtTime(1, fadeStart);
      fromGain.linearRampToValueAtTime(0, fadeEnd);
      toGain.cancelScheduledValues(fadeStart);
      toGain.setValueAtTime(0, fadeStart);
      toGain.linearRampToValueAtTime(1, fadeEnd);
      transitionTimerRef.current = window.setTimeout(() => {
        if (transitionId !== transitionIdRef.current) return;
        fromAudio.pause();
        fromGain.setValueAtTime(0, graph.context.currentTime);
        transitionTimerRef.current = null;
        transitioningRef.current = false;
      }, fadeSeconds * 1000);
    } else {
      fromAudio.pause();
      graph.deckGains[fromDeck].gain.setValueAtTime(0, graph.context.currentTime);
      graph.deckGains[toDeck].gain.setValueAtTime(1, graph.context.currentTime);
      transitioningRef.current = false;
    }
  }, [cancelTransition, ensureAudioGraph]);

  const playTrack = useCallback(async (track: Track) => {
    const activeDeck = activeDeckRef.current;
    const audio = audioRefs.current[activeDeck];
    if (!audio) return;
    const requestedSource = new URL(track.audio, window.location.href).href;
    const isCurrentSource = track.id === currentId && audio.src === requestedSource;

    if (isCurrentSource && !audio.paused) {
      cancelTransition(activeDeck);
      audioRefs.current.forEach((deck) => deck?.pause());
      setIsPlaying(false);
      return;
    }

    if (isCurrentSource) {
      cancelTransition(activeDeck);
      try {
        const graph = ensureAudioGraph();
        await graph.context.resume();
        await audio.play();
        setNotice("");
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
        setNotice(`Couldn't resume ${track.title}. Check the audio file in public/audio.`);
      }
      return;
    }

    const anotherDeckIsPlaying = audioRefs.current.some((deck) => deck !== null && !deck.paused);
    void switchToTrack(track, anotherDeckIsPlaying ? settings.crossfadeSeconds : 0);
  }, [cancelTransition, currentId, ensureAudioGraph, settings.crossfadeSeconds, switchToTrack]);

  const playRelative = useCallback((direction: 1 | -1) => {
    void playTrack(getRelativeTrack(direction));
  }, [getRelativeTrack, playTrack]);

  const handleTimeUpdate = useCallback((deck: number, audio: HTMLAudioElement) => {
    if (deck !== activeDeckRef.current) return;
    setCurrentTime(audio.currentTime);
    const fadeSeconds = settings.crossfadeSeconds;
    if (fadeSeconds === 0 || repeat || audio.paused || transitioningRef.current || !Number.isFinite(audio.duration)) return;
    const remaining = audio.duration - audio.currentTime;
    if (remaining > fadeSeconds) return;
    const currentIndex = tracks.findIndex((track) => track.id === currentId);
    if (!shuffle && currentIndex === tracks.length - 1) return;
    void switchToTrack(getRelativeTrack(1), Math.min(fadeSeconds, remaining));
  }, [currentId, getRelativeTrack, repeat, settings.crossfadeSeconds, shuffle, switchToTrack]);

  const handleEnded = useCallback(() => {
    const audio = audioRefs.current[activeDeckRef.current];
    if (repeat && audio) {
      audio.currentTime = 0;
      void audio.play().then(() => setIsPlaying(true)).catch(() => {
        setIsPlaying(false);
        setNotice(`Couldn't replay ${currentTrack.title}. Check the audio file in public/audio.`);
      });
      return;
    }
    const index = tracks.findIndex((track) => track.id === currentId);
    if (!shuffle && index === tracks.length - 1) {
      setIsPlaying(false);
      setCurrentTime(duration);
      return;
    }
    playRelative(1);
  }, [currentId, currentTrack.title, duration, playRelative, repeat, shuffle]);

  const seek = (value: number) => {
    const audio = audioRefs.current[activeDeckRef.current];
    if (!audio || !Number.isFinite(value)) return;
    audio.currentTime = value;
    setCurrentTime(value);
  };

  const toggleLike = (id: string) => {
    setLikedIds((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]);
  };

  useEffect(() => {
    const graph = audioGraphRef.current;
    if (graph) {
      graph.masterGain.gain.setTargetAtTime(isMuted ? 0 : volume, graph.context.currentTime, 0.015);
      return;
    }
    audioRefs.current.forEach((audio) => {
      if (audio) audio.volume = isMuted ? 0 : volume;
    });
  }, [isMuted, volume]);

  useEffect(() => {
    if (audioGraphRef.current) applyMusicFilter(audioGraphRef.current, settings.musicFilter);
  }, [settings.musicFilter]);

  useEffect(() => {
    let loadedSettings = DEFAULT_SETTINGS;
    try {
      const saved = window.localStorage.getItem(PLAYER_SETTINGS_STORAGE_KEY);
      if (saved) {
        try {
          loadedSettings = normalizeSettings(JSON.parse(saved));
          setSettings(loadedSettings);
        } catch {
          setNotice("Saved settings couldn't be read. Using the defaults for now.");
        }
      }
    } catch {
      setNotice("This browser couldn't access saved settings.");
    }
    if (loadedSettings.saveLikedSongs) {
      try {
        const savedLikes = window.localStorage.getItem(PLAYER_LIKED_TRACKS_STORAGE_KEY);
        if (savedLikes) {
          const parsed: unknown = JSON.parse(savedLikes);
          if (!Array.isArray(parsed)) throw new Error("Saved liked tracks are invalid.");
          setLikedIds(parsed.filter((id): id is string =>
            typeof id === "string" && tracks.some((track) => track.id === id)
          ));
        }
      } catch {
        setNotice("Saved likes couldn't be read. Your current session will still work.");
      }
    }
    setSettingsReady(true);
    setLikesReady(true);
  }, []);

  useEffect(() => {
    if (!settingsReady) return;
    try {
      window.localStorage.setItem(PLAYER_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      setNotice("Settings couldn't be saved in this browser.");
    }
  }, [settings, settingsReady]);

  useEffect(() => {
    if (!settingsReady || !likesReady) return;
    try {
      if (settings.saveLikedSongs) {
        window.localStorage.setItem(PLAYER_LIKED_TRACKS_STORAGE_KEY, JSON.stringify(likedIds));
      } else {
        window.localStorage.removeItem(PLAYER_LIKED_TRACKS_STORAGE_KEY);
      }
    } catch {
      setNotice("Liked songs couldn't be saved in this browser.");
    }
  }, [likedIds, likesReady, settings.saveLikedSongs, settingsReady]);

  useEffect(() => {
    if (!currentTrack.lyricsFile) {
      setLyricLines([]);
      setLyricsLoading(false);
      setLyricsError("");
      return;
    }

    const controller = new AbortController();
    setLyricLines([]);
    setLyricsLoading(true);
    setLyricsError("");
    fetch(currentTrack.lyricsFile, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Lyrics request failed with status ${response.status}`);
        return response.text();
      })
      .then((content) => setLyricLines(parseLrc(content)))
      .catch(() => {
        if (!controller.signal.aborted) setLyricsError("Couldn't load this song's lyrics file.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLyricsLoading(false);
      });

    return () => controller.abort();
  }, [currentTrack.lyricsFile]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && (lyricsOpen || settingsOpen)) {
        setLyricsOpen(false);
        setSettingsOpen(false);
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target?.tagName ?? "")) return;
      const audio = audioRefs.current[activeDeckRef.current];
      if (event.code === "Space") {
        event.preventDefault();
        void playTrack(currentTrack);
      } else if (event.code === "ArrowRight" && audio) {
        seek(Math.min(audio.currentTime + 5, duration));
      } else if (event.code === "ArrowLeft" && audio) {
        seek(Math.max(audio.currentTime - 5, 0));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentTrack, duration, lyricsOpen, playTrack, settingsOpen]);

  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <main className="app-shell" style={{ "--accent": currentTrack.color } as React.CSSProperties}>
      <div
        className="album-ambience"
        aria-hidden="true"
      >
        <div className="album-cover-layer" style={{ backgroundImage: `url("${currentTrack.cover}")` }} />
        <div className="album-color-flow" />
        <div className="album-color-flow alternate" />
        <div className="album-shade" />
      </div>
      {([0, 1] as const).map((deck) => (
        <audio
          key={deck}
          ref={(element) => { audioRefs.current[deck] = element; }}
          preload="metadata"
          onTimeUpdate={(event) => handleTimeUpdate(deck, event.currentTarget)}
          onLoadedMetadata={(event) => {
            if (activeDeckRef.current !== deck) return;
            const length = event.currentTarget.duration;
            if (Number.isFinite(length) && length > 0) setDuration(length);
          }}
          onPlay={() => {
            if (activeDeckRef.current === deck) setIsPlaying(true);
          }}
          onPause={() => {
            if (activeDeckRef.current === deck) setIsPlaying(false);
          }}
          onEnded={() => {
            if (activeDeckRef.current === deck) handleEnded();
          }}
          onError={() => {
            if (activeDeckRef.current !== deck) return;
            setIsPlaying(false);
            setNotice(`Couldn't load ${currentTrack.title}. Check the audio file in public/audio.`);
          }}
        />
      ))}

      <header className="site-header">
        <a className="brand-lockup" href="#" aria-label="Intentions home">
          <span className="brand-mark"><img className="brand-logo" src="/branding/intentions-icon.png" alt="" /></span>
          <span className="brand-copy"><span className="wordmark">intentions</span><span className="brand-tagline">{PLAYER_BRAND_TAGLINE}</span></span>
        </a>
        <div className="header-actions">
          <span className="header-count">{tracks.length} songs</span>
          <button className="settings-button" onClick={() => setSettingsOpen(true)} aria-label="Open settings"><Settings2 size={17} /><span>Settings</span></button>
        </div>
      </header>

      <div className="app-content">
        <section className="now-playing-panel" aria-label="Now playing">
          <div className="panel-topline">
            <span className="section-tag">{isPlaying ? "NOW PLAYING" : "READY TO PLAY"}</span>
            <div className="panel-actions">
              <button className={`icon-button panel-like${likedIds.includes(currentId) ? " liked" : ""}`} onClick={() => toggleLike(currentId)} aria-label={likedIds.includes(currentId) ? "Unlike track" : "Like track"} aria-pressed={likedIds.includes(currentId)}>
                <Heart size={19} fill={likedIds.includes(currentId) ? "currentColor" : "none"} />
              </button>
            </div>
          </div>

          <div className="now-playing-main">
            <div className="main-cover"><CoverArt track={currentTrack} /></div>
            <div className="track-details">
              <h1>{currentTrack.title}</h1>
              <dl className="track-metadata">
                <div className="track-meta-artist">
                  <dt>Artist</dt>
                  <dd>{currentTrack.artist}</dd>
                </div>
                <div className="track-meta-facts">
                  <div className="track-meta-album">
                    <dt>Album</dt>
                    <dd title={currentTrack.album}>{currentTrack.album}</dd>
                  </div>
                  <div className="track-meta-year">
                    <dt>Release year</dt>
                    <dd>{currentTrack.year}</dd>
                  </div>
                </div>
              </dl>
            </div>
          </div>

          <div className="main-controls">
            <div className="transport-controls">
              <button className={`small-control${shuffle ? " active" : ""}`} onClick={() => setShuffle((value) => !value)} aria-label="Toggle shuffle" aria-pressed={shuffle}><Shuffle size={17} /></button>
              <button className="small-control" onClick={() => playRelative(-1)} aria-label="Previous track"><SkipBack size={19} fill="currentColor" /></button>
              <button className="big-play" onClick={() => void playTrack(currentTrack)} aria-label={isPlaying ? "Pause" : "Play"}>
                {isPlaying ? <Pause size={21} fill="currentColor" /> : <Play size={21} fill="currentColor" />}
              </button>
              <button className="small-control" onClick={() => playRelative(1)} aria-label="Next track"><SkipForward size={19} fill="currentColor" /></button>
              <button className={`small-control${repeat ? " active" : ""}`} onClick={() => setRepeat((value) => !value)} aria-label="Toggle repeat" aria-pressed={repeat}><Repeat size={17} /></button>
            </div>

            <div className="progress-area">
              <input type="range" min={0} max={duration || 1} step={0.1} value={Math.min(currentTime, duration || 1)} onChange={(event) => seek(Number(event.target.value))} aria-label="Seek through track" style={{ "--range-progress": `${progress}%` } as React.CSSProperties} />
              <div><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div>
            </div>

            <div className="volume-control">
              <button className="small-control" onClick={() => setIsMuted((value) => !value)} aria-label={isMuted ? "Unmute" : "Mute"}>
                {isMuted || volume === 0 ? <VolumeX size={17} /> : volume < 0.5 ? <Volume1 size={17} /> : <Volume2 size={17} />}
              </button>
              <input type="range" min={0} max={1} step={0.01} value={isMuted ? 0 : volume} onChange={(event) => { setVolume(Number(event.target.value)); setIsMuted(false); }} aria-label="Volume" style={{ "--range-progress": `${(isMuted ? 0 : volume) * 100}%` } as React.CSSProperties} />
              <span>{isPlaying ? "playing" : "ready"}</span>
            </div>
          </div>

          {!lyricsOpen && (
            <section className="lyrics-inline" aria-label="Current lyrics">
              <div className="lyrics-inline-heading">
                <span className="lyrics-label">LYRICS</span>
                <button className="lyrics-open-button" onClick={() => setLyricsOpen(true)} aria-label="Expand lyrics">
                  <AudioLines size={15} /><span>Expand</span>
                </button>
              </div>
              <LyricsText
                lines={lyricLines}
                currentTime={currentTime}
                duration={duration}
                loading={lyricsLoading}
                error={lyricsError}
                compact
                onSeek={seek}
              />
              <div className="lyrics-inline-footer">
                <span className="lyrics-inline-track">{currentTrack.title}</span>
              </div>
            </section>
          )}

          {notice && <div className="player-notice" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss message"><X size={15} /></button></div>}
        </section>

        {lyricsOpen ? (
          <section className="lyrics-panel" id="lyrics-panel" aria-label={`${currentTrack.title} lyrics`}>
            <div className="lyrics-panel-heading">
              <div className="lyrics-heading-copy">
                <span className="lyrics-label">WORDS FOR THIS MOMENT</span>
                <h2>Lyrics</h2>
                <p>{currentTrack.title}<span>·</span>{currentTrack.artist}</p>
              </div>
              <button className="close-lyrics-button" onClick={() => setLyricsOpen(false)} aria-label="Close lyrics and return to playlist">
                <X size={17} /><span>Close</span>
              </button>
            </div>
            <div className="lyrics-progress" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
            <LyricsText
              lines={lyricLines}
              currentTime={currentTime}
              duration={duration}
              loading={lyricsLoading}
              error={lyricsError}
              onSeek={seek}
            />
            <div className="lyrics-panel-footer">
              <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
              <span>{isPlaying ? "following along" : "ready when you are"}</span>
            </div>
          </section>
        ) : (
          <section className="library-panel" aria-label="Song library">
          <div className="library-heading">
            <div><p className="section-tag">YOUR MUSIC</p><h2>The playlist</h2><span>{visibleTracks.length} songs</span></div>
            <button className={`liked-filter${favoritesOnly ? " selected" : ""}`} onClick={() => setFavoritesOnly((value) => !value)} aria-pressed={favoritesOnly}>
              <Heart size={16} fill={favoritesOnly ? "currentColor" : "none"} /><span>Liked</span>
            </button>
          </div>

          <label className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find that song..." aria-label="Search tracks" />{query && <button onClick={() => setQuery("")} aria-label="Clear search"><X size={15} /></button>}</label>

          <div className="track-list-heading" aria-hidden="true">
            <span />
            <span />
            <span>Title / Artist</span>
            <span>Duration</span>
            <span />
          </div>
          <div className="track-list">
            {visibleTracks.length ? visibleTracks.map((track) => {
              const active = track.id === currentId;
              const liked = likedIds.includes(track.id);
              return (
                <article className={`track-row${active ? " active" : ""}`} key={track.id}>
                  <button className="track-play" onClick={() => void playTrack(track)} aria-label={active && isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}>
                    {active && isPlaying ? <span className="mini-bars"><i /><i /><i /></span> : <Play size={15} fill="currentColor" />}
                  </button>
                  <CoverArt track={track} />
                  <button className="track-main" onClick={() => void playTrack(track)}>
                    <strong>{track.title}</strong><span>{track.artist}</span>
                  </button>
                  <span className="track-duration" aria-label={`Duration ${formatTime(track.duration)}`} title="Track duration">{formatTime(track.duration)}</span>
                  <button className={`track-like${liked ? " liked" : ""}`} onClick={() => toggleLike(track.id)} aria-label={liked ? `Unlike ${track.title}` : `Like ${track.title}`} aria-pressed={liked}>
                    <Heart size={16} fill={liked ? "currentColor" : "none"} />
                  </button>
                </article>
              );
            }) : <div className="empty-list">{favoritesOnly ? "No liked songs yet." : "Nothing found, try another search."}</div>}
          </div>
          </section>
        )}
      </div>

      <footer className="site-footer">
        <span className="footer-brand">intentions</span>
        <span className="footer-note">{PLAYER_FOOTER_NOTE}</span>
      </footer>

      {settingsOpen && (
        <div className="settings-overlay" onClick={(event) => { if (event.target === event.currentTarget) setSettingsOpen(false); }}>
          <section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
            <div className="settings-heading">
              <div><span className="lyrics-label">YOUR PLAYER</span><h2 id="settings-title">Settings</h2><p>Small things, saved on this device.</p></div>
              <button className="icon-button close-modal" onClick={() => setSettingsOpen(false)} aria-label="Close settings"><X size={20} /></button>
            </div>
            <div className="settings-list">
              <div className="setting-item">
                <div><strong>Remember liked songs</strong><p>Keep your liked tracks saved in this browser.</p></div>
                <button className={`setting-switch${settings.saveLikedSongs ? " on" : ""}`} role="switch" aria-checked={settings.saveLikedSongs} aria-label="Remember liked songs" onClick={() => setSettings((value) => ({ ...value, saveLikedSongs: !value.saveLikedSongs }))}><span /></button>
              </div>
              <div className="setting-item setting-item-select">
                <div><strong>Crossfade</strong><p>Blend into the next song before this one ends.</p></div>
                <select
                  className="setting-select"
                  aria-label="Crossfade duration"
                  value={settings.crossfadeSeconds}
                  onChange={(event) => {
                    const seconds = CROSSFADE_SECONDS.find((option) => option === Number(event.target.value));
                    if (seconds !== undefined) setSettings((value) => ({ ...value, crossfadeSeconds: seconds }));
                  }}
                >
                  {CROSSFADE_SECONDS.map((seconds) => (
                    <option key={seconds} value={seconds}>{seconds === 0 ? "Off" : `${seconds} sec`}</option>
                  ))}
                </select>
              </div>
              <div className="setting-item setting-item-select">
                <div><strong>Music filter</strong><p>Shape the sound with a quick EQ preset.</p></div>
                <select
                  className="setting-select"
                  aria-label="Music filter"
                  value={settings.musicFilter}
                  onChange={(event) => {
                    const filter = event.target.value;
                    if (isMusicFilter(filter)) {
                      setSettings((value) => ({ ...value, musicFilter: filter }));
                    }
                  }}
                >
                  {Object.entries(MUSIC_FILTERS).map(([filter, preset]) => (
                    <option key={filter} value={filter}>{preset.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="settings-footer"><span>Saved automatically</span></div>
          </section>
        </div>
      )}
    </main>
  );
}
