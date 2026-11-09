import { createPreviewServer } from '../serve.mjs';
import { ownedPath } from './fixture.mjs';

const root = ownedPath(process.argv[2]);
const server = await createPreviewServer(root);
server.on('error', () => { process.stderr.write('Preview child could not start; existing processes preserved.\n'); process.exitCode = 1; });
server.listen(4217, '127.0.0.1', () => process.stdout.write('Restock preview listening at 127.0.0.1:4217 (no browser opened)\n'));
