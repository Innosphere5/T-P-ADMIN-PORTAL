'use client';

import React from 'react';
import { MODULES } from '../constants/tokens';

export default function Sidebar({
  activeModule,
  setActiveModule,
  mobileOpen,
  setMobileOpen,
}) {
  const navItems = [
    {
      id: 'approvals',
      label: 'Onboarding Approvals',
      icon: 'how_to_reg',
      iconBg: 'bg-amber-500/15',
      iconColor: 'text-amber-700',
    },
    {
      id: 'students',
      label: 'Student Management',
      icon: 'school',
      iconBg: 'bg-tint-maroon/80',
      iconColor: 'text-primary',
    },
    {
      id: 'companies',
      label: 'Company Management',
      icon: 'business',
      iconBg: 'bg-tint-blue/80',
      iconColor: 'text-info-blue',
    },
    {
      id: 'drives',
      label: 'Drive Management',
      icon: 'event_available',
      iconBg: 'bg-tint-maroon/80',
      iconColor: 'text-primary',
    },
    {
      id: 'trainings',
      label: 'Training Management',
      icon: 'model_training',
      iconBg: 'bg-secondary-fixed/30',
      iconColor: 'text-secondary',
    },
    {
      id: 'internships',
      label: 'Internship Monitoring',
      icon: 'assignment_ind',
      iconBg: 'bg-tint-green/80',
      iconColor: 'text-success-green',
    },
    {
      id: 'statistics',
      label: 'Placement Statistics',
      icon: 'bar_chart',
      iconBg: 'bg-tint-maroon/60',
      iconColor: 'text-primary-container',
    },
    {
      id: 'reports',
      label: 'Report Generation',
      icon: 'summarize',
      iconBg: 'bg-tint-blue/70',
      iconColor: 'text-info-blue',
    },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 transition-opacity duration-300 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Exact Stitch Institutional Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full z-50 flex flex-col justify-between transition-transform duration-300
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          w-72 md:translate-x-0 md:w-20 lg:w-72 shadow-[0_1px_8px_rgba(0,0,0,0.04)]`}
        style={{
          background: 'linear-gradient(rgba(243, 244, 247, 0.78) 0%, rgba(235, 237, 242, 0.72) 100%)',
          backdropFilter: 'blur(20px)',
          boxShadow: 'rgba(255, 255, 255, 0.8) -1px 0px 0px 0px inset, rgba(255, 255, 255, 0.9) 1px 1px 1px 0px inset, rgba(15, 23, 42, 0.05) 4px 0px 24px -2px',
          borderRight: '1px solid rgba(203, 213, 225, 0.5)',
        }}
      >
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Brand Card at top */}
          <div
            className="m-3 sm:m-4 p-3.5 relative overflow-hidden rounded-2xl flex items-center gap-3 backdrop-blur-xl border border-white/80 shadow-md group transition-all duration-300 hover:shadow-xl hover:scale-[1.01]"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(254, 242, 244, 0.85) 45%, rgba(255, 250, 240, 0.8) 75%, rgba(255, 255, 255, 0.92) 100%)',
              boxShadow: 'rgba(107, 0, 24, 0.1) 0px 12px 28px -5px, rgba(255, 255, 255, 0.95) 0px 1px 0px inset, rgba(231, 185, 74, 0.15) 0px 0px 16px inset',
            }}
          >
            {/* Ambient glows */}
            <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-rose-500/20 blur-xl pointer-events-none animate-aura-pulse" />
            <div
              className="absolute -left-6 -bottom-6 w-24 h-24 rounded-full bg-[#ffdf9b]/30 blur-lg pointer-events-none animate-aura-pulse"
              style={{ animationDelay: '2.4s' }}
            />
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
              <div className="w-28 h-[250%] bg-gradient-to-r from-transparent via-rose-400/35 via-white/40 to-transparent absolute -top-1/2 left-0 animate-sidebar-brand-sweep pointer-events-none" />
            </div>
            <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent opacity-95 pointer-events-none" />

            {/* Official Logo with Glossy Sweep Animation */}
            <div className="relative z-10 w-11 h-11 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 shadow-sm border border-white/90 ring-1 ring-black/5 overflow-hidden group/logo">
              <img
                alt="RIMT University Official Logo"
                className="h-full w-full object-contain relative z-10 transition-transform duration-300 group-hover/logo:scale-105"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuC19AQmgWL-gUir-ndxuF4jup3xrY5qBj64LUXlgD9RJE6IRXQl7Uw9pQ_cKLppluBw_ZpAaGrjzn9MM_33NeGwHee4byWlTWDl3k3ZH1ODJBySdYc1fAI_vX56Ks6Y_9rsUeDdfxgzgIKrwrKJRiXXd43-8bqVix0hb9h_KVy-x333S8_1qgi_MEC7mirEEZdIdmjQrVxbxQLOkTdB8x3YlxqRC5q1PzKVSKVWY-4rZfKHynQQWu8oLw4z4yUS8WIugw"
              />
              {/* High-gloss sweep beam directly over RIMT logo */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
                <div className="w-6 h-[250%] bg-gradient-to-r from-transparent via-white/90 to-transparent absolute -top-1/2 left-0 animate-logo-sweep pointer-events-none" />
              </div>
            </div>

            {/* Title / Badges (hidden on tablet rail) */}
            <div className="relative z-10 flex flex-col min-w-0 flex-1 md:hidden lg:flex">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-primary tracking-tight truncate">
                  RIMT Trust
                </span>
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-green opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-success-green"></span>
                </span>
              </div>
              <div className="mt-0.5 inline-flex items-center">
                <span className="px-1.5 py-0.5 rounded-full bg-tint-maroon/70 text-[9px] font-bold text-primary border border-rose-200/80 uppercase tracking-wider shadow-sm">
                  T&amp;P Admin Portal
                </span>
              </div>
            </div>
          </div>

          {/* Core Modules Label */}
          <div className="px-4 py-1 md:hidden lg:block">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary px-2">
              Core Modules
            </span>
          </div>

          {/* Navigation Links with Smooth Zoom Animation on Hover */}
          <nav className="flex flex-col px-2 sm:px-3 gap-2 mt-1">
            {navItems.map((item) => {
              const isActive = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveModule(item.id);
                    setMobileOpen(false);
                  }}
                  className={`group relative flex items-center gap-3 px-3.5 py-3 rounded-xl text-left overflow-hidden cursor-pointer
                    transform transition-all duration-250 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                    hover:scale-[1.06] hover:translate-x-1.5 hover:z-20 active:scale-[0.97]
                    ${
                      isActive
                        ? 'text-white shadow-md border-t border-white/30 hover:shadow-2xl hover:shadow-primary/40'
                        : 'bg-gradient-to-br from-white/95 via-surface-container-low/70 to-surface-container-high/60 backdrop-blur-md shadow-sm hover:shadow-xl hover:shadow-slate-300/80 border-t border-white/80 ring-1 ring-black/5 text-text-primary hover:text-primary hover:border-white'
                    }`}
                  style={
                    isActive
                      ? {
                          background: 'linear-gradient(135deg, rgb(139, 29, 44) 0%, rgb(110, 21, 33) 100%)',
                          boxShadow: 'rgba(107, 0, 24, 0.35) 0px 6px 18px, rgba(255, 255, 255, 0.4) 0px 1px 1px inset',
                        }
                      : {}
                  }
                  title={item.label}
                >
                  {/* Subtle sheen highlight on hover */}
                  <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 overflow-hidden">
                    <div className="w-20 h-[250%] bg-gradient-to-r from-transparent via-white/35 to-transparent absolute -top-1/2 left-0 animate-sheen-sweep pointer-events-none" />
                  </div>

                  {/* Icon with Zoom effect */}
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border-t shadow-sm transform transition-transform duration-200 ease-out group-hover:scale-110 ${
                      isActive
                        ? 'bg-white/20 backdrop-blur-md border-white/40 text-white'
                        : `${item.iconBg} border-white/80 ${item.iconColor}`
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg transition-transform duration-200 group-hover:scale-105">
                      {item.icon}
                    </span>
                  </div>

                  {/* Label with smooth transition */}
                  <span
                    className={`text-sm font-semibold truncate flex-1 md:hidden lg:inline transform transition-all duration-200 ${
                      isActive
                        ? 'text-white'
                        : 'text-text-primary group-hover:text-primary group-hover:translate-x-0.5'
                    }`}
                  >
                    {item.label}
                  </span>

                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white shadow-sm md:hidden lg:inline shrink-0 transform transition-transform duration-200 group-hover:scale-125" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer: System Active Card */}
        <div
          className="p-3 m-3 bg-surface-container-low rounded-xl flex items-center justify-between shadow-xs"
          style={{
            background: 'rgba(255, 255, 255, 0.55)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.8)',
            boxShadow: 'rgba(255, 255, 255, 0.9) 0px 1px 1px 0px inset, rgba(15, 23, 42, 0.04) 0px 2px 8px -2px',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">
              verified_user
            </span>
            <div className="flex flex-col md:hidden lg:flex">
              <span className="text-xs font-bold text-text-primary leading-tight">
                System Active
              </span>
              <span className="text-[10px] text-text-secondary leading-tight">
                Academic Yr 2024-25
              </span>
            </div>
          </div>
          <span className="w-2 h-2 rounded-full bg-success-green ring-4 ring-tint-green shrink-0" />
        </div>
      </aside>
    </>
  );
}
