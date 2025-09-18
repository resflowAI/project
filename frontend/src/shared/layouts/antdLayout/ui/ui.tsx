// frontend/src/shared/layouts/antdLayout.tsx
'use client';

import React from 'react';
import { App, ConfigProvider, theme as antdTheme } from 'antd';
import ruRU from 'antd/es/locale/ru_RU';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import { axiosFetcher } from '@/shared/api/swr';
import { SWRConfig } from 'swr';

dayjs.locale('ru');

export const AntdProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ConfigProvider
      locale={ruRU}
      theme={{
        token: {
          colorPrimary: '#0057B6', // Gazprom Blue
          colorInfo: '#0057B6',
          colorLink: '#0057B6',
          colorBgLayout: 'var(--app-bg)',
          colorText: 'var(--text-primary)',
          colorTextSecondary: 'var(--text-secondary)',
          borderRadius: 8,
        },
        components: {
          Card: {
            colorBgContainer: 'var(--card-bg)',
            boxShadowTertiary: '0 4px 20px rgba(10,31,68,0.04)',
          },
        },
        algorithm: antdTheme.defaultAlgorithm,
      }}
    >
      <App message={{ maxCount: 3, duration: 2 }} notification={{ placement: 'bottomRight' }}>
        <SWRConfig
          value={{
            fetcher: axiosFetcher, // типобезопасный axios-fetcher
            revalidateOnFocus: false, // не дёргать сеть при смене вкладки
            dedupingInterval: 10000, // дедуп за 1с
            errorRetryCount: 2, // до 2-х ретраев на ошибку
            errorRetryInterval: 2000, // пауза между ретраями
            shouldRetryOnError: false, // выключено глобально (включай точечно при надобности)
            onError: (err: Error) => {
              if (process.env.NODE_ENV !== 'production') {
                console.error(err);
              }
            },
          }}
        >
          {children}
        </SWRConfig>
      </App>
    </ConfigProvider>
  );
};
