const express = require('express');
const opgg = require('opgg-scrape');
const ejs = require('ejs');

const app = express();
app.set('view engine', 'ejs');

// Init Middleware
app.use(express.json({ extended: false }));
app.use(express.static('public'));

let sumStats = {};

summoners = ['Gabszao', 'Rusbrus', 'Hevnie'];
refreshStats = true;

app.get('/', async (req, res) => {
  let sumList = [];
  // async/await does not work as expected with forEach().
  for (let summoner of summoners) {
    let summonerStat = await opgg.getStats(summoner, {
      region: 'br',
      refresh: refreshStats,
    });
    sumList.push(summonerStat);
  }

  res.render('list', { list: sumList });
});

function async() {}
// Look for environment variable 'PORT' (for Heroku), else use defined port.
const PORT = process.env.PORT || 5000;

// Listen to PORT
// Using string literal top print message with PORT variable
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
