import { prisma } from '@/lib/db';

export async function getStoreSettings() {
  let settings = await prisma.storeSettings.findUnique({ where: { id: 'default' } });
  if (!settings) {
    settings = await prisma.storeSettings.create({
      data: { id: 'default' },
    });
  }
  return settings;
}

export async function getAbandonedCartCutoff() {
  const settings = await getStoreSettings();
  const hours = settings.abandonedCartHours ?? 24;
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}
