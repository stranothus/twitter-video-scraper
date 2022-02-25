Gather videos on the Russia/Ukraine conflict or any other topic from Twitter. 

Setup:
- clone this repo
- add .env with the following variables:
    - authorization - get this from looking at a Twitter fetch in your dev tools
    - x-guest-token - this can be excluded since it will need to be regenerated, eventually, but it's recommended to start with one. You can get this by looking at Twitter cookies in a new private window
    - BROWSER_PATH - the absolute path to your puppeteer browser
- run `npm install` in your terminal
- run `npm start` to start scraping

How it works: 
This script searches Twitter and finds videos in the top X posts of the search results. It then searches if it already has a download of each posts' video and, if not, downloads one as an mp4 file. The Twitter API requires a few values, one of which is a guest token. This guest token periodically expires, so the script opens a new automated browser and loads Twitter to get a new guest token when it detects the old one isn't working. 

This script does not affect Twitter posts or users to any signigicant degree, if any degree at all. It is not written by Twitter or any associate of Twitter. Use at your own risk. 