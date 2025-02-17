import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-typescript';
import { defineConfig } from 'rollup';

export default defineConfig({
	input: 'src/index.ts',
	plugins: [commonjs(), typescript()],
	external: ['prettier'],
	output: {
		dir: 'dist',
		format: 'cjs',
		sourcemap: true,
	},
});
