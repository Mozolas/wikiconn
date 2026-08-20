import { type Dictionary } from '@/i18n/dictionaries/en';
import { errorCopy } from '@/i18n/error-copy';
import { pluralForms } from '@/i18n/plural';

/**
 * Czech. Typed against the English dictionary, so a forgotten key is a build
 * error rather than an English word in the middle of a Czech sentence.
 *
 * Written as Czech rather than translated from the English above it, which is
 * why several strings say something slightly different. Informal register
 * throughout: a game that asks for a nickname and nothing else has no business
 * addressing anyone formally.
 *
 * Two notes on the plurals below. Czech CLDR puts 5 and up in `other`, not in
 * `many`, which is for decimals, so `other` carries the genitive form. And a
 * couple of phrases are deliberately verbless: Czech past tense would have to
 * agree with a gender that a nickname does not carry.
 */
export const cs: Dictionary = {
  meta: {
    title: 'WikiConn - závod po Wikipedii',
    description:
      'Hra pro dva až pět hráčů rovnou v prohlížeči. Z jednoho článku Wikipedie do druhého jen po odkazech, které v něm jsou. Bez účtu, zdarma.',
    keywords: [
      'závod po wikipedii',
      'wiki závod',
      'hra wikipedie',
      'wikirace',
      'wikipedie hra pro více hráčů',
      'prohlížečová hra',
      'wiki golf',
      'šest kroků od wikipedie',
    ],
    ogImageAlt:
      'Logo WikiConn nad nápisem "Race through Wikipedia" a řetěz názvů článků od Alberta Einsteina k Pizze.',
    lobbyTitle: 'Startovní čára',
    playTitle: 'Závodí se',
  },

  chrome: {
    skipToContent: 'Přejít na obsah',
    tagline: 'Závody po Wikipedii',
    backToHome: 'Zpátky na úvod',
    loading: 'Načítám…',
    appearance: 'Vzhled',
    language: 'Jazyk',
    languageNames: { en: 'English', cs: 'Čeština' },
    theme: { light: 'Světlý', dark: 'Tmavý', system: 'Podle systému' },
    footer: {
      attributionPrefix: 'Texty a obrázky článků jsou z Wikipedie a dál pro ně platí licence',
      licence: 'CC BY-SA 4.0',
      disclaimer: 'WikiConn je nezávislý hobby projekt a s Nadací Wikimedia nemá nic společného.',
      source: 'Kód na GitHubu',
    },
  },

  home: {
    title: 'Proklikej se Wikipedií.',
    lede: 'Dva až pět hráčů, jeden start, jeden cíl. Vyhrává ten, kdo se tam doklikne první. Běží to v záložce prohlížeče a nechce po tobě nic než přezdívku.',
    create: {
      heading: 'Založ závod',
      body: 'Zakládáš, tak si taky vybíráš: jazyk, oba články a co na sebe hráči během závodu uvidí.',
      button: 'Vytvořit místnost',
      busy: 'Zakládám…',
      failed: 'Místnost se nepovedlo založit',
    },
    join: {
      heading: 'Připoj se k závodu',
      body: 'Vlož kód, co jsi dostal. Nebo rovnou celý odkaz.',
      label: 'Kód místnosti',
      placeholder: 'ABCDEF',
      submit: 'Připojit se',
      invalid: 'Tenhle kód neplatí. Šest znaků, písmena A-Z a číslice 2-9.',
    },
    whatIs: {
      heading: 'Co je závod po Wikipedii?',
      paragraphs: [
        'Pravidlo je jenom jedno: z článku do článku se dostaneš výhradně po odkazech, které v něm jsou. Vyhledávání ne. Adresní řádek ne. A vracet se na hlavní stranu, když nevíš kudy dál, taky ne.',
        'Nejkratší cesta skoro nikdy nevede tam, kam bys čekal. Pusť dva lidi od Alberta Einsteina k pizze a každý se rozjede na opačnou stranu, oba přesvědčení, že ten druhý jen plýtvá klikáním. Přes fyziku se nedostaneš nikam. Přes housle jsi tam na tři kliknutí.',
        'Hraje se to v prohlížečích dvacet let a každý tomu říká jinak: wiki race, wiki golf, Wikipedia speedrun. WikiConn to jenom hlídá za tebe. Ověřuje, že každý skok byl doopravdy odkaz, na který se dalo kliknout, měří čas, a jakmile někdo dorazí do cíle, vyskládá vedle sebe trasy všech. Ty trasy jsou většinou větší zábava než samotná výhra.',
      ],
    },
    howItWorks: {
      heading: 'Jak to chodí',
      steps: [
        {
          title: 'Založ a rozešli',
          body: 'Otevři místnost, vyber start a cíl a pošli šestimístný kód dál.',
        },
        {
          title: 'Proklikej se tam',
          body: 'Jen odkazy v článku, na kterém zrovna stojíš. To je celá hra.',
        },
        {
          title: 'Vyhrává první v cíli',
          body: 'Na konci se ukážou trasy všech, i s počtem kliknutí a časem. Včetně oklik.',
        },
      ],
    },
    faq: {
      heading: 'Časté otázky',
      entries: [
        {
          question: 'Kolik hráčů se vejde do jednoho závodu?',
          answer:
            'Dva až pět. Startuje se naráz ze stejného článku a stačí k tomu šestimístný kód.',
        },
        {
          question: 'Potřebuju účet nebo musím něco instalovat?',
          answer:
            'Ne. Chce to přezdívku, ne e-mail. Nic se nikam neukládá a samotná místnost po dni ticha zmizí.',
        },
        {
          question: 'V jakých jazycích Wikipedie se dá závodit?',
          answer:
            'Anglicky a česky. Vybírá ten, kdo místnost zakládá, a čtou pak všichni tu samou.',
        },
        {
          question: 'Co brání tomu, aby si někdo cíl prostě vyhledal?',
          answer:
            'Článek dostaneš bez vyhledávacího pole, takže jediná cesta dál je odkaz na stránce, kterou máš před sebou. Otevřít si článek kolečkem v nové záložce taky nejde. Dál už se spoléhá na férovost, je to hra mezi kamarády, ne turnaj.',
        },
        {
          question: 'Vidí hráči, kde jsou soupeři?',
          answer:
            'Podle toho, co hostitel povolí. Aktuální článek, počet kliknutí a trasa naživo jdou zapnout každý zvlášť. Na výsledky to ale nemá vliv, tam se stejně ukáže všechno.',
        },
        {
          question: 'Funguje to na mobilu?',
          answer: 'Jo. Většinou to tak i začíná, kód se prostě pošle kolem stolu.',
        },
      ],
    },
  },

  lobby: {
    title: 'Startovní čára',
    subtitleHost: 'Místnost je tvoje. Nastav trasu a spusť závod, až budou všichni uvnitř.',
    subtitleGuest: 'Hostitel zrovna vybírá trasu. Vydrž, závod začne všem naráz.',
    codeLabel: 'Kód místnosti',
    copyCode: 'Kopírovat kód',
    copyLink: 'Kopírovat odkaz',
    copied: 'Zkopírováno',
    copyBlockedCode: 'Kopírovat to tady nejde. Kód je {value}',
    copyBlockedLink: 'Kopírovat to tady nejde. Odkaz je {value}',
    connected: 'Připojeno',
    connecting: 'Připojuji…',
    settingsPanel: 'Nastavení závodu',
    loadingRoom: 'Načítám místnost…',
    playersPanel: 'Hráči',
    waitingForPlayers: 'Čekám na hráče…',
    leave: 'Odejít',
    you: '(ty)',
    host: 'Hostitel',
    disconnected: 'Odpojeno',
  },

  nickname: {
    title: 'Jak ti máme říkat?',
    description:
      'Pod tímhle jménem tě uvidí ostatní. Zůstane jen v tomhle prohlížeči, žádný účet ani e-mail.',
    label: 'Přezdívka',
    placeholder: 'Ada',
    hint: '{min}-{max} znaků.',
    submit: 'Jdeme na to',
  },

  settings: {
    editionLegend: 'Která Wikipedie',
    editionNames: { en: 'Anglická Wikipedie', cs: 'Česká Wikipedie' },
    startLabel: 'Start',
    startHint: 'Odsud vyrazí všichni.',
    finishLabel: 'Cíl',
    finishHint: 'Kdo ho otevře první, vyhrál.',
    visibilityLegend: 'Co o sobě závodníci vidí',
    visibilityRows: {
      showCurrentArticle: {
        label: 'Aktuální článek',
        description: 'Kdo právě čte co.',
      },
      showClickCount: {
        label: 'Počet kliknutí',
        description: 'Kolik odkazů kdo prošel.',
      },
      showFullPath: {
        label: 'Trasa naživo',
        description: 'Každý skok se objeví hned, jak ho někdo udělá.',
      },
    },
    startRace: 'Spustit závod',
    blockerPickBoth: 'Vyber start a cíl.',
    blockerSameArticle: 'Start a cíl musí být různé články.',
    blockerWaiting: pluralForms({
      one: 'Chybí ještě jeden hráč…',
      few: 'Chybí ještě {count} hráči…',
      other: 'Chybí ještě {count} hráčů…',
    }),
    guestNote: 'Tohle mění jen hostitel. Závod začne všem naráz.',
  },

  picker: {
    searchPlaceholder: 'Hledat na {lang} Wikipedii…',
    random: 'Náhodný článek',
    randomPick: 'Vybrat náhodně',
    randomAnother: 'Losovat znovu',
    randomFailed: 'Losování se nepovedlo',
    clear: 'Vymazat',
    clearNamed: 'Vymazat: {label}',
    suggestions: 'Návrhy: {label}',
    nothingFound: 'Na „{query}“ nic.',
  },

  play: {
    joining: 'Připojuji se k závodu…',
    reconnecting: 'Spojení vypadlo, obnovuji…',
    target: 'Cíl',
    elapsed: 'Čas',
    clicksUsed: 'Kliknutí',
    finished: 'V cíli',
    loadingArticle: 'Načítám článek',
    articleFailed: 'Článek se nenačetl.',
    articleFailedInline: 'Ten článek se nepovedlo otevřít, zůstáváš na předchozím.',
    articleLoadFailed: 'Článek se nepovedlo načíst',
    tryAgain: 'Zkusit znovu',
    racersSection: 'Závodníci',
    racersHeading: 'Závodníci ({count})',
    noRacers: 'Zatím tu nikdo není.',
    hiddenByHost: 'hostitel to skryl',
    clicks: pluralForms({
      one: '{count} kliknutí',
      few: '{count} kliknutí',
      other: '{count} kliknutí',
    }),
    currentlyReading: 'Právě čte',
    recentRoute: 'Poslední trasa',
    clicksLabel: 'Kliknutí',
    showResults: 'Zobrazit výsledky',
    leaveRace: 'Odejít ze závodu',
  },

  endGame: {
    raceOver: 'Konec',
    winnerTitle: 'Vyhrává {nickname}!',
    ended: 'Závod skončil.',
    winnerLine: '{target} za {duration} a {clicks}.',
    noPlayers: 'Žádní hráči.',
    winner: 'Vítěz',
    didNotFinish: 'nedokončeno',
    route: pluralForms({
      one: 'Trasa · {count} článek',
      few: 'Trasa · {count} články',
      other: 'Trasa · {count} článků',
    }),
    start: 'start',
    finish: 'cíl',
    raceAgain: 'Ještě jednou',
    waitingForHost: 'Čekáme, až hostitel spustí další…',
  },

  errors: {
    cannotJoin: 'Sem se připojit nedá',
    network: 'Server neodpovídá. Zkontroluj připojení a zkus to znovu.',
    timeout: 'Server odpovídal moc dlouho.',
    pickDifferentNickname: 'Zvolit jinou přezdívku',
    byCode: errorCopy({
      ROOM_NOT_FOUND: {
        title: 'Místnost neexistuje',
        message: 'Buď takový kód nikdy nebyl, nebo místnost už vypršela.',
      },
      ROOM_FULL: {
        title: 'Místnost je plná',
        message: 'Víc hráčů se do závodu nevejde.',
      },
      GAME_ALREADY_STARTED: {
        title: 'Závod už běží',
        message: 'Začalo se bez tebe. Řekni si hostiteli o odvetu.',
      },
      NICKNAME_TAKEN: {
        title: 'Přezdívka je obsazená',
        message: 'Někdo v místnosti se už tak jmenuje.',
      },
      IDENTITY_MISMATCH: {
        title: 'Konflikt identity',
        message: 'Z tohohle prohlížeče už v místnosti někdo je, akorát pod jinou identitou.',
      },
      INVALID_NAVIGATION: {
        title: 'Tah neplatí',
        message: 'Ten odkaz na článku, ze kterého jsi klikl, nebyl, takže ses nikam neposunul.',
      },
      NOT_HOST: {
        title: 'Tohle může jen hostitel',
        message: 'Řekni si tomu, kdo místnost otevřel.',
      },
      WIKI_ARTICLE_NOT_FOUND: {
        title: 'Článek nenalezen',
        message: 'Pod tímhle názvem už na Wikipedii nic není.',
      },
      WIKI_FETCH_FAILED: {
        title: 'Wikipedie neodpovídá',
        message: 'Článek se nepovedlo stáhnout. Většinou pomůže zkusit to znovu.',
      },
      INTERNAL_ERROR: {
        title: 'Něco se pokazilo',
        message: 'Server narazil na problém. Většinou pomůže zkusit to znovu.',
      },
      GAME_NOT_RUNNING: {
        title: 'Nic tu neběží',
        message: 'V téhle místnosti se právě nezávodí.',
      },
    }),
  },

  notFound: {
    title: 'Stránka nenalezena',
    message: 'Ten kód místnosti nevypadá správně, nebo taková stránka nikdy nebyla.',
  },

  appError: {
    title: 'Něco se pokazilo',
    message: 'Tuhle stránku rozbila neočekávaná chyba. Většinou pomůže zkusit to znovu.',
    retry: 'Zkusit znovu',
  },
};
