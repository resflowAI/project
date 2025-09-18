'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Layout, Menu, theme as antdTheme } from 'antd';
import { usePathname } from 'next/navigation';
import styles from './ui.module.scss';
import { pathToKey } from '../model';
import { NAV } from '../data';
import type { AppShellProps } from '../types';

const { Content } = Layout;
const { useToken } = antdTheme;

const SIDER_WIDTH = 232;

export const AppShell = ({ children, logo, projectName = 'Project' }: AppShellProps) => {
  const pathname = usePathname();
  const activeKey = useMemo(() => pathToKey(pathname), [pathname]);
  const { token } = useToken();

  const SiderContent = (
    <>
      <div className={styles.logoWrap}>
        <Link href="/" className={styles.logoLink}>
          {logo ? (
            <Image
              src={logo.src}
              alt={logo.alt ?? 'logo'}
              width={logo.width ?? 36}
              height={logo.height ?? 36}
              className={styles.logoImg}
            />
          ) : (
            <div className={styles.logoStub} />
          )}
          <span className={styles.brandName}>{projectName}</span>
        </Link>
      </div>

      <Menu
        mode="inline"
        selectedKeys={[activeKey]}
        className={styles.menu}
        items={NAV.map((i) => ({
          key: i.key,
          icon: i.icon,
          label: (
            <Link href={i.href} className={styles.menuLink}>
              {i.label}
            </Link>
          ),
        }))}
        style={{ padding: '8px', borderInlineEnd: 'none' }}
      />

      <div className={styles.bottomSpace} />
    </>
  );

  return (
    // пробрасываем ширину сайдбара в CSS-переменную
    <Layout className={styles.root} style={{ ['--sider-w' as string]: `${SIDER_WIDTH}px` }}>
      {/* Фиксированный сайдбар — обычный aside, НЕ AntD Sider */}
      <aside className={styles.siderFixed} aria-label="Основная навигация">
        {SiderContent}
      </aside>

      {/* Правая часть, сразу со смещением — без резервирования второго раза */}
      <Layout className={styles.main}>
        <Content className={styles.content} style={{ background: token.colorBgLayout }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};
