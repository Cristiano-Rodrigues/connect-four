"use client"

import { ConnectFour } from "@/lib/game";
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { Loader2, Users, AlertCircle } from "lucide-react";

type Status = 'connecting' | 'waiting' | 'ready' | 'full';

export default function GameRoom() {
	const params = useParams();
	const roomId = params.roomId as string;
	const [game, setGame] = useState(new ConnectFour());
	const currPlayer = 1;

	const [status, setStatus] = useState<Status>('connecting');
	const socketRef = useRef<Socket | null>(null);

	useEffect(() => {
		if (roomId === 'robot') {
			setStatus('ready');
			return;
		}

		const socket = io(process.env.NEXT_PUBLIC_API_URL);
		socketRef.current = socket;

		socket.on('connect', () => {
			socket.emit('join_room', roomId);
		});

		socket.on('room_joined', (data: { roomId: string, status: Status }) => {
			setStatus(data.status);
		});

		socket.on('game_ready', () => {
			setStatus('ready');
		});

		socket.on('room_full', () => {
			setStatus('full');
			socket.disconnect();
		});

		return () => {
			socket.disconnect();
		};
	}, [roomId]);

	if (status === 'connecting') {
		return (
			<div className="flex flex-col justify-center items-center h-screen bg-[#0a0a0a] text-white">
				<Loader2 size={48} className="animate-spin text-indigo-500 mb-4" />
				<p className="text-gray-400">Conectando à sala...</p>
			</div>
		);
	}

	if (status === 'full') {
		return (
			<div className="flex flex-col justify-center items-center h-screen bg-[#0a0a0a] text-white">
				<AlertCircle size={64} className="text-red-500 mb-4" />
				<h1 className="text-2xl font-bold mb-2">Sala Cheia</h1>
				<p className="text-gray-400">Limite máximo de jogadores atingido!</p>
			</div>
		);
	}

	if (status === 'waiting') {
		return (
			<div className="flex flex-col justify-center items-center h-screen bg-[#0a0a0a] text-white">
				<div className="relative mb-8">
					<Users size={64} className="text-indigo-500 opacity-50" />
					<div className="absolute top-0 right-0 w-4 h-4 bg-emerald-500 rounded-full animate-ping"></div>
				</div>
				<h1 className="text-2xl font-bold mb-2">Aguardando Oponente</h1>
				<p className="text-gray-400 text-center max-w-md">
					Partilhe o link com o seu amigo para ele se juntar à partida.<br/>
					<span className="text-indigo-400 font-mono text-sm mt-4 block p-2 bg-white/5 rounded-lg">
						{typeof window !== 'undefined' ? window.location.href : ''}
					</span>
				</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col justify-center items-center h-screen">
			<div className="flex flex-col gap-6 items-center max-w-xl w-full p-8">
				<div className="text-center w-full">
					<h2 className="text-xl font-bold mb-2">
						{roomId === 'robot' ? 'Jogando contra o Robô' : 'Partida Multiplayer'}
					</h2>
					<div className="px-4 py-2 bg-white/5 rounded-lg border border-white/10 inline-block">
						{
							game.state == 'playing' ?
								(game.turn % 2 === currPlayer ? <span className="font-semibold">Sua vez</span> : <span className="text-amber-400 font-semibold">Espere pelo outro jogador</span>) :
								(game.state == 'won' ? (game.winner == currPlayer ? <span className="text-indigo-400 font-bold">Você ganhou!</span> : <span className="text-red-400 font-bold">Você perdeu!</span>) : <span className="text-gray-400 font-bold">Jogo empatado!</span>)
						}
					</div>
				</div>
				<div className="grid grid-cols-7 gap-2 p-4">
					{
						game.grid.cells.map((cell: number, index: number) => {
							return (
								<div
									key={index}
									className={`w-12 h-12 cursor-pointer transition-all duration-300 shadow-inner flex items-center justify-center
										${cell === 0 ? 'bg-gray-400 hover:bg-white/10' : ''}
										${cell === 1 ? 'bg-red-400' : ''}
										${cell === 2 ? 'bg-yellow-400' : ''}
									`}
									onClick={() => {
										if (game.state == 'won' || game.state == 'tied') {
											return;
										}

										const col = index % game.grid.width;
										const result = game.insertTile(col);

										if (result) {
											setGame(new ConnectFour(game.grid, game.turn, game.state, game.winner));
										}
									}}
								>
								</div>
							)
						})
					}
				</div>
				<div className="flex justify-end w-full">
					<button
						className="px-6 py-2 rounded-xl bg-gray-400 text-sm font-semibold cursor-pointer"
						onClick={() => {
							setGame(new ConnectFour())
						}}
					>
						Reiniciar Jogo
					</button>
				</div>
			</div>
		</div>
	)
}