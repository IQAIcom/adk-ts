import type { DocSection } from "../types.js";

let docs: DocSection[] = [];

export function setDocs(sections: DocSection[]) {
	docs = sections;
}

export function getDocs(): DocSection[] {
	return docs;
}
