import { CheckCircleOutlined, BulbOutlined, WarningOutlined } from '@ant-design/icons';
import { CriticalVariant, TokenOverrides } from '../types';
import { CriticalIssueRow } from '@/shared/interface/criticalIssues';

const percent = (p?: number) =>
  p == null || Number.isNaN(p) ? '—' : `${Math.round(p * 100)}%`;

export const VARIANT_PRESETS: Record<CriticalVariant, Required<TokenOverrides>> = {
  issue: {
    accentColor: '#D4380D', // красный (проблемы)
    icon: <WarningOutlined />,
    tagColor: 'red-inverse',
    tagLabelBuilder: (row: CriticalIssueRow) => `${percent(row.negativeShare)} негатива`,
  },
  insight: {
    accentColor: '#0057B6', // Gazprom Blue
    icon: <BulbOutlined />,
    tagColor: 'blue-inverse',
    tagLabelBuilder: (row: CriticalIssueRow) =>
      row.volume != null ? `${row.volume.toLocaleString('ru-RU')} упоминаний` : null,
  },
  recommendation: {
    accentColor: '#2DB67C', // зелёный (рекоммендации)
    icon: <CheckCircleOutlined />,
    tagColor: 'green-inverse',
    tagLabelBuilder: () => 'Приоритет: высокий', // можешь заменить на свою логику
  },
};
