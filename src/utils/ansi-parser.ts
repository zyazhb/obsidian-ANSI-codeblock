/**
 * ANSI color code parser
 * Converts ANSI escape sequences to HTML with styled spans
 */

export interface ANSIToken {
	text: string;
	styles: string[];
}

/**
 * Parse ANSI escape sequences and return tokens with styling information
 */
export function parseANSICodes(text: string): ANSIToken[] {
	const tokens: ANSIToken[] = [];
	let currentText = '';
	let currentStyles: string[] = [];
	
	// ANSI escape sequence regex
	const ansiRegex = /\x1b\[([0-9;]+)m/g;
	let lastIndex = 0;
	let match;
	
	while ((match = ansiRegex.exec(text)) !== null) {
		// Add text before the escape sequence
		if (match.index > lastIndex) {
			if (currentText) {
				tokens.push({ text: currentText, styles: [...currentStyles] });
			}
			currentText = text.substring(lastIndex, match.index);
			if (currentText) {
				tokens.push({ text: currentText, styles: [...currentStyles] });
			}
			currentText = '';
		}
		
		// Parse the ANSI code
		const codes = match[1].split(';').map(c => parseInt(c, 10));
		currentStyles = applyANSICodes(codes, currentStyles);
		
		lastIndex = match.index + match[0].length;
	}
	
	// Add remaining text
	if (lastIndex < text.length) {
		currentText = text.substring(lastIndex);
		if (currentText) {
			tokens.push({ text: currentText, styles: [...currentStyles] });
		}
	} else if (currentText) {
		tokens.push({ text: currentText, styles: [...currentStyles] });
	}
	
	return tokens.length > 0 ? tokens : [{ text, styles: [] }];
}

/**
 * Apply ANSI codes to current styles
 */
function applyANSICodes(codes: number[], currentStyles: string[]): string[] {
	const styles = [...currentStyles];
	
	for (const code of codes) {
		// Reset
		if (code === 0) {
			styles.length = 0;
			continue;
		}
		
		// Text styles
		if (code === 1) styles.push('ansi-bold');
		if (code === 2) styles.push('ansi-dim');
		if (code === 3) styles.push('ansi-italic');
		if (code === 4) styles.push('ansi-underline');
		if (code === 5) styles.push('ansi-blink');
		if (code === 7) styles.push('ansi-inverse');
		if (code === 9) styles.push('ansi-strikethrough');
		
		// Remove text style (21-29)
		if (code === 21 || code === 22) removeStyle(styles, 'ansi-bold', 'ansi-dim');
		if (code === 23) removeStyle(styles, 'ansi-italic');
		if (code === 24) removeStyle(styles, 'ansi-underline');
		if (code === 25) removeStyle(styles, 'ansi-blink');
		if (code === 27) removeStyle(styles, 'ansi-inverse');
		if (code === 29) removeStyle(styles, 'ansi-strikethrough');
		
		// Foreground colors
		if (code >= 30 && code <= 37) {
			removeForegroundColors(styles);
			styles.push(`ansi-fg-${code - 30}`);
		}
		if (code === 39) removeForegroundColors(styles);
		
		// Background colors
		if (code >= 40 && code <= 47) {
			removeBackgroundColors(styles);
			styles.push(`ansi-bg-${code - 40}`);
		}
		if (code === 49) removeBackgroundColors(styles);
		
		// Bright foreground colors
		if (code >= 90 && code <= 97) {
			removeForegroundColors(styles);
			styles.push(`ansi-fg-bright-${code - 90}`);
		}
		
		// Bright background colors
		if (code >= 100 && code <= 107) {
			removeBackgroundColors(styles);
			styles.push(`ansi-bg-bright-${code - 100}`);
		}
		
		// 256 color support (38;5;n and 48;5;n)
		// For now, we'll handle basic 256 color support
		if (code === 38 && codes.indexOf(code) !== codes.length - 1) {
			const nextCode = codes[codes.indexOf(code) + 1];
			if (nextCode === 5) {
				const colorCode = codes[codes.indexOf(code) + 2];
				if (colorCode !== undefined) {
					removeForegroundColors(styles);
					styles.push(`ansi-fg-256-${colorCode}`);
				}
			}
		}
		if (code === 48 && codes.indexOf(code) !== codes.length - 1) {
			const nextCode = codes[codes.indexOf(code) + 1];
			if (nextCode === 5) {
				const colorCode = codes[codes.indexOf(code) + 2];
				if (colorCode !== undefined) {
					removeBackgroundColors(styles);
					styles.push(`ansi-bg-256-${colorCode}`);
				}
			}
		}
	}
	
	return styles;
}

function removeStyle(styles: string[], ...toRemove: string[]): void {
	for (const style of toRemove) {
		const index = styles.indexOf(style);
		if (index !== -1) {
			styles.splice(index, 1);
		}
	}
}

function removeForegroundColors(styles: string[]): void {
	const toRemove: string[] = [];
	for (const style of styles) {
		if (style.startsWith('ansi-fg-')) {
			toRemove.push(style);
		}
	}
	for (const style of toRemove) {
		removeStyle(styles, style);
	}
}

function removeBackgroundColors(styles: string[]): void {
	const toRemove: string[] = [];
	for (const style of styles) {
		if (style.startsWith('ansi-bg-')) {
			toRemove.push(style);
		}
	}
	for (const style of toRemove) {
		removeStyle(styles, style);
	}
}

/**
 * Convert ANSI text to HTML
 */
export function ansiToHTML(text: string): string {
	// Convert caret notation (^[) to actual escape sequences (\x1b)
	// Also handle other common representations
	// Note: ^[[1m means ESC + [1m, so we replace ^[ with \x1b
	let normalizedText = text
		.replace(/\^\[/g, '\x1b')  // ^[ -> ESC (without the bracket, as [ comes after)
		.replace(/\\x1b\[/g, '\x1b[')  // \x1b[ -> ESC[ (escaped hex)
		.replace(/\\e\[/g, '\x1b[')   // \e[ -> ESC[ (escaped e)
		.replace(/\\033\[/g, '\x1b['); // \033[ -> ESC[ (escaped octal)
	
	// Handle escape sequences that aren't color codes
	const cleanedText = normalizedText.replace(/\x1b\[[^m]*m/g, (match) => {
		// Only keep actual SGR (Select Graphic Rendition) codes
		if (/^\x1b\[[0-9;]+m$/.test(match)) {
			return match;
		}
		return '';
	});
	
	const tokens = parseANSICodes(cleanedText);
	const htmlParts: string[] = [];
	
	for (const token of tokens) {
		let escapedText = token.text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/\n/g, '<br>');  // Preserve newlines
		
		if (token.styles.length > 0) {
			const classNames = token.styles.join(' ');
			htmlParts.push(`<span class="${classNames}">${escapedText}</span>`);
		} else {
			htmlParts.push(escapedText);
		}
	}
	
	return htmlParts.join('');
}

