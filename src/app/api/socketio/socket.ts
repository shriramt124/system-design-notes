
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

export default function handler(req: SocketWithIO, res: any) {
  if (req.socket.io) {
    res.end();
    return;
  }

  const io = new ServerIO(req.socket, {
    path: "/api/socketio",
    addTrailingSlash: false,
  });

  req.socket.io = io;

  io.on("connection", (socket) => {
    socket.on("joinGame", (gameId) => {
      socket.join(gameId);
      console.log(`Socket ${socket.id} joined game ${gameId}`);

      // Assign player symbols ('X' or 'O')
      let playerX = io.sockets.adapter.rooms.get(gameId)?.size === 1;
      socket.emit('playerSymbol', playerX ? 'X' : 'O');
    });

    socket.on("makeMove", (gameId, index, playerSymbol) => {
      io.to(gameId).emit("gameUpdate", (board, nextPlayer) => {
        // Update game state here
      });

      // Simulate game state update and win condition check for demonstration
      // In a real application, you would maintain the game state on the server
      // and perform win condition checks there.
      // For simplicity, we'll just emit a dummy game update event.
      const board = Array(9).fill(null);
      board[index] = playerSymbol;
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

        if (winner) {
            io.to(gameId).emit("gameResult", { winner, winningLine });
        } else if (!board.includes(null)) {
            io.to(gameId).emit("draw");
        } else {
          const nextPlayer = playerSymbol === 'X' ? 'O' : 'X';
          io.to(gameId).emit("gameUpdate", board, nextPlayer);
        }
    });
  });

  res.end();
}
