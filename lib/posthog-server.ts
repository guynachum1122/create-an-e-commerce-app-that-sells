import { PostHog } from 'posthog-node';
import { prisma } from '@/lib/db';

let client: PostHog | null = null;

function getClient(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;
  if (!client) {
    client = new PostHog(key, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
    });
  }
  return client;
}

async function userHasAnalyticsConsent(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { analyticsConsent: true },
  });
  return user?.analyticsConsent === true;
}

export async function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>
) {
  const ph = getClient();
  if (!ph) return;

  const consented = await userHasAnalyticsConsent(distinctId);
  if (!consented) return;

  const safeProps = { ...properties };
  delete safeProps.email;

  ph.capture({ distinctId, event, properties: safeProps });
  await ph.shutdown();
}
