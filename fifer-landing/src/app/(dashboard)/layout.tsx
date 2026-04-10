import { AmbientFeedback } from "@/components/core/AmbientFeedback";
import { DemoModeFloatingToggle } from "@/components/core/DemoModeFloatingToggle";
import { DashboardShellBody } from "@/components/core/DashboardShellBody";
import { FiferAlertHost } from "@/components/core/FiferAlertHost";
import { LivingCommandBar } from "@/components/core/LivingCommandBar";
import { OfflineSyncBridge } from "@/components/core/OfflineSyncBridge";
import { SidebarAuto } from "@/components/core/SidebarAuto";
import { NeuralEventsBridge } from "@/components/core/NeuralEventsBridge";
import { UserDNAHydrator } from "@/hooks/useUserDNA";

export default function DashboardGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <AmbientFeedback />
      <OfflineSyncBridge />
      <UserDNAHydrator />
      <NeuralEventsBridge />
      <div className="flex min-h-screen items-stretch bg-[#0A0F1E]">
        <SidebarAuto />
        <main className="flex-1 min-w-0 p-4 lg:p-6">
          <section
            className="grid grid-cols-12 gap-4 rounded-[0.75rem] border border-[#EAB308]/20 bg-[#0A0F1E] p-4"
            data-shell-canvas="living-os"
          >
            <DashboardShellBody>{children}</DashboardShellBody>
          </section>
        </main>
      </div>
      <FiferAlertHost syncIntegrationXRay autosanacionPath="/finance" />
      <LivingCommandBar />
      <DemoModeFloatingToggle />
    </>
  );
}