import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { requireCoach } from '@/lib/coach-auth';

const PLAN_PRICES_VND = {
  standard: 199_000,
  pro: 299_000,
} as const;

type PaidPlan = keyof typeof PLAN_PRICES_VND;

function isPaidPlan(plan: string): plan is PaidPlan {
  return plan === 'standard' || plan === 'pro';
}

function computeIsExpired(plan: string, subscriptionExpires: Date | null): boolean {
  if (!isPaidPlan(plan)) return false;
  if (!subscriptionExpires) return true;
  return subscriptionExpires.getTime() < Date.now();
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: coachId } = await params;
  const auth = requireCoach(req);
  if (auth instanceof NextResponse) return auth;
  if (auth.sub !== coachId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const coach = await prisma.coach.findUnique({
    where: { id: coachId },
    select: {
      subscriptionPlan: true,
      subscriptionExpires: true,
      trialBookingsUsed: true,
    },
  });

  if (!coach) {
    return NextResponse.json({ error: 'Coach not found' }, { status: 404 });
  }

  return NextResponse.json({
    plan: coach.subscriptionPlan,
    expires: coach.subscriptionExpires,
    trialBookingsUsed: coach.trialBookingsUsed,
    isExpired: computeIsExpired(coach.subscriptionPlan, coach.subscriptionExpires),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: coachId } = await params;
  const auth = requireCoach(req);
  if (auth instanceof NextResponse) return auth;
  if (auth.sub !== coachId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { plan?: string };
  try {
    body = (await req.json()) as { plan?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const plan = body.plan;
  if (plan !== 'standard' && plan !== 'pro') {
    return NextResponse.json({ error: 'plan must be standard or pro' }, { status: 400 });
  }

  const price = PLAN_PRICES_VND[plan];

  return NextResponse.json({
    plan,
    price,
    status: 'awaiting_payment' as const,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: coachId } = await params;
  const auth = requireCoach(req);
  if (auth instanceof NextResponse) return auth;
  if (auth.sub !== coachId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { paymentProofUrl?: string; plan?: PaidPlan };
  try {
    body = (await req.json()) as { paymentProofUrl?: string; plan?: PaidPlan };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const paymentProofUrl =
    typeof body.paymentProofUrl === 'string' ? body.paymentProofUrl.trim() : '';
  if (!paymentProofUrl) {
    return NextResponse.json({ error: 'paymentProofUrl is required' }, { status: 400 });
  }

  const coach = await prisma.coach.findUnique({
    where: { id: coachId },
    select: { subscriptionPlan: true },
  });

  if (!coach) {
    return NextResponse.json({ error: 'Coach not found' }, { status: 404 });
  }

  let nextPlan = coach.subscriptionPlan;
  if (coach.subscriptionPlan === 'trial') {
    if (body.plan !== 'standard' && body.plan !== 'pro') {
      return NextResponse.json(
        { error: 'plan must be standard or pro when upgrading from trial' },
        { status: 400 },
      );
    }
    nextPlan = body.plan;
  }

  const subscriptionExpires = new Date();
  subscriptionExpires.setDate(subscriptionExpires.getDate() + 30);

  await prisma.coach.update({
    where: { id: coachId },
    data: {
      subscriptionPlan: nextPlan,
      subscriptionExpires,
    },
  });

  return NextResponse.json({
    plan: nextPlan,
    subscriptionExpires,
    paymentProofUrl,
  });
}
