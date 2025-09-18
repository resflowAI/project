'use client';

import React from 'react';
import { Modal, Tag } from 'antd';
import styles from './ui.module.scss';
import { CriticalBlockProps } from '../../types';
import { VARIANT_PRESETS } from '../../model';

export const ModalList = ({
  open,
  onClose,
  data,
  title = 'Инсайт',
  variant = 'insight',
  tokens,
  limit,
  renderRow,
}: CriticalBlockProps & { open: boolean; onClose: () => void }) => {
  const t = { ...VARIANT_PRESETS[variant], ...(tokens ?? {}) };
  const rows = typeof limit === 'number' ? data.rows.slice(0, limit) : data.rows;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
      title={
        <div className={styles.modalTitle}>
          <span className={styles.icon} style={{ color: t.accentColor }}>
            {t.icon}
          </span>
          <span>{title}</span>
        </div>
      }
    >
      <div className={styles.list}>
        {rows.map((row) =>
          renderRow ? (
            <div key={row.id} className={styles.item}>
              {renderRow(row)}
            </div>
          ) : (
            <article key={row.id} className={styles.item}>
              <div className={styles.itemHeader}>
                <h4 className={styles.aspect}>{row.aspect}</h4>
                <div className={styles.badges}>
                  {t.tagLabelBuilder(row) && <Tag color={t.tagColor}>{t.tagLabelBuilder(row)}</Tag>}
                  {row.volume != null && variant !== 'recommendation' && (
                    <Tag>{row.volume.toLocaleString('ru-RU')} упоминаний</Tag>
                  )}
                </div>
              </div>
              {row.description && <p className={styles.desc}>{row.description}</p>}
            </article>
          ),
        )}
      </div>

      <div className={styles.meta}>
        Обновлено: {new Date(data.updatedAt).toLocaleString('ru-RU')}
      </div>
    </Modal>
  );
};
