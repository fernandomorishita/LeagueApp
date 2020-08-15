const express = require('express');
const ejs = require('ejs');
const config = require('config');
require('dotenv').config();
const axios = require('axios');
const _ = require('lodash');
const summoners = require('./config/db');

const app = express();
app.set('view engine', 'ejs');

// Init Middleware
app.use(express.json({ extended: false }));
app.use(express.static('public'));

/*
DEV NOTES:
For simplicity, the main structure of the App is here.
API_KEY is used as environment variable through 'dotenv'.
*/

app.get('/', async (req, res) => {
  let summonerArray = [];
  let idCounter = 0;
  let soloQ, flex;
  let championList = await axios.get(config.get('champions'));

  // 1 - Loop through all listed summoners.
  for (let summoner of summoners) {
    let isLiveMatch = 'No';

    // 2 - Gather summoner data.
    try {
      // Read Summoner Header from API
      let {
        id,
        accountId,
        puuid,
        name,
        profileIconId,
        summonerLevel,
      } = await getAPIData('summonerHeaderURL', summoner);

      // Read Summoner Details from API
      let summonerDetail = await getAPIData('summonerDetailURL', id);

      summonerDetail.forEach((queue) => {
        ({ queueType, tier, rank, leaguePoints, wins, losses } = queue);

        if (queueType == 'RANKED_SOLO_5x5') {
          soloQ = {
            tier,
            rank,
            leaguePoints,
            wins,
            losses,
          };
        } else {
          flex = {
            tier,
            rank,
            leaguePoints,
            wins,
            losses,
          };
        }
      });

      // Gather match data from API
      let matchHistory = await getSummonerMatchHistory(
        championList.data.data,
        accountId
      );

      // Get live match if applicable
      try {
        let liveMatch = await getAPIData('liveMatchURL', id);
        isLiveMatch = 'LIVE';
      } catch (error) {
        isLiveMatch = ' ';
      }

      // Define image urls
      let icon = config.get('profileImg') + profileIconId + '.png';
      soloQ.emblem = 'img/Emblem_' + _.capitalize(soloQ.tier) + '.png';
      flex.emblem = 'img/Emblem_' + _.capitalize(flex.tier) + '.png';
      let champIcon = config.get('championImg') + matchHistory.mostPlayed.img;

      // Increment ID
      idCounter = idCounter + 1;

      let summonerStats = {
        id: idCounter,
        name: name,
        icon: icon,
        level: summonerLevel,
        soloQ: soloQ,
        flex: flex,
        mostPlayed: champIcon,
        timesPlayed: matchHistory.timesPlayed,
        liveMatch: isLiveMatch,
      };

      summonerArray.push(summonerStats);
    } catch (error) {
      console.log(error);
    }
  }

  // Send array to front-end
  res.render('list', { summoners: summonerArray });
});

async function getAPIData(iKindOfData, iID) {
  // Main connection function to API
  const url = config.get(iKindOfData) + iID + '?api_key=' + process.env.API_KEY;
  let result = await axios.get(url);
  return result.data;
}

async function getSummonerMatchHistory(iChampionList, iSummonerAccountID) {
  // Get data and analyse
  let summonerMatches = await getAPIData('summonerMatches', iSummonerAccountID);
  let count = 0;
  let champions = [];
  let roles = [];
  let lanes = [];

  summonerMatches.matches.forEach((match) => {
    champions.push(match.champion);
    roles.push(match.role);
    lanes.push(match.lane);
    count += 1;
  });

  // Get most played champion from champions array
  let { champID, timesPlayed } = getMostPlayedChampion(champions);

  // Get champion data
  let championData = getChampionDataByID(iChampionList, champID);

  return { mostPlayed: championData, timesPlayed: timesPlayed };
}

function getMostPlayedChampion(iChampionsArray) {
  let mostFrequent = iChampionsArray[0];
  let maxValue = 1;
  let championsMap = new Map();
  iChampionsArray.forEach((championID) => {
    if (championsMap.has(championID)) {
      let { occ } = championsMap.get(championID);
      //let value = occ.occ;
      occ += 1;
      championsMap.set(championID, { occ: occ });
    } else {
      championsMap.set(championID, { occ: 1 });
    }

    let { occ } = championsMap.get(championID);
    if (occ > maxValue) {
      mostFrequent = championID;
      maxValue = occ;
    }
  });
  return { champID: mostFrequent, timesPlayed: maxValue };
}

function getChampionDataByID(iChampionList, iChampionID) {
  for (let champion in iChampionList) {
    if (iChampionList[champion].key == iChampionID) {
      return {
        name: iChampionList[champion].id,
        img: iChampionList[champion].image.full,
      };
    }
  }
}

// Look for environment variable 'PORT' (for Heroku), else use defined port.
const PORT = process.env.PORT || 5000;

// Listen to PORT
// Using string literal to print message with PORT variable
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
