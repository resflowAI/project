/* eslint-disable react/jsx-no-bind */
import React, { useCallback, useState } from 'react';
import { Button, Tooltip } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import styles from './ui.module.scss';
import { downloadCsv } from '@/shared/api/downloadCsv';
import { buildMetricQuery } from '@/shared/api/metricQuery';
import { useFiltersStore } from '@/shared/filterStore/model/store';
import type { MetricQuery } from '@/shared/api/metricQuery';
import type { ExtraFilters } from '@/shared/interface/filter';

export type ExportCsvButtonProps = {
  endpoint: string; // example: '/api/csv/timeline' or '/api/csv/comments'
  extra?: Partial<ExtraFilters> | null; // optional override for extra filters
  title?: string;
};

export const ExportCsvButton: React.FC<ExportCsvButtonProps> = ({
  endpoint,
  extra = null,
  title,
}) => {
  const [loading, setLoading] = useState(false);
  const { value } = useFiltersStore();

  const period =
    value.range && value.range[0] && value.range[1]
      ? { from: value.range[0], to: value.range[1] }
      : null;

  const params: MetricQuery = buildMetricQuery(
    period,
    (value.extra ?? ({} as ExtraFilters)) as ExtraFilters,
  );

  // if caller provided extra overrides, merge simple fields (services, tags, text, rating)
  if (extra) {
    if (Array.isArray(extra.services) && extra.services.length) params.service = extra.services;
    if (Array.isArray(extra.tags) && extra.tags.length) params.tags = extra.tags;
    if (typeof extra.text === 'string' && extra.text.trim()) params.text = extra.text;
    if (typeof extra.rating === 'number') params.min_rating = extra.rating;
  }

  const handle = useCallback(async () => {
    try {
      setLoading(true);
      await downloadCsv(endpoint, params);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('CSV download failed', err);
    } finally {
      setLoading(false);
    }
  }, [endpoint, params]);

  return (
    <Tooltip title={title ?? 'Export CSV'}>
      <Button
        className={styles.exportBtn}
        type="text"
        icon={<DownloadOutlined />}
        onClick={handle}
        loading={loading}
        size="small"
      />
    </Tooltip>
  );
};

export default ExportCsvButton;
