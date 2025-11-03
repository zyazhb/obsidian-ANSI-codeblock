import { Plugin, MarkdownPostProcessorContext } from 'obsidian';
import { ansiToHTML } from './utils/ansi-parser';

/**
 * Register ANSI code block processor
 */
export function registerANSIProcessor(plugin: Plugin) {
	plugin.registerMarkdownCodeBlockProcessor('ansi', (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
		// el is extended by Obsidian with createDiv/createEl methods
		const container = (el as any).createDiv('ansi-code-block');
		const pre = container.createEl('pre');
		pre.innerHTML = ansiToHTML(source);
	});
	
	// Also support uppercase ANSI
	plugin.registerMarkdownCodeBlockProcessor('ANSI', (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
		// el is extended by Obsidian with createDiv/createEl methods
		const container = (el as any).createDiv('ansi-code-block');
		const pre = container.createEl('pre');
		pre.innerHTML = ansiToHTML(source);
	});
}

