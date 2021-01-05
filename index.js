const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongodb = require('mongodb');

const port = process.env.PORT || 3005;

let game = null;

(async () => {

const connectionString = `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@cluster0.gmcli.mongodb.net/minesweeper?retryWrites=true&w=majority`
const options = { useUnifiedTopology: true };
console.info('Conecting to MongoDB...');

const client = await mongodb.MongoClient.connect(connectionString, options);

const app = express();
app.use(bodyParser.json());
app.use(cors());

const games = client.db('minesweeper').collection('games');

function getValidGames () { return games.find({}).toArray(); }

function getGameByID (id) { return games.findOne({ _id: mongodb.ObjectId(id) }); }

function sortMinesPositions (minesNumber, rowsNumber, columnsNumber) {
  const minesPositions = Array(minesNumber);
  for (let i = 0; i < minesNumber; i++) {
    const index = Math.floor(Math.random() * rowsNumber * columnsNumber);
    if (!minesPositions.includes(index)) minesPositions[i] = index;
    else i--;
  }
  return minesPositions;
};

function sortMineSymbol () {
  const mines = ['\u2620','\u2622','\u2623'];
  const index = Math.floor(Math.random() * mines.length);
  return mines[index];
}

function verifyBody (minesNumber, rowsNumber, columnsNumber) {
  if (typeof(rowsNumber) !== "number")
    return {status: 'failed', msg: `Invalid type of the number of rows: ${typeof(rowsNumber)}`};
  if (rowsNumber <= 0)
    return {status: 'failed', msg: `Invalid number of rows: ${rowsNumber}`};
  if (typeof(columnsNumber) !== "number")
    return {status: 'failed', msg: `Invalid type of the number of columns: ${typeof(columnsNumber)}`};
  if (columnsNumber <= 0)
    return {status: 'failed', msg: `Invalid number of columns: ${columnsNumber}`};
  if (typeof(minesNumber) !== "number")
    return {status: 'failed', msg: `Invalid type of the number of mines: ${typeof(minesNumber)}`};
  if (minesNumber <= 0)
    return {status: 'failed', msg: `Invalid number of mines: ${minesNumber}`};
  if (minesNumber > rowsNumber * columnsNumber)
    return {status: 'failed', msg: `Invalid number of mines: ${minesNumber} > game-board (${
      rowsNumber * columnsNumber})`};
  return null;
}

// ==================== Initialize a Game ======================================================== POST
app.post('/Init', async (req, res) => {
  const { minesNumber, rowsNumber, columnsNumber } = req.body;

  // Validating Body ==================================================================================
  const message = verifyBody(minesNumber, rowsNumber, columnsNumber);
  if (message) {
    res.send(message);
    return;
  };

  // Sorting mines positions ==========================================================================
  const minesPositions = sortMinesPositions(minesNumber, rowsNumber, columnsNumber);

  // sorting mine symbol ==============================================================================
  const mineSymbol = sortMineSymbol();

  game = {
    rowsNumber,
    columnsNumber,
    minesNumber,
    squaresValues: Array(rowsNumber * columnsNumber).fill(''),
    squaresCSS: Array(rowsNumber * columnsNumber).fill(''),
    minesPositions,
    mineSymbol,
  };

  // Creating game ====================================================================================
  const { insertedCount, insertedId } = await games.insertOne({ minesNumber, rowsNumber, columnsNumber, minesPositions, mineSymbol });

  // Validating creation ==============================================================================
  if (insertedCount !== 1) {
    res.send({status: 'failed', msg: 'Error during creation of the game!'});
    return;
  }

  game.gameID = '' + insertedId;
  // Returning game id ================================================================================
  res.send({ status: 'ok', msg: `Game ${insertedId} created successfully`, gameID: insertedId});
});






// ==================== Get All Games ========================================================= GET ALL
app.get('/data', async (req, res) => {
  res.send({status: 'ok', msg: 'Returning all games', games: await getValidGames()});
});






// ==================== Open a Square and update state in the front-end =========================== PUT
app.put('/OpenSquare', async (req, res) => {
  const gameID = req.body.gameID;

  // Validating id ====================================================================================
  if (game.gameID !== gameID) {
    res.send({status: 'failed', msg: `Game ${gameID} not found`});
    return;
  }

  // Validating Body ==================================================================================
  const { index, updates, win } = req.body;

  if (win !== true && typeof(index) !== "number") {
    res.send({status: 'failed', msg: `Invalid type of index value: ${typeof(index)}`});
    return;
  }
  if (win !== true && (index < 0 || index > game.rowsNumber * game.columnsNumber)) {
    res.send({status: 'failed', msg: `Invalid index value: ${index}`});
    return;
  }

  for (const update of updates) {
    game.squaresValues[update.index] = update.squareValue;
    game.squaresCSS[update.index] = update.squareCSS;
  }
  
  // Returning Updated Values =========================================================================
  const message = {status: 'ok', msg: 'Square Opened successfully'};
  message.exploded = OpenSquare(index, win)
  message.squaresValues = game.squaresValues;
  message.squaresCSS = game.squaresCSS;

  res.send(message);
});






// ==================== Restart the Game ========================================================== PUT
app.put('/Restart', async (req, res) => {
  const gameID = req.body.gameID;

  // Validating id ====================================================================================
  if (!game) game = await getGameByID(gameID);
  if (game.gameID !== gameID) {
    res.send({status: 'failed', msg: `Game ${gameID} not found`});
    return;
  }

  const { minesNumber, rowsNumber, columnsNumber } = req.body;

  // Validating Body ==================================================================================
  const message = verifyBody(minesNumber, rowsNumber, columnsNumber);
  if (message) {
    res.send(message);
    return;
  };

  // Sorting mines positions ==========================================================================
  const minesPositions = sortMinesPositions(minesNumber, rowsNumber, columnsNumber);

  // Sorting mine symbol ==============================================================================
  const mineSymbol = sortMineSymbol();

  // Reseting game ====================================================================================
  game = {
    gameID,
    rowsNumber,
    columnsNumber,
    minesNumber,
    squaresValues: Array(rowsNumber * columnsNumber).fill(''),
    squaresCSS: Array(rowsNumber * columnsNumber).fill(''),
    minesPositions,
    mineSymbol,
  };

  res.send({ status: 'ok', msg: `Game ${gameID} restarted succesfuly`});
});






// ==================== Remove Game ============================================================ DELETE
app.delete('/end', async (req, res) => {
  const gameID = req.body.gameID;

  // Validating id ====================================================================================
  if (await games.countDocuments({ _id: mongodb.ObjectId(gameID) }) !== 1) {
    res.send({status: 'failed', msg: `Game ${gameID} not found`});
    return;
  }

  // Deleting =========================================================================================
  const { deletedCount } = await games.deleteOne({ _id: mongodb.ObjectId(gameID) });

  // // Validating deletion ===========================================================================
  if (deletedCount !== 1) {
    res.send({status: 'failed', msg: 'Error during deletion of the game!'});
    return;
  }
  res.send({status: 'ok', msg: `Game ${gameID} deleted`});
});

app.listen(port, () => {
    console.log(`App running on http://localhost:${port}`);
})
})();













