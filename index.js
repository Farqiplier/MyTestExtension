/**
 * SeAnime Streaming Provider: Rivestream
 * Metadata: TMDB API
 * Video: Rivestream Embed API
 */

class Provider {
  constructor() {
    this.apiKey = "963152cd5dd145cfa7496a5e975139e9";
    this.apiUrl = "https://api.themoviedb.org/3";
  }

  getSettings() {
    return {
      episodeServers: ["Rivestream"],
      supportsDub: false, // Rivestream typically handles multi-audio/subs in the player
    };
  }

  /**
   * Robustly extracts TMDB ID and Media Type.
   * Handles: Raw ID (Playground), SeAnime Media Object (Production).
   */
  async getMediaInfo(mediaId) {
    let id = "";
    let type = "tv"; // Default fallback

    if (typeof mediaId === "object" && mediaId !== null) {
      // Production: SeAnime passes a Media object
      id = mediaId.tmdbId || mediaId.id;
      type = (mediaId.type || "tv").toLowerCase();
    } else {
      // Playground: User might have entered a raw ID string or number
      id = String(mediaId);
      // Attempt to verify if it's a movie or TV via TMDB search if not specified
      try {
        const check = await fetch(`${this.apiUrl}/movie/${id}?api_key=${this.apiKey}`).then(res => res.json());
        type = check.success === false ? "tv" : "movie";
      } catch (e) {
        type = "tv";
      }
    }
    return { id, type };
  }

  /**
   * Fetches metadata from TMDB and formats it for SeAnime
   */
  async findEpisodes(mediaId) {
    const { id, type } = await this.getMediaInfo(mediaId);
    const episodes = [];

    if (type === "movie") {
      episodes.push({
        id: `${id}|movie`,
        number: 1,
        title: "Full Movie",
      });
    } else {
      // Fetch TV Details to get number of seasons
      const tvRes = await fetch(`${this.apiUrl}/tv/${id}?api_key=${this.apiKey}`).then(res => res.json());

      if (!tvRes.seasons) return [];

      // Loop through seasons to get all episodes
      for (const season of tvRes.seasons) {
        // Skip specials (Season 0) if desired, or include them
        if (season.season_number === 0) continue;

        const sRes = await fetch(
          `${this.apiUrl}/tv/${id}/season/${season.season_number}?api_key=${this.apiKey}`
        ).then(res => res.json());

        if (sRes.episodes) {
          for (const ep of sRes.episodes) {
            episodes.push({
              id: `${id}|tv|${ep.season_number}|${ep.episode_number}`,
              number: episodes.length + 1, // SeAnime uses absolute numbering for display
              title: `S${ep.season_number}E${ep.episode_number} - ${ep.name}`,
            });
          }
        }
      }
    }

    return episodes;
  }

  /**
   * Generates the Rivestream Embed URL
   */
  async findEpisodeServer(episode, server) {
    const parts = episode.id.split("|");
    const tmdbId = parts[0];
    const type = parts[1]; // movie or tv

    let embedUrl = "";

    if (type === "movie") {
      embedUrl = `https://rivestream.org/embed?id=${tmdbId}&type=movie`;
    } else {
      const season = parts[2];
      const epNum = parts[3];
      embedUrl = `https://rivestream.org/embed?id=${tmdbId}&type=tv&season=${season}&episode=${epNum}`;
    }

    return {
      server: "Rivestream",
      videoSources: [
        {
          url: embedUrl,
          quality: "auto",
          type: "iframe", // Tells SeAnime to render as an iframe
        },
      ],
    };
  }
}

// Crucial: Instantiate for SeAnime discovery
new Provider();
