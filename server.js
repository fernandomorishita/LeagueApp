const express = require('express');
const opgg = require('opgg-scrape');
const request = require('request');
const https = require('https');
const ejs = require('ejs');
const config = require('config');
require('dotenv').config();
const axios = require('axios');

const app = express();
app.set('view engine', 'ejs');

// Init Middleware
app.use(express.json({ extended: false }));
app.use(express.static('public'));

const summoners = ['Gabszao', 'Rusbrus', 'Hevnie', 'Homemdosako'];
const refreshStats = false;

app.get('/', async (req, res) => {
  let summonerArray = [];
  for (let summoner of summoners) {
    try {
      let summonerHeader = await getSummonerIDByName(summoner);

      let summonerDetail = await getSummonerInfoByID(summonerHeader.id);

      let summonerSoloQ = summonerDetail[0];
      let summonerFlex = summonerDetail[1];
      let soloQRank = summonerSoloQ.tier + ' ' + summonerSoloQ.rank;
      let flexRank = summonerFlex.tier + ' ' + summonerFlex.rank;
      let summonerStats = {
        name: summonerHeader.name,
        level: summonerHeader.summonerLevel,
        soloQRank: soloQRank,
        soloQLP: summonerSoloQ.leaguePoints,
        soloQWins: summonerSoloQ.wins,
        soloQLosses: summonerSoloQ.losses,
        flexRank: flexRank,
        flexLP: summonerFlex.leaguePoints,
        flexWins: summonerFlex.wins,
        flexLosses: summonerFlex.losses,
      };

      summonerArray.push(summonerStats);
    } catch (error) {
      console.log(error);
    }
  }
  res.render('list', { summoners: summonerArray });
});

async function getSummonerIDByName(iSummonerName) {
  let url =
    config.get('summonerHeaderURL') +
    iSummonerName +
    '?api_key=' +
    process.env.API_KEY;
  let result = await axios.get(url);
  return result.data;
}

async function getSummonerInfoByID(iID) {
  let url =
    config.get('summonerDetailURL') + iID + '?api_key=' + process.env.API_KEY;
  let result = await axios.get(url);
  return result.data;
}
// Look for environment variable 'PORT' (for Heroku), else use defined port.
const PORT = process.env.PORT || 5000;

// Listen to PORT
// Using string literal to print message with PORT variable
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