function CountMines (index) {
  const { rowsNumber, columnsNumber, minesPositions } = game;

  const cssClasses = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
  // index = row * columnsNumber + column
  // index/columnsNumber = row (quotient) + column/columnsNumber (remainder)
  const rowInit = Math.floor(index / columnsNumber);
  const columnInit = index % columnsNumber;
  let positions = [];

  for (let row = rowInit - 1; row < rowInit + 2; row++) {
      if (row < 0 || row > rowsNumber - 1) continue;
      for (let column = columnInit -1; column < columnInit + 2; column++) {
          if (row === rowInit && column === columnInit) continue;
          if (column < 0 || column > columnsNumber - 1) continue;
          positions.push(row * columnsNumber + column);
      }
  }

  // Count mines in adjacent squares
  let mines = 0;
  for (const position of positions) if (minesPositions.includes(position)) mines++;

  // return the number of mines, the updated cssClass and the valid positions around index
  return([mines === 0 ? '' : mines, 'clicked ' + cssClasses[mines], positions]);
}

// function OpenAllSquares (squaresValues, squaresCSS, game, win) {
function OpenAllSquares (win = false) {
  const { squaresValues, squaresCSS, minesPositions, mineSymbol } = game;

  for (let index = 0, length = squaresValues.length; index < length; index++) {
      if (squaresCSS[index]) continue;
      if (minesPositions.includes(index)) {
          squaresValues[index] = squaresCSS[index] === 'saved' || win ? '\u2713' : mineSymbol;
          squaresCSS[index] = squaresCSS[index] === 'saved' || win ? 'saved-true' : 'clicked exploded';
      }
      if (squaresCSS[index] === 'saved') {
          squaresValues[index] = '\u2717';
          squaresCSS[index] = 'exploded';
      }
      if (!squaresCSS[index]) {
          [squaresValues[index], squaresCSS[index]] = CountMines(index);
      }
  }
  return;
}

function OpenSquare (index, win = false) {
  const { minesPositions, squaresValues, squaresCSS } = game;

  if (win) {
      OpenAllSquares(win);
      return false;
  }

  if (minesPositions.includes(index)) {
      OpenAllSquares();
      squaresCSS[index] = 'clicked';
      return true;
  }

  let allPositions = [index];
  let positions = [];
  let i = 0;
  
  while (true) {
      // if square was not clicked
      if (!squaresCSS[allPositions[i]]) {
          // Else, count mines around the square, update value with the number of mines
          // and squaresCSS with 'clicked ' + the number of mines as text
          // positions keep the indexes of the squares around
          // [squaresValues[allPositions[i]], squaresCSS[allPositions[i]], positions] = CountMines(allPositions[i], game);
          [squaresValues[allPositions[i]], squaresCSS[allPositions[i]], positions] = CountMines(allPositions[i]);
          if (!squaresValues[allPositions[i]]) {
              for (const pos of positions) if (!allPositions.includes(pos)) allPositions.push(pos);
          }
      }
      if (i < allPositions.length - 1) i++;
      else return false;
  }
};