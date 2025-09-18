"use client";

import React from 'react';
import ThemeSearchBlockShared from '@/shared/ui/themeSearch';
import { useThemeSearch } from '../hooks/themeSearch/useThemeSearch';

export const ThemeSearchBlock: React.FC = () => {
  const { theme, setTheme, onSearch, onReset, data, isLoading, periodRange } = useThemeSearch();

  return (
    <ThemeSearchBlockShared
      theme={theme}
      setTheme={setTheme}
      onSearch={onSearch}
      onReset={onReset}
      data={data}
      isLoading={isLoading}
      periodRange={periodRange}
    />
  );
};

export default ThemeSearchBlock;
