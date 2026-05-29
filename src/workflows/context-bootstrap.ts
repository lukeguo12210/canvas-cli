export type BootstrapSummary = {
  skipped: true;
  reason: string;
};

export async function runPostLoginBootstrap(): Promise<BootstrapSummary> {
  return {
    skipped: true,
    reason: "Context bootstrap is planned for Phase 4."
  };
}
