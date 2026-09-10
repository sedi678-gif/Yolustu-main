import { AppLanguage } from './settingsTypes';

type SettingsStrings = {
  title: string;
  subtitle: string;
  back: string;
  language: string;
  notifications: string;
  notifMessages: string;
  notifLikes: string;
  notifFollowers: string;
  notifAlliance: string;
  notifMarketing: string;
  privacy: string;
  profilePublic: string;
  showOnline: string;
  showActivity: string;
  allowMessages: string;
  everyone: string;
  followersOnly: string;
  nobody: string;
  appearance: string;
  theme: string;
  dark: string;
  light: string;
  system: string;
  reduceMotion: string;
  account: string;
  readReceipts: string;
  autoPlay: string;
  security: string;
  oldPass: string;
  newPass: string;
  savePass: string;
  passNote: string;
  support: string;
  supportText: string;
  phone: string;
  email: string;
  feedback: string;
  feedbackPlaceholder: string;
  send: string;
  saved: string;
  blocked: string;
  blockedHint: string;
  about: string;
  version: string;
  savedSync: string;
};

export const SETTINGS_I18N: Record<AppLanguage, SettingsStrings> = {
  az: {
    title: 'Ayarlar',
    subtitle: 'Hesab, məxfilik və bildirişlər — avtomatik sinxron',
    back: 'Profil',
    language: 'Dil',
    notifications: 'Bildirişlər',
    notifMessages: 'Mesajlar',
    notifLikes: 'Bəyənmələr',
    notifFollowers: 'Yeni izləyicilər',
    notifAlliance: 'İttifaq hadisələri',
    notifMarketing: 'Kampaniya xəbərləri',
    privacy: 'Məxfilik',
    profilePublic: 'Profil hamıya açıq',
    showOnline: 'Onlayn statusu göstər',
    showActivity: 'Aktivliyi göstər',
    allowMessages: 'Mesaj icazəsi',
    everyone: 'Hamı',
    followersOnly: 'Yalnız izləyənlər',
    nobody: 'Heç kim',
    appearance: 'Görünüş',
    theme: 'Tema',
    dark: 'Qaranlıq',
    light: 'İşıqlı',
    system: 'Sistem',
    reduceMotion: 'Animasiyaları azalt',
    account: 'Hesab',
    readReceipts: 'Oxundu bildirişi',
    autoPlay: 'Videoları avtomatik oynat',
    security: 'Təhlükəsizlik',
    oldPass: 'Cari şifrə',
    newPass: 'Yeni şifrə',
    savePass: 'Şifrəni yenilə',
    passNote: 'Şifrə təhlükəsiz saxlanılır. Dəyişiklik qeydə alınır.',
    support: 'Dəstək',
    supportText: 'Suallarınız üçün bizimlə əlaqə saxlayın.',
    phone: '+994 70 324 28 29',
    email: 'yolustu@gmail.com',
    feedback: 'Geri bildiriş',
    feedbackPlaceholder: 'Təklif və ya irad...',
    send: 'Göndər',
    saved: 'Saxlanıldı',
    blocked: 'Bloklanmışlar',
    blockedHint: 'Mesajlar səhifəsindən istifadəçi bloklaya bilərsən.',
    about: 'Haqqında',
    version: 'Yolüstü v0.1.0',
    savedSync: 'Saxlanıldı və sinxron edildi',
  },
  en: {
    title: 'Settings',
    subtitle: 'Account, privacy & notifications — auto sync',
    back: 'Profile',
    language: 'Language',
    notifications: 'Notifications',
    notifMessages: 'Messages',
    notifLikes: 'Likes',
    notifFollowers: 'New followers',
    notifAlliance: 'Alliance events',
    notifMarketing: 'Promotions',
    privacy: 'Privacy',
    profilePublic: 'Public profile',
    showOnline: 'Show online status',
    showActivity: 'Show activity',
    allowMessages: 'Who can message',
    everyone: 'Everyone',
    followersOnly: 'Followers only',
    nobody: 'Nobody',
    appearance: 'Appearance',
    theme: 'Theme',
    dark: 'Dark',
    light: 'Light',
    system: 'System',
    reduceMotion: 'Reduce motion',
    account: 'Account',
    readReceipts: 'Read receipts',
    autoPlay: 'Auto-play videos',
    security: 'Security',
    oldPass: 'Current password',
    newPass: 'New password',
    savePass: 'Update password',
    passNote: 'Your password is stored securely.',
    support: 'Support',
    supportText: 'Contact us for any questions.',
    phone: '+994 70 324 28 29',
    email: 'yolustu@gmail.com',
    feedback: 'Feedback',
    feedbackPlaceholder: 'Your suggestion...',
    send: 'Send',
    saved: 'Saved',
    blocked: 'Blocked users',
    blockedHint: 'Block users from the Messages page.',
    about: 'About',
    version: 'Yolüstü v0.1.0',
    savedSync: 'Saved and synced',
  },
  ru: {
    title: 'Настройки',
    subtitle: 'Аккаунт, конфиденциальность — автосинхронизация',
    back: 'Профиль',
    language: 'Язык',
    notifications: 'Уведомления',
    notifMessages: 'Сообщения',
    notifLikes: 'Лайки',
    notifFollowers: 'Подписчики',
    notifAlliance: 'Альянс',
    notifMarketing: 'Реклама',
    privacy: 'Конфиденциальность',
    profilePublic: 'Публичный профиль',
    showOnline: 'Показывать онлайн',
    showActivity: 'Показывать активность',
    allowMessages: 'Кто может писать',
    everyone: 'Все',
    followersOnly: 'Только подписчики',
    nobody: 'Никто',
    appearance: 'Вид',
    theme: 'Тема',
    dark: 'Тёмная',
    light: 'Светлая',
    system: 'Системная',
    reduceMotion: 'Меньше анимаций',
    account: 'Аккаунт',
    readReceipts: 'Уведомления о прочтении',
    autoPlay: 'Автовоспроизведение видео',
    security: 'Безопасность',
    oldPass: 'Текущий пароль',
    newPass: 'Новый пароль',
    savePass: 'Обновить пароль',
    passNote: 'Пароль хранится в защищённом виде.',
    support: 'Поддержка',
    supportText: 'Свяжитесь с нами.',
    phone: '+994 70 324 28 29',
    email: 'yolustu@gmail.com',
    feedback: 'Отзыв',
    feedbackPlaceholder: 'Ваш отзыв...',
    send: 'Отправить',
    saved: 'Сохранено',
    blocked: 'Заблокированные',
    blockedHint: 'Блокировка в разделе Сообщения.',
    about: 'О приложении',
    version: 'Yolüstü v0.1.0',
    savedSync: 'Сохранено и синхронизировано',
  },
  tr: {
    title: 'Ayarlar',
    subtitle: 'Hesap, gizlilik — otomatik senkron',
    back: 'Profil',
    language: 'Dil',
    notifications: 'Bildirimler',
    notifMessages: 'Mesajlar',
    notifLikes: 'Beğeniler',
    notifFollowers: 'Yeni takipçiler',
    notifAlliance: 'İttifak',
    notifMarketing: 'Kampanyalar',
    privacy: 'Gizlilik',
    profilePublic: 'Herkese açık profil',
    showOnline: 'Çevrimiçi göster',
    showActivity: 'Aktiviteyi göster',
    allowMessages: 'Mesaj izni',
    everyone: 'Herkes',
    followersOnly: 'Sadece takipçiler',
    nobody: 'Kimse',
    appearance: 'Görünüm',
    theme: 'Tema',
    dark: 'Karanlık',
    light: 'Aydınlık',
    system: 'Sistem',
    reduceMotion: 'Animasyonları azalt',
    account: 'Hesap',
    readReceipts: 'Okundu bilgisi',
    autoPlay: 'Videoları otomatik oynat',
    security: 'Güvenlik',
    oldPass: 'Mevcut şifre',
    newPass: 'Yeni şifre',
    savePass: 'Şifrəni güncelle',
    passNote: 'Şifre güvenli şekilde saklanır.',
    support: 'Destek',
    supportText: 'Sorularınız için bize ulaşın.',
    phone: '+994 70 324 28 29',
    email: 'yolustu@gmail.com',
    feedback: 'Geri bildirim',
    feedbackPlaceholder: 'Öneriniz...',
    send: 'Gönder',
    saved: 'Kaydedildi',
    blocked: 'Engellenenler',
    blockedHint: 'Mesajlar sayfasından engelleyebilirsiniz.',
    about: 'Hakkında',
    version: 'Yolüstü v0.1.0',
    savedSync: 'Kaydedildi ve senkronize edildi',
  },
};

export function getSettingsStrings(lang: AppLanguage) {
  return SETTINGS_I18N[lang] ?? SETTINGS_I18N.az;
}
