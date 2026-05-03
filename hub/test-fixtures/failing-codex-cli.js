#!/usr/bin/env node

import { writeFileSync } from 'node:fs'

writeFileSync(2, 'Codex config is invalid: missing auth token\n')
process.exit(78)
