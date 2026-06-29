(() => {
  "use strict";

  const SIZE = 7;
  const PLACE_SCORE = 10;
  const LINE_SCORE = [0, 100, 250, 500];
  const COLORS = ["#f94144", "#f3722c", "#f9c74f", "#43aa8b", "#4d96ff", "#9b5de5"];
  const CATALOG = [
    block("Single", 15, [[0, 0]]),
    block("Horizontal 2", 7.5, [[0, 0], [1, 0]]),
    block("Vertical 2", 7.5, [[0, 0], [0, 1]]),
    block("Horizontal 3", 5, [[0, 0], [1, 0], [2, 0]]),
    block("Vertical 3", 5, [[0, 0], [0, 1], [0, 2]]),
    block("Square", 10, [[0, 0], [1, 0], [0, 1], [1, 1]]),
    block("L", 8, [[0, 0], [0, 1], [0, 2], [1, 2]]),
    block("Reverse L", 8, [[1, 0], [1, 1], [1, 2], [0, 2]]),
    block("T", 9, [[0, 0], [1, 0], [2, 0], [1, 1]]),
    block("Z", 7, [[0, 0], [1, 0], [1, 1], [2, 1]]),
    block("Reverse Z", 7, [[1, 0], [2, 0], [0, 1], [1, 1]]),
    block("Horizontal 4", 3, [[0, 0], [1, 0], [2, 0], [3, 0]]),
    block("Vertical 4", 3, [[0, 0], [0, 1], [0, 2], [0, 3]]),
    block("Diagonal 3 Down", 1.5, [[0, 0], [1, 1], [2, 2]]),
    block("Diagonal 3 Up", 1.5, [[2, 0], [1, 1], [0, 2]]),
    block("Diagonal 4 Down", 1, [[0, 0], [1, 1], [2, 2], [3, 3]]),
    block("Diagonal 4 Up", 1, [[3, 0], [2, 1], [1, 2], [0, 3]]),
  ];

  const state = {
    board: makeBoard(),
    hand: [],
    score: 0,
    dragging: null,
    busy: false,
  };

  const els = {
    titleScreen: document.querySelector("#titleScreen"),
    gameScreen: document.querySelector("#gameScreen"),
    gameOverScreen: document.querySelector("#gameOverScreen"),
    startButton: document.querySelector("#startButton"),
    retryButton: document.querySelector("#retryButton"),
    titleButton: document.querySelector("#titleButton"),
    backTitleButton: document.querySelector("#backTitleButton"),
    score: document.querySelector("#score"),
    finalScore: document.querySelector("#finalScore"),
    board: document.querySelector("#board"),
    hand: document.querySelector("#hand"),
    dragLayer: document.querySelector("#dragLayer"),
  };

  function block(name, weight, cells) {
    return { name, weight, cells };
  }

  function makeBoard() {
    return Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  }

  function cloneBoard(boardData) {
    return boardData.map((row) => row.slice());
  }

  function show(screen) {
    els.titleScreen.classList.toggle("hidden", screen !== "title");
    els.gameScreen.classList.toggle("hidden", screen !== "game");
    els.gameOverScreen.classList.add("hidden");
  }

  function startGame() {
    state.board = makeBoard();
    state.hand = [randomPiece(), randomPiece(), randomPiece()];
    state.score = 0;
    state.busy = false;
    updateScore();
    renderBoard();
    renderHand();
    show("game");
  }

  function randomPiece() {
    const total = CATALOG.reduce((sum, item) => sum + item.weight, 0);
    let roll = Math.random() * total;
    let selected = CATALOG[0];
    for (const item of CATALOG) {
      roll -= item.weight;
      if (roll <= 0) {
        selected = item;
        break;
      }
    }
    return {
      id: globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      name: selected.name,
      cells: selected.cells.map(([x, y]) => ({ x, y })),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      used: false,
    };
  }

  function updateScore() {
    els.score.textContent = String(state.score);
    els.finalScore.textContent = String(state.score);
  }

  function renderBoard() {
    els.board.innerHTML = "";
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.dataset.row = String(row);
        cell.dataset.col = String(col);
        const color = state.board[row][col];
        if (color) cell.append(createBrick(color));
        els.board.append(cell);
      }
    }
  }

  function createBrick(color) {
    const brick = document.createElement("div");
    brick.className = "brick";
    brick.style.setProperty("--brick-color", color);
    return brick;
  }

  function renderHand() {
    els.hand.innerHTML = "";
    state.hand.forEach((piece, index) => {
      const slot = document.createElement("div");
      slot.className = `slot${piece.used ? " used" : ""}`;
      if (!piece.used) {
        const element = createPieceElement(piece, "piece");
        element.dataset.index = String(index);
        element.addEventListener("pointerdown", beginDrag);
        slot.append(element);
      }
      els.hand.append(slot);
    });
  }

  function createPieceElement(piece, className) {
    const bounds = getBounds(piece.cells);
    const element = document.createElement("div");
    element.className = className;
    element.style.gridTemplateColumns = `repeat(${bounds.width}, 1fr)`;
    element.style.gridTemplateRows = `repeat(${bounds.height}, 1fr)`;
    element.style.setProperty("--brick-color", piece.color);
    for (let y = 0; y < bounds.height; y++) {
      for (let x = 0; x < bounds.width; x++) {
        const filled = piece.cells.some((cell) => cell.x - bounds.minX === x && cell.y - bounds.minY === y);
        const cell = document.createElement("div");
        cell.className = `piece-cell ${filled ? "filled" : "empty"}`;
        element.append(cell);
      }
    }
    return element;
  }

  function getBounds(cells) {
    const xs = cells.map((cell) => cell.x);
    const ys = cells.map((cell) => cell.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    return { minX, minY, width: maxX - minX + 1, height: maxY - minY + 1 };
  }

  function dragAnchor(piece) {
    const cx = piece.cells.reduce((sum, cell) => sum + cell.x, 0) / piece.cells.length;
    const cy = piece.cells.reduce((sum, cell) => sum + cell.y, 0) / piece.cells.length;
    let best = piece.cells[0];
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const cell of piece.cells) {
      const distance = (cell.x - cx) ** 2 + (cell.y - cy) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = cell;
      }
    }
    return best;
  }

  function beginDrag(event) {
    if (state.busy) return;
    const source = event.currentTarget;
    const index = Number(source.dataset.index);
    const piece = state.hand[index];
    if (!piece || piece.used) return;

    event.preventDefault();
    source.setPointerCapture(event.pointerId);
    source.style.opacity = "0.22";

    const dragElement = createPieceElement(piece, "drag-piece");
    els.dragLayer.append(dragElement);
    const firstFilled = dragElement.querySelector(".piece-cell.filled");
    const unit = firstFilled.getBoundingClientRect().width || 24;
    state.dragging = { index, piece, source, dragElement, pointerId: event.pointerId, unit };

    moveDrag(event);
    source.addEventListener("pointermove", moveDrag);
    source.addEventListener("pointerup", endDrag);
    source.addEventListener("pointercancel", cancelDrag);
  }

  function moveDrag(event) {
    if (!state.dragging) return;
    const { dragElement, piece, unit } = state.dragging;
    const lift = Math.max(64, unit * 2.2);
    const bounds = getBounds(piece.cells);
    const anchor = dragAnchor(piece);
    const left = event.clientX - (anchor.x - bounds.minX + 0.5) * unit;
    const top = event.clientY - lift - (anchor.y - bounds.minY + 0.5) * unit;
    dragElement.style.left = `${left}px`;
    dragElement.style.top = `${top}px`;

    const target = screenToOrigin(event.clientX, event.clientY - lift, piece);
    const valid = target && canPlace(state.board, piece, target.row, target.col);
    dragElement.classList.toggle("invalid", !valid);
    preview(target, piece, Boolean(valid));
  }

  function endDrag(event) {
    if (!state.dragging) return;
    const { piece, index, source } = state.dragging;
    const lift = Math.max(64, state.dragging.unit * 2.2);
    const target = screenToOrigin(event.clientX, event.clientY - lift, piece);
    const valid = target && canPlace(state.board, piece, target.row, target.col);
    cleanupDrag();
    if (valid) {
      placePiece(piece, target.row, target.col, index);
    } else {
      source.style.opacity = "";
      clearPreview();
    }
  }

  function cancelDrag() {
    if (!state.dragging) return;
    state.dragging.source.style.opacity = "";
    cleanupDrag();
    clearPreview();
  }

  function cleanupDrag() {
    const drag = state.dragging;
    if (!drag) return;
    drag.source.releasePointerCapture?.(drag.pointerId);
    drag.source.removeEventListener("pointermove", moveDrag);
    drag.source.removeEventListener("pointerup", endDrag);
    drag.source.removeEventListener("pointercancel", cancelDrag);
    drag.dragElement.remove();
    state.dragging = null;
  }

  function screenToOrigin(clientX, clientY, piece) {
    const boardRect = els.board.getBoundingClientRect();
    const style = getComputedStyle(els.board);
    const gap = parseFloat(style.gap) || 0;
    const padding = parseFloat(style.paddingLeft) || 0;
    const cellSize = (boardRect.width - padding * 2 - gap * (SIZE - 1)) / SIZE;
    const localX = clientX - boardRect.left - padding;
    const localY = clientY - boardRect.top - padding;
    if (localX < -cellSize || localY < -cellSize || localX > boardRect.width || localY > boardRect.height) return null;
    const col = Math.floor(localX / (cellSize + gap));
    const row = Math.floor(localY / (cellSize + gap));
    if (row < 0 || col < 0 || row >= SIZE || col >= SIZE) return null;
    const anchor = dragAnchor(piece);
    return { row: row - anchor.y, col: col - anchor.x };
  }

  function preview(target, piece, valid) {
    clearPreview();
    if (!target) return;
    for (const cell of piece.cells) {
      const row = target.row + cell.y;
      const col = target.col + cell.x;
      if (row < 0 || col < 0 || row >= SIZE || col >= SIZE) continue;
      cellElement(row, col).classList.add(valid ? "preview-ok" : "preview-bad");
    }
  }

  function clearPreview() {
    els.board.querySelectorAll(".preview-ok, .preview-bad").forEach((cell) => {
      cell.classList.remove("preview-ok", "preview-bad");
    });
  }

  function canPlace(boardData, piece, originRow, originCol) {
    return piece.cells.every((cell) => {
      const row = originRow + cell.y;
      const col = originCol + cell.x;
      return row >= 0 && col >= 0 && row < SIZE && col < SIZE && !boardData[row][col];
    });
  }

  async function placePiece(piece, originRow, originCol, handIndex) {
    state.busy = true;
    clearPreview();
    for (const cell of piece.cells) {
      state.board[originRow + cell.y][originCol + cell.x] = piece.color;
    }
    state.hand[handIndex].used = true;
    state.score += PLACE_SCORE;
    updateScore();
    renderBoard();
    renderHand();

    const result = findCompleted(state.board);
    if (result.cells.length > 0) {
      state.score += LINE_SCORE[result.lineCount] || 1000;
      updateScore();
      await animateClear(result.cells);
      for (const { row, col } of result.cells) state.board[row][col] = null;
      renderBoard();
    }

    if (state.hand.every((item) => item.used)) {
      state.hand = [randomPiece(), randomPiece(), randomPiece()];
      renderHand();
    }

    state.busy = false;
    if (!hasAnyMove()) showGameOver();
  }

  function findCompleted(boardData) {
    const set = new Map();
    let lineCount = 0;
    const addCell = (row, col) => set.set(`${row},${col}`, { row, col });

    for (let row = 0; row < SIZE; row++) {
      if (boardData[row].every(Boolean)) {
        lineCount++;
        for (let col = 0; col < SIZE; col++) addCell(row, col);
      }
    }

    for (let col = 0; col < SIZE; col++) {
      let full = true;
      for (let row = 0; row < SIZE; row++) full = full && Boolean(boardData[row][col]);
      if (full) {
        lineCount++;
        for (let row = 0; row < SIZE; row++) addCell(row, col);
      }
    }

    let down = true;
    let up = true;
    for (let i = 0; i < SIZE; i++) {
      down = down && Boolean(boardData[i][i]);
      up = up && Boolean(boardData[i][SIZE - 1 - i]);
    }
    if (down) {
      lineCount++;
      for (let i = 0; i < SIZE; i++) addCell(i, i);
    }
    if (up) {
      lineCount++;
      for (let i = 0; i < SIZE; i++) addCell(i, SIZE - 1 - i);
    }

    return { cells: [...set.values()], lineCount };
  }

  function animateClear(cells) {
    cells.forEach(({ row, col }) => cellElement(row, col).classList.add("clearing"));
    return new Promise((resolve) => window.setTimeout(resolve, 280));
  }

  function cellElement(row, col) {
    return els.board.children[row * SIZE + col];
  }

  function hasAnyMove() {
    const remaining = state.hand.filter((piece) => !piece.used);
    if (remaining.length === 0) return true;
    return canFinishHand(state.board, remaining, new Set());
  }

  function canFinishHand(boardData, pieces, visited) {
    if (pieces.length === 0) return true;
    const key = encodeBoard(boardData, pieces);
    if (visited.has(key)) return false;
    visited.add(key);

    for (let i = 0; i < pieces.length; i++) {
      const piece = pieces[i];
      for (let row = 0; row < SIZE; row++) {
        for (let col = 0; col < SIZE; col++) {
          if (!canPlace(boardData, piece, row, col)) continue;
          const next = cloneBoard(boardData);
          for (const cell of piece.cells) next[row + cell.y][col + cell.x] = piece.color;
          const cleared = findCompleted(next).cells;
          for (const cell of cleared) next[cell.row][cell.col] = null;
          const rest = pieces.slice(0, i).concat(pieces.slice(i + 1));
          if (canFinishHand(next, rest, visited)) return true;
        }
      }
    }
    return false;
  }

  function encodeBoard(boardData, pieces) {
    const cells = boardData.flat().map(Boolean).map((value) => (value ? "1" : "0")).join("");
    return `${cells}|${pieces.map((piece) => piece.id).sort().join(",")}`;
  }

  function showGameOver() {
    els.finalScore.textContent = String(state.score);
    els.gameOverScreen.classList.remove("hidden");
  }

  els.startButton.addEventListener("click", startGame);
  els.retryButton.addEventListener("click", startGame);
  els.titleButton.addEventListener("click", () => show("title"));
  els.backTitleButton.addEventListener("click", () => show("title"));

  renderBoard();
})();
