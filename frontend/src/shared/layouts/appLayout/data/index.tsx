import { INavItem } from '@/shared/interface/header';
import {
  HomeOutlined,
  AppstoreOutlined,
  UserOutlined,
  MessageOutlined,
  LineChartOutlined,
  TrophyOutlined,
  FundProjectionScreenOutlined,
} from '@ant-design/icons';

export const NAV: INavItem[] = [
  { key: 'home', label: 'Главная', href: '/dashboard', icon: <HomeOutlined /> },
  { key: 'chars', label: 'Характеристики', href: '/chars', icon: <AppstoreOutlined /> },
  { key: 'persona', label: 'Портрет клиента', href: '/persona', icon: <UserOutlined /> },
  { key: 'reviews', label: 'Отзывы', href: '/reviews', icon: <MessageOutlined /> },
  { key: 'finance', label: 'Финансы', href: '/finance', icon: <LineChartOutlined /> },
  { key: 'competitors', label: 'Конкуренты', href: '/competitors', icon: <TrophyOutlined /> },
  {
    key: 'forecast',
    label: 'Прогнозирование',
    href: '/forecast',
    icon: <FundProjectionScreenOutlined />,
  },
];

export const NAV_MAP = {
  chars: 'chars',
  persona: 'persona',
  reviews: 'reviews',
  finance: 'finance',
  competitors: 'competitors',
  forecast: 'forecast',
  home: 'dashboard',
} as const;
