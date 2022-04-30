import fs from "fs";
import os from "os";
import sanitizer from "string-sanitizer";
import { TwitterApi } from "twitter-api-v2";
// import sanitizer from "string-sanitizer"
import dotenv from "dotenv";

dotenv.config();

const getLastTweetsIds = async () => {
  // Baca dari tweetsIDs
  // await fs.readFile("./tweetsIDs.json", "utf8", (err, data) => {
  //     tweetsIDs = JSON.parse(data);
  //     return tweetsIDs;
  // });
  const tweetsIDs = await fs.promises.readFile(
    "./tweets/tweetsIDs.json",
    "utf8"
  );
  return tweetsIDs;
};

const getTweet = async () => {
  const twitterClient = new TwitterApi(process.env.BEARER_TOKEN);

  const tweets = await twitterClient.v2.search("lang:id indonesia", {
    max_results: 100,
    "tweet.fields": "lang",
  });

  await tweets.fetchLast(5000);

  // let tweetsIds = [];
  let tweetsIds = JSON.parse(await getLastTweetsIds());
  let tweetsJSON = [];
  for (const tweet of tweets) {
    if (tweet.lang == "in") {
      if (!tweetsIds.includes(tweet.id)) {
        tweetsIds.push(tweet.id);
        tweetsJSON.push(tweet);
      }
    }
  }

  // console.log(tweetsIds);

  fs.writeFile(
    "./tweets/tweetsIDs.json",
    JSON.stringify(tweetsIds, null, 2),
    function (err) {
      if (err) {
        console.log("Failed writing file");
      } else {
        console.log("Success writing file");
      }
    }
  );

  const currentDate = new Date();
  const currentDateString = currentDate.toISOString();
  fs.appendFile(
    "./tweets/tweets_" + currentDateString + ".json",
    JSON.stringify(tweetsJSON, null, 2),
    function (err) {
      if (err) {
        console.log("Failed writing file");
      } else {
        console.log("Success writing file");
      }
    }
  );

  return tweetsJSON;
  // console.log(tweetsJSON);
};

const decodeString = (str) => {
  return str.replace(/\\u[\dA-F]{4}/gi, (unicode) => {
    return String.fromCharCode(parseInt(unicode.replace(/\\u/g, ""), 16));
  });
};

const getCorpus = async () => {
  let linesFiltered = [];
  let lines = [];
  const tweets = await getTweet();
  for (const tweet of tweets) {
    let cleanedTweet = tweet.text.replace(/(?:https?|ftp):\/\/[\n\S]+/g, "");
    const splitByLine = cleanedTweet.split(/\r?\n/);
    for (const line of splitByLine) {
      if (sanitizer.sanitize.keepNumber(line).length > 0) {
        // remove line with only 1 word in it
        let regexp = /[a-zA-Z]+\s+[a-zA-Z]+/g;
        if (regexp.test(line)) {
          if (!linesFiltered.includes(line)) {
            // const decodedTweet = decodeString(JSON.stringify(line));
            // linesFiltered.push(JSON.parse(decodedTweet));
            const unicodeRemovedTweet = line
              .normalize("NFD")
              .replace(/([\u0300-\u036f]|[^0-9a-zA-Z \-"':])/g, "");
            // Menghapus #Kosong
            const splitBySentences = unicodeRemovedTweet.split(". ");
            for (const sentence of splitBySentences) {
              if (
                (sentence != "" ||
                  sentence != " " ||
                  sentence != "   " ||
                  sentence != /\r?\n/) &&
                regexp.test(sentence)
              ) {
                linesFiltered.push(sentence);
              }
            }
            // linesFiltered.push(unicodeRemovedTweet);
            lines.push(line);
          }
        }
      }
    }
  }
  // console.log(linesFiltered);
  let number = 1;
  for (const line of linesFiltered) {
    fs.appendFile("./corpus/corpus.txt", line + os.EOL, function (err) {
      if (err) {
        console.log("Failed to append data");
      } else {
        console.log("Added data ", number++, "to file");
      }
    });
  }

  let numbera = 1;
  for (const line of lines) {
    fs.appendFile("./corpus/corpusAsli.txt", line + os.EOL, function (err) {
      if (err) {
        console.log("Failed to append data");
      } else {
        console.log("Added data ", numbera++, "to file");
      }
    });
  }
};

getCorpus();
// const sleep = (miliseconds) =>
//   new Promise((resolve) => setTimeout(resolve, miliseconds));

// const repeat = async (minute) => {
//   await getCorpus();
//   await sleep(minute * 60000);
//   await repeat();
// };

// repeat(1);
