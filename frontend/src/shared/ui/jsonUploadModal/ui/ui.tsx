// features/json-upload/ui/UploadJsonModal.tsx
'use client';

import React from 'react';
import {
  Modal,
  Upload,
  Radio,
  Space,
  Typography,
  Divider,
  Table,
  message,
  Checkbox,
  DatePicker,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { InboxOutlined } from '@ant-design/icons';

import dayjs from 'dayjs';
import { useSWRConfig } from 'swr';

import styles from './upload.module.scss';
import { useSourceStore } from '@/features/filter-slice/jsonUpload/model/sourceStore';
import { SourceSelection, UploadItem } from '@/shared/interface/jsonUpload';
import {
  isJsonFile,
  mergeById,
  readFileAsItems,
} from '@/features/filter-slice/jsonUpload/model/local';
import { uploadJson } from '../api';

const { Dragger } = Upload;
const { Text } = Typography;

export type UploadJsonModalProps = {
  open: boolean;
  onClose: () => void;
};

export const UploadJsonModal: React.FC<UploadJsonModalProps> = ({ open, onClose }) => {
  const [items, setItems] = React.useState<UploadItem[]>([]);
  const [uploadDate, setUploadDate] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<'replace' | 'append'>('replace');
  const [loading, setLoading] = React.useState(false);
  const { mutate: mutateAll } = useSWRConfig();

  const sources = useSourceStore((s) => s.sources);
  const setSources = useSourceStore((s) => s.setSources);
  const setMeta = useSourceStore((s) => s.setLastUploadMeta);

  React.useEffect(() => {
    if (!open) {
      setItems([]);
      setUploadDate(null);
      setMode('replace');
      setLoading(false);
    }
  }, [open]);

  const cols: ColumnsType<UploadItem> = [
    { title: 'ID', dataIndex: 'id', width: 96 },
    { title: 'Текст', dataIndex: 'text' },
  ];

  const dragProps: React.ComponentProps<typeof Dragger> = {
    multiple: true,
    accept: '.json,application/json',
    beforeUpload: async (file) => {
      if (!isJsonFile(file)) {
        message.error(`Файл ${file.name} не похож на JSON`);
        return Upload.LIST_IGNORE;
      }
      try {
        const part = await readFileAsItems(file);
        setItems((prev) => (mode === 'append' ? mergeById(prev, part) : part));
        message.success(`Добавлено: ${part.length}`);
      } catch (e: unknown) {
        const msg =
          typeof e === 'object' &&
          e !== null &&
          'message' in e &&
          typeof (e as { message?: unknown }).message === 'string'
            ? ((e as { message?: string }).message as string)
            : String(e);
        message.error(msg || 'Ошибка чтения файла');
      }
      return Upload.LIST_IGNORE;
    },
  };

  const canSubmit = items.length > 0 && Boolean(uploadDate);

  const submit = async () => {
    if (!canSubmit || !uploadDate) return;
    setLoading(true);
    try {
      const { status, detail } = await uploadJson(items, {
        uploadingDate: uploadDate,
      });
      if (status === 'successfull') {
        message.success('JSON загружен и поставлен в обработку');
        // после успешной загрузки дадим пользователю возможность сразу включить источник uploading
        if (!sources.includes('uploading')) {
          setSources([...sources, 'uploading'] as SourceSelection);
        }
        setMeta(items.length);
        onClose();
      } else {
        message.error(detail || 'Ошибка загрузки JSON');
      }
    } catch (e: unknown) {
      const msg =
        typeof e === 'object' &&
        e !== null &&
        'message' in e &&
        typeof (e as { message?: unknown }).message === 'string'
          ? ((e as { message?: string }).message as string)
          : String(e);
      message.error(msg || 'Ошибка загрузки JSON');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Загрузка JSON"
      okText="Отправить"
      okButtonProps={{ loading, disabled: !canSubmit }}
      onOk={submit}
      onCancel={onClose}
      width={860}
      destroyOnHidden
    >
      <div className={styles.grid}>
        <div className={styles.left}>
          <Dragger {...dragProps}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Перетащите файлы .json или кликните</p>
            <p className="ant-upload-hint">
              Формат: массив <Text code>{'{ id:number, text:string }'}</Text> или объект{' '}
              <Text code>{'{ "data": [...] }'}</Text>.
            </p>
          </Dragger>

          <Divider style={{ margin: '16px 0' }} />

          <Space direction="vertical" size={12}>
            <label className={styles.label}>Как добавлять:</label>
            <Radio.Group
              optionType="button"
              buttonStyle="solid"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              options={[
                { label: 'Заменить', value: 'replace' },
                { label: 'Добавить', value: 'append' },
              ]}
          />

            <label className={styles.label}>Дата загрузки:</label>
            <DatePicker
              allowClear
              value={uploadDate ? dayjs(uploadDate, 'YYYY-MM-DD') : null}
              onChange={(value) => setUploadDate(value ? value.format('YYYY-MM-DD') : null)}
              format="DD.MM.YYYY"
              placeholder="Дата обработки"
              style={{ width: '100%' }}
            />
          </Space>
        </div>

        <div className={styles.right}>
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <label className={styles.label}>Предпросмотр ({items.length})</label>
            <Table<UploadItem>
              size="small"
              rowKey="id"
              dataSource={items.slice(0, 50)}
              columns={cols}
              pagination={items.length > 50 ? { pageSize: 50, showSizeChanger: false } : false}
              bordered
            />
            <Divider style={{ margin: '16px 0' }} />
            <label className={styles.label}>После загрузки показывать данные из:</label>
            <Checkbox.Group
              value={sources}
              onChange={(v) => {
                const arr = v as SourceSelection;
                // гарантируем, что минимум один источник выбран
                if (arr.length === 0) return;
                setSources(arr);
                mutateAll(() => true, undefined, { revalidate: true });
              }}
              options={[
                { label: 'Парсинг', value: 'parsing' },
                { label: 'JSON', value: 'uploading' },
              ]}
            />
            <Text type="secondary">
              Параметр <Text code>source</Text> будет добавлен во все запросы графиков.
            </Text>
          </Space>
        </div>
      </div>
    </Modal>
  );
};
