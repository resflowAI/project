import { GlobalFilter } from '@/features/filter-slice/globalFilter';
import { AppShell } from '@/shared/layouts/appLayout';
import type { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Сам сервис',
  description: 'Next14 + AntD v5',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <Suspense fallback={null}>
          <AppShell projectName="Газпром Аналитика">
            <GlobalFilter />
            {children}
          </AppShell>
        </Suspense>
      </body>
    </html>
  );
}
