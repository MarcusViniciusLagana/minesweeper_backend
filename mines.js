function CountMines (index, { rowsNumber, columnsNumber, minesPositions }) {

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

function OpenAllSquares (squaresValues, squaresCSS, game, win) {
    const { minesPositions, mineSymbol } = game;

    for (let index = 0, length = squaresValues.length; index < length; index++) {
        if (minesPositions.includes(index)) {
            squaresValues[index] = squaresCSS[index] === 'saved' || win ? '\u2713' : mineSymbol;
            squaresCSS[index] = squaresCSS[index] === 'saved' || win ? 'saved-true' : 'clicked exploded';
        }
        if (squaresCSS[index] === 'saved') {
            squaresValues[index] = '\u2717';
            squaresCSS[index] = 'exploded';
        }
        if (!squaresCSS[index]) {
            [squaresValues[index], squaresCSS[index]] = CountMines(index, game);
        }
    }
    return;
}

function OpenSquare (index, squaresValues, squaresCSS, game, win) {
    const { minesPositions } = game;

    if (win) {
        OpenAllSquares(squaresValues, squaresCSS, game, win);
        return true;
    }

    if (minesPositions.includes(index)) {
        OpenAllSquares(squaresValues, squaresCSS, game, win);
        squaresCSS[index] = 'clicked';
        return false;
    }

    let allPositions = [index];
    let positions = [];
    let i = 0;
    
    while (true) {
        // if square was not clicked:
        if (!squaresCSS[allPositions[i]]) {
            // Count mines around the square, update value with the number of mines
            // and squaresCSS with 'clicked ' + the number of mines as text
            // positions keep the indexes of the squares around
            [squaresValues[allPositions[i]], squaresCSS[allPositions[i]], positions] = CountMines(allPositions[i], game);
            if (!squaresValues[allPositions[i]]) {
                for (const pos of positions) if (!allPositions.includes(pos)) allPositions.push(pos);
            }
        }
        if (i < allPositions.length - 1) i++;
        else return true;
    }
};

module.exports = OpenSquare;