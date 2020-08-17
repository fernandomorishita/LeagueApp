const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
  summoner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'summoner',
  },
  soloQ: {
    tier: {
      type: String,
    },
    rank: {
      type: String,
    },
    wins: {
      type: Number,
    },
    losses: {
      type: Number,
    },
    leaguePoints: {
      type: Number,
    },
    emblem: {
      type: String,
    },
    miniSeries: {
      wins: {
        type: Number,
      },
      losses: {
        type: Number,
      },
      target: {
        type: Number,
      },
    },
  },
  flexQ: {
    tier: {
      type: String,
    },
    rank: {
      type: String,
    },
    wins: {
      type: Number,
    },
    losses: {
      type: Number,
    },
    leaguePoints: {
      type: Number,
    },
    emblem: {
      type: String,
    },
    miniSeries: {
      wins: {
        type: Number,
      },
      losses: {
        type: Number,
      },
      target: {
        type: Number,
      },
    },
  },
  kda: {
    type: String,
  },
  tCS: {
    type: Number,
  },
  tGold: {
    type: Number,
  },
  tDamageDealt: {
    type: Number,
  },
  tKills: {
    type: Number,
  },
  tDeaths: {
    type: Number,
  },
  tAssists: {
    type: Number,
  },
  tWards: {
    type: Number,
  },
  aCS: {
    type: Number,
  },
  aGold: {
    type: Number,
  },
  aDamageDealt: {
    type: Number,
  },
  aKills: {
    type: Number,
  },
  aDeaths: {
    type: Number,
  },
  aAssists: {
    type: Number,
  },
  aWards: {
    type: Number,
  },
  mostPlayed: {
    name: {
      type: String,
    },
    imgUrl: {
      type: String,
    },
    timesPlayed: {
      type: Number,
    },
  },
});

module.exports = Profile = mongoose.model('profile', ProfileSchema);
