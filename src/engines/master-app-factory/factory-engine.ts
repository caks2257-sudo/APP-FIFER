import type { AppProvisioningPayload } from './schema';

export async function dispatchAppProvisioningJob(
  payload: AppProvisioningPayload,
  userId: string,
): Promise<{ status: 'queued'; jobId: string }> {
  console.log(
    `[Master App Factory] Job dispatched for ${payload.businessName} by user ${userId}.`,
  );

  void processProvisioning(payload, userId).catch((err: unknown) => {
    console.error(`[Master App Factory] Failed to provision ${payload.businessName}:`, err);
  });

  return { status: 'queued', jobId: `job_${Date.now()}` };
}

async function processProvisioning(
  payload: AppProvisioningPayload,
  userId: string,
): Promise<void> {
  console.log(
    `[Master App Factory] ⚙️ Starting background provisioning for ${payload.businessName} (user ${userId})...`,
  );

  if (payload.primaryUrl) {
    console.log(`[Master App Factory] 🕸️ Simulated scraping of ${payload.primaryUrl}`);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log(`[Master App Factory] 🏗️ Creating master record in 'Mis Apps'...`);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  for (const moduleId of payload.requestedModules) {
    console.log(
      `[Master App Factory] 🔌 Provisioning isolated sub-app space for module: ${moduleId}`,
    );
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  console.log(`[Master App Factory] ✅ Provisioning complete for ${payload.businessName}.`);
}

export type DeleteSubAppResult = { success: true; message: string };

/**
 * Eliminación simulada de una sub-app (Prisma + desconexión de módulos).
 * En producción encolaría trabajo async similar a `dispatchAppProvisioningJob`.
 */
export async function deleteSubApp(
  appId: string,
  userId: string,
): Promise<DeleteSubAppResult> {
  const id = appId.trim();
  console.log(`[Master App Factory] 🗑️ Delete requested for sub-app "${id}" by user ${userId}`);

  await new Promise((resolve) => setTimeout(resolve, 450));
  console.log(`[Master App Factory] Simulated Prisma cascade / soft-delete for "${id}"`);

  await new Promise((resolve) => setTimeout(resolve, 350));
  console.log(
    `[Master App Factory] Simulated disconnect: finance-core, social-media-core bindings for "${id}"`,
  );

  await new Promise((resolve) => setTimeout(resolve, 400));

  return {
    success: true,
    message: `Sub-app "${id}" eliminada del entorno (simulado).`,
  };
}
