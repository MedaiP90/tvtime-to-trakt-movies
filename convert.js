const fs = require("fs");
const moment = require("moment");
const axios = require("axios");
const readline = require("readline");
const dotenv = require("dotenv");

dotenv.config();

const baseUrl = "https://api.trakt.tv";
const clientId = process.env.TRAKT_CLIENT_ID;
const clientSecret = process.env.TRAKT_CLIENT_SECRET;
const trackingInfoRaw = fs.readFileSync("./tracking-prod-records.json", "utf-8");
const trackingMovies = JSON.parse(trackingInfoRaw).filter((entry) => entry.entity_type === "movie");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const followed = trackingMovies.filter((movie) => movie.type === "follow");
const watched = trackingMovies.filter((movie) => movie.type === "watch");

const totalFollowed = followed.length;
const totalWatched = watched.length;

(async () => {
  const movies = [];
  const needAttention = [];
  let accessToken = "";
  let foundOnTrakt = 0;

  const codeResponse = (await axios.post(`${baseUrl}/oauth/device/code`, { client_id: clientId })).data;
  const deviceCode = codeResponse.device_code;
  const pollInterval = codeResponse.interval * 1000;

  console.log(`Verification url: ${codeResponse.verification_url}`);
  console.log(`User code: ${codeResponse.user_code}`);

  // Poll for token
  await new Promise(async (resolve) => {
    let tokenResponse = undefined;

    while (!tokenResponse) {
      try {
        tokenResponse = await axios.post(`${baseUrl}/oauth/device/token`, {
          code: deviceCode,
          client_id: clientId,
          client_secret: clientSecret,
        });
      } catch (error) {
        // Do nothing
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    accessToken = tokenResponse.data.access_token;
    resolve();
  });

  for (let index = 0; index < totalFollowed; index++) {
    const movie = followed[index];
    let releaseYear = moment(movie.release_date).format("YYYY");
    let searchTerm = movie.movie_name;

    if (releaseYear === "0001") releaseYear = undefined;
    // if (releaseYear) searchTerm += ` (${releaseYear})`;

    const matchingMovies = (await axios.get(
      `${baseUrl}/search/movie?query=${encodeURI(searchTerm)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "trakt-api-key": clientId,
          "trakt-api-version": "2",
        },
      }
    )).data;

    if (matchingMovies.length === 0) continue;

    let traktId = undefined;
    let tmdbId = undefined;
    let imdbId = undefined;
    const preFiltered = matchingMovies.filter((m) => {
      return releaseYear ? m.movie.year === Number(releaseYear) : true;
    });

    if (preFiltered.length === 0) {
      needAttention.push({ name: searchTerm, year: releaseYear, matchingMovies });
      continue;
    }

    if (preFiltered.length === 1) {
      traktId = preFiltered[0].movie.ids.trakt;
      tmdbId = preFiltered[0].movie.ids.tmdb;
      imdbId = preFiltered[0].movie.ids.imdb;
    } else {
      needAttention.push({
        name: searchTerm,
        year: releaseYear,
        watchlisted_at: moment(movie.created_at).format(),
        matchingMovies: preFiltered
      });
      continue;
    }

    const movieEntry = {
      name: movie.movie_name,
      year: releaseYear,
      // trakt_id: traktId,
      // tmdb_id: tmdbId,
      imdb_id: imdbId,
      type: "movie",
      watchlisted_at: moment(movie.created_at).format(),
    };

    movies.push(movieEntry);
    foundOnTrakt++;

    console.log(`Processed ${index + 1} of ${totalFollowed}: ${movie.movie_name}`);
  }

  for (let index = 0; index < totalWatched; index++) {
    const movie = watched[index];
    let releaseYear = moment(movie.release_date).format("YYYY");

    if (releaseYear === "0001") releaseYear = undefined;

    /* Found */

    const movieIndex = movies.findIndex((m) => m.name === movie.movie_name && m.year === releaseYear);
    const fallbackIndex = movies.findIndex((m) => m.name === movie.movie_name);

    if (movieIndex >= 0) {
      movies[movieIndex].watched_at = moment(movie.created_at).format();
      delete movies[movieIndex].watchlisted_at;
    } else if (fallbackIndex >= 0) {
      movies[fallbackIndex].watched_at = moment(movie.created_at).format();
      delete movies[fallbackIndex].watchlisted_at;
    }

    /* Not found */

    const movieAttentionIndex = needAttention.findIndex((m) => m.name === movie.movie_name && m.year === releaseYear);
    const fallbackAttentionIndex = needAttention.findIndex((m) => m.name === movie.movie_name);

    if (movieAttentionIndex >= 0) {
      needAttention[movieAttentionIndex].watched_at = moment(movie.created_at).format();
      delete needAttention[movieAttentionIndex].watchlisted_at;
    } else if (fallbackAttentionIndex >= 0) {
      needAttention[fallbackAttentionIndex].watched_at = moment(movie.created_at).format();
      delete needAttention[fallbackAttentionIndex].watchlisted_at;
    }

    console.log(`Processed ${index + 1} of ${totalWatched}: ${movie.movie_name}`);
  }

  // Delete unused info
  movies.forEach((movie) => {
    delete movie.name;
    delete movie.year;
  });

  fs.writeFileSync("./movies_listed.json", JSON.stringify(movies.filter((m) => !!m.watchlisted_at), null, 2));
  fs.writeFileSync("./movies_watched.json", JSON.stringify(movies.filter((m) => !!m.watched_at), null, 2));
  fs.writeFileSync("./needAttention.json", JSON.stringify(needAttention, null, 2));

  console.log("=================================");
  console.log(`Total followed: ${totalFollowed}`);
  console.log(`Total watched: ${totalWatched}`);
  console.log(`Found on Trakt: ${foundOnTrakt}`);
  console.log(`Need attention: ${needAttention.length}`);
})();
