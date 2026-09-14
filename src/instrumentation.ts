export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { getAdminEmails, getKitchenManagerEmails } = await import('@/lib/firebaseAdmin');

    const missingEnvVars: string[] = [];
    if (!process.env.ADMIN_EMAILS || !process.env.ADMIN_EMAILS.trim()) {
      missingEnvVars.push('ADMIN_EMAILS');
    }
    if (!process.env.KITCHEN_MANAGER_EMAILS || !process.env.KITCHEN_MANAGER_EMAILS.trim()) {
      missingEnvVars.push('KITCHEN_MANAGER_EMAILS');
    }
    if (!process.env.MASTER_ADMIN_EMAIL || !process.env.MASTER_ADMIN_EMAIL.trim()) {
      missingEnvVars.push('MASTER_ADMIN_EMAIL');
    }

    if (missingEnvVars.length > 0) {
      console.warn(
        `⚠️ [STARTUP-AUTH-ENV-WARNING] Missing or empty role assignment environment variable(s): ${missingEnvVars.join(
          ', '
        )}. Users logging in with these emails may default to "employee". Please verify your Vercel/production environment variables.`
      );
    } else {
      console.log(
        `✅ [STARTUP-AUTH-ENV-OK] Role environment variables active: ${getAdminEmails().length} admin(s), ${getKitchenManagerEmails().length} kitchen manager(s).`
      );
    }
  }
}
