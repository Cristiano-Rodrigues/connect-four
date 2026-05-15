type CellContent = 0 | 1 | 2;
type Color = 0 | 1;
type GameState = 'tied' | 'won' | 'playing'

class Grid {
  width: number;
  height: number;
  cells: CellContent[];

  constructor (width: number, height: number) {
    this.width = width;
    this.height = height;

    this.cells = new Array(width * height).fill(0);
  }

  get (x: number, y: number) {
    if (!this.isInBound(x, y)) {
      return;
    }
    return this.cells[y * this.width + x];
  }

  set (x: number, y: number, value: CellContent) {
    if (!this.isInBound(x, y)) {
      return
    }
    this.cells[y * this.width + x] = value;
  }

  isInBound (x: number, y: number) {
    return (
      x >= 0 && x < this.width &&
      y >= 0 && y < this.height
    )
  }

  isAvailableCell (x: number, y: number) {
    return this.get(x, y) === 0
  }
}

export class ConnectFour {
  grid: Grid;
  turn: number;
  state: GameState;
  winner: Color | null;

  constructor (grid?: Grid, turn?: number, state?: GameState, winner?: Color | null) {
    this.grid = grid ?? new Grid(7, 6);
    this.turn = turn ?? 1;
    this.state = state ?? 'playing';
    this.winner = winner ?? null;
  }

  insertTile (col: number): boolean {
    let line = this.grid.height - 1;
    while (
      !this.grid.isAvailableCell(col, line) &&
      line > 0
    ) {
      line--
    }

    const color: Color = ((this.turn - 1) % 2) + 1 as Color;
    this.turn++;

    if (!this.grid.isAvailableCell(col, line)) {
      return false;
    }

    this.grid.set(col, line, color);

    if (this.isTied()) {
      this.state = 'tied';

      return true;
    }
    
    let winner = this.getWinner();
    if (winner != null) {
      this.state = 'won';
      this.winner = winner;
    }

    return true;
  }

  isTied () {
    return this.grid.cells.every((cell: number) => cell !== 0);
  }

  getWinner (): Color | null {
    for (let y = 0; y < this.grid.height; y++) {
      for (let x = 0; x < this.grid.width; x++) {
        let winner: Color | null = (
          this.getWinnerHorizontally(x, y) ||
          this.getWinnerVertically(x, y) ||
          this.getWinnerAscDiagonal(x, y) ||
          this.getWinnerDescDiagonal (x, y)
        )
        if (winner) {
          return winner;
        }
      }
    }

    return null;
  }

  private getWinnerHorizontally (x: number, y: number): Color | null {
    const currCol = this.grid.get(x, y);

    if (!currCol) null;

    if (
      currCol !== 0 &&
      currCol === this.grid.get(x + 1, y) &&
      currCol === this.grid.get(x + 2, y) &&
      currCol === this.grid.get(x + 3, y)
    ) {
      return currCol as Color;
    }
    return null;
  }

  private getWinnerAscDiagonal (x: number, y: number): Color | null {
    const currCol = this.grid.get(x, y);

    if (!currCol) null;

    if (
      currCol !== 0 &&
      currCol === this.grid.get(x + 1, y - 1) &&
      currCol === this.grid.get(x + 2, y - 2) &&
      currCol === this.grid.get(x + 3, y - 3)
    ) {
      return currCol as Color;
    }
    return null;
  }

  private getWinnerVertically (x: number, y: number): Color | null {
    const currCol = this.grid.get(x, y);

    if (!currCol) null;

    if (
      currCol !== 0 &&
      currCol === this.grid.get(x, y + 1) &&
      currCol === this.grid.get(x, y + 2) &&
      currCol === this.grid.get(x, y + 3)
    ) {
      return currCol as Color;
    }

    return null;
  }

  private getWinnerDescDiagonal (x: number, y: number): Color | null {
    const currCol = this.grid.get(x, y);

    if (!currCol) null;

    if (
      currCol !== 0 &&
      currCol === this.grid.get(x + 1, y + 1) &&
      currCol === this.grid.get(x + 2, y + 2) &&
      currCol === this.grid.get(x + 3, y + 3)
    ) {
      return currCol as Color;
    }
    return null;
  }

}