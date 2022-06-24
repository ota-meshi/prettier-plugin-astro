import { createSyncFn } from 'synckit';
import { createRequire } from 'module';
import type {
	AttributeNode,
	CommentNode,
	DoctypeNode,
	ExpressionNode,
	FrontmatterNode,
	Node,
	RootNode,
	TagLikeNode,
	TextNode,
} from './nodes';
import type { Parser, ParserOptions } from 'prettier';
import { isTagLikeNode } from './utils';

const require = createRequire(import.meta.url);

// the worker path must be absolute
const parseSync = createSyncFn(require.resolve('../workers/parse-worker.js'));

export function parseForPrettier(
	text: string,
	_parsers: Parameters<Parser['parse']>[1],
	opts: ParserOptions
) {
	const root: RootNode = parseSync(text);

	const processor = new AstroASTProcessor();
	const newRoot = processor.processNode(root);
	opts.originalText = processor.text;
	return newRoot;
}

export class AstroASTProcessor {
	public text = '';

	processNode(node: RootNode): RootNode;
	processNode<N extends Node>(node: N): N;
	processNode(node: Node): Node {
		if (node.type === 'root') {
			return this.processRoot(node);
		}
		if (node.type === 'frontmatter') {
			return this.processFrontmatter(node);
		}
		if (node.type === 'comment') {
			return this.processComment(node);
		}
		if (node.type === 'expression') {
			return this.processExpression(node);
		}
		if (node.type === 'text' || node.type === 'doctype') {
			return this.processLiteral(node);
		}
		if (isTagLikeNode(node)) {
			return this.processTag(node);
		}
		throw new SyntaxError(`Unknown node type "${(node as any).type}"!`);
	}
	processAttribute(node: AttributeNode): AttributeNode {
		const start = this.text.length;
		switch (node.kind) {
			case 'empty': {
				this.text += `${node.name}`;
				break;
			}
			case 'expression': {
				this.text += `${node.name}={${node.value}}`;
				break;
			}
			case 'quoted': {
				this.text += `${node.name}="${node.value}"`;
				break;
			}
			case 'template-literal': {
				this.text += `${node.name}=\`${node.value}\``;
				break;
			}
			case 'shorthand': {
				this.text += `{${node.name}}`;
				break;
			}
			case 'spread': {
				this.text += `{...${node.name}}`;
				break;
			}
		}
		return {
			type: node.type,
			kind: node.kind,
			name: node.name,
			value: node.value,
			position: {
				start: { offset: start } as never,
				end: { offset: this.text.length } as never,
			},
		};
	}

	processRoot(node: RootNode): RootNode {
		const start = this.text.length;
		const children = node.children.map((child) => this.processNode(child));
		return {
			type: node.type,
			children,
			position: {
				start: { offset: start } as never,
				end: { offset: this.text.length } as never,
			},
		};
	}
	processFrontmatter(node: FrontmatterNode): FrontmatterNode {
		const start = this.text.length;
		this.text += `---${node.value}---\n\n`;
		return {
			type: node.type,
			value: node.value,
			position: {
				start: { offset: start } as never,
				end: { offset: this.text.length } as never,
			},
		};
	}
	processComment(node: CommentNode): CommentNode {
		const start = this.text.length;
		this.text += `<!--${node.value}-->`;
		return {
			type: node.type,
			value: node.value,
			position: {
				start: { offset: start } as never,
				end: { offset: this.text.length } as never,
			},
		};
	}
	processExpression(node: ExpressionNode): ExpressionNode {
		const start = this.text.length;
		this.text += `{`;
		const children = node.children.map((child) => this.processNode(child));
		this.text += `}`;
		return {
			type: 'expression',
			children,
			position: {
				start: { offset: start } as never,
				end: { offset: this.text.length } as never,
			},
		};
	}
	processLiteral(node: TextNode | DoctypeNode): TextNode | DoctypeNode {
		const start = this.text.length;
		this.text += node.value;
		return {
			type: node.type,
			value: node.value,
			position: {
				start: { offset: start } as never,
				end: { offset: this.text.length } as never,
			},
		};
	}
	processTag(node: TagLikeNode): TagLikeNode {
		const start = this.text.length;
		this.text += `<${node.name}`;
		const attributes = node.attributes.map((attr) => this.processAttribute(attr));
		this.text += '>';
		const children = node.children.map((child) => this.processNode(child));
		this.text += `</${node.name}>`;

		return {
			type: node.type,
			name: node.name,
			attributes,
			children,
			position: {
				start: { offset: start } as never,
				end: { offset: this.text.length } as never,
			},
		};
	}
}
