//import OpenSquare from './mines';

const express = require('express');
const bodyParser = require('body-parser');
const app = express();
app.use(bodyParser.json());

const port = process.env.PORT || 3000;

app.get('/OpenSquare/:id', (req, res) => {
  // index, squaresValues, squaresCSS, rows, columns
  const index = +req.params.id;
  let squaresValues = req.body.squaresValues;
  let squaresCSS = req.body.squaresCSS;
  const rows = req.body.rows;
  const columns = req.body.columns;
  const win = req.body.win;

  res.send([index, squaresValues, squaresCSS, rows, columns, win]);
});

app.listen(port, () => {
    console.log(`App running on http://localhost:${port}`);
})