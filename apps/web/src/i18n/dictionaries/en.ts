import { errorCopy } from '@/i18n/error-copy';
import { pluralForms } from '@/i18n/plural';

/**
 * Every string the interface can show, in the language the project is written
 * in. This object is also the type every other dictionary has to satisfy, so a
 * translation that forgets a key fails the build rather than the user.
 *
 * Only server components import it. Client components read the active locale's
 * copy out of the i18n context, which keeps the other translations out of the
 * browser bundle.
 */
export const en = {
  meta: {
    title: 'WikiConn - race through Wikipedia',
    description:
      'A browser game for two to five players. Get from one Wikipedia article to another using only the links inside them. No accounts, no downloads, free.',
    keywords: [
      'wikipedia race',
      'wikirace',
      'wiki game',
      'wikipedia game',
      'wikipedia speedrun',
      'multiplayer browser game',
      'wiki golf',
      'six degrees of wikipedia',
    ],
    ogImageAlt:
      'The WikiConn logo above the words "Race through Wikipedia", with a chain of article names running from Albert Einstein to Pizza.',
    lobbyTitle: 'The starting line',
    playTitle: 'Racing',
  },

  chrome: {
    skipToContent: 'Skip to content',
    tagline: 'The Wikipedia racing game',
    backToHome: 'Back to home',
    loading: 'Loading…',
    appearance: 'Appearance',
    language: 'Language',
    languageNames: { en: 'English', cs: 'Čeština' },
    theme: { light: 'Light', dark: 'Dark', system: 'Match system' },
    footer: {
      attributionPrefix: 'Article text and images come from Wikipedia and stay available under',
      licence: 'CC BY-SA 4.0',
      disclaimer:
        'WikiConn is an independent hobby project with no connection to the Wikimedia Foundation.',
      source: 'Source on GitHub',
    },
  },

  home: {
    title: 'Race through Wikipedia.',
    lede: 'Two to five players, one starting article, one target. Whoever clicks their way there first wins. It runs in a browser tab and asks for nothing but a nickname.',
    create: {
      heading: 'Start a new race',
      body: 'You are the host, so you pick: the language, both articles, and how much everyone sees of everyone else mid-race.',
      button: 'Create room',
      busy: 'Creating room…',
      failed: 'Could not create the room',
    },
    join: {
      heading: 'Join a friend',
      body: 'Paste the code you were given, or the whole invite link.',
      label: 'Room code',
      placeholder: 'ABCDEF',
      submit: 'Join',
      invalid: 'That code will not do. Six characters, letters A-Z and digits 2-9.',
    },
    whatIs: {
      heading: 'What is a Wikipedia race?',
      paragraphs: [
        'The rule fits on one line. Get from one article to another using only the links inside them. No search box, no address bar, and no crawling back to the front page when you run out of ideas.',
        'The short path is almost never the obvious one. Send two people from Albert Einstein to Pizza and they set off in opposite directions, each certain the other is wasting clicks. Physics is a dead end. The violin gets you there in three.',
        'People have been playing this in browsers for twenty years under a dozen names. Wiki race. Wiki golf. Wikipedia speedrun. WikiConn is the one that keeps score: it checks that every hop was a link you could actually have clicked, runs the clock, and lays everybody’s route out side by side the second someone arrives. Reading the routes is usually better than winning.',
      ],
    },
    howItWorks: {
      heading: 'How it works',
      steps: [
        {
          title: 'Create and share',
          body: 'Open a room, pick where the race starts and where it ends, then send the six-character code round.',
        },
        {
          title: 'Click your way there',
          body: 'Only the links inside the article you are on. That is the whole game.',
        },
        {
          title: 'First one home wins',
          body: 'And then everyone sees everyone else’s route, clicks and time. Detours included.',
        },
      ],
    },
    faq: {
      heading: 'Common questions',
      entries: [
        {
          question: 'How many players can join one race?',
          answer:
            'Two to five. Everyone starts from the same article at the same moment, and all anybody needs is the six-character code.',
        },
        {
          question: 'Do I need an account, or have to install something?',
          answer:
            'No. It asks for a nickname, not an email. Nothing outlives the room, and the room is gone after a day of silence.',
        },
        {
          question: 'Which Wikipedia languages can we race in?',
          answer:
            'English and Czech. The host picks one while setting the room up and everybody reads that edition.',
        },
        {
          question: 'What stops someone from just searching for the target?',
          answer:
            'The page arrives without a search box, and the server checks every move against the article you were standing on. A link that was not there does not count. Middle-clicking out to a new tab does not work either.',
        },
        {
          question: 'Can players see where their rivals are?',
          answer:
            'As much as the host allows. Current article, click count and live route are three separate switches. The finish screen ignores all three.',
        },
        {
          question: 'Does it work on a phone?',
          answer: 'Yes. Passing the code around a table is how most races start.',
        },
      ],
    },
  },

  lobby: {
    title: 'The starting line',
    subtitleHost: 'The room is yours. Set the route, then start when everyone is in.',
    subtitleGuest:
      'The host is picking the route. Sit tight, the race starts for everyone at once.',
    codeLabel: 'Room code',
    copyCode: 'Copy code',
    copyLink: 'Copy invite link',
    copied: 'Copied',
    copyBlockedCode: 'Copying is blocked here. The code is {value}',
    copyBlockedLink: 'Copying is blocked here. The link is {value}',
    connected: 'Connected',
    connecting: 'Connecting…',
    settingsPanel: 'Race settings',
    loadingRoom: 'Loading the room…',
    playersPanel: 'Players',
    waitingForPlayers: 'Waiting for players…',
    leave: 'Leave',
    you: '(you)',
    host: 'Host',
    disconnected: 'Disconnected',
  },

  nickname: {
    title: 'What should we call you?',
    description:
      'This is the name the other racers see. It stays in this browser, no account and no email.',
    label: 'Nickname',
    placeholder: 'Ada',
    hint: '{min}-{max} characters.',
    submit: 'Go in',
  },

  settings: {
    editionLegend: 'Which Wikipedia',
    editionNames: { en: 'English Wikipedia', cs: 'Czech Wikipedia' },
    startLabel: 'Start',
    startHint: 'Where everyone sets off.',
    finishLabel: 'Finish',
    finishHint: 'First to open it wins.',
    visibilityLegend: 'What racers see of each other',
    visibilityRows: {
      showCurrentArticle: {
        label: 'Current article',
        description: 'Who is reading what, right now.',
      },
      showClickCount: {
        label: 'Click count',
        description: 'How many links each racer has followed.',
      },
      showFullPath: {
        label: 'Live route',
        description: 'Every hop shows up the moment it happens.',
      },
    },
    startRace: 'Start the race',
    blockerPickBoth: 'Pick a start and a finish.',
    blockerSameArticle: 'Start and finish have to be different articles.',
    blockerWaiting: pluralForms({
      one: 'One more player needed…',
      other: '{count} more players needed…',
    }),
    guestNote: 'Only the host changes these. The race starts for everyone at once.',
  },

  picker: {
    searchPlaceholder: 'Search {lang} Wikipedia…',
    random: 'Random article',
    randomPick: 'Pick a random article',
    randomAnother: 'Draw another one',
    randomFailed: 'Could not draw an article',
    clear: 'Clear',
    clearNamed: 'Clear {label}',
    suggestions: '{label} suggestions',
    nothingFound: 'Nothing found for “{query}”.',
  },

  play: {
    joining: 'Joining the race…',
    reconnecting: 'Connection lost, reconnecting…',
    target: 'Target',
    elapsed: 'Time',
    clicksUsed: 'Clicks',
    finished: 'Finished',
    loadingArticle: 'Loading article',
    articleFailed: 'That article would not load.',
    articleFailedInline: 'That article would not open, so you are still on the previous one.',
    articleLoadFailed: 'Could not load the article',
    tryAgain: 'Try again',
    racersSection: 'Racers',
    racersHeading: 'Racers ({count})',
    noRacers: 'No racers yet.',
    hiddenByHost: 'the host hid this',
    clicks: pluralForms({ one: '{count} click', other: '{count} clicks' }),
    currentlyReading: 'Currently reading',
    recentRoute: 'Recent route',
    clicksLabel: 'Clicks',
    showResults: 'Show results',
    leaveRace: 'Leave the race',
  },

  endGame: {
    raceOver: 'Race over',
    winnerTitle: '{nickname} wins!',
    ended: 'The race has ended.',
    winnerLine: 'Reached {target} in {duration}, on {clicks}.',
    noPlayers: 'No players.',
    winner: 'Winner',
    didNotFinish: 'did not finish',
    route: pluralForms({ one: 'Route · {count} article', other: 'Route · {count} articles' }),
    start: 'start',
    finish: 'finish',
    raceAgain: 'Race again',
    waitingForHost: 'Waiting for the host to start another one…',
  },

  errors: {
    cannotJoin: 'Cannot join this room',
    network: 'The server is not answering. Check your connection and have another go.',
    timeout: 'The server took too long to answer.',
    pickDifferentNickname: 'Pick a different nickname',
    byCode: errorCopy({
      ROOM_NOT_FOUND: {
        title: 'Room not found',
        message: 'Either that code was never a room, or the room has expired.',
      },
      ROOM_FULL: {
        title: 'Room is full',
        message: 'This race already has as many players as it takes.',
      },
      GAME_ALREADY_STARTED: {
        title: 'Race already under way',
        message: 'They started without you. Ask the host for a rematch.',
      },
      NICKNAME_TAKEN: {
        title: 'Nickname taken',
        message: 'Somebody in this room is already going by that name.',
      },
      IDENTITY_MISMATCH: {
        title: 'Identity conflict',
        message: 'This browser is already in the room under a different identity.',
      },
      INVALID_NAVIGATION: {
        title: 'That move did not count',
        message: 'That link was not on the article you were standing on, so you have not moved.',
      },
      NOT_HOST: {
        title: 'Only the host can do that',
        message: 'Ask whoever opened the room to change it.',
      },
      WIKI_ARTICLE_NOT_FOUND: {
        title: 'Article not found',
        message: 'Wikipedia has nothing under that title any more.',
      },
      WIKI_FETCH_FAILED: {
        title: 'Wikipedia is not answering',
        message: 'The article could not be fetched. Trying again usually helps.',
      },
      INTERNAL_ERROR: {
        title: 'Something went wrong',
        message: 'The server ran into a problem. Trying again usually helps.',
      },
      GAME_NOT_RUNNING: {
        title: 'No race running',
        message: 'Nobody is racing in this room at the moment.',
      },
    }),
  },

  notFound: {
    title: 'Page not found',
    message: 'That room code does not look right, or the page never existed.',
  },

  appError: {
    title: 'Something went wrong',
    message: 'An unexpected error broke this page. Trying again usually helps.',
    retry: 'Try again',
  },
};

export type Dictionary = typeof en;
