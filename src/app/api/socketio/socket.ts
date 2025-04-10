import { Server as NetServer } from "http";
import { NextApiRequest } from "next";
import { Server as ServerIO } from "socket.io";

export const config = {
  api: {
    bodyParser: false,
  },
};

interface SocketServer extends NetServer {
  io?: ServerIO | undefined;
}

interface SocketWithIO extends NextApiRequest {
  socket: SocketServer;
}

// Store game states in memory (replace with a database for production)
const games: { [gameId: string]: (string | null)[] } = {};

export default function handler(req: SocketWithIO, res: any) {
  if (req.socket.io) {
    res.end();
    return;
  }

  const io = new ServerIO(req.socket, {
    path: "/api/socketio",
    addTrailingSlash: false,
    cors: {
      origin: '*',
      methods: ["GET", "POST"]
    }
  });

  req.socket.io = io;

  io.on("connection", (socket) => {
    socket.on("joinGame", (gameId) => {
      socket.join(gameId);
      console.log(`Socket ${socket.id} joined game ${gameId}`);

      // Assign player symbols ('X' or 'O')
      const room = io.sockets.adapter.rooms.get(gameId);
      const numClients = room ? room.size : 0;
      let playerX = numClients === 1;
      socket.emit('playerSymbol', playerX ? 'X' : 'O');

      // Initialize game state if it doesn't exist
      if (!games[gameId]) {
        games[gameId] = Array(9).fill(null);
      }
    });

    socket.on("makeMove", (gameId, index, playerSymbol) => {
      if (!games[gameId]) {
        console.error(`Game ${gameId} not found!`);
        return;
      }

      const board = games[gameId];

      if (board[index] || checkWinner(board).winner) {
          console.log("Invalid move");
          return; // Invalid move
      }

      board[index] = playerSymbol;
      games[gameId] = board; // Update the game state

      const { winner, winningLine } = checkWinner(board);
      const isDraw = !board.includes(null);

      if (winner) {
        io.to(gameId).emit("gameResult", { winner, winningLine });
      } else if (isDraw) {
        io.to(gameId).emit("draw");
      } else {
        const nextPlayer = playerSymbol === 'X' ? 'O' : 'X';
        io.to(gameId).emit("gameUpdate", board, nextPlayer);
      }
    });
  });

  res.end();
}

function checkWinner(board: (string | null)[]) {
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6],
    ];
    let winner = null;
    let winningLine = null;

    for (let line of lines) {
        const [a, b, c] = line;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            winner = board[a];
            winningLine = line;
            break;
        }

    }

    return { winner, winningLine };
}
