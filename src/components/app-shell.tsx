"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Building2,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Command,
  CreditCard,
  FileCheck2,
  LayoutDashboard,
  Menu,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Store,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/overview", label: "Control room", icon: LayoutDashboard },
  { href: "/missions", label: "Missions", icon: FileCheck2 },
  { href: "/policies", label: "Policy Studio", icon: ShieldCheck },
  { href: "/transactions", label: "Transactions", icon: CreditCard },
  { href: "/vendors", label: "Vendors", icon: Store },
];

function pageLabel(pathname: string) {
  if (pathname.includes("/execute")) return "Mission control";
  if (pathname.includes("/review")) return "Purchase review";
  if (pathname.includes("/source")) return "Controlled sourcing";
  if (pathname === "/missions/new") return "New mission";
  return nav.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.label ?? (pathname === "/settings" ? "Workspace settings" : "SpendScript");
}

function Sidebar({ connectedServices, setupHref, missionCount, organizationName, onNavigate }: { connectedServices: number; setupHref: string; missionCount: number; organizationName: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[#07111f] text-white">
      <div className="pointer-events-none absolute -left-20 top-14 size-60 rounded-full bg-[#3157f6]/15 blur-3xl" />
      <div className="relative flex h-[76px] items-center border-b border-white/[.07] px-6"><BrandMark inverted /></div>
      <div className="relative px-4 pb-4 pt-5">
        <Link href="/settings" onClick={onNavigate} className="focus-ring flex w-full items-center gap-3 rounded-xl border border-white/[.08] bg-white/[.045] p-3 text-left transition-colors hover:bg-white/[.075]">
          <span className="grid size-9 place-items-center rounded-lg bg-[#dce4ff] text-[#203ea4]"><Building2 className="size-[17px]" /></span>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{organizationName}</span><span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[.12em] text-[#657a95]">Procurement control</span></span>
          <ChevronDown className="size-3.5 text-[#60748e]" />
        </Link>
      </div>
      <div className="relative px-4 pb-5">
        <Button asChild className="h-11 w-full justify-center bg-[#3157f6] shadow-[0_8px_22px_rgba(49,87,246,.28)] hover:bg-[#4166ff]">
          <Link href="/missions/new" onClick={onNavigate}><Plus />New purchasing mission</Link>
        </Button>
      </div>
      <div className="relative px-4"><p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[.15em] text-[#4f647e]">Workspace</p></div>
      <nav className="relative flex-1 space-y-1 px-3" aria-label="Primary navigation">
        {nav.map((item) => {
          const active = pathname === item.href || (item.href !== "/overview" && pathname.startsWith(`${item.href}/`));
          return (
            <Link key={item.href} href={item.href} onClick={onNavigate} className={cn("focus-ring group relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all", active ? "bg-white/[.09] text-white" : "text-[#8da0b8] hover:bg-white/[.045] hover:text-white")}>
              {active ? <span className="absolute -left-0.5 h-5 w-[3px] rounded-full bg-[#7794ff]" /> : null}
              <item.icon className={cn("size-[17px] transition-colors", active ? "text-[#9bb0ff]" : "text-[#60748e] group-hover:text-[#8da0b8]")} />
              {item.label}
              {item.href === "/missions" ? <span className="ml-auto rounded-md bg-white/[.06] px-1.5 py-0.5 font-mono text-[10px] text-[#71869f]">{String(missionCount).padStart(2, "0")}</span> : null}
            </Link>
          );
        })}
      </nav>

      {connectedServices < 3 ? <div className="relative mx-4 mb-4 rounded-2xl border border-[#7898ff]/20 bg-[#3157f6]/10 p-4">
        <div className="flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#8ca8ff]">Stack readiness</span><span className="font-mono text-[11px] text-[#8ca8ff]">{connectedServices}/3</span></div>
        <div className="mt-3 flex gap-1.5">{[0,1,2].map((index) => <span key={index} className={cn("h-1.5 flex-1 rounded-full", index < connectedServices ? "bg-[#77e6a8]" : "bg-white/[.1]")} />)}</div>
        <p className="mt-3 text-xs leading-5 text-[#8296af]">Connect Supabase, OpenAI, and Prava for this shared business workspace.</p>
        <Link href={setupHref} onClick={onNavigate} className="focus-ring mt-3 inline-flex items-center gap-1.5 rounded-md text-xs font-semibold text-[#b7c5ff] hover:text-white">Manage shared stack<Sparkles className="size-3" /></Link>
      </div> : <div className="relative mx-4 mb-4 flex items-center gap-2 rounded-xl border border-[#56d595]/15 bg-[#56d595]/[.07] px-3 py-2.5 text-xs font-medium text-[#8deab6]"><CheckCircle2 className="size-4" />All systems connected</div>}
      <div className="relative space-y-1 border-t border-white/[.07] p-3">
        <Link className="focus-ring flex h-9 items-center gap-3 rounded-lg px-3 text-xs text-[#71869f] hover:bg-white/[.04] hover:text-white" href="/settings" onClick={onNavigate}><Settings className="size-4" />Settings</Link>
        <a className="focus-ring flex h-9 items-center gap-3 rounded-lg px-3 text-xs text-[#71869f] hover:bg-white/[.04] hover:text-white" href="https://docs.prava.space" target="_blank" rel="noreferrer"><CircleHelp className="size-4" />Integration guide</a>
      </div>
    </div>
  );
}

export function AppShell({ children, connectedServices, setupHref, missionCount, organizationName }: { children: React.ReactNode; connectedServices: number; setupHref: string; missionCount: number; organizationName: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setCommandOpen(true); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-[#f1f3ef]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[268px] lg:block"><Sidebar connectedServices={connectedServices} setupHref={setupHref} missionCount={missionCount} organizationName={organizationName} /></aside>
      {mobileOpen ? <div className="fixed inset-0 z-50 lg:hidden"><button className="absolute inset-0 bg-[#07111f]/55 backdrop-blur-sm" aria-label="Close navigation" onClick={() => setMobileOpen(false)} /><aside className="relative h-full w-[300px] shadow-2xl"><button className="focus-ring absolute right-3 top-5 z-10 rounded-lg p-2 text-[#91a4bd] hover:bg-white/[.06]" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X className="size-5" /></button><Sidebar connectedServices={connectedServices} setupHref={setupHref} missionCount={missionCount} organizationName={organizationName} onNavigate={() => setMobileOpen(false)} /></aside></div> : null}
      <div className="lg:pl-[268px]">
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-[#dfe3dc] bg-[#f8f9f6]/90 px-4 backdrop-blur-xl md:px-8">
          <div className="flex items-center gap-3"><button onClick={() => setMobileOpen(true)} className="focus-ring rounded-lg p-2 text-[#475467] hover:bg-[#e8ebe5] lg:hidden" aria-label="Open navigation"><Menu className="size-5" /></button><div><p className="hidden text-[10px] font-semibold uppercase tracking-[.14em] text-[#98a2b3] sm:block">{organizationName} / Operations</p><p className="text-sm font-semibold tracking-[-.01em] text-[#1b2638]">{pageLabel(pathname)}</p></div></div>
          <div className="flex items-center gap-2">
            <button onClick={() => setCommandOpen(true)} className="focus-ring hidden h-9 items-center gap-2 rounded-lg border border-[#d7dcd3] bg-white px-3 text-xs text-[#667085] shadow-[0_1px_2px_rgba(16,24,40,.03)] hover:border-[#bec5ba] md:flex"><Search className="size-3.5" />Search anything<span className="ml-5 flex items-center gap-0.5 rounded border border-[#e2e5df] bg-[#f5f6f3] px-1.5 py-0.5 font-mono text-[10px] text-[#98a2b3]"><Command className="size-2.5" />K</span></button>
            {connectedServices < 3 ? <Link href={setupHref} className="focus-ring hidden items-center gap-2 rounded-full border border-[#e7c989] bg-[#fff9eb] px-3 py-1.5 text-xs font-semibold text-[#8b5c06] hover:bg-[#fff3d5] sm:flex"><span className="size-1.5 rounded-full bg-[#d39b2a]" />Shared stack {connectedServices}/3</Link> : <span className="hidden items-center gap-2 rounded-full border border-[#bee5cf] bg-[#effaf3] px-3 py-1.5 text-xs font-semibold text-[#087443] sm:flex"><span className="size-1.5 rounded-full bg-[#17a363]" />Shared controls live</span>}
            <div className="relative"><button onClick={() => setNotificationsOpen((current) => !current)} className="focus-ring relative grid size-9 place-items-center rounded-lg text-[#475467] hover:bg-[#e8ebe5]" aria-label="Notifications"><Bell className="size-[18px]" /><span className="absolute right-1.5 top-1.5 size-2 rounded-full border-2 border-[#f8f9f6] bg-[#3157f6]" /></button>{notificationsOpen ? <div className="absolute right-0 top-12 w-[330px] overflow-hidden rounded-2xl border border-[#dfe3dc] bg-white shadow-[0_18px_50px_rgba(18,28,45,.16)]"><div className="flex items-center justify-between border-b border-[#e7eae5] px-4 py-3"><p className="text-sm font-semibold">Activity requiring attention</p><button onClick={() => setNotificationsOpen(false)} className="rounded p-1 text-[#98a2b3] hover:bg-[#f1f3ef]"><X className="size-3.5" /></button></div><div className="divide-y divide-[#edf0eb]">{[["Manager approval due","USB-C hub mission · $308","8m"],["Policy block recorded","Monitor arms · merchant mismatch","1h"],["Catalog refreshed","14 hardware offers updated","2h"]].map(([title,detail,time]) => <Link href="/missions" key={title} onClick={() => setNotificationsOpen(false)} className="flex gap-3 px-4 py-3 hover:bg-[#f8f9f6]"><span className="mt-1 size-2 shrink-0 rounded-full bg-[#3157f6]" /><span className="flex-1"><span className="block text-xs font-semibold text-[#344054]">{title}</span><span className="mt-1 block text-[11px] text-[#667085]">{detail}</span></span><span className="font-mono text-[10px] text-[#98a2b3]">{time}</span></Link>)}</div></div> : null}</div>
            <Link href="/settings" aria-label="Open profile settings" className="focus-ring ml-1 grid size-9 place-items-center rounded-full bg-[#14243b] text-xs font-semibold text-white ring-2 ring-white shadow-sm">MC</Link>
          </div>
        </header>
        <main className="mx-auto max-w-[1520px] px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>

      <Dialog open={commandOpen} onOpenChange={(open) => { setCommandOpen(open); if (!open) setCommandQuery(""); }}><DialogContent className="top-[28%] max-w-xl p-0"><DialogHeader className="mb-0 border-b border-[#e7eae5] p-4"><DialogTitle className="sr-only">Quick navigation</DialogTitle><DialogDescription className="sr-only">Search SpendScript routes</DialogDescription><div className="flex items-center gap-3"><Search className="size-5 text-[#667085]" /><input autoFocus value={commandQuery} onChange={(event) => setCommandQuery(event.target.value)} className="h-8 flex-1 bg-transparent text-sm outline-none placeholder:text-[#98a2b3]" placeholder="Jump to a mission, policy, transaction…" /></div></DialogHeader><div className="p-2"><p className="px-2 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[.12em] text-[#98a2b3]">Navigate</p>{nav.filter((item) => item.label.toLowerCase().includes(commandQuery.trim().toLowerCase())).map((item) => <Link key={item.href} href={item.href} onClick={() => setCommandOpen(false)} className="focus-ring flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#344054] hover:bg-[#f1f3ef]"><item.icon className="size-4 text-[#667085]" />{item.label}<span className="ml-auto text-[11px] text-[#98a2b3]">Open</span></Link>)}{nav.every((item) => !item.label.toLowerCase().includes(commandQuery.trim().toLowerCase())) ? <p className="px-3 py-8 text-center text-sm text-[#8b95a5]">No matching destination</p> : null}</div></DialogContent></Dialog>
    </div>
  );
}
