import type { Track } from "@/types/music";
import { PLAYER_PUBLIC_MEDIA_BASE_URL } from "@/config/player";

const mediaUrl = (path: string) => `${PLAYER_PUBLIC_MEDIA_BASE_URL}/${path}`;

export const tracks: Track[] = [
  {
    id: "amoeba",
    title: "Amoeba",
    artist: "Clairo",
    album: "Sling",
    year: 2021,
    audio: mediaUrl("audio/amoeba.mp3"),
    cover: mediaUrl("covers/amoeba.jpg"),
    lyricsFile: mediaUrl("lyrics/amoeba.lrc"),
    duration: 228,
    color: "#91a965"
  },
  {
    id: "hotel-california",
    title: "Hotel California",
    artist: "Eagles",
    album: "Hotel California",
    year: 1976,
    audio: mediaUrl("audio/hotel-california.mp3"),
    cover: mediaUrl("covers/hotel-california.jpg"),
    lyricsFile: mediaUrl("lyrics/hotel-california.lrc"),
    duration: 391,
    color: "#d0a44c"
  },
  {
    id: "national-anthem",
    title: "National Anthem",
    artist: "Lana Del Rey",
    album: "Born to Die",
    year: 2012,
    audio: mediaUrl("audio/national-anthem.mp3"),
    cover: mediaUrl("covers/national-anthem.jpg"),
    lyricsFile: mediaUrl("lyrics/national-anthem.lrc"),
    duration: 230,
    color: "#99b75a"
  },
  {
    id: "white-mustang",
    title: "White Mustang",
    artist: "Lana Del Rey",
    album: "Lust for Life",
    year: 2017,
    audio: mediaUrl("audio/white-mustang.mp3"),
    cover: mediaUrl("covers/white-mustang.jpg"),
    lyricsFile: mediaUrl("lyrics/white-mustang.lrc"),
    duration: 164,
    color: "#b38b55"
  },
  {
    id: "popular",
    title: "Popular",
    artist: "The Weeknd, Playboi Carti & Madonna",
    album: "Popular (Music from the HBO Original Series)",
    year: 2023,
    audio: mediaUrl("audio/popular.mp3"),
    cover: mediaUrl("covers/popular.jpg"),
    lyricsFile: mediaUrl("lyrics/popular.lrc"),
    duration: 215,
    color: "#9b6caa"
  },
  {
    id: "senorita",
    title: "Señorita",
    artist: "Shawn Mendes & Camila Cabello",
    album: "Señorita",
    year: 2019,
    audio: mediaUrl("audio/senorita.mp3"),
    cover: mediaUrl("covers/senorita.jpg"),
    lyricsFile: mediaUrl("lyrics/senorita.lrc"),
    duration: 191,
    color: "#bc665d"
  },
  {
    id: "mi-gente",
    title: "Mi Gente (Slowed + Reverb, Bass Boosted)",
    artist: "J Balvin & Willy William",
    album: "Mi Gente",
    year: 2017,
    audio: mediaUrl("audio/mi-gente.mp3"),
    cover: mediaUrl("covers/mi-gente.png"),
    duration: 240,
    color: "#e57b4d"
  },
  {
    id: "fucked-my-way-up-to-the-top",
    title: "Fucked My Way Up to the Top",
    artist: "Lana Del Rey",
    album: "Ultraviolence (Deluxe)",
    year: 2014,
    audio: mediaUrl("audio/fucked-my-way-up-to-the-top.mp3"),
    cover: mediaUrl("covers/fucked-my-way-up-to-the-top.jpg"),
    lyricsFile: mediaUrl("lyrics/fucked-my-way-up-to-the-top.lrc"),
    duration: 212,
    color: "#b28a66"
  },
  {
    id: "fluorescent-adolescent",
    title: "Fluorescent Adolescent",
    artist: "Arctic Monkeys",
    album: "Favourite Worst Nightmare",
    year: 2007,
    audio: mediaUrl("audio/fluorescent-adolescent.mp3"),
    cover: mediaUrl("covers/fluorescent-adolescent.jpg"),
    lyricsFile: mediaUrl("lyrics/fluorescent-adolescent.lrc"),
    duration: 184,
    color: "#d18b53"
  },
  {
    id: "everything-sucks",
    title: "everything sucks",
    artist: "vaultboy",
    album: "everything sucks",
    year: 2021,
    audio: mediaUrl("audio/everything-sucks.mp3"),
    cover: mediaUrl("covers/everything-sucks.jpg"),
    lyricsFile: mediaUrl("lyrics/everything-sucks.lrc"),
    duration: 115,
    color: "#9d83aa"
  },
  {
    id: "espresso",
    title: "Espresso",
    artist: "Sabrina Carpenter",
    album: "Short n' Sweet",
    year: 2024,
    audio: mediaUrl("audio/espresso.mp3"),
    cover: mediaUrl("covers/espresso.jpg"),
    lyricsFile: mediaUrl("lyrics/espresso.lrc"),
    duration: 175,
    color: "#ce9b58"
  },
  {
    id: "dancing-in-my-room",
    title: "Dancing in My Room",
    artist: "347aidan",
    album: "Dancing in My Room",
    year: 2020,
    audio: mediaUrl("audio/dancing-in-my-room.mp3"),
    cover: mediaUrl("covers/dancing-in-my-room.jpg"),
    lyricsFile: mediaUrl("lyrics/dancing-in-my-room.lrc"),
    duration: 180,
    color: "#9672b2"
  },
  {
    id: "adela-nicole-kidman",
    title: "Nicole Kidman",
    artist: "ADÉLA",
    album: "PRIMA",
    year: 2026,
    audio: mediaUrl("audio/adela-nicole-kidman.mp3"),
    cover: mediaUrl("covers/adela-nicole-kidman.jpg"),
    lyricsFile: mediaUrl("lyrics/adela-nicole-kidman.lrc"),
    duration: 181,
    color: "#ca795e"
  }
];
