const express = require('express');
const ejs = require('ejs');
const config = require('config');
require('dotenv').config();
const axios = require('axios');
const _ = require('lodash');
const connectDB = require('./config/db');
const summoners = require('./config/summoners');

const Summoner = require('./models/Summoner');
const Profile = require('./models/Profile');

const app = express();
app.set('view engine', 'ejs');

/*
DEV NOTES:
For simplicity, the main structure of the App is here.
*/

// Connect Database
connectDB();

// Init Middleware
app.use(express.json({ extended: false }));
app.use(express.static('public'));

app.get('/', async (req, res) => {
  let profiles = [];

  // Get all summoners
  try {
    const summoners = await Summoner.find({});
    if (summoners.length == 0) {
      return res.status(400).json({ msg: 'No summoners found' });
    }

    for (let i = 0; i < summoners.length; i++) {
      console.log(summoners[i].id);
      let profile = await Profile.findOne({ summoner: summoners[i].id });
      profiles.push(profile);
      let live = await getAPIData('liveMatchURL', summoners[i].riotId);
      if (!_.isEmpty(live)) {
        summoners[i].live = 'LIVE';
      } else {
        summoners[i].live = ' ';
      }
    }
  } catch (error) {
    console.log(error.message);
  }

  console.log(profiles);
  // Send array to front-end
  res.render('list', { summoners: summoners, profiles: profiles });
});

app.post('/', async (req, res) => {
  let championList = await axios.get(config.get('champions'));
  const process = summoners.map((summoner) =>
    createOrUpdateData(summoner, championList.data.data)
  );
  const results = await Promise.all(process);

  res.redirect('/');
});

async function createOrUpdateData(iSummoner, iChampionList) {
  try {
    let {
      id,
      accountId,
      puuid,
      name,
      profileIconId,
      revisionDate,
      summonerLevel,
    } = await getAPIData('summonerHeaderURL', iSummoner);

    // Build Summoner object
    let summonerFields = {};
    summonerFields.riotId = id;
    summonerFields.accountId = accountId;
    summonerFields.puuid = puuid;
    summonerFields.name = name;
    summonerFields.profileIconId = profileIconId;
    summonerFields.profileIconUrl =
      config.get('profileImg') + profileIconId + '.png';
    summonerFields.revisionDate = revisionDate;
    summonerFields.summonerLevel = summonerLevel;

    let dbSummoner = await Summoner.findOne({ name });
    if (dbSummoner) {
      //Update
      dbSummoner = await Summoner.findOneAndUpdate(
        { name: name },
        { $set: summonerFields },
        { new: true }
      );
      console.log('Summoner updated');
    } else {
      // Create Summoner
      dbSummoner = new Summoner(summonerFields);
      await dbSummoner.save();
      console.log('Summoner created');
    }

    // create or update profile
    let profileFields = await getSummonerProfile(dbSummoner, iChampionList);
    profileFields.summoner = dbSummoner.id;

    let dbProfile = await Profile.findOne({ summoner: profileFields.summoner });
    if (dbProfile) {
      // update
      dbProfile = await Profile.findOneAndUpdate(
        { summoner: profileFields.summoner },
        { $set: profileFields },
        { new: true }
      );
      console.log('Profile updated');
    } else {
      // create
      dbProfile = new Profile(profileFields);
      await dbProfile.save();
      console.log('Profile created');
    }
  } catch (error) {
    console.log(error.message);
  }
}

