import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const BASE_URL = "https://iqaicom.github.io/adk-ts";
const SITE_NAME = "ADK-TS";
const DEFAULT_TITLE = "ADK-TS API Reference";
const DEFAULT_DESCRIPTION =
	"Complete API reference for ADK-TS, the TypeScript-native AI agent framework. Browse classes, interfaces, types, and methods for agents, tools, sessions, and more.";
const OG_IMAGE = `${BASE_URL}/og-image.png`;
const FAVICON = `${BASE_URL}/adk.png`;
const TWITTER_HANDLE = "@iqaicom";

const metaTags = `
<meta property="og:type" content="website" />
<meta property="og:site_name" content="${SITE_NAME}" />
<meta property="og:image" content="${OG_IMAGE}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="${TWITTER_HANDLE}" />
<meta name="twitter:creator" content="${TWITTER_HANDLE}" />
<meta name="twitter:image" content="${OG_IMAGE}" />
<link rel="icon" href="${FAVICON}" />
<link rel="apple-touch-icon" href="${FAVICON}" />
`;

function getHtmlFiles(dir) {
	const files = [];
	for (const item of readdirSync(dir)) {
		const fullPath = join(dir, item);
		if (statSync(fullPath).isDirectory()) {
			files.push(...getHtmlFiles(fullPath));
		} else if (item.endsWith(".html")) {
			files.push(fullPath);
		}
	}
	return files;
}

function extractTitle(html) {
	const match = html.match(/<title>(.*?)<\/title>/);
	return match ? match[1] : DEFAULT_TITLE;
}

function injectMeta(filePath) {
	let html = readFileSync(filePath, "utf-8");
	const pageTitle = extractTitle(html);
	const isIndex = filePath.endsWith("index.html");

	const ogTitle = `<meta property="og:title" content="${pageTitle}" />`;
	const ogDesc = `<meta property="og:description" content="${DEFAULT_DESCRIPTION}" />`;
	const ogUrl = isIndex
		? `<meta property="og:url" content="${BASE_URL}/" />`
		: "";
	const twitterTitle = `<meta name="twitter:title" content="${pageTitle}" />`;
	const twitterDesc = `<meta name="twitter:description" content="${DEFAULT_DESCRIPTION}" />`;

	const injection = `${ogTitle}\n${ogDesc}\n${ogUrl}\n${twitterTitle}\n${twitterDesc}\n${metaTags}`;

	// Replace TypeDoc's auto-generated description with our own
	html = html.replace(
		/<meta name="description" content="Documentation for [^"]*"\/>/,
		`<meta name="description" content="${DEFAULT_DESCRIPTION}"/>`,
	);

	html = html.replace("</head>", `${injection}</head>`);
	writeFileSync(filePath, html);
}

const apiDir = join(process.cwd(), "api");
const htmlFiles = getHtmlFiles(apiDir);

for (const file of htmlFiles) {
	injectMeta(file);
}

console.log(`Injected meta tags into ${htmlFiles.length} HTML files.`);
