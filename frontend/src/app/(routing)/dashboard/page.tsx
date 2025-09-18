'use client';

import { KpiCard } from '@/entities/graphics-slice/kpiCard';
import styles from './dashboard.module.scss';
import { LineTimeseries } from '@/shared/ui/lineTimeseries';
import { ClusterBars } from '@/shared/ui/clusterBars';
import { TreemapChart } from '@/shared/ui/treemap';
import { Skeleton, Card } from 'antd';

import { useCountCommentsKpi } from './hooks/metrics/countComments';
import { useAverageSentimentKpi } from './hooks/metrics/averageSentiment';
import { useAverageRatingKpi } from './hooks/metrics/averageRating';
import { useMostLikedClusterKpi } from './hooks/metrics/mostLikedCluster';
import { useMostDislikedClusterKpi } from './hooks/metrics/mostDislikedCluster';
import { useCountTimeline } from './hooks/timeline/countTimeline';
import { useRatingTimeline } from './hooks/timeline/ratingTimeline';
import { useTagsSentimentHistogram } from './hooks/histograms/useTagsSentimentHistogram';
import { useTagsTreemap } from './hooks/treemap/useTagsTreemap';

export default function Page() {
  const { data: countKpi, isLoading: isCountLoading } = useCountCommentsKpi();
  const { data: averageSentiment, isLoading: isAvgSentLoading } = useAverageSentimentKpi();
  const { data: averageRating, isLoading: isAvgRatingLoading } = useAverageRatingKpi();
  const { data: mostLikedCluster, isLoading: isLikedLoading } = useMostLikedClusterKpi();
  const { data: mostDislikedCluster, isLoading: isDislikedLoading } = useMostDislikedClusterKpi();

  const { data: reviewsTimeline, isLoading: isReviewsTL } = useCountTimeline();
  const { data: ratingTimeline, isLoading: isRatingTL } = useRatingTimeline();

  const { data: tagsHistogram, isLoading: isTagsHistLoading } = useTagsSentimentHistogram();
  const { data: tagsTreemap, isLoading: iTreemapsLoading } = useTagsTreemap();

  return (
    <div className={styles.grid}>
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
