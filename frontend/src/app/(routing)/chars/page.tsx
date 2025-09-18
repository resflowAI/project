'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Select, Skeleton, Card } from 'antd';
import styles from './chars.module.scss';

import { LineTimeseries } from '@/shared/ui/lineTimeseries';
import { Heatmap } from '@/shared/ui/heatmap';
import { ScatterCard } from '@/shared/ui/scatter';
import { PieCard } from '@/shared/ui/pieChart';
import { SentimentGap } from '@/shared/ui/clusterBarTable';
import { useTagsCorrelationHeatmap } from './hooks/hitmap/useTagsCorrelationHeatmap';
import { useTagsScatter } from './hooks/scatter/useTagsScatter';
import { useSentimentDistribution } from './hooks/pie/useSentimentDistribution';
import { useServerDistribution } from './hooks/pie/useServerDistribution';
import { useAvgTagsMark } from './hooks/timeline/useAvgTagsMark';
import { useTagsCountTimeline } from './hooks/timeline/useTagsCountTimeline';
import { useDistinctTags } from './hooks/filter/useDistinctTags';
import { useTagsSentimentHistogram } from './hooks/histograms/useTagsSentimentHistogram';
import ThemeSearchBlock from './ui/ThemeSearchBlock';

const CHART_HEIGHT = 320;

