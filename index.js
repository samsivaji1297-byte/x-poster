const fs = require("fs");
const { TwitterApi } = require("twitter-api-v2");

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
    console.log("No posts left.");
    return;
  }

  try {
    const response = await client.v2.tweet(nextPost.text);
    console.log("Posted:", response);

    nextPost.posted = true;
    fs.writeFileSync("posts.json", JSON.stringify(posts, null, 2));
  } catch (err) {
    console.error("Error posting:", err);
  }
}

main();
