"use client"

import { ConnectFour } from "@/lib/game";
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { Loader2, Users, AlertCircle, Send, History, MessageSquare, Trophy, User as UserIcon, RefreshCw } from "lucide-react";
import Cookies from 'js-cookie';

type Status = 'connecting' | 'waiting' | 'ready' | 'full';

interface ChatMessage {
  nickname: string;
  message: string;
  timestamp: string;
}

interface MatchRecord {
  winner: string;
  date: string;
}

export default function GameRoom() {
	const params = useParams();
	const roomId = params.roomId as string;
	const [game, setGame] = useState(new ConnectFour());
	const [status, setStatus] = useState<Status>('connecting');
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [inputMessage, setInputMessage] = useState('');
	const [history, setHistory] = useState<MatchRecord[]>([]);
	const [nickname, setNickname] = useState<string>('Anônimo');
	const [robotDifficulty, setRobotDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
	const [playerRole, setPlayerRole] = useState<1 | 2 | null>(null);
	const [p1Name, setP1Name] = useState<string>('Jogador 1');
	const [p2Name, setP2Name] = useState<string>('Jogador 2');
	
	const socketRef = useRef<Socket | null>(null);
	const chatEndRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const token = Cookies.get('access_token');
		if (token) {
			try {
				const payload = JSON.parse(atob(token.split('.')[1]));
				setNickname(payload.nickname || 'Jogador');
			} catch (e) {
				console.error("Error decoding token", e);
			}
		}
	}, []);

	useEffect(() => {
		if (roomId !== 'robot') {
			const apiUrl = process.env.NEXT_PUBLIC_API_URL;
			fetch(`${apiUrl}/api/rooms/${roomId}/messages`)
				.then(res => res.json())
				.then(data => setMessages(data))
				.catch(err => console.error("Error fetching messages:", err));
			
			fetch(`${apiUrl}/api/rooms/${roomId}/matches`)
				.then(res => res.json())
				.then(data => setHistory(data))
				.catch(err => console.error("Error fetching matches:", err));
		}
	}, [roomId]);

	useEffect(() => {
		if (roomId === 'robot') {
			setStatus('ready');
			return;
		}

		const apiUrl = process.env.NEXT_PUBLIC_API_URL;
		const socket = io(apiUrl);
		socketRef.current = socket;
		const nicknameValue = nickname;

		socket.on('connect', () => {
			socket.emit('join_room', { roomId, nickname: nicknameValue });
		});

		socket.on('room_joined', (data: { roomId: string, status: Status, player1?: string, player2?: string }) => {
			setStatus(data.status);
			if (data.player1) setP1Name(data.player1);
			if (data.player2) setP2Name(data.player2);
			if (data.status === 'waiting') setPlayerRole(1);
			else if (data.status === 'ready') setPlayerRole(2);
		});

		socket.on('game_ready', (data: any) => {
			setStatus('ready');
			if (data && data.player1) setP1Name(data.player1);
			if (data && data.player2) setP2Name(data.player2);
			if (playerRole === null) setPlayerRole(2);
		});

		socket.on('receive_message', (msg: ChatMessage) => {
			setMessages(prev => [...prev, msg]);
		});

		socket.on('game_update', (data: any) => {
			const updatedGame = new ConnectFour();
			if (data.grid && data.grid.cells) {
				updatedGame.grid.cells = data.grid.cells;
				updatedGame.grid.width = data.grid.width;
				updatedGame.grid.height = data.grid.height;
			}
			updatedGame.turn = data.turn;
			updatedGame.state = data.state;
			updatedGame.winner = data.winner;
			setGame(updatedGame);
			if (data.player1) setP1Name(data.player1);
			if (data.player2) setP2Name(data.player2);
		});

		socket.on('match_history_update', (data: MatchRecord[]) => {
			setHistory(data);
		});

		socket.on('room_full', () => {
			setStatus('full');
			socket.disconnect();
		});

		return () => {
			socket.disconnect();
		};
	}, [roomId]);

	useEffect(() => {
		chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	const sendMessage = (e?: React.FormEvent) => {
		e?.preventDefault();
		if (!inputMessage.trim() || !socketRef.current) return;

		const msgData = {
			roomId,
			message: inputMessage,
			nickname
		};

		socketRef.current.emit('send_message', msgData);
		setInputMessage('');
	};

	const handleMove = (col: number) => {
		if (roomId === 'robot') {
			if (game.state !== 'playing' || game.turn % 2 !== 1) return;
			
			const newGame = game.clone();
			const result = newGame.insertTile(col);
			
			if (result) {
				setGame(newGame);
				if (newGame.state === 'playing') {
					setTimeout(() => {
						setGame(currentGame => {
							const botGame = currentGame.clone();
							const robotCol = botGame.getRobotMove(robotDifficulty);
							if (robotCol !== -1) {
								botGame.insertTile(robotCol);
								if (botGame.state === 'won' || botGame.state === 'tied') {
									const winnerName = botGame.state === 'won' ? (botGame.winner === 1 ? 'Jogador' : 'Robô') : 'Empate';
									setHistory(prev => [{ winner: winnerName, date: new Date().toLocaleTimeString() }, ...prev]);
								}
								return botGame;
							}
							return currentGame;
						});
					}, 500);
				} else {
					const winnerName = newGame.state === 'won' ? 'Jogador' : 'Empate';
					setHistory(prev => [{ winner: winnerName, date: new Date().toLocaleTimeString() }, ...prev]);
				}
			}
		} else {
			if (socketRef.current) {
				socketRef.current.emit('make_move', { roomId, col });
			}
		}
	};

	if (status === 'connecting') {
		return (
			<div className="flex flex-col justify-center items-center h-screen bg-[#1a1a1a] text-white">
				<Loader2 size={48} className="animate-spin text-indigo-500 mb-4" />
				<p className="text-gray-400">Conectando à sala...</p>
			</div>
		);
	}

	if (status === 'full') {
		return (
			<div className="flex flex-col justify-center items-center h-screen bg-[#1a1a1a] text-white p-4">
				<div className="max-w-md w-full bg-[#242424] border border-white/10 rounded-2xl p-8 text-center shadow-2xl">
					<AlertCircle size={64} className="text-red-500 mx-auto mb-4" />
					<h1 className="text-2xl font-bold mb-2">Sala Cheia</h1>
					<p className="text-gray-400">Limite máximo de jogadores atingido!</p>
					<button 
						onClick={() => window.location.href = '/setup-room'}
						className="mt-6 w-full py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold transition-all"
					>
						Voltar ao Início
					</button>
				</div>
			</div>
		);
	}

	if (status === 'waiting') {
		return (
			<div className="flex flex-col justify-center items-center h-screen bg-[#1a1a1a] text-white p-4">
				<div className="max-w-md w-full bg-[#242424] border border-white/10 rounded-2xl p-8 text-center shadow-2xl">
					<div className="relative mx-auto w-20 h-20 mb-6">
						<Users size={64} className="text-indigo-500 opacity-50" />
						<div className="absolute top-0 right-0 w-4 h-4 bg-emerald-500 rounded-full animate-ping"></div>
					</div>
					<h1 className="text-2xl font-bold mb-2">Aguardando Oponente</h1>
					<p className="text-gray-400 text-sm mb-6">Partilhe o link com o seu amigo para ele se juntar à partida.</p>
					<div className="bg-white/5 p-3 rounded-xl border border-white/10 font-mono text-xs break-all mb-4">
						{typeof window !== 'undefined' ? window.location.href : ''}
					</div>
					<button 
						onClick={() => {
							navigator.clipboard.writeText(window.location.href);
						}}
						className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-semibold transition-all"
					>
						Copiar Link
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[#1a1a1a] text-white flex flex-col font-sans">
			<header className="h-16 border-b border-white/5 bg-[#242424]/50 backdrop-blur-md flex items-center justify-between px-8 z-10 sticky top-0">
				<div className="flex items-center gap-3">
					<div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
						<Trophy size={18} />
					</div>
					<h1 className="font-bold tracking-tight text-lg">Connect Four</h1>
				</div>
				
				<div className="flex items-center gap-6">
					<div className="flex items-center gap-4 bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
						{roomId === 'robot' && (
							<select 
								value={robotDifficulty}
								onChange={(e) => setRobotDifficulty(e.target.value as any)}
								className="bg-transparent text-sm font-medium text-gray-300 outline-none border-none cursor-pointer"
							>
								<option value="easy" className="text-black">Fácil</option>
								<option value="medium" className="text-black">Médio</option>
								<option value="hard" className="text-black">Difícil</option>
							</select>
						)}
						{roomId === 'robot' && <div className="w-px h-3 bg-white/10"></div>}
						<div className="flex items-center gap-2">
							<div className="w-3 h-3 rounded-full bg-red-400"></div>
							<span className="text-xs font-medium text-gray-300">P1: {roomId === 'robot' ? 'Jogador' : (p1Name === nickname ? 'Você' : p1Name)}</span>
						</div>
						<div className="w-px h-3 bg-white/10"></div>
						<div className="flex items-center gap-2">
							<div className="w-3 h-3 rounded-full bg-yellow-400"></div>
							<span className="text-xs font-medium text-gray-300">P2: {roomId === 'robot' ? 'Robô' : (p2Name === nickname ? 'Você' : p2Name)}</span>
						</div>
					</div>
					
					<div className="flex items-center gap-2 text-sm">
						<UserIcon size={16} className="text-gray-500" />
						<span className="text-gray-400 italic">{nickname}</span>
					</div>
				</div>
			</header>

			<main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] gap-6 overflow-hidden max-w-[1600px] mx-auto w-full">
				<aside className="hidden lg:flex flex-col bg-[#242424] rounded-2xl border border-white/10 overflow-hidden shadow-xl">
					<div className="p-4 border-b border-white/5 flex items-center gap-2 bg-white/5">
						<History size={18} className="text-indigo-400" />
						<h3 className="font-bold text-sm">Histórico da Sala</h3>
					</div>
					<div className="flex-1 overflow-y-auto p-4 space-y-3">
						{history.length === 0 ? (
							<div className="h-full flex flex-col items-center justify-center text-center opacity-30 py-10">
								<History size={48} className="mb-2" />
								<p className="text-xs">Nenhuma partida registrada</p>
							</div>
						) : (
							history.map((record, i) => (
								<div key={i} className="bg-white/5 border border-white/5 p-3 rounded-xl flex justify-between items-center animate-in slide-in-from-left-4">
									<div>
										<p className="text-xs text-gray-500 mb-1">{record.date}</p>
										<p className="text-sm font-semibold">{record.winner}</p>
									</div>
									<div className="w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center text-indigo-400">
										<Trophy size={14} />
									</div>
								</div>
							))
						)}
					</div>
				</aside>

				<section className="flex flex-col gap-6 items-center overflow-y-auto min-h-0">
					<div className="w-full max-w-lg">
						<div className={`p-4 rounded-2xl border backdrop-blur-sm transition-all duration-500 flex items-center justify-center gap-3 shadow-lg ${
							game.state === 'playing' 
								? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-100'
								: game.state === 'won'
									? 'bg-emerald-600/20 border-emerald-500/20 text-emerald-100 scale-105'
									: 'bg-white/5 border-white/10 text-gray-300'
						}`}>
							{game.state === 'playing' ? (
								<>
									<RefreshCw size={20} className="animate-spin text-indigo-400" />
									<span className="font-semibold text-lg tracking-tight">
										{game.turn % 2 === 1 
											? `Turno de ${roomId === 'robot' ? 'Jogador' : (p1Name === nickname ? 'Você' : p1Name)} (Vermelho)` 
											: `Turno de ${roomId === 'robot' ? 'Robô' : (p2Name === nickname ? 'Você' : p2Name)} (Amarelo)`}
									</span>
								</>
							) : (
								<>
									<Trophy size={24} className={game.state === 'won' ? "text-yellow-400" : "text-gray-400"} />
									<span className="font-bold text-xl tracking-tight uppercase">
										{game.state === 'won' 
											? `${game.winner === 1 
													? (roomId === 'robot' ? 'Jogador' : (p1Name === nickname ? 'Você' : p1Name)) 
													: (roomId === 'robot' ? 'Robô' : (p2Name === nickname ? 'Você' : p2Name))
												} Venceu!` 
											: 'Jogo Empatado!'}
									</span>
								</>
							)}
						</div>
					</div>

					<div className="bg-[#242424] p-6 rounded-3xl border border-white/10 shadow-2xl relative">
						<div className="grid grid-cols-7 gap-3 bg-indigo-950/30 p-4 rounded-2xl border border-indigo-500/20 backdrop-blur-sm">
							{game.grid.cells.map((cell: number, index: number) => {
								const col = index % game.grid.width;
								return (
									<div
										key={index}
										className={`relative w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full cursor-pointer transition-all duration-200 overflow-hidden group
											${cell === 0 ? 'bg-[#1a1a1a] shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] hover:bg-white/5' : ''}
										`}
										onClick={() => handleMove(col)}
									>
										{cell !== 0 && (
											<div className={`absolute inset-1 rounded-full shadow-lg transform transition-all duration-500 animate-drop ${
												cell === 1 
													? 'bg-gradient-to-br from-red-400 to-red-600 shadow-red-950/50' 
													: 'bg-gradient-to-br from-yellow-300 to-yellow-500 shadow-yellow-950/50'
											}`}>
												<div className="absolute inset-0 bg-white/20 rounded-full blur-[2px] opacity-30 transform -translate-x-1 -translate-y-1 scale-75"></div>
											</div>
										)}
									</div>
								);
							})}
						</div>

						<div className="absolute -top-4 left-10 right-10 flex justify-between pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
							{[...Array(7)].map((_, i) => (
								<div key={i} className="w-16 h-2 rounded-full bg-white/10"></div>
							))}
						</div>
					</div>

					<button
						className="px-8 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all font-bold text-sm tracking-widest uppercase active:scale-95 shadow-lg flex items-center gap-2 group"
						onClick={() => {
							if (roomId === 'robot') {
								setGame(new ConnectFour());
							} else if (socketRef.current) {
								socketRef.current.emit('restart_game', { roomId });
							}
						}}
					>
						<RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-500" />
						Reiniciar Partida
					</button>
				</section>

				<aside className="flex flex-col bg-[#242424] rounded-2xl border border-white/10 overflow-hidden shadow-xl h-[500px] lg:h-auto">
					<div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
						<div className="flex items-center gap-2">
							<MessageSquare size={18} className="text-indigo-400" />
							<h3 className="font-bold text-sm">Chat da Sala</h3>
						</div>
						<div className="flex items-center gap-1.5 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
							<div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
							<span className="text-[10px] font-bold text-emerald-500 uppercase tracking-tighter">Live</span>
						</div>
					</div>

					<div className="flex-1 overflow-y-auto p-4 space-y-4">
						{messages.length === 0 ? (
							<div className="h-full flex flex-col items-center justify-center text-center opacity-30 py-10">
								<MessageSquare size={48} className="mb-2" />
								<p className="text-xs">Inicie uma conversa!</p>
							</div>
						) : (
							messages.map((msg, i) => (
								<div key={i} className={`flex flex-col ${msg.nickname === nickname ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2`}>
									<span className="text-[10px] text-gray-500 mb-1 px-1">{msg.nickname}</span>
									<div className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm shadow-md ${
										msg.nickname === nickname 
											? 'bg-indigo-600 text-white rounded-tr-none' 
											: 'bg-white/10 text-gray-200 rounded-tl-none border border-white/5'
									}`}>
										{msg.message}
									</div>
								</div>
							))
						)}
						<div ref={chatEndRef} />
					</div>

					<div className="p-4 bg-white/5 border-t border-white/5">
						<form onSubmit={sendMessage} className="flex gap-2">
							<input
								type="text"
								value={inputMessage}
								onChange={(e) => setInputMessage(e.target.value)}
								placeholder="Sua mensagem..."
								className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-gray-600"
							/>
							<button 
								type="submit"
								className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center hover:bg-indigo-500 transition-all active:scale-90"
							>
								<Send size={18} />
							</button>
						</form>
					</div>
				</aside>
			</main>

			<style jsx global>{`
				@keyframes drop {
					from { transform: translateY(-300%); opacity: 0; }
					to { transform: translateY(0); opacity: 1; }
				}
				.animate-drop {
					animation: drop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
				}
				@keyframes fade-in {
					from { opacity: 0; }
					to { opacity: 1; }
				}
				@keyframes slide-in-from-left-4 {
					from { transform: translateX(-1rem); opacity: 0; }
					to { transform: translateX(0); opacity: 1; }
				}
				@keyframes slide-in-from-bottom-2 {
					from { transform: translateY(0.5rem); opacity: 0; }
					to { transform: translateY(0); opacity: 1; }
				}
				.animate-in {
					animation: 0.3s ease-out forwards;
				}
				.fade-in { animation-name: fade-in; }
				.slide-in-from-left-4 { animation-name: slide-in-from-left-4; }
				.slide-in-from-bottom-2 { animation-name: slide-in-from-bottom-2; }
			`}</style>
		</div>
	)
}