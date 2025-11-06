import type { LanguageCode } from '../contexts/SettingsContext';
import type { ThemeName } from '../theme/themes';

export type TranslationShape = {
  settings: {
    title: string;
    themeLabel: string;
    themeDescription: string;
    soundLabel: string;
    soundDescription: string;
    hapticsLabel: string;
    hapticsDescription: string;
    languageLabel: string;
    languageDescription: string;
    themeNames: Record<ThemeName, string>;
    toggles: {
      on: string;
      off: string;
    };
  };
  navigation: {
    gallery: string;
    settings: string;
    trash: string;
    premium: string;
    about: string;
  };
  screens: {
    trash: {
      description: string;
    };
    premium: {
      description: string;
    };
    about: {
      description: string;
      versionLabel: string;
    };
  };
};

const makeThemeNames = (light: string, dark: string, solar: string, mono: string) => ({
  light,
  dark,
  solar,
  mono,
});

export const LANGUAGES_DISPLAY_NAMES: Record<LanguageCode, string> = {
  en: 'English',
  ru: 'Русский',
  es: 'Español',
  de: 'Deutsch',
  fr: 'Français',
  pt: 'Português',
  ja: '日本語',
  it: 'Italiano',
  pl: 'Polski',
  zh: '简体中文',
  hi: 'हिन्दी',
  uk: 'Українська',
};

