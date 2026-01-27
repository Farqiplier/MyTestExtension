class Provider {
    constructor() {
        this.baseUrl = "https://rivestream.org";
        this.tmdbKey = "963152cd5dd145cfa7496a5e975139e9";
        this.tmdbBase = "https://api.themoviedb.org/3";
    }

    getSettings() {
        return {
            episodeServers: ["Standard", "Torrent", "Aggregator"],
            supportsDub: false
        };
    }

    async search(query) {
        const searchTerm = typeof query === 'string' ? query : (query.query || "");
        const url = `${this.tmdbBase}/search/multi?api_key=${this.tmdbKey}&query=${encodeURIComponent(searchTerm)}`;
        const res = await fetch(url).then(r => r.json());
        if (!res.results) return [];
        return res.results
            .filter(m => m.media_type === "movie" || m.media_type === "tv")
            .map(m => ({
                id: m.id.toString(),
                title: m.title || m.name,
                url: m.media_type
            }));
    }

    async findEpisodes(mediaId) {
        // Real app passes the media object; Playground might pass a string.
        let idRaw = (typeof mediaId === 'object') ? (mediaId.id || mediaId.mediaId) : mediaId;
        if (!idRaw) return [];

        const idStr = idRaw.toString();
        try {
            const res = await fetch(`${this.tmdbBase}/tv/${idStr}?api_key=${this.tmdbKey}`).then(r => r.json());
            
            if (!res.seasons) {
                return [{ id: idStr + "00000", number: 1, title: "Full Movie" }];
            }

            let allEpisodes = [];
            for (const season of res.seasons) {
                if (season.season_number === 0) continue;
                const sRes = await fetch(`${this.tmdbBase}/tv/${idStr}/season/${season.season_number}?api_key=${this.tmdbKey}`).then(r => r.json());
                if (sRes.episodes) {
                    sRes.episodes.forEach(ep => {
                        const sStr = season.season_number.toString().padStart(2, '0');
                        const eStr = ep.episode_number.toString().padStart(3, '0');
                        allEpisodes.push({
                            id: idStr + sStr + eStr,
                            number: ep.episode_number,
                            title: `S${season.season_number}E${ep.episode_number}: ${ep.name}`
                        });
                    });
                }
            }
            return allEpisodes;
        } catch (e) {
            return [{ id: idStr + "00000", number: 1, title: "Full Movie" }];
        }
    }

    async findEpisodeServer(episode, server) {
        let data = (typeof episode === 'string') ? JSON.parse(episode) : episode;
        const fullId = (data.id || "").toString();
        
        const isMovie = fullId.endsWith("00000");
        const tmdbId = fullId.slice(0, -5);
        
        let path = "/embed";
        if (server === "Torrent") path = "/embed/torrent";
        if (server === "Aggregator") path = "/embed/agg";

        let finalUrl = `${this.baseUrl}${path}?id=${tmdbId}`;
        if (isMovie) {
            finalUrl += "&type=movie";
        } else {
            const season = parseInt(fullId.slice(-5, -3));
            const epNum = parseInt(fullId.slice(-3));
            finalUrl += `&type=tv&season=${season}&episode=${epNum}`;
        }

        return {
            server: server,
            videoSources: [{ url: finalUrl, type: "embed", quality: "auto" }]
        };
    }
}
