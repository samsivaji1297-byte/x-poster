const fs = require("fs");
const { TwitterApi } = require("twitter-api-v2");

// -------------------------------
// Retry wrapper for X API calls
// -------------------------------
async function postWithRetry(fn, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      // Cloudflare / X transient failure
      if (err.code === 503 || err.status === 503) {
        const wait = 500 * Math.pow(2, i); // exponential backoff
        console.log(`503 from X (attempt ${i + 1}/${retries}). Retrying in ${wait}ms...`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }

      // Network-level failures
      if (err.code === "ECONNRESET" || err.code === "ETIMEDOUT") {
        const wait = 500 * Math.pow(2, i);
        console.log(`Network error (${err.code}). Retrying in ${wait}ms...`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }

      // Any other error → throw immediately
      throw err;
    }
  }

  throw new Error("Failed after maximum retries.");
}

// -------------------------------
// Main posting logic
// -------------------------------
async function main() {
  const client = new TwitterApi({
    appKey: process.env.X_API_KEY,
    appSecret: process.env.X_API_SECRET,
    accessToken: process.env.X_ACCESS_TOKEN,
    accessSecret: process.env.X_ACCESS_SECRET,
  });

  const posts = JSON.parse(fs.readFileSync("posts.json", "utf8"));
  const nextPost = posts.find(p => p.posted === false);

  if (!nextPost) {
    console.log("No posts left to publish.");
    return;
  }

  try {
    let response;

    if (Array.isArray(nextPost.text)) {
      console.log("Posting thread...");
      response = await postWithRetry(() =>
        client.v2.tweetThread(nextPost.text.map(t => ({ text: t })))
      );
    } else {
      console.log("Posting single tweet...");
      response = await postWithRetry(() =>
        client.v2.tweet({ text: nextPost.text })
      );
    }

    console.log("Posted successfully:", response);

    nextPost.posted = true;
    fs.writeFileSync("posts.json", JSON.stringify(posts, null, 2));

  } catch (err) {
    console.error("Final error after retries:", err);
  }
}

main();
