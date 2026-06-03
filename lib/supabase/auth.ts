import { getProfileFromRequest } from '../auth/session'

export async function getUserFromRequest(request: Request): Promise<any | null> {
  return getProfileFromRequest(request)
}
