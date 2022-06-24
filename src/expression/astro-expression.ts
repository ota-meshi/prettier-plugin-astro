import type { Parser, Printer } from 'prettier';
import { babelParser, parseExpression } from './utils';

const pluginParsers: Record<string, Parser> = {
	__astro_expression: {
		parse: parseExpression,
		astFormat: 'estree',
		locStart: (...args) => babelParser.locStart(...args),
		locEnd: (...args) => babelParser.locEnd(...args),
	},
};
export { pluginParsers as parsers };

export const printers: Record<string, Printer> = {};
