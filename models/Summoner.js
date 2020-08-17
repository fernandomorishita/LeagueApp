const mongoose = require('mongoose');

const SummonerSchema = new mongoose.Schema({
  riotId: {
    type: String,
  },
  accountId: {
    type: String,
  },
  puuid: {
    type: String,
  },
  name: {
    type: String,
  },
  profileIconId: {
    type: Number,
  },
  revisionDate: {
    type: Number,
  },
  summonerLevel: {
    type: Number,
  },
  profileIconUrl: {
    type: String,
  },
});

module.exports = Summoner = mongoose.model('summoner', SummonerSchema);
