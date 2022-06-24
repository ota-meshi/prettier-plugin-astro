import printer from './printer';
import { options } from './options';
import { Parser, Printer, SupportLanguage } from 'prettier';
import * as expressionPlugin from './expression';
import { parseForPrettier } from './parser';

export const languages: Partial<SupportLanguage>[] = [
	{
		name: 'astro',
		parsers: ['astro'],
		extensions: ['.astro'],
		vscodeLanguageIds: ['astro'],
	},
];

export const parsers: Record<string, Parser> = {
	astro: {
		parse: parseForPrettier,
		astFormat: 'astro',
		locStart: (node) => node.position.start.offset,
		locEnd: (node) => node.position.end.offset,
	},
	...expressionPlugin.parsers,
};

export const printers: Record<string, Printer> = {
	astro: printer,
	...expressionPlugin.printers,
};

const defaultOptions = {
	tabWidth: 2,
};

export { options, defaultOptions };
