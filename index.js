const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const OpenSquare = require('./mines');

const app = express();
app.use(bodyParser.json());
app.use(cors({ origin: 'http://localhost:3000' }));

const port = process.env.PORT || 3005;

let games = [];

function getGameByID (id) {
  return games.find(game => game.id === id);
};

app.post('/Init', (req, res) => {
  const minesNumber = req.body.minesNumber;
  const rowsNumber = req.body.rowsNumber;
  const columnsNumber = req.body.columnsNumber;

  if (!minesNumber) {
    res.send({status: 'failed', msg: `Invalid number of mines: ${minesNumber}`});
    return;
  }
  if (!rowsNumber) {
    res.send({status: 'failed', msg: `Invalid number of rows: ${rowsNumber}`});
    return;
  }
  if (!columnsNumber) {
    res.send({status: 'failed', msg: `Invalid number of columns: ${columnsNumber}`});
    return;
  }
  if (minesNumber > rowsNumber * columnsNumber) {
    res.send({status: 'failed', msg: `Invalid number of mines: ${minesNumber} > game-board`});
    return;
  }

  // sorting mines positions
  const minesPositions = Array(minesNumber);
  for (let i = 0; i < minesNumber; i++) {
    const index = Math.floor(Math.random() * rowsNumber * columnsNumber);
    if (!minesPositions.includes(index)) minesPositions[i] = index;
    else i--;
  }

  // sorting mine symbol
  const mines = ['\u2620','\u2622','\u2623'];
  const index = Math.floor(Math.random() * mines.length);
  const mineSymbol = mines[index];
  const id = games.length + 1;

  games.push ({
    id,
    rowsNumber,
    columnsNumber,
    minesNumber,
    minesPositions,
    mineSymbol
  });

  res.send({ status: 'ok', msg: `Game ${id} created succesfuly`, id});
});

app.get('/data', (req, res) => {
  res.send({status: 'ok', msg: 'Parameters received successfully', games});
});

app.get('/OpenSquare', (req, res) => {
  const id = +req.query.id;

  const game = getGameByID(id);
  if (!game) {
    res.send({status: 'failed', msg: `Game ${id} not found`});
    return;
  }

  const index = +req.query.index;
  let squaresValues = req.query.squaresValues.slice();
  let squaresCSS = req.query.squaresCSS.slice();
  const win = req.query.win;

  if ((!win && index === null) || !squaresValues || !squaresCSS) {
    res.send({status: 'failed', msg: 'Missing mandatory parameter'});
    return;
  }
  
  const message = {status: 'ok', msg: 'Parameters received successfully', id};
  message.exploded = !OpenSquare(index, squaresValues, squaresCSS, game, win)
  message.squaresValues = squaresValues;
  message.squaresCSS = squaresCSS;

  res.send(message);
});

app.put('/Restart', async (req, res) => {
  const id = req.body.id;

  const game = getGameByID(id); 
  if (!game) {
    res.send({status: 'failed', msg: `Game ${id} not found`});
    return;
  }

  const minesNumber = req.body.minesNumber;
  const rowsNumber = req.body.rowsNumber;
  const columnsNumber = req.body.columnsNumber;

  if (minesNumber > rowsNumber * columnsNumber) {
    res.send({status: 'failed', id, msg: `Invalid number of mines: ${minesNumber} > game-board`});
    return;
  }

  // sorting mines positions
  const minesPositions = Array(minesNumber);
  for (let i = 0; i < minesNumber; i++) {
    const index = Math.floor(Math.random() * rowsNumber * columnsNumber);
    if (!minesPositions.includes(index)) minesPositions[i] = index;
    else i--;
  }

  //sorting mine symbol
  const mines = ['\u2620','\u2622','\u2623'];
  const index = Math.floor(Math.random() * mines.length);
  const mineSymbol = mines[index];

  game.rowsNumber = rowsNumber;
  game.columnsNumber = columnsNumber;
  game.minesNumber = minesNumber;
  game.minesPositions = minesPositions;
  game.mineSymbol = mineSymbol;

  res.send({ status: 'ok', msg: `Game ${id} resset succesfuly`});
});

app.listen(port, () => {
    console.log(`App running on http://localhost:${port}`);
})