export const translations: Record<LanguageCode, TranslationShape> = {
  en: {
    settings: {
      title: 'Settings',
      themeLabel: 'Theme',
      themeDescription: 'Choose how BrushFlow looks.',
      soundLabel: 'Sound',
      soundDescription: 'Enable sound effects while painting.',
      hapticsLabel: 'Haptics',
      hapticsDescription: 'Vibrate when important actions happen.',
      languageLabel: 'Language',
      languageDescription: 'Select your preferred language.',
      themeNames: makeThemeNames('Light', 'Dark', 'Solar', 'Mono'),
      toggles: {
        on: 'On',
        off: 'Off',
      },
    },
    navigation: {
      gallery: 'Gallery',
      settings: 'Settings',
      trash: 'Trash',
      premium: 'Premium',
      about: 'About',
    },
    screens: {
      trash: {
        description: 'Your deleted artworks will appear here.',
      },
      premium: {
        description: 'Upgrade to unlock pro brushes, advanced layers, and export options.',
      },
      about: {
        description: 'BrushFlow is crafted to keep your creativity flowing across every device.',
        versionLabel: 'Version',
      },
    },
  },
  ru: {
    settings: {
      title: 'Настройки',
      themeLabel: 'Тема',
      themeDescription: 'Выберите внешний вид BrushFlow.',
      soundLabel: 'Звук',
      soundDescription: 'Включить звуковые эффекты при рисовании.',
      hapticsLabel: 'Вибрация',
      hapticsDescription: 'Вибрация при важных действиях.',
      languageLabel: 'Язык',
      languageDescription: 'Выберите предпочитаемый язык.',
      themeNames: makeThemeNames('Светлая', 'Тёмная', 'Солнечная', 'Моно'),
      toggles: {
        on: 'Вкл.',
        off: 'Выкл.',
      },
    },
    navigation: {
      gallery: 'Галерея',
      settings: 'Настройки',
      trash: 'Корзина',
      premium: 'Премиум',
      about: 'О приложении',
    },
    screens: {
      trash: {
        description: 'Удалённые работы появятся здесь.',
      },
      premium: {
        description: 'Откройте премиум-кисти, расширенные слои и параметры экспорта.',
      },
      about: {
        description: 'BrushFlow создан, чтобы вдохновлять художников на любом устройстве.',
        versionLabel: 'Версия',
      },
    },
  },
  es: {
    settings: {
      title: 'Ajustes',
      themeLabel: 'Tema',
      themeDescription: 'Elige cómo se ve BrushFlow.',
      soundLabel: 'Sonido',
      soundDescription: 'Activa efectos de sonido al pintar.',
      hapticsLabel: 'Vibración háptica',
      hapticsDescription: 'Vibra en acciones importantes.',
      languageLabel: 'Idioma',
      languageDescription: 'Selecciona tu idioma preferido.',
      themeNames: makeThemeNames('Claro', 'Oscuro', 'Solar', 'Mono'),
      toggles: {
        on: 'Activado',
        off: 'Desactivado',
      },
    },
    navigation: {
      gallery: 'Galería',
      settings: 'Ajustes',
      trash: 'Papelera',
      premium: 'Premium',
      about: 'Acerca de',
    },
    screens: {
      trash: {
        description: 'Tus obras eliminadas aparecerán aquí.',
      },
      premium: {
        description: 'Mejora para desbloquear pinceles pro, capas avanzadas y opciones de exportación.',
      },
      about: {
        description: 'BrushFlow está diseñado para mantener tu creatividad en movimiento en cualquier dispositivo.',
        versionLabel: 'Versión',
      },
    },
  },
  de: {
    settings: {
      title: 'Einstellungen',
      themeLabel: 'Design',
      themeDescription: 'Wähle das Erscheinungsbild von BrushFlow.',
      soundLabel: 'Ton',
      soundDescription: 'Soundeffekte beim Malen aktivieren.',
      hapticsLabel: 'Haptik',
      hapticsDescription: 'Bei wichtigen Aktionen vibrieren.',
      languageLabel: 'Sprache',
      languageDescription: 'Bevorzugte Sprache auswählen.',
      themeNames: makeThemeNames('Hell', 'Dunkel', 'Solar', 'Mono'),
      toggles: {
        on: 'An',
        off: 'Aus',
      },
    },
    navigation: {
      gallery: 'Galerie',
      settings: 'Einstellungen',
      trash: 'Papierkorb',
      premium: 'Premium',
      about: 'Über',
    },
    screens: {
      trash: {
        description: 'Gelöschte Werke erscheinen hier.',
      },
      premium: {
        description: 'Upgrade, um Profi-Pinsel, erweiterte Ebenen und Exportoptionen freizuschalten.',
      },
      about: {
        description: 'BrushFlow wurde entwickelt, um deine Kreativität auf jedem Gerät fließen zu lassen.',
        versionLabel: 'Version',
      },
    },
  },
  fr: {
    settings: {
      title: 'Paramètres',
      themeLabel: 'Thème',
      themeDescription: 'Choisissez l’apparence de BrushFlow.',
      soundLabel: 'Son',
      soundDescription: 'Activer les effets sonores pendant la peinture.',
      hapticsLabel: 'Haptique',
      hapticsDescription: 'Vibrer lors des actions importantes.',
      languageLabel: 'Langue',
      languageDescription: 'Sélectionnez votre langue préférée.',
      themeNames: makeThemeNames('Clair', 'Sombre', 'Solaire', 'Mono'),
      toggles: {
        on: 'Activé',
        off: 'Désactivé',
      },
    },
    navigation: {
      gallery: 'Galerie',
      settings: 'Paramètres',
      trash: 'Corbeille',
      premium: 'Premium',
      about: 'À propos',
    },
    screens: {
      trash: {
        description: 'Vos œuvres supprimées apparaîtront ici.',
      },
      premium: {
        description: 'Passez en Premium pour débloquer des pinceaux pro, des calques avancés et des options d’export.',
      },
      about: {
        description: 'BrushFlow est conçu pour nourrir votre créativité sur tous vos appareils.',
        versionLabel: 'Version',
      },
    },
  },
  pt: {
    settings: {
      title: 'Configurações',
      themeLabel: 'Tema',
      themeDescription: 'Escolha como o BrushFlow parece.',
      soundLabel: 'Som',
      soundDescription: 'Ativar efeitos sonoros ao pintar.',
      hapticsLabel: 'Hápticos',
      hapticsDescription: 'Vibrar em ações importantes.',
      languageLabel: 'Idioma',
      languageDescription: 'Selecione o idioma preferido.',
      themeNames: makeThemeNames('Claro', 'Escuro', 'Solar', 'Mono'),
      toggles: {
        on: 'Ativado',
        off: 'Desativado',
      },
    },
    navigation: {
      gallery: 'Galeria',
      settings: 'Configurações',
      trash: 'Lixeira',
      premium: 'Premium',
      about: 'Sobre',
    },
    screens: {
      trash: {
        description: 'Suas obras excluídas aparecerão aqui.',
      },
      premium: {
        description: 'Faça upgrade para liberar pincéis profissionais, camadas avançadas e opções de exportação.',
      },
      about: {
        description: 'BrushFlow foi criado para manter sua criatividade fluindo em qualquer dispositivo.',
        versionLabel: 'Versão',
      },
    },
  },
  ja: {
    settings: {
      title: '設定',
      themeLabel: 'テーマ',
      themeDescription: 'BrushFlow の見た目を選択します。',
      soundLabel: 'サウンド',
      soundDescription: '描画中の効果音を有効にする。',
      hapticsLabel: '触覚フィードバック',
      hapticsDescription: '重要な操作で振動させます。',
      languageLabel: '言語',
      languageDescription: '使用する言語を選択します。',
      themeNames: makeThemeNames('ライト', 'ダーク', 'ソーラー', 'モノ'),
      toggles: {
        on: 'オン',
        off: 'オフ',
      },
    },
    navigation: {
      gallery: 'ギャラリー',
      settings: '設定',
      trash: 'ゴミ箱',
      premium: 'プレミアム',
      about: 'アプリ情報',
    },
    screens: {
      trash: {
        description: '削除した作品がここに表示されます。',
      },
      premium: {
        description: 'プレミアムにアップグレードしてプロ向けブラシや高度なレイヤー、エクスポート機能を解放しましょう。',
      },
      about: {
        description: 'BrushFlow はあらゆるデバイスで創造性を支えます。',
        versionLabel: 'バージョン',
      },
    },
  },
  it: {
    settings: {
      title: 'Impostazioni',
      themeLabel: 'Tema',
      themeDescription: 'Scegli l’aspetto di BrushFlow.',
      soundLabel: 'Suono',
      soundDescription: 'Abilita gli effetti sonori durante la pittura.',
      hapticsLabel: 'Feedback aptico',
      hapticsDescription: 'Vibra durante le azioni importanti.',
      languageLabel: 'Lingua',
      languageDescription: 'Seleziona la lingua preferita.',
      themeNames: makeThemeNames('Chiaro', 'Scuro', 'Solare', 'Mono'),
      toggles: {
        on: 'Attivo',
        off: 'Disattivo',
      },
    },
    navigation: {
      gallery: 'Galleria',
      settings: 'Impostazioni',
      trash: 'Cestino',
      premium: 'Premium',
      about: 'Informazioni',
    },
    screens: {
      trash: {
        description: 'Le opere eliminate appariranno qui.',
      },
      premium: {
        description: 'Passa a Premium per sbloccare pennelli professionali, livelli avanzati e opzioni di esportazione.',
      },
      about: {
        description: 'BrushFlow è creato per accompagnare la tua creatività su ogni dispositivo.',
        versionLabel: 'Versione',
      },
    },
  },
  pl: {
    settings: {
      title: 'Ustawienia',
      themeLabel: 'Motyw',
      themeDescription: 'Wybierz wygląd BrushFlow.',
      soundLabel: 'Dźwięk',
      soundDescription: 'Włącz efekty dźwiękowe podczas malowania.',
      hapticsLabel: 'Wibracje',
      hapticsDescription: 'Wibracje przy ważnych działaniach.',
      languageLabel: 'Język',
      languageDescription: 'Wybierz preferowany język.',
      themeNames: makeThemeNames('Jasny', 'Ciemny', 'Słoneczny', 'Mono'),
      toggles: {
        on: 'Wł.',
        off: 'Wył.',
      },
    },
    navigation: {
      gallery: 'Galeria',
      settings: 'Ustawienia',
      trash: 'Kosz',
      premium: 'Premium',
      about: 'O aplikacji',
    },
    screens: {
      trash: {
        description: 'Usunięte prace pojawią się tutaj.',
      },
      premium: {
        description: 'Ulepsz, aby odblokować profesjonalne pędzle, zaawansowane warstwy i opcje eksportu.',
      },
      about: {
        description: 'BrushFlow powstał, aby wspierać kreatywność na każdym urządzeniu.',
        versionLabel: 'Wersja',
      },
    },
  },
  zh: {
    settings: {
      title: '设置',
      themeLabel: '主题',
      themeDescription: '选择 BrushFlow 的外观。',
      soundLabel: '声音',
      soundDescription: '绘画时启用音效。',
      hapticsLabel: '触觉反馈',
      hapticsDescription: '重要操作时震动。',
      languageLabel: '语言',
      languageDescription: '选择首选语言。',
      themeNames: makeThemeNames('浅色', '深色', '阳光', '单色'),
      toggles: {
        on: '开启',
        off: '关闭',
      },
    },
    navigation: {
      gallery: '图库',
      settings: '设置',
      trash: '回收站',
      premium: '高级版',
      about: '关于',
    },
    screens: {
      trash: {
        description: '已删除的作品会显示在此处。',
      },
      premium: {
        description: '升级以解锁专业画笔、高级图层和导出选项。',
      },
      about: {
        description: 'BrushFlow 专为让你的灵感在每台设备上持续流动而打造。',
        versionLabel: '版本',
      },
    },
  },
  hi: {
    settings: {
      title: 'सेटिंग्स',
      themeLabel: 'थीम',
      themeDescription: 'BrushFlow का रूप चुनें।',
      soundLabel: 'ध्वनि',
      soundDescription: 'चित्रकारी के दौरान ध्वनि प्रभाव सक्षम करें।',
      hapticsLabel: 'हैप्टिक प्रतिक्रिया',
      hapticsDescription: 'महत्वपूर्ण क्रियाओं पर कंपन करें।',
      languageLabel: 'भाषा',
      languageDescription: 'अपनी पसंदीदा भाषा चुनें।',
      themeNames: makeThemeNames('हल्का', 'गहरा', 'सौर', 'मोनो'),
      toggles: {
        on: 'चालू',
        off: 'बंद',
      },
    },
    navigation: {
      gallery: 'गैलरी',
      settings: 'सेटिंग्स',
      trash: 'कचरा पेटी',
      premium: 'प्रीमियम',
      about: 'परिचय',
    },
    screens: {
      trash: {
        description: 'हटाए गए आर्टवर्क यहाँ दिखाई देंगे।',
      },
      premium: {
        description: 'प्रो ब्रश, उन्नत परतें और निर्यात विकल्प अनलॉक करने के लिए प्रीमियम में अपग्रेड करें।',
      },
      about: {
        description: 'BrushFlow को हर डिवाइस पर आपकी रचनात्मकता को बहते रखने के लिए बनाया गया है।',
        versionLabel: 'संस्करण',
      },
    },
  },
  uk: {
    settings: {
      title: 'Налаштування',
      themeLabel: 'Тема',
      themeDescription: 'Оберіть, як виглядає BrushFlow.',
      soundLabel: 'Звук',
      soundDescription: 'Увімкнути звукові ефекти під час малювання.',
      hapticsLabel: 'Вібрація',
      hapticsDescription: 'Вібрація під час важливих дій.',
      languageLabel: 'Мова',
      languageDescription: 'Оберіть бажану мову.',
      themeNames: makeThemeNames('Світла', 'Темна', 'Сонячна', 'Моно'),
      toggles: {
        on: 'Увімк.',
        off: 'Вимк.',
      },
    },
    navigation: {
      gallery: 'Галерея',
      settings: 'Налаштування',
      trash: 'Кошик',
      premium: 'Преміум',
      about: 'Про додаток',
    },
    screens: {
      trash: {
        description: 'Видалені роботи з’являться тут.',
      },
      premium: {
        description: 'Оновіться, щоб відкрити про-кисті, розширені шари та параметри експорту.',
      },
      about: {
        description: 'BrushFlow створено, щоб підтримувати вашу творчість на будь-якому пристрої.',
        versionLabel: 'Версія',
      },
    },
  },
};
