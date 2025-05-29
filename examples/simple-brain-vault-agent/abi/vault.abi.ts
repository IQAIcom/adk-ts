[
	{
		type: "constructor",
		inputs: [
			{
				name: "_userAddress",
				type: "address",
				internalType: "address",
			},
			{
				name: "_botAddress",
				type: "address",
				internalType: "address",
			},
			{
				name: "_adminAddress",
				type: "address",
				internalType: "address",
			},
			{
				name: "_vaultCreatorAddress",
				type: "address",
				internalType: "address",
			},
		],
		stateMutability: "nonpayable",
	},
	{
		type: "receive",
		stateMutability: "payable",
	},
	{
		type: "function",
		name: "adminAddress",
		inputs: [],
		outputs: [
			{
				name: "",
				type: "address",
				internalType: "address",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "approveTokenForProtocol",
		inputs: [
			{
				name: "token",
				type: "address",
				internalType: "address",
			},
			{
				name: "protocolSpender",
				type: "address",
				internalType: "address",
			},
			{
				name: "amount",
				type: "uint256",
				internalType: "uint256",
			},
		],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "botAddress",
		inputs: [],
		outputs: [
			{
				name: "",
				type: "address",
				internalType: "address",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "deposit",
		inputs: [
			{
				name: "token",
				type: "address",
				internalType: "address",
			},
			{
				name: "amount",
				type: "uint256",
				internalType: "uint256",
			},
		],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "unyield",
		inputs: [
			{
				name: "targetProtocol",
				type: "address",
				internalType: "address",
			},
			{
				name: "callParams",
				type: "bytes",
				internalType: "bytes",
			},
		],
		outputs: [],
		stateMutability: "payable",
	},
	{
		type: "function",
		name: "userAddress",
		inputs: [],
		outputs: [
			{
				name: "",
				type: "address",
				internalType: "address",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "vaultCreator",
		inputs: [],
		outputs: [
			{
				name: "",
				type: "address",
				internalType: "contract IVaultCreator",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "withdraw",
		inputs: [
			{
				name: "token",
				type: "address",
				internalType: "address",
			},
			{
				name: "amount",
				type: "uint256",
				internalType: "uint256",
			},
		],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "yield",
		inputs: [
			{
				name: "targetProtocol",
				type: "address",
				internalType: "address",
			},
			{
				name: "callParams",
				type: "bytes",
				internalType: "bytes",
			},
			{
				name: "reason",
				type: "string",
				internalType: "string",
			},
		],
		outputs: [],
		stateMutability: "payable",
	},
	{
		type: "event",
		name: "Approved",
		inputs: [
			{
				name: "token",
				type: "address",
				indexed: true,
				internalType: "address",
			},
			{
				name: "spender",
				type: "address",
				indexed: true,
				internalType: "address",
			},
			{
				name: "amount",
				type: "uint256",
				indexed: false,
				internalType: "uint256",
			},
		],
		anonymous: false,
	},
	{
		type: "event",
		name: "Deposited",
		inputs: [
			{
				name: "token",
				type: "address",
				indexed: true,
				internalType: "address",
			},
			{
				name: "user",
				type: "address",
				indexed: true,
				internalType: "address",
			},
			{
				name: "amount",
				type: "uint256",
				indexed: false,
				internalType: "uint256",
			},
		],
		anonymous: false,
	},
	{
		type: "event",
		name: "Unyielded",
		inputs: [
			{
				name: "targetProtocol",
				type: "address",
				indexed: true,
				internalType: "address",
			},
			{
				name: "params",
				type: "bytes",
				indexed: false,
				internalType: "bytes",
			},
			{
				name: "caller",
				type: "address",
				indexed: false,
				internalType: "address",
			},
		],
		anonymous: false,
	},
	{
		type: "event",
		name: "Withdrawn",
		inputs: [
			{
				name: "token",
				type: "address",
				indexed: true,
				internalType: "address",
			},
			{
				name: "recipient",
				type: "address",
				indexed: true,
				internalType: "address",
			},
			{
				name: "amount",
				type: "uint256",
				indexed: false,
				internalType: "uint256",
			},
		],
		anonymous: false,
	},
	{
		type: "event",
		name: "Yielded",
		inputs: [
			{
				name: "targetProtocol",
				type: "address",
				indexed: true,
				internalType: "address",
			},
			{
				name: "params",
				type: "bytes",
				indexed: false,
				internalType: "bytes",
			},
			{
				name: "reason",
				type: "string",
				indexed: false,
				internalType: "string",
			},
			{
				name: "caller",
				type: "address",
				indexed: false,
				internalType: "address",
			},
		],
		anonymous: false,
	},
];
