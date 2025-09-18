'use client';

import React, { useCallback, useMemo } from 'react';
import { Drawer, Rate, Select, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import styles from './ui.module.scss';
import { useFiltersStore } from '../../../../shared/filterStore/model/store';

type LabeledValue = { label: string; value: string };
type Group = { label: string; options: LabeledValue[] };

type Props = {
  open: boolean;
  onClose: () => void;
  onApply?: () => void;

  /** Данные с бэка */
  banksGroups?: Group[];
  serviceGroups?: Group[];
  ratingsRange?: { min: number; max: number };
  loading?: boolean;
};

export const DrawerFilters: React.FC<Props> = React.memo(
  ({
    open,
    onClose,
    onApply,
    banksGroups = [],
    serviceGroups = [],
    ratingsRange = { min: 0, max: 5 },
    loading = false,
  }) => {
    const { value, setExtra } = useFiltersStore();

    // Only expose filters which backend supports
    const rating = value.extra.rating ?? 0;
    const services = value.extra.services ?? [];
    const tags = value.extra.tags ?? [];
    const text = value.extra.text ?? '';

    /** Готовим опции Select с учётом группировки (мемо для производительности) */

    const serviceOptions = useMemo(
      () => serviceGroups.map((g) => ({ label: g.label, options: g.options })),
      [serviceGroups],
    );

    /** Коллбэки обновлений extra-фильтров */
    const onRatingChange = useCallback((n: number) => setExtra({ rating: n || 0 }), [setExtra]);
    const onServicesChange = useCallback(
      (arr: string[]) => setExtra({ services: arr }),
      [setExtra],
    );
    const onTagsChange = useCallback((arr: string[]) => setExtra({ tags: arr }), [setExtra]);
    const onTextChange = useCallback((t: string) => setExtra({ text: t }), [setExtra]);

    /** Reset only extra filters (without period/range) */
    const resetExtra = useCallback(() => {
      setExtra({ rating: 0, tags: [], text: '', services: [] });
    }, [setExtra]);

    const handleApply = useCallback(() => {
      onApply?.();
      onClose();
    }, [onApply, onClose]);

    return (
      <Drawer
        rootClassName={styles.drawerRoot}
        title="Ещё фильтры"
        placement="right"
        width={460}
        open={open}
        onClose={onClose}
        footer={
          <div className={styles.drawerFooter}>
            <Button icon={<ReloadOutlined />} onClick={resetExtra}>
              Сбросить фильтры
            </Button>
            <div style={{ flex: 1 }} />
            <Button type="default" onClick={onClose} style={{ marginRight: 8 }}>
              Отмена
            </Button>
            <Button size="large" type="primary" onClick={handleApply}>
              Применить
            </Button>
          </div>
        }
      >
        {/* Services */}
        <div className={styles.drawerSection}>
          <div className={styles.drawerLabel}>Источники / Сервисы</div>
          <Select
            loading={loading}
            mode="multiple"
            size="large"
            placeholder="Выберите сервисы"
            value={services}
            onChange={onServicesChange}
            options={serviceOptions}
            style={{ width: '100%' }}
            maxTagCount="responsive"
            allowClear
            showSearch
            optionFilterProp="label"
            virtual
          />
        </div>

        {/* Tags / Text / Rating */}
        <div className={styles.drawerSection}>
          <div className={styles.drawerLabel}>Теги</div>
          <Select
            mode="tags"
            size="large"
            placeholder="Добавьте теги"
            value={tags}
            onChange={onTagsChange}
            style={{ width: '100%' }}
            tokenSeparators={[',']}
            allowClear
          />
        </div>

        <div className={styles.drawerSection}>
          <div className={styles.drawerLabel}>Текст</div>
          <input
            type="text"
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder="Поиск по тексту"
            style={{ width: '100%', padding: 8, borderRadius: 6 }}
          />
        </div>

        <div className={styles.drawerSection}>
          <div className={styles.drawerLabel}>Рейтинг</div>
          <Rate style={{ fontSize: 24 }} value={rating} onChange={onRatingChange} allowClear />
          <div className={styles.hint}>
            Допустимый диапазон: {ratingsRange.min}–{ratingsRange.max}
          </div>
        </div>
      </Drawer>
    );
  },
);
DrawerFilters.displayName = 'DrawerFilters';

export default DrawerFilters;
