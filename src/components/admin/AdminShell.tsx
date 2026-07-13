"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Trees,
  MapPin,
  Inbox,
  FileText,
  Image as ImageIcon,
  Settings,
  UserCircle,
  ExternalLink,
  Menu,
  X,
} from "lucide-react";
import LogoutButton from "@/components/admin/LogoutButton";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/projects", label: "Ventures", icon: Trees },
  { href: "/admin/plots", label: "Plots", icon: MapPin },
  { href: "/admin/enquiries", label: "Enquiries", icon: Inbox },
  { href: "/admin/cms", label: "Content", icon: FileText },
  { href: "/admin/media", label: "Media", icon: ImageIcon },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/profile", label: "Profile", icon: UserCircle },
];

interface AdminSummary {
  name: string;
  email: string;
  avatarUrl: string | null;
}

/**
 * The admin shell, in the approved design language.
 *
 * Same palette (cream / charcoal / loam), same serif display face, same square
 * geometry and hairline rules as the public site. The sidebar is `bg-loam` —
 * the exact surface the public navbar drops to on scroll — so the two halves of
 * the product read as one thing.
 *
 * It is also responsive, which the original 'w-64 fixed sidebar' was not: below
 * `lg` the nav becomes a slide-in drawer rather than crushing the content.
 */
export default function AdminShell({
  admin,
  newEnquiries,
  children,
}: {
  admin: AdminSummary;
  newEnquiries: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the drawer on navigation — otherwise it stays open over the new page.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const nav = (
    <nav className="space-y-1">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`group flex items-center gap-4 border-l-2 px-5 py-3.5 text-xs uppercase tracking-[0.22em] transition-all duration-500 ${
              active
                ? "border-cream bg-cream/10 text-cream"
                : "border-transparent text-cream/55 hover:border-cream/40 hover:bg-cream/5 hover:text-cream"
            }`}
          >
            <Icon size={16} strokeWidth={1.4} className="shrink-0" />
            <span className="flex-1">{label}</span>
            {href === "/admin/enquiries" && newEnquiries > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center border border-cream/40 px-1.5 text-[10px] tracking-normal text-cream">
                {newEnquiries > 99 ? "99+" : newEnquiries}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  const identity = (
    <div className="border-t border-cream/15 px-5 pb-6 pt-6">
      <div className="flex items-center gap-4">
        {admin.avatarUrl ? (
          <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full">
            <Image
              src={admin.avatarUrl}
              alt=""
              fill
              sizes="40px"
              className="object-cover"
            />
          </span>
        ) : (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-cream/30 font-serif text-sm text-cream">
            {admin.name.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate font-serif text-base text-cream">
            {admin.name}
          </p>
          <p className="truncate text-[10px] uppercase tracking-[0.22em] text-cream/50">
            {admin.email}
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-2">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 text-[10px] uppercase tracking-[0.28em] text-cream/55 transition-colors duration-500 hover:text-cream"
        >
          <ExternalLink size={13} strokeWidth={1.4} />
          View site
        </Link>
        <LogoutButton />
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-cream">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col justify-between bg-loam lg:flex">
        <div>
          <div className="px-5 py-8">
            <Link href="/admin/dashboard" className="font-serif text-h4 text-cream">
              Own A Plot
            </Link>
            <p className="mt-1 text-[10px] uppercase tracking-[0.28em] text-cream/45">
              Administration
            </p>
          </div>
          {nav}
        </div>
        {identity}
      </aside>

      {/* Mobile drawer */}
      <div
        aria-hidden={!open}
        className={`fixed inset-0 z-40 lg:hidden ${
          open ? "" : "pointer-events-none"
        }`}
      >
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-charcoal/50 backdrop-blur-sm transition-opacity duration-500 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          className={`absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col justify-between overflow-y-auto bg-loam transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div>
            <div className="flex items-center justify-between px-5 py-6">
              <span className="font-serif text-h4 text-cream">Own A Plot</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="flex h-11 w-11 items-center justify-center text-cream"
              >
                <X size={20} />
              </button>
            </div>
            {nav}
          </div>
          {identity}
        </aside>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-charcoal/10 bg-cream px-5 py-4 lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="flex h-11 w-11 items-center justify-center border border-charcoal/20"
          >
            <Menu size={18} />
          </button>
          <span className="font-serif text-h4">Own A Plot</span>
        </header>

        <main className="min-w-0 flex-1 px-5 py-10 md:px-10 md:py-14">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
