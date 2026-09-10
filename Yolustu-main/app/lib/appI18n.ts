import { AppLanguage } from './settingsTypes';

export type AppStrings = {
  nav: {
    profile: string;
    shop: string;
    explore: string;
    messages: string;
    alliance: string;
  };
  messages: {
    title: string;
    empty: string;
    emptyHint: string;
    placeholder: string;
    recording: string;
    search: string;
    searchPlaceholder: string;
    searchBtn: string;
    attachTitle: string;
    micTitle: string;
    voiceCall: string;
    videoCall: string;
    viewProfile: string;
    systemHint: string;
    uploadFailed: string;
    micDenied: string;
    galleryDenied: string;
    sending: string;
  };
  explore: {
    title: string;
    empty: string;
    emptyHint: string;
    goProfile: string;
    searchTitle: string;
    viewProfile: string;
    filter: string;
    report: string;
  };
};

const STRINGS: Record<AppLanguage, AppStrings> = {
  az: {
    nav: { profile: 'Profil', shop: 'Mağaza', explore: 'Kəşf et', messages: 'Mesajlar', alliance: 'İttifaq' },
    messages: {
      title: 'Mesajlar',
      empty: 'Söhbət yoxdur',
      emptyHint: '🔍 ilə istifadəçi tap. Mesaj, səs, şəkil və video avtomatik saxlanılır.',
      placeholder: 'Mesaj yaz...',
      recording: 'Səsyazılır... buraxın',
      search: 'İstifadəçi tap',
      searchPlaceholder: 'Ad, @nickname...',
      searchBtn: 'Axtar',
      attachTitle: 'Şəkil və ya video göndər',
      micTitle: 'Səs mesajı — basılı saxla',
      voiceCall: 'Səsli zəng',
      videoCall: 'Video zəng',
      viewProfile: 'Profilə bax',
      systemHint: 'Mesaj və media məlumatları avtomatik sinxron saxlanılır.',
      uploadFailed: 'Media göndərilmədi. Yenidən cəhd edin.',
      micDenied: 'Mikrofon icazəsi lazımdır.',
      galleryDenied: 'Fayl seçmək üçün icazə verin.',
      sending: 'Göndərilir...',
    },
    explore: {
      title: 'Kəşf et',
      empty: 'Hələ paylaşım yoxdur',
      emptyHint: 'Profildən şəkil və ya video paylaş — burada görünəcək.',
      goProfile: 'Profilə get',
      searchTitle: 'İstifadəçi axtar',
      viewProfile: 'Profilə bax',
      filter: 'Filtrlə',
      report: 'Şikayət et',
    },
  },
  en: {
    nav: { profile: 'Profile', shop: 'Shop', explore: 'Explore', messages: 'Messages', alliance: 'Alliance' },
    messages: {
      title: 'Messages',
      empty: 'No chats',
      emptyHint: 'Find users with 🔍. All media is saved automatically.',
      placeholder: 'Write a message...',
      recording: 'Recording... release',
      search: 'Find user',
      searchPlaceholder: 'Name, @nickname...',
      searchBtn: 'Search',
      attachTitle: 'Send photo or video',
      micTitle: 'Voice message — hold',
      voiceCall: 'Voice call',
      videoCall: 'Video call',
      viewProfile: 'View profile',
      systemHint: 'Messages and media sync automatically.',
      uploadFailed: 'Failed to send media. Try again.',
      micDenied: 'Microphone permission required.',
      galleryDenied: 'Allow file access to attach media.',
      sending: 'Sending...',
    },
    explore: {
      title: 'Explore',
      empty: 'No posts yet',
      emptyHint: 'Share from profile to appear here.',
      goProfile: 'Go to profile',
      searchTitle: 'Search users',
      viewProfile: 'View profile',
      filter: 'Filter',
      report: 'Report',
    },
  },
  ru: {
    nav: { profile: 'Профиль', shop: 'Магазин', explore: 'Обзор', messages: 'Сообщения', alliance: 'Альянс' },
    messages: {
      title: 'Сообщения',
      empty: 'Нет чатов',
      emptyHint: 'Найдите пользователей через 🔍. Медиа сохраняется автоматически.',
      placeholder: 'Напишите сообщение...',
      recording: 'Запись... отпустите',
      search: 'Найти пользователя',
      searchPlaceholder: 'Имя, @nickname...',
      searchBtn: 'Поиск',
      attachTitle: 'Отправить фото или видео',
      micTitle: 'Голосовое — удерживайте',
      voiceCall: 'Голосовой звонок',
      videoCall: 'Видеозвонок',
      viewProfile: 'Открыть профиль',
      systemHint: 'Сообщения и медиа синхронизируются автоматически.',
      uploadFailed: 'Не удалось отправить медиа.',
      micDenied: 'Нужен доступ к микрофону.',
      galleryDenied: 'Разрешите доступ к файлам.',
      sending: 'Отправка...',
    },
    explore: {
      title: 'Обзор',
      empty: 'Пока нет публикаций',
      emptyHint: 'Поделитесь из профиля — появится здесь.',
      goProfile: 'В профиль',
      searchTitle: 'Поиск пользователей',
      viewProfile: 'Открыть профиль',
      filter: 'Фильтр',
      report: 'Жалоба',
    },
  },
  tr: {
    nav: { profile: 'Profil', shop: 'Mağaza', explore: 'Keşfet', messages: 'Mesajlar', alliance: 'İttifak' },
    messages: {
      title: 'Mesajlar',
      empty: 'Sohbet yok',
      emptyHint: '🔍 ile kullanıcı bul. Medya otomatik kaydedilir.',
      placeholder: 'Mesaj yaz...',
      recording: 'Kaydediliyor... bırak',
      search: 'Kullanıcı bul',
      searchPlaceholder: 'Ad, @nickname...',
      searchBtn: 'Ara',
      attachTitle: 'Fotoğraf veya video gönder',
      micTitle: 'Sesli mesaj — basılı tut',
      voiceCall: 'Sesli arama',
      videoCall: 'Görüntülü arama',
      viewProfile: 'Profile bak',
      systemHint: 'Mesajlar ve medya otomatik senkronize edilir.',
      uploadFailed: 'Medya gönderilemedi.',
      micDenied: 'Mikrofon izni gerekli.',
      galleryDenied: 'Dosya erişimine izin verin.',
      sending: 'Gönderiliyor...',
    },
    explore: {
      title: 'Keşfet',
      empty: 'Henüz paylaşım yok',
      emptyHint: 'Profilden paylaş — burada görünür.',
      goProfile: 'Profile git',
      searchTitle: 'Kullanıcı ara',
      viewProfile: 'Profile bak',
      filter: 'Filtrele',
      report: 'Şikayet',
    },
  },
};

export function getAppStrings(lang: AppLanguage): AppStrings {
  return STRINGS[lang] ?? STRINGS.az;
}
