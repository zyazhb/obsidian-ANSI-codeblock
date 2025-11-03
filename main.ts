import { Plugin } from 'obsidian';
import { registerANSIProcessor } from './src/ansi-processor';

export default class ANSIColorPlugin extends Plugin {
	async onload() {
		registerANSIProcessor(this);
	}

	onunload() {
		// Cleanup handled by Obsidian's registerMarkdownCodeBlockProcessor
	}
}
