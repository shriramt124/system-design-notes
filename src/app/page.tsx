"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { Button } from "@/components/ui/button"
import { useSearchParams } from 'next/navigation';

const BoardCell = ({ value, onClick, isWinningCell }: { value: string | null, onClick: () => void, isWinningCell: boolean }) => {
  const cellStyle = `
    flex items-center justify-center h-20 w-20 text-5xl font-bold
    border-2 border-secondary
    ${isWinningCell ? 'bg-accent text-primary' : ''}
    hover:bg-muted
    cursor-pointer
    transition-colors
  `;

  return (
    <div className={cellStyle} onClick={onClick}>
      {value}
    </div>
  );
};

const generateGameLink = () => {
  return Math.random().toString(36).substring(2, 15);
};

const checkWinner = (board: (string | null)[]) => {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];

  for (let line of lines) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], winningLine: line };
    }
  }

  return { winner: null, winningLine: null };
};

export default function Home() {
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState<'X' | 'O'>('X');
  const [gameLink, setGameLink] = useState<string | null>(null);
  const [socket, setSocket] = useState<any>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [winningLine, setWinningLine] = useState<number[] | null>(null);
  const [isDraw, setIsDraw] = useState<boolean>(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");
  const [playerSymbol, setPlayerSymbol] = useState<'X' | 'O' | null>(null);

  const searchParams = useSearchParams();

  useEffect(() => {
    const queryGameId = searchParams.get('gameId');
    if (queryGameId) {
      setGameId(queryGameId);
      setGameLink(queryGameId);
    }
  }, [searchParams]);


  useEffect(() => {
    if (gameLink) {
      const newSocket = io('http://localhost:3000');
      setSocket(newSocket);

      newSocket.on('connect', () => {
        setMessage('Connected to server');
      });

      newSocket.emit('joinGame', gameLink);

      newSocket.on('gameUpdate', (newBoard: (string | null)[], nextPlayer: 'X' | 'O') => {
        setBoard(newBoard);
        setCurrentPlayer(nextPlayer);
      });

      newSocket.on('gameResult', ({ winner, winningLine }: { winner: string | null, winningLine: number[] | null }) => {
        setWinner(winner);
        setWinningLine(winningLine);
      });

     newSocket.on('draw', () => {
        setIsDraw(true);
      });

       newSocket.on('playerSymbol', (symbol: 'X' | 'O') => {
            setPlayerSymbol(symbol);
        });

      return () => {
        newSocket.off('connect');
        newSocket.off('gameUpdate');
        newSocket.off('gameResult');
        newSocket.off('draw');
        newSocket.disconnect();
      };
    }
  }, [gameLink]);

  const startNewGame = () => {
    const link = generateGameLink();
    setGameLink(link);
    setGameId(link);
    setBoard(Array(9).fill(null));
    setCurrentPlayer('X');
    setWinner(null);
    setWinningLine(null);
    setIsDraw(false);
  };

  const handleCellClick = (index: number) => {
    if (board[index] || winner || isDraw || !playerSymbol) return;

    const newBoard = [...board];
    newBoard[index] = playerSymbol;
    setBoard(newBoard);

    socket.emit('makeMove', gameLink, index, playerSymbol);
  };

  const getCellStyle = (index: number) => {
    return winningLine?.includes(index);
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-4xl font-bold mb-4 text-primary">Tic Tac Toe Online</h1>

      {!gameLink ? (
        <Button onClick={startNewGame} className="mb-4">
          Generate New Game Link
        </Button>
      ) : (
        <>
          <p className="mb-2">
            Share this game link: <span className="font-bold text-accent">{`http://localhost:9002/?gameId=${gameLink}`}</span>
          </p>
          {playerSymbol && (
            <p className="mb-2">
              You are playing as: <span className="font-bold text-accent">{playerSymbol}</span>
            </p>
          )}
        </>
      )}

      {gameLink && (
        <div className="grid grid-cols-3 gap-0">
          {board.map((value, index) => (
            <BoardCell
              key={index}
              value={value}
              onClick={() => handleCellClick(index)}
              isWinningCell={getCellStyle(index)}
            />
          ))}
        </div>
      )}

      {winner && (
        <h2 className="text-2xl font-semibold mt-4">
          Winner: <span className="text-accent">{winner}</span>!
        </h2>
      )}

      {isDraw && <h2 className="text-2xl font-semibold mt-4">It's a Draw!</h2>}
      <p>{message}</p>
    </main>
  );
}

