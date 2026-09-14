import { NextRequest } from 'next/server';
import { POST as claimSeatPost } from '@/app/api/profile/claim-seat/route';

/**
 * POST /api/seats/claim
 * Backwards-compatibility wrapper around /api/profile/claim-seat
 */
export async function POST(req: NextRequest) {
  return claimSeatPost(req);
}
