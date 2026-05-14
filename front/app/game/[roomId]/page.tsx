"use client"

import { ConnectFour } from "@/lib/game";
import { useState } from "react";

export default function GameRoom() {
	const [game, setGame] = useState(new ConnectFour());
	const currPlayer = 1;

	return (
		<div className="flex justify-center items-center h-screen">
			<div className="flex flex-col gap-2">
				<div className="text-center">
					{
						game.state == 'playing' ?
							(game.turn % 2 === currPlayer ? 'Sua vez' : 'Espere pelo outro jogador') :
							(game.state == 'won' ? (game.winner == currPlayer ? 'Você ganhou!' : 'Você perdeu!') : 'Jogo empatado!')
					}
				</div>
				<div className="grid grid-cols-7 gap-2">
					{
						game.grid.cells.map((cell: number, index: number) => {
							return (
								<div
									key={index}
									className="w-12 h-12 p-2 bg-gray-200 rounded-md cursor-pointer"
									onClick={() => {
										const col = index % game.grid.width;
										const result = game.insertTile(col);

										if (result) {
											setGame(new ConnectFour(game.grid, game.turn, game.state, game.winner));
										}
									}}
								>
									{ cell == 0 ? ' ' : (cell == 1 ? 'x' : 'o') }
								</div>
							)
						})
					}
				</div>
				<div className="flex justify-end p-2">
					<button
						className="cursor-pointer"
						onClick={() => {
							setGame(new ConnectFour())
						}}
					>
						Restart
					</button>
				</div>
			</div>
		</div>
	)
}