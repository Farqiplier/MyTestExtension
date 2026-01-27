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
        return [{ id: "1399", title: "Game of Thrones", url: "tv" }];
    }

    // SWAPPED: arg1 is now the "Media ID" box in your Playground
    async findEpisodes(mediaId, episodeId) {
        // Use mediaId if present, otherwise fallback to episodeId box, default to GoT
        let idRaw = mediaId || episodeId || "1399";
        
        // If the Playground passes an object (index 1), extract the ID
        if (typeof idRaw === 'object') idRaw = idRaw.id || "1399";
        
        const idStr = idRaw.toString();
        
        try {
            const res = await fetch(`${this.tmdbBase}/tv/${idStr}?api_key=${this.tmdbKey}`).then(r => r.json());
            
            // If it's a movie (no seasons), return the single-item array
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
            return [{ id: "0", title: "Fetch Error: " + e.message }];
        }
    }

    async findEpisodeServer(episode, server) {
        let data = episode;
        if (typeof episode === 'string') {
            try { data = JSON.parse(episode); } catch (e) { data = { id: episode }; }
        }

        const fullId = (data.id || "").toString();
        if (!fullId) return { error: "No ID found in JSON" };

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