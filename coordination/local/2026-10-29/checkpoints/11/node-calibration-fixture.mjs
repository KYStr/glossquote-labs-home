// PRIMARY-ONLY FUTURE FIXTURE; owner task checks syntax, never starts this program.
// Primary must create suspended, bind to its approved private desktop/job, then resume.
// A negative must also be task-owned on that private desktop, under a SEPARATE owned job.
import readline from 'node:readline';
const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
let explicitExit = false;
const timer = setTimeout(() => process.exit(3), 120000); // timeout cannot masquerade as an acknowledged EXIT
process.stdout.write(JSON.stringify({ kind: 'TASK_OWNED_NODE_CALIBRATION', pid: process.pid, fixtureOnly: true }) + '\n');
input.on('line', (line) => {
  if (line === 'PING') process.stdout.write('READY\n');
  else if (line === 'EXIT') { explicitExit = true; clearTimeout(timer); input.pause(); process.stdout.write('EXIT_ACK\n', () => process.exit(0)); }
  else { clearTimeout(timer); input.close(); process.exit(2); }
});
input.on('close', () => { clearTimeout(timer); if (!explicitExit) process.exit(4); });