async function getSummonerProfile(iDbSummoner, iChampionList) {
  let soloQ = {};
  let flexQ = {};

  try {
    let summonerDetail = await getAPIData(
      'summonerDetailURL',
      iDbSummoner.riotId
    );

    summonerDetail.forEach((league) => {
      if (league.queueType == 'RANKED_FLEX_SR') {
        flexQ.tier = league.tier;
        flexQ.rank = league.rank;
        flexQ.wins = league.wins;
        flexQ.losses = league.losses;
        flexQ.leaguePoints = league.leaguePoints;
        flexQ.emblem = 'img/Emblem_' + league.tier + '.png';

        if (!_.isEmpty(league.miniSeries)) {
          flexQ.miniSeries.wins = league.miniSeries.wins;
          flexQ.miniSeries.losses = league.miniSeries.losses;
          flexQ.miniSeries.target = league.miniSeries.target;
        }
      } else {
        soloQ.tier = league.tier;
        soloQ.rank = league.rank;
        soloQ.wins = league.wins;
        soloQ.losses = league.losses;
        soloQ.leaguePoints = league.leaguePoints;
        soloQ.emblem = 'img/Emblem_' + league.tier + '.png';

        if (!_.isEmpty(league.miniSeries)) {
          soloQ.miniSeries.wins = league.miniSeries.wins;
          soloQ.miniSeries.losses = league.miniSeries.losses;
          soloQ.miniSeries.target = league.miniSeries.target;
        }
      }
    });
  } catch (error) {
    console.log(error.message);
  }

  let profile = await getMatchesAnalysis(iDbSummoner, iChampionList);
  profile.soloQ = soloQ;
  profile.flexQ = flexQ;
  return profile;
}

async function getMatchesAnalysis(iDbSummoner, iChampionList) {
  let championsArray = [];
  let killsArray = [];
  let deathsArray = [];
  let assistsArray = [];
  let totalDamageDealtToChampionsArray = [];
  let magicDamageDealtToChampionsArray = [];
  let physicalDamageDealtToChampionsArray = [];
  let trueDamageDealtToChampionsArray = [];
  let totalHealArray = [];
  let goldEarnedArray = [];
  let totalMinionsKilledArray = [];
  let wardsPlacedArray = [];
  let wardsKilledArray = [];

  let kda,
    tCS,
    tDamageDealt,
    tGold,
    tKills,
    tDeaths,
    tAssists,
    tWards,
    aCS,
    aDamageDealt,
    aGold,
    aKills,
    aDeaths,
    aAssists,
    aWards,
    mostPlayed,
    champName,
    champId,
    timesPlayed;
  try {
    // Get last 100 matches for given summoner
    let matches = await getAPIData('summonerMatches', iDbSummoner.accountId);

    for (let i = 0; i < 99; i++) {
      //championsArray.push(m.champion);

      //let matchInfo = await getAPIData('match', m.gameId);
      //let participantId = getParticipantId(iAccountId, matchInfo);
      championsArray.push(matches.matches[i].champion);

      if (i <= 9) {
        let matchInfo = await getAPIData('match', matches.matches[i].gameId);
        let participantId = getParticipantId(iDbSummoner.riotId, matchInfo);
        let {
          kills,
          deaths,
          assists,
          totalDamageDealtToChampions,
          magicDamageDealtToChampions,
          physicalDamageDealtToChampions,
          trueDamageDealtToChampions,
          totalHeal,
          goldEarned,
          totalMinionsKilled,
          wardsPlaced,
          wardsKilled,
        } = getParticipantMatchData(participantId, matchInfo);

        if (checkField(kills)) killsArray.push(kills);
        if (checkField(deaths)) deathsArray.push(deaths);
        if (checkField(assists)) assistsArray.push(assists);
        if (checkField(totalDamageDealtToChampions))
          totalDamageDealtToChampionsArray.push(totalDamageDealtToChampions);
        if (checkField(magicDamageDealtToChampions))
          magicDamageDealtToChampionsArray.push(magicDamageDealtToChampions);
        if (checkField(physicalDamageDealtToChampions))
          physicalDamageDealtToChampionsArray.push(
            physicalDamageDealtToChampions
          );
        if (checkField(trueDamageDealtToChampions))
          trueDamageDealtToChampionsArray.push(trueDamageDealtToChampions);
        if (checkField(totalHeal)) totalHealArray.push(totalHeal);
        if (checkField(goldEarned)) goldEarnedArray.push(goldEarned);
        if (checkField(totalMinionsKilled))
          totalMinionsKilledArray.push(totalMinionsKilled);
        if (checkField(wardsPlaced)) wardsPlacedArray.push(wardsPlaced);
        if (checkField(wardsKilled)) wardsKilledArray.push(wardsKilled);
      }
    }
  } catch (error) {
    console.log(error.message);
  }

  // Get most played champion from champions array
  ({ champId, timesPlayed } = getMostPlayedChampion(championsArray));

  // Get champion data
  champName = getChampionDataByID(iChampionList, champId);

  const arrSum = (arr) => arr.reduce((a, b) => a + b, 0);
  const arrAvg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

  tCS = arrSum(totalMinionsKilledArray);
  tGold = arrSum(goldEarnedArray);
  tDamageDealt = arrSum(totalDamageDealtToChampionsArray);
  tKills = arrSum(killsArray);
  tDeaths = arrSum(deathsArray);
  tAssists = arrSum(assistsArray);
  tWards = arrSum(wardsPlacedArray);
  aCS = arrAvg(totalMinionsKilledArray);
  aGold = arrAvg(goldEarnedArray);
  aDamageDealt = arrAvg(totalDamageDealtToChampionsArray);
  aKills = arrAvg(killsArray);
  aDeaths = arrAvg(deathsArray);
  aAssists = arrAvg(assistsArray);
  aWards = arrAvg(wardsPlacedArray);
  kda = Math.round(((aKills + aAssists) / aDeaths) * 100) / 100;
  mostPlayed = champName;
  mostPlayed.timesPlayed = timesPlayed;

  return {
    kda,
    tCS,
    tGold,
    tDamageDealt,
    tKills,
    tDeaths,
    tAssists,
    tWards,
    aCS,
    aGold,
    aDamageDealt,
    aKills,
    aDeaths,
    aAssists,
    aWards,
    mostPlayed,
  };
}

