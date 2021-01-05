const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongodb = require('mongodb');
const OpenSquare = require('./mines');

const port = process.env.PORT || 3005;

(async () => {

//const connectionString = 'mongodb://localhost:27017/minesweeper';
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
  if (typeof(minesNumber) !== "number")
    return {status: 'failed', msg: `Invalid type of the number of mines: ${typeof(minesNumber)}`};
  if (minesNumber <= 0)
    return {status: 'failed', msg: `Invalid number of mines: ${minesNumber}`};
  if (typeof(rowsNumber) !== "number")
    return {status: 'failed', msg: `Invalid type of the number of rows: ${typeof(rowsNumber)}`};
  if (rowsNumber <= 0)
    return {status: 'failed', msg: `Invalid number of rows: ${rowsNumber}`};
  if (typeof(columnsNumber) !== "number")
    return {status: 'failed', msg: `Invalid type of the number of columns: ${typeof(columnsNumber)}`};
  if (columnsNumber <= 0)
    return {status: 'failed', msg: `Invalid number of columns: ${columnsNumber}`};
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

  // Creating game ====================================================================================
  const { insertedCount, insertedId } = await games.insertOne({ rowsNumber, columnsNumber,
    minesNumber, mineSymbol, minesPositions });

  // Validating creation ==============================================================================
  if (insertedCount !== 1) {
    res.send({status: 'failed', msg: 'Error during creation of the game!'});
    return;
  }

  // Returning game id ================================================================================
  res.send({ status: 'ok', msg: `Game ${insertedId} created successfully`, gameID: insertedId});
});






// ==================== Get All Games ========================================================= GET ALL
app.get('/data', async (req, res) => {
  res.send({status: 'ok', msg: 'Returning all games', games: await getValidGames()});
});






// ==================== Open a Square and update state in the front-end =========================== GET
app.get('/OpenSquare', async (req, res) => {
  const id = req.query.gameID;

  // Validating id ====================================================================================
  const game = await getGameByID(id);
  if (!game) {
    res.send({status: 'failed', msg: `Game ${id} not found`});
    return;
  }

  // Validating Body/QueryString ======================================================================
  const index = +req.query.index;
  let squaresValues = Array.isArray(req.query.squaresValues) ? req.query.squaresValues.slice() : [];
  let squaresCSS = Array.isArray(req.query.squaresCSS) ? req.query.squaresCSS.slice() : [];
  const win = req.query.win;

  if (win !== true && (index < 0 || typeof(index) !== "number")) {
    res.send({status: 'failed', msg: `Invalid type (${typeof(index)}) or index value (${index})`});
    return;
  }
  if (squaresValues.length !== game.rowsNumber * game.columnsNumber) {
    res.send({status: 'failed',
      msg: `Squares length (${squaresValues.length}) not equal game-board (${
        game.rowsNumber * game.columnsNumber}) or type error (${typeof(req.query.squaresValues)})`});
    return;
  }
  if (squaresCSS.length !== game.rowsNumber * game.columnsNumber) {
    res.send({status: 'failed',
      msg: `CSS length (${squaresCSS.length}) not equal game-board (${
        game.rowsNumber * game.columnsNumber}) or type error (${typeof(req.query.squaresCSS)})`});
    return;
  }
  
  // Returning Updated Values =========================================================================
  const message = {status: 'ok', msg: 'Square Opened successfully'};
  message.exploded = !OpenSquare(index, squaresValues, squaresCSS, game, win)
  message.squaresValues = squaresValues;
  message.squaresCSS = squaresCSS;
  res.send(message);
});






// ==================== Restart the Game ========================================================== PUT
app.put('/Restart', async (req, res) => {
  const id = req.body.gameID;

  // Validating id ====================================================================================
  const game = await getGameByID(id); 
  if (!game) {
    res.send({status: 'failed', msg: `Game ${id} not found`});
    return;
  }

  const minesNumber = req.body.minesNumber;
  const rowsNumber = req.body.rowsNumber;
  const columnsNumber = req.body.columnsNumber;

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
  game.rowsNumber = rowsNumber;
  game.columnsNumber = columnsNumber;
  game.minesNumber = minesNumber;
  game.minesPositions = minesPositions;
  game.mineSymbol = mineSymbol;
  const { result } = await games.updateOne(
    { _id: mongodb.ObjectId(id) },
    { $set: game }
  );

  // Validating resset ================================================================================
  if (result.ok !== 1) {
    res.send({status: 'failed', msg: 'Error during reset of the game!'});
    return;
  }
  res.send({ status: 'ok', msg: `Game ${id} resset succesfuly`});
});






// ==================== Remove Game ============================================================ DELETE
app.delete('/end', async (req, res) => {
  const id = req.body.gameID;

  // Validating id ====================================================================================
  if (await games.countDocuments({ _id: mongodb.ObjectId(id) }) !== 1) {
    res.send({status: 'failed', msg: `Game ${id} not found`});
    return;
  }

  // Deleting =========================================================================================
  const { deletedCount } = await games.deleteOne({ _id: mongodb.ObjectId(id) });

  // // Validating deletion ===========================================================================
  if (deletedCount !== 1) {
    res.send({status: 'failed', msg: 'Error during deletion of the game!'});
    return;
  }
  res.send({status: 'ok', msg: `Game ${id} deleted`});
});

app.listen(port, () => {
    console.log(`App running on http://localhost:${port}`);
})
})();