import type { ParserOptions, Plugin, Parser } from 'prettier';

export function getPrinter(options: ParserOptions, astFormat: string) {
	const printerPlugin = options.plugins.find(
		(plugin): plugin is Plugin =>
			typeof plugin !== 'string' && Boolean(plugin.printers && plugin.printers[astFormat])
	);
	if (!printerPlugin) {
		throw new Error(`Couldn't find plugin for AST format "${astFormat}"`);
	}
	return printerPlugin.printers![astFormat]!;
}
export function getParser(options: ParserOptions, parser: string) {
	const parserPlugin = options.plugins.find(
		(plugin): plugin is Plugin =>
			typeof plugin !== 'string' && Boolean(plugin.parsers && plugin.parsers[parser])
	);
	if (!parserPlugin) {
		throw new Error(`Couldn't find plugin for parser "${parser}"`);
	}
	return parserPlugin.parsers![parser]!;
}

export let babelParser: Parser;

export function parseExpression(
	text: string,
	parsers: Parameters<Parser['parse']>[1],
	opts: ParserOptions
) {
	babelParser = getParser(opts, 'babel');
	const ast = babelParser.parse(`<>{${text}\n}</>`, parsers, opts);
	const jsxFragment = ast.program.body[0].expression;
	return { ...ast, program: jsxFragment.children[0].expression };
}
