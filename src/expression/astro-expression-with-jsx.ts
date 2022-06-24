import type { AstPath, Doc, Options, Parser, ParserOptions, Printer } from 'prettier';
import type { ExpressionNode, Node } from '../nodes';
import { serialize } from '../utils';
import { babelParser, getPrinter, parseExpression } from './utils';
import traverse from '@babel/traverse';
import { AstroASTProcessor } from '../parser';

class AstroJsxASTData extends AstroASTProcessor {
	public readonly nodes: Node[] = [];

	public addNode(node: Node) {
		this.nodes.push(this.processNode(node));
	}
}

let estreePrinter: Printer | undefined;

function setup(options: ParserOptions) {
	estreePrinter = getPrinter(options, 'estree');
}

const pluginParsers: Record<string, Parser> = {
	__astro_expression_with_jsx: {
		parse: parseExpressionWithJsx,
		astFormat: '__astro_expression_with_jsx',
		locStart: (...args) => babelParser.locStart(...args),
		locEnd: (...args) => babelParser.locEnd(...args),
	},
	__astro_jsx_from_options: {
		// This parser only uses the nodes passed in `__astroJsxASTData`.
		parse(text, _parsers, options) {
			// @ts-ignore
			const astroJsxASTData: AstroJsxASTData = options.__astroJsxASTData;
			options.originalText = text;
			return { type: 'root', children: astroJsxASTData.nodes };
		},
		// Use the astro component printer.
		astFormat: 'astro',
		locStart: (node) => node.position.start.offset,
		locEnd: (node) => node.position.end.offset,
	},
};
export { pluginParsers as parsers };

const astroExpressionPrinter: Printer = {
	print: (...args) => estreePrinter!.print(...args),
	embed,
};

const printer: Printer = new Proxy<Printer>(astroExpressionPrinter, {
	get(_target, name) {
		return (astroExpressionPrinter as any)[name] ?? (estreePrinter as any)[name];
	},
});

export const printers: Record<string, Printer> = {
	__astro_expression_with_jsx: printer,
};

function parseExpressionWithJsx(
	text: string,
	parsers: Parameters<Parser['parse']>[1],
	opts: ParserOptions
) {
	setup(opts);
	try {
		// If it can be parsed as JSX, use JSX AST and printer.
		return parseExpression(text, parsers, opts);
	} catch (e) {
		if (!(e instanceof SyntaxError)) {
			throw e;
		}
	}
	// If it cannot be parsed as JSX, print a combination of JSX and Astro AST.
	// @ts-ignore
	const node: ExpressionNode = opts.__astroExpressionNode;
	return parseExpressionWithAstroJSX(text, node, parsers, opts);
}

function embed(
	path: AstPath,
	_print: (path: AstPath) => Doc,
	textToDoc: (text: string, options: Options) => Doc,
	options: ParserOptions
): Doc | null {
	const node = path.getValue();
	const astroJsxASTData: AstroJsxASTData | undefined = (node as any).__astroJsxASTData;
	if (!astroJsxASTData) {
		return null;
	}

	// If it node have an Astro AST nodes, use an Astro printer.
	return textToDoc(astroJsxASTData.text, {
		...options,
		// `"__astro_jsx_from_options"` parser only uses the nodes passed in `__astroJsxASTData`.
		parser: '__astro_jsx_from_options',
		// @ts-ignore
		__astroJsxASTData: astroJsxASTData,
	});
}

function parseExpressionWithAstroJSX(
	originalText: string,
	node: ExpressionNode,
	parsers: Parameters<Parser['parse']>[1],
	opts: ParserOptions
) {
	const astroJsxDataList: AstroJsxASTData[] = [];
	let textAsScript = '';
	let astroJsxData: AstroJsxASTData | null = null;
	for (const child of node.children) {
		if (child.type === 'text') {
			if (astroJsxData) {
				// Astro-JSX will be replaced with fragments.
				textAsScript += '<>' + ' '.repeat(astroJsxData.text.length - 5) + '</>';
				astroJsxData = null;
			}
			textAsScript += serialize(child);
		} else {
			if (!astroJsxData) {
				astroJsxData = new AstroJsxASTData();
				astroJsxDataList.push(astroJsxData);
			}
			astroJsxData.addNode(child);
		}
	}
	if (astroJsxData) {
		textAsScript += '<>' + ' '.repeat(astroJsxData.text.length - 5) + '</>';
	}
	const ast = parseExpression(textAsScript, parsers, opts);

	opts.originalText = opts.originalText.replace(textAsScript, originalText);

	traverse(ast, {
		noScope: true,
		JSXFragment(nodePath) {
			(nodePath.node as any).__astroJsxASTData = astroJsxDataList.shift();
		},
	});
	return ast;
}
