import SideNav from '@/app/ui/dashboard/sidenav';

export const experimental_ppr = true;

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex h-screen flex-col md:flex-row md:overflow-hidden">
      <nav className="w-full flex-none md:w-64">
        <SideNav />
      </nav>
      <main className="flex-grow p-6 md:overflow-y-auto md:p-12">{children}</main>
    </main>
  );
}