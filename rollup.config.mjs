import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import serve from 'rollup-plugin-serve';

const dev = Boolean(process.env.DEV);

export default {
  input: 'src/prusalink-card.ts',
  output: {
    file: 'dist/prusalink-card.js',
    format: 'es',
    sourcemap: dev,
  },
  plugins: [
    resolve(),
    typescript({ sourceMap: dev, inlineSources: dev, exclude: ['src/**/*.test.ts'] }),
    !dev && terser({ format: { comments: false } }),
    dev &&
      serve({
        contentBase: '.',
        host: 'localhost',
        port: 5000,
        open: true,
        openPage: '/demo/index.html',
      }),
  ].filter(Boolean),
};
