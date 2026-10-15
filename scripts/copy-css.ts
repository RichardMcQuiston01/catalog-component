import { copyFile, mkdir } from 'node:fs/promises';

await mkdir('dist', { recursive: true });
await copyFile('src/catalog.css', 'dist/catalog.css');
console.log('Copied src/catalog.css to dist/catalog.css');
