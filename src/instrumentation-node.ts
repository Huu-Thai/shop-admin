import { env } from './server/env';

// Check the environment at start so a misconfigured server stops right away; otherwise Next keeps
// listening and answers every request with an error.
try {
  env();
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}
