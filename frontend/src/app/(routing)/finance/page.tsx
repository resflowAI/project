'use client';

import { Card, Skeleton, Space, Typography } from 'antd';
import { ClusterBars } from '@/shared/ui/clusterBars';
import { LineTimeseries } from '@/shared/ui/lineTimeseries';

import { useFinTagsSentimentHistogram } from './hooks/histograms/useFinTagsSentimentHistogram';
import { useFinTagsMark } from './hooks/timeline/useFinTagsMark';

const { Title } = Typography;

export default function FinancePage() {
  // таймлайн без дополнительных фильтров
  const { data: finTagsTL, isLoading: isTLLoading } = useFinTagsMark();

  // гистограмма (как было)
  const { data: finTagsHist, isLoading: isHistLoading } = useFinTagsSentimentHistogram();

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {/* Таймлайн */}
      {isTLLoading ? (
        <Card>
          <Skeleton active paragraph={{ rows: 8 }} />
        </Card>
      ) : (
        finTagsTL && <LineTimeseries payload={finTagsTL} height={320} />
      )}

      {/* Гистограмма */}
      {isHistLoading ? (
        <Card>
          <Skeleton active paragraph={{ rows: 6 }} />
        </Card>
      ) : (
        finTagsHist && (
          <ClusterBars
            payload={{ ...finTagsHist, title: 'Распределение тональности финансовых тегов' }}
            height={320}
            seriesLabels={{
              positive: 'Позитивные',
              neutral: 'Нейтральные',
              negative: 'Негативные',
              mentions: 'Упоминания',
            }}
          />
        )
      )}
    </Space>
  );
}
