import { createAdminClient } from '../src'

export const TEST_BASE_URL = 'https://demo.spreecommerce.org'
export const TEST_API_KEY = 'sk_test'

export function createTestClient() {
  return createAdminClient({
    baseUrl: TEST_BASE_URL,
    secretKey: TEST_API_KEY,
  })
}
