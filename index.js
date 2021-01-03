const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const OpenSquare = require('./mines');

const app = express();
app.use(bodyParser.json());

app.use(cors({ origin: 'http://localhost:3000' }));

const port = process.env.PORT || 3005;

let games = [];

app.post('/Init/:id', (req, res) => {
  const minesNumber = +req.params.id;
  const rowsNumber = req.body.rowsNumber;
  const columnsNumber = req.body.columnsNumber;
  let message;

  if (!minesNumber)
    message = {status: 'failed', id, msg: `Invalid number of mines: ${minesNumber}`};
  else if (minesNumber > rowsNumber * columnsNumber)
    message = {status: 'failed', id, msg: `Invalid number of mines: ${minesNumber} > game-board`};
  else if (!rowsNumber)
    message = {status: 'failed', id, msg: `Invalid number of rows: ${rowsNumber}`};
  else if (!columnsNumber)
    message = {status: 'failed', id, msg: `Invalid number of columns: ${columnsNumber}`};
  else {

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

    let id = games.length;

    games[id] = {
      id,
      rowsNumber,
      columnsNumber,
      minesNumber,
      minesPositions,
      mineSymbol
    };

    message = { status: 'ok', id, msg: `Game ${id} created succesfuly`};

  }
  res.send(message);
});

app.get('/OpenSquare', (req, res) => {
  const id = +req.query.id;
  let message;

  if (!games[id]) message = {status: 'failed', id, msg: `Game ${id} not found`};
  else {
    const index = +req.query.index;
    let squaresValues = req.query.squaresValues.slice();
    let squaresCSS = req.query.squaresCSS.slice();
    const win = req.query.win;

    if ((!win && index === null) || !squaresValues || !squaresCSS)
      message = {status: 'failed', id, msg: 'Missing mandatory parameter'};
    else {
      message = {status: 'ok', id, msg: 'Parameters received successfully'};
      message.exploded = !OpenSquare(index, squaresValues, squaresCSS, games[id], win)
      message.squaresValues = squaresValues;
      message.squaresCSS = squaresCSS;
    }
  }

  res.send(message);
});

app.put('/Restart/:id', async (req, res) => {
  const id = +req.params.id;
  let message;

  if (!games[id]) message = {status: 'failed', id, msg: `Game ${id} not found`};
  else {
    const minesNumber = req.body.minesNumber;
    const rowsNumber = req.body.rowsNumber;
    const columnsNumber = req.body.columnsNumber;

    if (!minesNumber) minesNumber = games[id].minesNumber;
    if (!rowsNumber) rowsNumber = games[id].rowsNumber;
    if (!columnsNumber) columnsNumber = games[id].columnsNumber;

    if (minesNumber > rowsNumber * columnsNumber)
      message = {status: 'failed', id, msg: `Invalid number of mines: ${minesNumber} > game-board`};
    else {

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

      games[id] = {
        id,
        rowsNumber,
        columnsNumber,
        minesNumber,
        minesPositions,
        mineSymbol
      };

      message = { status: 'ok', id, msg: `Game ${id} resset succesfuly`}

    }
  }

  res.send(message);

});

app.listen(port, () => {
    console.log(`App running on http://localhost:${port}`);
})