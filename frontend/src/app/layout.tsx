// frontend/src/app/layout.tsx
import 'antd/dist/reset.css';
import '../shared/styles/globals.scss';

import type { Metadata } from 'next';
import { AntdProvider } from '@/shared/layouts/antdLayout';
import { AntdRegistry } from '@ant-design/nextjs-registry';

export const metadata: Metadata = {
  title: 'App',
  description: 'Next14 + AntD v5',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <AntdRegistry>
          <AntdProvider>{children}</AntdProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