function checkField(iField) {
  if (isNaN(iField)) {
    return false;
  }

  if (typeof iField == 'undefined') {
    return false;
  }

  return true;
}
function getParticipantId(iSummonerId, iMatchInfo) {
  for (p of iMatchInfo.participantIdentities) {
    if (p.player.summonerId == iSummonerId) {
      return p.participantId;
    }
  }

  console.log('error finding id');
}

function getParticipantMatchData(iParticipantId, iMatchInfo) {
  for (p of iMatchInfo.participants) {
    if (p.participantId == iParticipantId) {
      return {
        kills: p.stats.kills,
        deaths: p.stats.deaths,
        assists: p.stats.assists,
        totalDamageDealtToChampions: p.stats.totalDamageDealtToChampions,
        magicDamageDealtToChampions: p.stats.magicDamageDealtToChampions,
        physicalDamageDealtToChampions: p.stats.physicalDamageDealtToChampions,
        trueDamageDealtToChampions: p.stats.trueDamageDealtToChampions,
        totalHeal: p.stats.totalHeal,
        goldEarned: p.stats.goldEarned,
        totalMinionsKilled: p.stats.totalMinionsKilled,
        wardsPlaced: p.stats.wardsPlaced,
        wardsKilled: p.stats.wardsKilled,
      };
    }
  }
}

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
  return { champId: mostFrequent, timesPlayed: maxValue };
}

function getChampionDataByID(iChampionList, iChampionID) {
  for (let champion in iChampionList) {
    if (iChampionList[champion].key == iChampionID) {
      return {
        name: iChampionList[champion].id,
        imgUrl: config.get('championImg') + iChampionList[champion].image.full,
      };
    }
  }
}

// Look for environment variable 'PORT' (for Heroku), else use defined port.
const PORT = process.env.PORT || 5000;

// Listen to PORT
// Using string literal to print message with PORT variable
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
