import localFont from "next/font/local";

export const Satoshi = localFont({
	src: [
		{
			path: "../../public/fonts/Satoshi-Regular.woff2",
			weight: "400",
			style: "normal",
		},
		{
			path: "../../public/fonts/Satoshi-Medium.woff2",
			weight: "500",
			style: "normal",
		},
		{
			path: "../../public/fonts/Satoshi-Bold.woff2",
			weight: "700",
			style: "normal",
		},
		{
			path: "../../public/fonts/Satoshi-Black.woff2",
			weight: "900",
			style: "normal",
		},
	],
	variable: "--font-satoshi",
	display: "swap",
});
