const LibrarianScene = () => {
	return (
		<div className="relative h-80 w-full max-w-lg">
			<svg
				viewBox="0 0 400 300"
				className="w-full h-full drop-shadow-2xl"
				aria-label="Library scene with books and a librarian"
				role="img"
			>
				{/* Bookshelf */}
				<g className="bookshelf">
					{/* Shelf structure - darker, less prominent */}
					<rect x="40" y="70" width="320" height="10" fill="#57534e" rx="2" />
					<rect x="40" y="150" width="320" height="10" fill="#57534e" rx="2" />
					<rect x="40" y="230" width="320" height="10" fill="#57534e" rx="2" />

					{/* Books on top shelf - vibrant colors */}
					<rect x="50" y="35" width="24" height="35" fill="#ef4444" rx="1">
						<animate
							attributeName="opacity"
							values="0.7;1;0.7"
							dur="3s"
							repeatCount="indefinite"
						/>
					</rect>
					<rect x="78" y="35" width="28" height="35" fill="#3b82f6" rx="1">
						<animate
							attributeName="opacity"
							values="1;0.7;1"
							dur="3.5s"
							repeatCount="indefinite"
						/>
					</rect>
					<rect x="110" y="35" width="22" height="35" fill="#10b981" rx="1">
						<animate
							attributeName="opacity"
							values="0.8;1;0.8"
							dur="2.8s"
							repeatCount="indefinite"
						/>
					</rect>
					<rect x="136" y="35" width="26" height="35" fill="#f59e0b" rx="1">
						<animate
							attributeName="opacity"
							values="1;0.8;1"
							dur="3.2s"
							repeatCount="indefinite"
						/>
					</rect>
					<rect x="166" y="35" width="24" height="35" fill="#8b5cf6" rx="1">
						<animate
							attributeName="opacity"
							values="0.7;1;0.7"
							dur="2.5s"
							repeatCount="indefinite"
						/>
					</rect>
					<rect x="194" y="35" width="28" height="35" fill="#06b6d4" rx="1">
						<animate
							attributeName="opacity"
							values="1;0.7;1"
							dur="3.8s"
							repeatCount="indefinite"
						/>
					</rect>

					{/* EMPHASIZED: Gap where book is missing - glowing effect */}
					<g>
						<rect
							x="226"
							y="35"
							width="36"
							height="35"
							fill="none"
							stroke="#f43f5e"
							strokeWidth="3"
							strokeDasharray="6 4"
							rx="1"
						>
							<animate
								attributeName="opacity"
								values="0.4;1;0.4"
								dur="1.5s"
								repeatCount="indefinite"
							/>
							<animate
								attributeName="stroke"
								values="#f43f5e;#fbbf24;#f43f5e"
								dur="3s"
								repeatCount="indefinite"
							/>
						</rect>
						{/* Glow effect */}
						<rect
							x="226"
							y="35"
							width="36"
							height="35"
							fill="#f43f5e"
							opacity="0.1"
							rx="1"
						>
							<animate
								attributeName="opacity"
								values="0.05;0.2;0.05"
								dur="1.5s"
								repeatCount="indefinite"
							/>
						</rect>
					</g>

					<rect x="266" y="35" width="24" height="35" fill="#ec4899" rx="1">
						<animate
							attributeName="opacity"
							values="0.8;1;0.8"
							dur="3.3s"
							repeatCount="indefinite"
						/>
					</rect>
					<rect x="294" y="35" width="28" height="35" fill="#f97316" rx="1">
						<animate
							attributeName="opacity"
							values="1;0.8;1"
							dur="2.9s"
							repeatCount="indefinite"
						/>
					</rect>
					<rect x="326" y="35" width="22" height="35" fill="#a855f7" rx="1">
						<animate
							attributeName="opacity"
							values="0.7;1;0.7"
							dur="3.6s"
							repeatCount="indefinite"
						/>
					</rect>

					{/* Books on middle shelf - slightly muted */}
					<rect
						x="50"
						y="115"
						width="26"
						height="35"
						fill="#10b981"
						opacity="0.8"
						rx="1"
					/>
					<rect
						x="80"
						y="115"
						width="24"
						height="35"
						fill="#6366f1"
						opacity="0.8"
						rx="1"
					/>
					<rect
						x="108"
						y="115"
						width="28"
						height="35"
						fill="#ef4444"
						opacity="0.8"
						rx="1"
					/>
					<rect
						x="140"
						y="115"
						width="22"
						height="35"
						fill="#14b8a6"
						opacity="0.8"
						rx="1"
					/>
					<rect
						x="166"
						y="115"
						width="26"
						height="35"
						fill="#f97316"
						opacity="0.8"
						rx="1"
					/>
					<rect
						x="196"
						y="115"
						width="24"
						height="35"
						fill="#3b82f6"
						opacity="0.8"
						rx="1"
					/>
					<rect
						x="224"
						y="115"
						width="28"
						height="35"
						fill="#a855f7"
						opacity="0.8"
						rx="1"
					/>
					<rect
						x="256"
						y="115"
						width="26"
						height="35"
						fill="#22c55e"
						opacity="0.8"
						rx="1"
					/>
					<rect
						x="286"
						y="115"
						width="24"
						height="35"
						fill="#eab308"
						opacity="0.8"
						rx="1"
					/>
					<rect
						x="314"
						y="115"
						width="28"
						height="35"
						fill="#06b6d4"
						opacity="0.8"
						rx="1"
					/>

					{/* Books on bottom shelf - more muted */}
					<rect
						x="50"
						y="195"
						width="24"
						height="35"
						fill="#7c3aed"
						opacity="0.6"
						rx="1"
					/>
					<rect
						x="78"
						y="195"
						width="28"
						height="35"
						fill="#dc2626"
						opacity="0.6"
						rx="1"
					/>
					<rect
						x="110"
						y="195"
						width="26"
						height="35"
						fill="#059669"
						opacity="0.6"
						rx="1"
					/>
					<rect
						x="140"
						y="195"
						width="22"
						height="35"
						fill="#d97706"
						opacity="0.6"
						rx="1"
					/>
					<rect
						x="166"
						y="195"
						width="28"
						height="35"
						fill="#2563eb"
						opacity="0.6"
						rx="1"
					/>
					<rect
						x="198"
						y="195"
						width="24"
						height="35"
						fill="#db2777"
						opacity="0.6"
						rx="1"
					/>
					<rect
						x="226"
						y="195"
						width="26"
						height="35"
						fill="#0891b2"
						opacity="0.6"
						rx="1"
					/>
					<rect
						x="256"
						y="195"
						width="24"
						height="35"
						fill="#65a30d"
						opacity="0.6"
						rx="1"
					/>
					<rect
						x="280"
						y="195"
						width="28"
						height="35"
						fill="#c026d3"
						opacity="0.6"
						rx="1"
					/>
					<rect
						x="312"
						y="195"
						width="26"
						height="35"
						fill="#ea580c"
						opacity="0.6"
						rx="1"
					/>
				</g>

				{/* EMPHASIZED: Librarian - larger, more detailed */}
				<g className="librarian">
					<g>
						<animate
							attributeName="transform"
							type="translate"
							values="0 0; -20 0; 0 0; 20 0; 0 0"
							dur="8s"
							repeatCount="indefinite"
						/>

						{/* Body/Dress - gradient effect */}
						<defs>
							<linearGradient
								id="dressGradient"
								x1="0%"
								y1="0%"
								x2="0%"
								y2="100%"
							>
								<stop offset="0%" stopColor="#475569" />
								<stop offset="100%" stopColor="#334155" />
							</linearGradient>
						</defs>
						<path
							d="M 200 185 L 188 255 L 212 255 Z"
							fill="url(#dressGradient)"
						/>

						{/* Head - larger */}
						<circle cx="200" cy="165" r="18" fill="#fcd5b5" />

						{/* Hair bun - more detailed */}
						<ellipse cx="200" cy="152" rx="10" ry="9" fill="#3f3f46" />
						<circle cx="200" cy="152" r="6" fill="#52525b" />

						{/* Glasses - more prominent */}
						<circle
							cx="194"
							cy="165"
							r="5"
							fill="none"
							stroke="#18181b"
							strokeWidth="2"
						/>
						<circle
							cx="206"
							cy="165"
							r="5"
							fill="none"
							stroke="#18181b"
							strokeWidth="2"
						/>
						<line
							x1="199"
							y1="165"
							x2="201"
							y2="165"
							stroke="#18181b"
							strokeWidth="2"
						/>
						<line
							x1="189"
							y1="164"
							x2="185"
							y2="163"
							stroke="#18181b"
							strokeWidth="1.5"
						/>
						<line
							x1="211"
							y1="164"
							x2="215"
							y2="163"
							stroke="#18181b"
							strokeWidth="1.5"
						/>

						{/* Eyes looking around */}
						<circle cx="194" cy="165" r="2" fill="#18181b">
							<animate
								attributeName="cx"
								values="194;195;194;193;194"
								dur="8s"
								repeatCount="indefinite"
							/>
						</circle>
						<circle cx="206" cy="165" r="2" fill="#18181b">
							<animate
								attributeName="cx"
								values="206;207;206;205;206"
								dur="8s"
								repeatCount="indefinite"
							/>
						</circle>

						{/* Arm reaching up - more dynamic */}
						<g>
							<animate
								attributeName="transform"
								type="rotate"
								values="0 200 185; -25 200 185; 0 200 185; 25 200 185; 0 200 185"
								dur="8s"
								repeatCount="indefinite"
							/>
							<line
								x1="200"
								y1="185"
								x2="235"
								y2="130"
								stroke="#475569"
								strokeWidth="8"
								strokeLinecap="round"
							/>

							{/* Hand searching */}
							<circle cx="235" cy="125" r="6" fill="#fcd5b5">
								<animate
									attributeName="cy"
									values="125; 115; 125; 135; 125"
									dur="8s"
									repeatCount="indefinite"
								/>
								<animate
									attributeName="cx"
									values="235; 240; 235; 230; 235"
									dur="8s"
									repeatCount="indefinite"
								/>
							</circle>
						</g>

						{/* Book in other hand */}
						<rect
							x="182"
							y="205"
							width="14"
							height="20"
							fill="#ef4444"
							rx="1"
							transform="rotate(-12 189 215)"
						>
							<animate
								attributeName="fill"
								values="#ef4444;#dc2626;#ef4444"
								dur="4s"
								repeatCount="indefinite"
							/>
						</rect>
					</g>
				</g>

				{/* EMPHASIZED: Question marks - larger, more prominent */}
				<text
					x="250"
					y="95"
					fontSize="32"
					fill="#fbbf24"
					fontWeight="bold"
					opacity="0"
				>
					?
					<animate
						attributeName="opacity"
						values="0;1;0.8;0"
						dur="3s"
						begin="0s"
						repeatCount="indefinite"
					/>
					<animate
						attributeName="y"
						values="95;75;95"
						dur="3s"
						begin="0s"
						repeatCount="indefinite"
					/>
				</text>
				<text
					x="275"
					y="105"
					fontSize="28"
					fill="#f59e0b"
					fontWeight="bold"
					opacity="0"
				>
					?
					<animate
						attributeName="opacity"
						values="0;1;0.8;0"
						dur="3s"
						begin="1s"
						repeatCount="indefinite"
					/>
					<animate
						attributeName="y"
						values="105;85;105"
						dur="3s"
						begin="1s"
						repeatCount="indefinite"
					/>
				</text>
				<text
					x="265"
					y="90"
					fontSize="24"
					fill="#fb923c"
					fontWeight="bold"
					opacity="0"
				>
					?
					<animate
						attributeName="opacity"
						values="0;1;0.8;0"
						dur="3s"
						begin="1.5s"
						repeatCount="indefinite"
					/>
					<animate
						attributeName="y"
						values="90;70;90"
						dur="3s"
						begin="1.5s"
						repeatCount="indefinite"
					/>
				</text>
			</svg>
		</div>
	);
};

export default LibrarianScene;