export default function Chars(): JSX.Element {
  const { data: corrHeatmap, isLoading: isHeatmapLoading } = useTagsCorrelationHeatmap();
  const { data: scatterResp, isLoading: isScatterLoading } = useTagsScatter();
  const { data: pieSentimentResp, isLoading: isPieSentimentLoading } = useSentimentDistribution();
  const { data: pieServerResp, isLoading: isPieServerLoading } = useServerDistribution();
  const { data: finTagsHist, isLoading: isFinTagsHistLoading } = useTagsSentimentHistogram();
  const { tags, isLoading: isTagsLoading } = useDistinctTags();

  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    if (tags.length > 0 && selectedTags.length === 0) {
      if (tags[0]) {
        setSelectedTags([tags[0]]);
      }
    }
  }, [tags, selectedTags.length]);

  const handleTagsChange = (newTags: string[]) => setSelectedTags(newTags.slice(0, 5));
  const tagOptions = useMemo(() => tags.map((t) => ({ label: t, value: t })), [tags]);

  const { data: timeLineCountTimeLine, isLoading: isCountLoading } = useTagsCountTimeline({
    tags: selectedTags,
    title: 'Динамика количества характеристик',
  });

  const { data: timeLineAvgTagsMark, isLoading: isAvgLoading } = useAvgTagsMark({
    tags: selectedTags,
    title: 'Динамика сентимента характеристик',
  });

  return (
    <div className={styles.grid}>
      <section className={styles.kpis} />

      {/* Theme search block */}
      <section>
        <ThemeSearchBlock />
      </section>

      {/* SentimentGap */}

      <section>
        {isFinTagsHistLoading ? (
          <Card>
            <Skeleton active paragraph={{ rows: 6 }} />
          </Card>
        ) : finTagsHist ? (
          <SentimentGap
            title={'Распределение тональности по продуктам'}
            subtitle="Доля положительных, нейтральных и отрицательных отзывов"
            rows={finTagsHist.data.map(({ name, positive, neutral, negative }) => ({
              name,
              positive,
              neutral,
              negative,
            }))}
            normalize100={true}
            showPositiveDelta={true}
            colors={{ positive: '#2DB965', neutral: '#C6CBD3', negative: '#F04438' }}
          />
        ) : (
          <Card>
            <Skeleton active paragraph={{ rows: 6 }} />
          </Card>
        )}
      </section>

      {/* Селектор тегов */}
      <section className={styles.selectorRow}>
        <div className={styles.selectorLeft}>
          <span className={styles.selectorLabel}>Выберите характеристики</span>
          <Select
            mode="multiple"
            allowClear
            style={{ width: '350px' }}
            className={styles.selector}
            placeholder="Выберите до 5 характеристик"
            loading={isTagsLoading}
            value={selectedTags}
            onChange={handleTagsChange}
            maxTagCount="responsive"
            maxTagTextLength={24}
            options={tagOptions}
            maxCount={5}
          />
        </div>
        <div className={styles.selectorRight}>
          <span className={styles.selectorHint}>
            Можно выбрать до 5 характеристик — оба графика обновятся автоматически
          </span>
        </div>
      </section>

      {/* Таймлайны */}
      {/* Таймлайны */}
      <section className={styles.timesRow}>
        <div className={styles.chartCell}>
          {isCountLoading ? (
            <Card>
              <Skeleton active paragraph={{ rows: 8 }} />
            </Card>
          ) : timeLineCountTimeLine ? (
            <LineTimeseries
              payload={{
                ...timeLineCountTimeLine,
                title: 'Динамика количества отзывов по характеристикам',
              }}
              height={CHART_HEIGHT}
            />
          ) : (
            <Card>
              <Skeleton active paragraph={{ rows: 8 }} />
            </Card>
          )}
        </div>

        <div className={styles.chartCell}>
          {isAvgLoading ? (
            <Card>
              <Skeleton active paragraph={{ rows: 8 }} />
            </Card>
          ) : timeLineAvgTagsMark ? (
            <LineTimeseries
              payload={{ ...timeLineAvgTagsMark, title: 'Динамика тональности отзывов' }}
              height={CHART_HEIGHT}
            />
          ) : (
            <Card>
              <Skeleton active paragraph={{ rows: 8 }} />
            </Card>
          )}
        </div>
      </section>

      {/* Heatmap */}
      {/* Heatmap */}
      <section className={styles.row}>
        {isHeatmapLoading ? (
          <Card>
            <Skeleton active paragraph={{ rows: 12 }} />
          </Card>
        ) : corrHeatmap ? (
          <Heatmap title="Таблица корреляций характеристик" data={corrHeatmap} height={420} />
        ) : (
          <Card>
            <Skeleton active paragraph={{ rows: 12 }} />
          </Card>
        )}
      </section>

      {/* Scatter + PieSentiment */}
      {/* Scatter + PieSentiment */}
      <section className={styles.rowDouble}>
        {isScatterLoading ? (
          <Card>
            <Skeleton active paragraph={{ rows: 10 }} />
          </Card>
        ) : scatterResp ? (
          <ScatterCard
            title="Упоминания и средняя тональность по продуктам"
            series={scatterResp.series}
            refLineY={scatterResp.avgSentiment ?? 0}
            xLabel={scatterResp.xLabel ?? 'Уровень важности характеристики'}
            yLabel={scatterResp.yLabel ?? 'Средний сентимент'}
            tooltipLabels={{
              characteristic: 'Характеристика',
              mentions: 'Упоминания',
              sentiment: 'Сентимент',
            }}
            tooltipOrder={['characteristic', 'mentions', 'sentiment']}
          />
        ) : (
          <Card>
            <Skeleton active paragraph={{ rows: 10 }} />
          </Card>
        )}

        {isPieSentimentLoading ? (
          <Card>
            <Skeleton active paragraph={{ rows: 8 }} />
          </Card>
        ) : pieSentimentResp ? (
          <PieCard
            title="Общая тональность отзывов"
            response={pieSentimentResp}
            height={CHART_HEIGHT}
            showPercent
            showLegend
            showTotalInCenter
            innerRadius="62%"
            outerRadius="88%"
            withBackground
            withPadding
            formatValue={(v) => v.toString()}
          />
        ) : (
          <Card>
            <Skeleton active paragraph={{ rows: 8 }} />
          </Card>
        )}
      </section>

      {/* PieServer */}
      {/* PieServer */}
      <section className={styles.clusterRow}>
        <div className={styles.clusterRight}>
          {isPieServerLoading ? (
            <Card>
              <Skeleton active paragraph={{ rows: 8 }} />
            </Card>
          ) : pieServerResp ? (
            <PieCard
              title="Каналы поступления отзывов"
              response={pieServerResp}
              height={CHART_HEIGHT}
              showPercent
              showLegend
              showTotalInCenter
              innerRadius="62%"
              outerRadius="88%"
              withBackground
              withPadding
            />
          ) : (
            <Card>
              <Skeleton active paragraph={{ rows: 8 }} />
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}
