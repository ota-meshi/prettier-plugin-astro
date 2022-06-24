import type { Parser, Printer } from 'prettier';
import * as astroExpressionWithJsx from './astro-expression-with-jsx';
import * as astroExpression from './astro-expression';

export const parsers: Record<string, Parser> = {
	...astroExpressionWithJsx.parsers,
	...astroExpression.parsers,
};

export const printers: Record<string, Printer> = {
	...astroExpressionWithJsx.printers,
	...astroExpression.printers,
};
