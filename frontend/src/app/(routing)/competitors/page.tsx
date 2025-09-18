'use client';

import { useState } from 'react';
import { Skeleton, Card, Select } from 'antd';

import { KpiCard } from '@/entities/graphics-slice/kpiCard';
import { LineTimeseries } from '@/shared/ui/lineTimeseries';
import { ClusterBars } from '@/shared/ui/clusterBars';
import { TreemapChart } from '@/shared/ui/treemap';

import { useCountCommentsKpi } from '../dashboard/hooks/metrics/countComments';
import { useAverageSentimentKpi } from '../dashboard/hooks/metrics/averageSentiment';
import { useAverageRatingKpi } from '../dashboard/hooks/metrics/averageRating';
import { useMostLikedClusterKpi } from '../dashboard/hooks/metrics/mostLikedCluster';
import { useMostDislikedClusterKpi } from '../dashboard/hooks/metrics/mostDislikedCluster';
import { useCountTimeline } from '../dashboard/hooks/timeline/countTimeline';
import { useRatingTimeline } from '../dashboard/hooks/timeline/ratingTimeline';
import { useTagsSentimentHistogram } from '../dashboard/hooks/histograms/useTagsSentimentHistogram';
import { useTagsTreemap } from '../dashboard/hooks/treemap/useTagsTreemap';

import styles from '../dashboard/dashboard.module.scss';

export default function Page() {
  const [concurrent, setConcurrent] = useState('райффайзен');

  const { data: countKpi, isLoading: isCountLoading } = useCountCommentsKpi(concurrent);
  const { data: averageSentiment, isLoading: isAvgSentLoading } =
    useAverageSentimentKpi(concurrent);
  const { data: averageRating, isLoading: isAvgRatingLoading } = useAverageRatingKpi(concurrent);
  const { data: mostLikedCluster, isLoading: isLikedLoading } = useMostLikedClusterKpi(concurrent);
  const { data: mostDislikedCluster, isLoading: isDislikedLoading } =
    useMostDislikedClusterKpi(concurrent);

  const { data: reviewsTimeline, isLoading: isReviewsTL } = useCountTimeline({ concurrent });
  const { data: ratingTimeline, isLoading: isRatingTL } = useRatingTimeline(concurrent);

  const { data: tagsHistogram, isLoading: isTagsHistLoading } =
    useTagsSentimentHistogram(concurrent);
  const { data: tagsTreemap, isLoading: iTreemapsLoading } = useTagsTreemap(concurrent);

  return (
    <div className={styles.grid}>
      <Select
        allowClear
        style={{ width: '350px' }}
        className={styles.selector}
        placeholder="Выберите конкуретна"
        value={concurrent}
        onChange={(newValue) => setConcurrent(newValue)}
        maxTagCount="responsive"
        maxTagTextLength={24}
        options={[
          'райффайзен',
          'россельхозбанк',
          'газпромбанк',
          'тбанк',
          'альфабанк',
          'совкомбанк',
          'втб',
          'сбербанк',
        ].map((bank) => ({ value: bank, display: bank }))}
        maxCount={5}
      />

      {/* 1. KPI */}
      <section className={styles.kpis}>
        <KpiCard loading={isCountLoading} data={countKpi} />
        <KpiCard loading={isAvgSentLoading} data={averageSentiment} />
        <KpiCard loading={isAvgRatingLoading} data={averageRating} />
        <KpiCard loading={isLikedLoading} data={mostLikedCluster} />
        <KpiCard loading={isDislikedLoading} data={mostDislikedCluster} />
      </section>

      {/* 2. Таймлайны */}
      <section>
        {isReviewsTL ? (
          <Card>
            <Skeleton active paragraph={{ rows: 6 }} />
          </Card>
        ) : (
          reviewsTimeline && (
            <LineTimeseries
              payload={{ ...reviewsTimeline, title: 'Количество отзывов во времени' }}
            />
          )
        )}
      </section>

      {/* 3. Секция: слева ClusterBars */}
      <section className={styles.clusterRow}>
        {isTagsHistLoading ? (
          <Card>
            <Skeleton active paragraph={{ rows: 8 }} />
          </Card>
        ) : (
          tagsHistogram && (
            <ClusterBars
              seriesLabels={{
                positive: 'Позитивные',
                neutral: 'Нейтральные',
                negative: 'Негативные',
                mentions: 'Упоминания',
              }}
              // переименуем заголовок внутри payload
              payload={{
                ...tagsHistogram,
                title: 'Распределение тональности по продуктам (топ 5)',
              }}
            />
          )
        )}
      </section>

      {/* 4. Рейтинг по времени */}
      <section className={styles.clusterRow}>
        {isRatingTL ? (
          <Card>
            <Skeleton active paragraph={{ rows: 6 }} />
          </Card>
        ) : (
          ratingTimeline && (
            <LineTimeseries payload={{ ...ratingTimeline, title: 'Динамика среднего рейтинга' }} />
          )
        )}
      </section>

      {/* 5. Treemap */}
      <section className={styles.treemapRow}>
        {iTreemapsLoading ? (
          <Card style={{ height: 360 }}>
            <Skeleton active paragraph={{ rows: 10 }} />
          </Card>
        ) : (
          tagsTreemap && (
            <TreemapChart
              title="Объём упоминаний и тональность по продуктам"
              data={tagsTreemap?.data ?? []}
              height={360}
            />
          )
        )}
      </section>
    </div>
  );
}
