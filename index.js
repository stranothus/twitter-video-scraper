import fetch from "node-fetch";
import dotenv from "dotenv";
import fs from "fs";
import stream from "stream";
import util from "util";
import m3u8ToMp4 from "m3u8-to-mp4";
import puppeteer from "puppeteer";

const streamPipeline = util.promisify(stream.pipeline);
const converter = new m3u8ToMp4();

dotenv.config();

const search = "ukraine";
const count = 20;

async function download(url, path) {
    const response = await fetch(url);
    if (!response.ok) throw console.error(`Unexpected response ${response.statusText}`);
    await streamPipeline(response.body, fs.createWriteStream(path));
}

async function getTweets() {
    let data = await fetch(`https://twitter.com/i/api/2/search/adaptive.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&include_ext_has_nft_avatar=1&skip_status=1&cards_platform=Web-12&include_cards=1&include_ext_alt_text=true&include_quote_count=true&include_reply_count=1&tweet_mode=extended&include_entities=true&include_user_entities=true&include_ext_media_color=true&include_ext_media_availability=true&include_ext_sensitive_media_warning=true&send_error_codes=true&simple_quoted_tweet=true&q=${search}&count=${count}&query_source=typed_query&pc=1&spelling_corrections=1&ext=mediaStats%2ChighlightedLabel%2ChasNftAvatar%2CvoiceInfo%2CsuperFollowMetadata`, {
        "headers": {
            "authorization": process.env.authorization,
            "x-guest-token": process.env["x-guest-token"]
        },
        "body": null,
        "method": "GET"
    }).then(response => response.json());

    if(!data.globalObjects || !data.globalObjects.tweets) {
        const browser = await puppeteer.launch({
            defaultViewport: null,
            headless: false,
            executablePath: process.env.BROWSER_PATH
        });
        const page = await browser.newPage();
        await page.goto("https://twitter.com/explore");
        const cookies = await page.cookies();
        browser.close();

        const newToken = cookies.filter(v => v.name === "gt")[0];

        console.log(`New token: ${newToken.value}`);

        process.env["x-guest-token"] = newToken.value;

        data = await fetch(`https://twitter.com/i/api/2/search/adaptive.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&include_ext_has_nft_avatar=1&skip_status=1&cards_platform=Web-12&include_cards=1&include_ext_alt_text=true&include_quote_count=true&include_reply_count=1&tweet_mode=extended&include_entities=true&include_user_entities=true&include_ext_media_color=true&include_ext_media_availability=true&include_ext_sensitive_media_warning=true&send_error_codes=true&simple_quoted_tweet=true&q=${search}&count=${count}&query_source=typed_query&pc=1&spelling_corrections=1&ext=mediaStats%2ChighlightedLabel%2ChasNftAvatar%2CvoiceInfo%2CsuperFollowMetadata`, {
            "headers": {
                "authorization": process.env.authorization,
                "x-guest-token": process.env["x-guest-token"]
            },
            "body": null,
            "method": "GET"
        }).then(response => response.json());
    }

    return data.globalObjects.tweets;
}

async function downloadVideos() {
    await getTweets().then(tweets => Promise.all(Object.keys(tweets).map(async v => {
        const tweet = tweets[v];

        if(!tweet.extended_entities || !tweet.extended_entities.media || !tweet.extended_entities.media[0] || !tweet.extended_entities.media[0].video_info || !tweet.extended_entities.media[0].video_info.variants) return false;

        const url = tweet.extended_entities.media[0].video_info.variants.sort((a, b) => (a.url.includes(".mp4") ? 0 : 1) - (b.url.includes(".mp4") ? 0 : 1))[0].url;

        if(fs.existsSync(`./tweet_vids/${v}.mp4`)) return false;

        const extension = url.split(".").reverse()[0].replace(/\?[^\s]+/, "");

        if(extension !== "mp4") {
            const stream = await converter
                .setInputFile(url)
                .setOutputFile(`./tweet_vids/${v}.mp4`)
                .start();

            console.log("m3u8 downloaded");

            return stream;
        }

        const stream = await download(url, `./tweet_vids/${v}.mp4`);

        console.log("mp4 downloaded");

        return stream;
    })));
}

async function loop() {
    await downloadVideos();

    await new Promise((resolve, reject) => setTimeout(() => resolve(true), 1000 * 60 * 5));

    await loop();
}

await loop();