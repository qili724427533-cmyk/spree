import { readFileSync } from 'node:fs'
import { CREDENTIALS_FILE } from './paths'

export interface E2ECredentials {
  api_url: string
  admin_email: string
  admin_password: string
  store_id: string
  store_name: string
}

let cached: E2ECredentials | null = null

export function getCredentials(): E2ECredentials {
  if (!cached) {
    cached = JSON.parse(readFileSync(CREDENTIALS_FILE, 'utf-8'))
  }
  return cached!
}
