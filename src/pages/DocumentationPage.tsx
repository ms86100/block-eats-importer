import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { BookOpen, KeyRound, Home, ShoppingBag } from 'lucide-react';
import { AuthOnboardingDocs } from '@/components/docs/AuthOnboardingDocs';
import { HomeDiscoveryDocs } from '@/components/docs/HomeDiscoveryDocs';
import { ServiceBookingDocs } from '@/components/docs/ServiceBookingDocs';

const MODULES = [
  { id: 'auth', label: 'Auth & Onboarding', icon: KeyRound },
  { id: 'home', label: 'Home & Discovery', icon: Home },
  { id: 'service-booking', label: 'Service Booking', icon: ShoppingBag },
] as const;

export default function DocumentationPage() {
  return (
    <AppLayout headerTitle="Documentation">
      <ScrollArea className="h-[calc(100dvh-3.5rem)]">
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-6">
          {/* Hero */}
          <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <BookOpen className="text-primary-foreground" size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Platform Documentation</h1>
                <p className="text-xs text-muted-foreground">Complete system reference · Navigate by module</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This documentation explains every feature of the platform in a clear, storytelling style — designed for business analysts,
              developers, and non-technical users alike. Select a module below to explore.
            </p>
          </div>

          {/* Tabbed Modules */}
          <Tabs defaultValue="auth" className="w-full">
            <TabsList className="w-full h-auto flex-wrap gap-1 bg-muted/50 p-1 mb-6">
              {MODULES.map((m) => {
                const Icon = m.icon;
                return (
                  <TabsTrigger key={m.id} value={m.id} className="flex items-center gap-1.5 text-xs px-3 py-2 flex-1 min-w-[120px]">
                    <Icon size={14} />
                    <span className="hidden sm:inline">{m.label}</span>
                    <span className="sm:hidden">{m.label.split(' ')[0]}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <TabsContent value="auth">
              <AuthOnboardingDocs />
            </TabsContent>
            <TabsContent value="home">
              <HomeDiscoveryDocs />
            </TabsContent>
            <TabsContent value="service-booking">
              <ServiceBookingDocs />
            </TabsContent>
          </Tabs>

          {/* Footer */}
          <div className="pt-8 pb-12 border-t border-border mt-8 text-center">
            <p className="text-[11px] text-muted-foreground">
              Platform Documentation · Last updated March 2026
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">
              More modules will be added as new features are documented.
            </p>
          </div>
        </div>
      </ScrollArea>
    </AppLayout>
  );
}
