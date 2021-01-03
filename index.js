//import OpenSquare from './mines';

const express = require('express');
const bodyParser = require('body-parser');
const OpenSquare = require('./mines');

const app = express();
app.use(bodyParser.json());

const port = process.env.PORT || 3000;

let games = [];

app.post('/Init/:id', (req, res) => {
  const minesNumber = +req.params.id;
  const rowsNumber = req.body.rowsNumber;
  const columnsNumber = req.body.columnsNumber;

  // sorting mines positions
  const minesPositions = Array(minesNumber);
  for (let i = 0; i < minesNumber; i++) {
    const index = Math.floor(Math.random() * rowsNumber * columnsNumber);
    if (!minesPositions.includes(index)) minesPositions[i] = index;
    else i--;
  }

  // sorting bomb symbol
  const mines = ['\u2620','\u2622','\u2623'];
  const index = Math.floor(Math.random() * mines.length);
  const mineSymbol = mines[index];

  let id = games.length;

  games[id] = {id, rowsNumber, columnsNumber, minesNumber, minesPositions, mineSymbol}

  res.send({ id, msg: `Game ${id} created succesfuly`});

});

app.get('/OpenSquare/:id', (req, res) => {
  // index, squaresValues, squaresCSS, rows, columns
  const id = +req.params.id;
  let message = {};

  if (!games[id]) message = {status: 'failed', text: `Game ${id} not found`};
  else {
    const index = req.body.index;
    let squaresValues = req.body.squaresValues.slice();
    let squaresCSS = req.body.squaresCSS.slice();
    const win = req.body.win;

    if ((!win && index === null) || !squaresValues || !squaresCSS)
      message = {status: 'failed', text: 'Missing mandatory parameter'};
    else {
      message = {status: 'ok', text: 'Parameters received succesflly'};
      message.exploded = !OpenSquare(index, squaresValues, squaresCSS, games[id], win)
      message.squaresValues = squaresValues;
      message.squaresCSS = squaresCSS;
    }
  }

  res.send(message);
});

app.listen(port, () => {
    console.log(`App running on http://localhost:${port}`);
})