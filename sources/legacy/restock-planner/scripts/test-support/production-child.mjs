import { createProductionServer } from '../serve-production.mjs';
import { ownedPath } from './fixture.mjs';
const server=await createProductionServer(ownedPath(process.argv[2]));
server.on('error',()=>{process.stderr.write('Production test child could not start; existing processes preserved.\n');process.exitCode=1;});
server.listen(5217,'127.0.0.1',()=>process.stdout.write('Restock production preview listening at 127.0.0.1:5217\n'));
