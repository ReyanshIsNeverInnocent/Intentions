export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  year: number;
  audio: string;
  cover: string;
  duration: number;
  color: string;
  lyricsFile?: string;
}

export interface LyricLine {
  time: number | null;
  text: string;
}
