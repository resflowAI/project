'use client';

import React, { useMemo, useState } from 'react';
import { Select, Space, Typography, Skeleton, Card } from 'antd';

import { mapWordCloudDefault } from '@/shared/ui/worldCloud/lib/map';
import { useWordCloud } from './api/useWordCloud';
import { useDistinctTags } from './api/useDistinctTags';
import { WordCloud } from '@/shared/ui/worldCloud';
import { SwrKey } from '@/shared/api/swr';
import { useNegativePareto } from './hooks/pareto/useNegativePareto';
import { ParetoCard } from '@/shared/ui/pareto';

const { Title } = Typography;

export default function PageWordCloud() {
  const { tags, isLoading: isTagsLoading } = useDistinctTags();

  // выбранный тег для WordCloud
  const [selectedTagWC, setSelectedTagWC] = useState<string | undefined>(undefined);

  const wcKey = useMemo<SwrKey>(() => {
    return selectedTagWC
      ? (['/unusual_graphics/wordcloud', { params: { tags: [selectedTagWC] } }] as const)
      : '/unusual_graphics/wordcloud';
  }, [selectedTagWC]);

  const { data: wcData, isLoading: isWCLoading } = useWordCloud({
    key: wcKey,
    map: mapWordCloudDefault,
    swr: { dedupingInterval: 5 * 60 * 1000 },
  });

  // выбранный тег для Pareto

  const { data: paretoResp, isLoading: isParetoLoading } = useNegativePareto({});

  const options = useMemo(() => tags.map((t) => ({ label: t, value: t })), [tags]);

  return (
    <Space style={{ width: '100%' }} size={24} direction="vertical">
      {/* ===== WordCloud блок ===== */}
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Title level={5} style={{ margin: 0 }}>
          Ключевые слова в отзывах
        </Title>

        <Select
          showSearch
          allowClear
          placeholder="Выберите тег"
          loading={isTagsLoading}
          options={options}
          value={selectedTagWC}
          onChange={(v) => setSelectedTagWC(v)}
          style={{ width: 420 }}
          filterOption={(input, option) =>
            (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
          }
        />

        {isWCLoading ? (
          <Card>
            <Skeleton active paragraph={{ rows: 6 }} />
          </Card>
        ) : (
          <WordCloud
            title={selectedTagWC ? `Ключевые слова — ${selectedTagWC}` : 'Ключевые слова в отзывах'}
            items={wcData?.items ?? []}
            padding={32}
            minFont={14}
            maxFont={56}
            height={420}
            maxWords={100}
          />
        )}
      </Space>

      {/* ===== Pareto блок ===== */}
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Title level={5} style={{ margin: 0 }}>
          Топ причин негативных отзывов (Pareto 80/20)
        </Title>

        {isParetoLoading ? (
          <Card>
            <Skeleton active paragraph={{ rows: 6 }} />
          </Card>
        ) : (
          paretoResp && <ParetoCard response={paretoResp} />
        )}
      </Space>
    </Space>
  );
}
