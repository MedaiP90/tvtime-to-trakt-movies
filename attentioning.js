const fs = require("fs");
const readline = require("readline");

const needAttentionRaw = fs.readFileSync("./needAttention.json", "utf-8");
const needAttention = JSON.parse(needAttentionRaw);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const totalNeedAttention = needAttention.length;

(async () => {
  const movies = [];

  for (let index = 0; index < totalNeedAttention; index++) {
    const movie = needAttention[index];

    console.log(`\n\nMultiple matches for "${movie.name} (${movie.year})":`);
    
    const alternatives = movie.matchingMovies.map((m, i) => {
      return `${i}) ${m.movie.title} (${m.movie.year}) -> IMDB: ${m.movie.ids.imdb}`;
    });

    if (alternatives.length === 0) continue;

    console.log(alternatives.join("\n"));
    console.log("-1) Skip");

    const selection = await new Promise((resolve) => {
      rl.question("Select option (default: 0): ", (a) => resolve(Number(a)));
    });

    if (selection === -1) continue;

    const imdbId = isNaN(selection)
      ? movie.matchingMovies[0].movie.ids.imdb
      : movie.matchingMovies[selection].movie.ids.imdb;
    const movieEntry = {
      imdb_id: imdbId,
      type: "movie",
      watchlisted_at: movie.watchlisted_at,
      watched_at: movie.watched_at,
    };

    movies.push(movieEntry);

    console.log(`Processed ${index + 1} of ${totalNeedAttention}: ${movie.name}`);
  }

  fs.writeFileSync("./attentioned_listed.json", JSON.stringify(movies.filter((m) => !!m.watchlisted_at), null, 2));
  fs.writeFileSync("./attentioned_watched.json", JSON.stringify(movies.filter((m) => !!m.watched_at), null, 2));
})();
