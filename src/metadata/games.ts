// ID一覧
// 新規IDが追加された場合はここに追記
import { Prisma } from "@prisma/client";

export type GameId =
  | "BUBBLE_ATTACK"
  | "STAR_GUARDIAN"
  | "CURVE_BALL_3D"
  | "YUMMY_JUMP"
  | "CYBER_PINBALL"
  | "NEON_BLITZ"
  | "SUPER_SNAKE"
  | "NEON_PONG"
  | "MYTHIC_MATCH"
  | "AKIBA_FC"
  | "NEON_SNAP"
  | "NINJA_GO_GO"
  | "MYTHIC_SWING";

export type PublisherId = "AKIVERSE" | "TORNYADE_GAMES";

export type WinCondition = "CHALLENGE" | "BATTLE";
export type GameType<T extends GameId> = {
  id: T;
  name: string;
  winCondition: WinCondition;
  enabled: boolean;
  sparkedEmitTerasSelf: Prisma.Decimal;
  sparkedEmitTerasOther: Prisma.Decimal;
  hotGame: boolean;
  craftRecipe: {
    minUpperCabinetGrade: number;
    minLowerCabinetGrade: number;
  };
  rarity: {
    rom: number;
    junk: number;
  };
  publisherId: PublisherId;
  order: number;
  onlyTournament: boolean;
  help: {
    description: string;
    howTo: string;
  };
  gamePath: string;
  category: string;
};

// 排出Teras量の仕様 https://www.notion.so/d126bf4313c74e3da48fcc2e30adc0b8
export const games: Record<GameId, GameType<GameId>> = {
  BUBBLE_ATTACK: {
    id: "BUBBLE_ATTACK",
    name: "Bubble Attack",
    winCondition: "BATTLE",
    enabled: true,
    sparkedEmitTerasSelf: new Prisma.Decimal(40),
    sparkedEmitTerasOther: new Prisma.Decimal(40),
    hotGame: false,
    craftRecipe: {
      minUpperCabinetGrade: 1,
      minLowerCabinetGrade: 1,
    },
    rarity: {
      rom: 1,
      junk: 1,
    },
    publisherId: "AKIVERSE",
    order: 1,
    onlyTournament: false,
    help: {
      description:
        "Complete a colour combination by slotting a bubble into the right position to dislodge bubbles from the collection in the centre of the arena to blast your opponent.",
      howTo:
        "1. Swipe your finger across the screen to aim\n2. Release to fire the bubble\n3. You have 10 seconds to complete a turn",
    },
    category: "Puzzle",
    gamePath: "/games/bubble-attack/index.html",
  },
  STAR_GUARDIAN: {
    id: "STAR_GUARDIAN",
    name: "Star Guardian",
    winCondition: "CHALLENGE",
    enabled: true,
    sparkedEmitTerasSelf: new Prisma.Decimal(40),
    sparkedEmitTerasOther: new Prisma.Decimal(40),
    hotGame: false,
    craftRecipe: {
      minUpperCabinetGrade: 1,
      minLowerCabinetGrade: 1,
    },
    rarity: {
      rom: 1,
      junk: 1,
    },
    publisherId: "AKIVERSE",
    order: 2,
    onlyTournament: false,
    help: {
      description:
        "Destroy the different electric space moles in your path and build your score. Collect upgrades as you progress to make your weapon strong",
      howTo:
        "1. Tap and swipe your finger on the screen to shoot and move the character",
    },
    category: "Shooting",
    gamePath: "/games/star-guardian/index.html",
  },
  CURVE_BALL_3D: {
    id: "CURVE_BALL_3D",
    name: "Retired Game",
    winCondition: "CHALLENGE",
    enabled: false,
    sparkedEmitTerasSelf: new Prisma.Decimal(0),
    sparkedEmitTerasOther: new Prisma.Decimal(0),
    hotGame: false,
    craftRecipe: {
      minUpperCabinetGrade: 1,
      minLowerCabinetGrade: 1,
    },
    rarity: {
      rom: 1,
      junk: 1,
    },
    publisherId: "AKIVERSE",
    order: 3,
    onlyTournament: false,
    help: {
      description:
        "Move your paddle to hit the ball and use the environment as your guide. Make a swift movement to any side while hitting the ball to make it Curve Ball! Be careful, the opponent gets smarter and faster as you play!",
      howTo:
        "1. Swipe your finger to move your paddle\n2. To return the ball, your paddle must hit the ball\n3. Whichever player reaches 10 points first, wins!",
    },
    category: "Sports",
    gamePath: "/games/curve-ball-3d/index.html",
  },
  YUMMY_JUMP: {
    id: "YUMMY_JUMP",
    name: "Yummy Jump",
    winCondition: "CHALLENGE",
    enabled: true,
    sparkedEmitTerasSelf: new Prisma.Decimal(40),
    sparkedEmitTerasOther: new Prisma.Decimal(40),
    hotGame: false,
    craftRecipe: {
      minUpperCabinetGrade: 1,
      minLowerCabinetGrade: 1,
    },
    rarity: {
      rom: 1,
      junk: 1,
    },
    publisherId: "AKIVERSE",
    order: 4,
    onlyTournament: false,
    help: {
      description:
        "Help the Yummies smash through the candy platforms and beat the target score. Discover all the Yummies in the game.",
      howTo:
        "1. Tap and hold to jump, release to stop\n2. Avoid red platforms\n3. You have limited time to reach the target score\n4. Fill the bar by building up combos and reach Supersonic mode to smash through all platforms!",
    },
    category: "Action",
    gamePath: "/games/yummy-jump/index.html",
  },
  CYBER_PINBALL: {
    id: "CYBER_PINBALL",
    name: "Cyber Pinball",
    winCondition: "CHALLENGE",
    enabled: true,
    sparkedEmitTerasSelf: new Prisma.Decimal(40),
    sparkedEmitTerasOther: new Prisma.Decimal(40),
    hotGame: false,
    craftRecipe: {
      minUpperCabinetGrade: 1,
      minLowerCabinetGrade: 1,
    },
    rarity: {
      rom: 1,
      junk: 1,
    },
    publisherId: "AKIVERSE",
    order: 5,
    onlyTournament: false,
    help: {
      description:
        "Use the paddles to keep the ball on the table for as long as possible. Knock different areas on the table to score points. Can you find secret combos to score even higher?",
      howTo:
        "1. Tap and hold to release the ball\n2. Tap the screen to move the paddle.\n3. Hit different areas of the table to score points\n4. You lose points when the ball falls off the table",
    },
    category: "Action",
    gamePath: "/games/cyber-pinball/index.html",
  },
  NEON_BLITZ: {
    id: "NEON_BLITZ",
    name: "Neon Blitz",
    winCondition: "CHALLENGE",
    enabled: true,
    sparkedEmitTerasSelf: new Prisma.Decimal(40),
    sparkedEmitTerasOther: new Prisma.Decimal(40),
    hotGame: false,
    craftRecipe: {
      minUpperCabinetGrade: 1,
      minLowerCabinetGrade: 1,
    },
    rarity: {
      rom: 1,
      junk: 1,
    },
    publisherId: "AKIVERSE",
    order: 6,
    onlyTournament: false,
    help: {
      description:
        "Each brick has a numerical count. The bricks must be smashed with balls as per their value to destroy them. Destroy all the bricks to achieve the given target.",
      howTo:
        "1. Tap and swipe your finger on the screen to aim at the bricks\n2. Release your finger to launch the balls at the bricks",
    },
    category: "Puzzle",
    gamePath: "/games/neon-blitz/index.html",
  },
  SUPER_SNAKE: {
    id: "SUPER_SNAKE",
    name: "Super Snake",
    winCondition: "BATTLE",
    enabled: true,
    sparkedEmitTerasSelf: new Prisma.Decimal(40),
    sparkedEmitTerasOther: new Prisma.Decimal(40),
    hotGame: false,
    craftRecipe: {
      minUpperCabinetGrade: 1,
      minLowerCabinetGrade: 1,
    },
    rarity: {
      rom: 1,
      junk: 1,
    },
    publisherId: "AKIVERSE",
    order: 7,
    onlyTournament: false,
    help: {
      description:
        "Get your snake to eat food to score points. Collect power-ups to score even more. Beware, don’t crash into your opponent or even yourself, as that would result in you losing points!",
      howTo:
        "1. Swipe to change snake’s direction\n2. Collect food\n3. Avoid crashing into opponent of yourself",
    },
    category: "Action",
    gamePath: "/games/super-snake/index.html",
  },
  NEON_PONG: {
    id: "NEON_PONG",
    name: "Neon Pong",
    winCondition: "BATTLE",
    enabled: true,
    sparkedEmitTerasSelf: new Prisma.Decimal(40),
    sparkedEmitTerasOther: new Prisma.Decimal(40),
    hotGame: false,
    craftRecipe: {
      minUpperCabinetGrade: 1,
      minLowerCabinetGrade: 1,
    },
    rarity: {
      rom: 1,
      junk: 1,
    },
    publisherId: "AKIVERSE",
    order: 8,
    onlyTournament: false,
    help: {
      description:
        "Move your paddle to hit the ball back towards your opponent. Miss the ball and lose a point. Collect powers along the way to help you win. Beware, your opponent can pick powers too!",
      howTo: "1. Swipe your finger across the screen to control your paddle",
    },
    category: "Sports",
    gamePath: "/games/neon-pong/index.html",
  },
  MYTHIC_MATCH: {
    id: "MYTHIC_MATCH",
    name: "Mythic Match",
    winCondition: "BATTLE",
    enabled: true,
    sparkedEmitTerasSelf: new Prisma.Decimal(40),
    sparkedEmitTerasOther: new Prisma.Decimal(40),
    hotGame: false,
    craftRecipe: {
      minUpperCabinetGrade: 2,
      minLowerCabinetGrade: 1,
    },
    rarity: {
      rom: 2,
      junk: 2,
    },
    publisherId: "AKIVERSE",
    order: 9,
    onlyTournament: false,
    help: {
      description:
        "Make matches as much and as fast as you can to beat the opponent!",
      howTo:
        "1. Pick the right warrior that matches your play style\n2. Swipe to make matches of 3 or more gems\n3. Make matches of 4 or more gems to generate Power Ups\n4. Combine Power Ups for a bigger blast!",
    },
    category: "Puzzle",
    gamePath: "/games/mythic-match/index.html",
  },
  AKIBA_FC: {
    id: "AKIBA_FC",
    name: "AKIBA FC",
    winCondition: "CHALLENGE",
    enabled: true,
    sparkedEmitTerasSelf: new Prisma.Decimal(40),
    sparkedEmitTerasOther: new Prisma.Decimal(40),
    hotGame: false,
    craftRecipe: {
      minUpperCabinetGrade: 1,
      minLowerCabinetGrade: 2,
    },
    rarity: {
      rom: 2,
      junk: 2,
    },
    publisherId: "AKIVERSE",
    order: 10,
    onlyTournament: false,
    help: {
      description:
        "Achieve the score target by kicking the ball at the right time and scoring goals to win!",
      howTo:
        "1. Tap screen to kick the ball\n2. Make sure to kick the ball on time by matching it with the guide\n3. You lose time when missing the ball\n4. Score goals by timing the kick to perfection and earn bonus points!",
    },
    category: "Sports",
    gamePath: "/games/akiba-fc/index.html",
  },
  NEON_SNAP: {
    id: "NEON_SNAP",
    name: "Neon Snap",
    winCondition: "CHALLENGE",
    enabled: true,
    sparkedEmitTerasSelf: new Prisma.Decimal(40),
    sparkedEmitTerasOther: new Prisma.Decimal(40),
    hotGame: true,
    craftRecipe: {
      minUpperCabinetGrade: 1,
      minLowerCabinetGrade: 2,
    },
    rarity: {
      rom: 2,
      junk: 2,
    },
    publisherId: "AKIVERSE",
    order: 11,
    onlyTournament: false,
    help: {
      description:
        "Place the puzzle pieces correctly on the board to score points. Fill a line to destroy it.\nCareful, it’s game over if you have no space to add new pieces to the board!",
      howTo:
        "1. Drag one of the three pieces at the bottom to the board\n2. Fill a line to clear it so that you can create more empty spaces\n3. Placing puzzle pieces on stars gives you bonus points!\n4. Achieve the target score to win!",
    },
    category: "Puzzle",
    gamePath: "/games/neon-snap/index.html",
  },
  NINJA_GO_GO: {
    id: "NINJA_GO_GO",
    name: "Ninja GoGo",
    winCondition: "BATTLE",
    enabled: true,
    sparkedEmitTerasSelf: new Prisma.Decimal(40),
    sparkedEmitTerasOther: new Prisma.Decimal(40),
    hotGame: true,
    craftRecipe: {
      minUpperCabinetGrade: 2,
      minLowerCabinetGrade: 1,
    },
    rarity: {
      rom: 2,
      junk: 2,
    },
    publisherId: "TORNYADE_GAMES",
    order: 12,
    onlyTournament: false,
    help: {
      description:
        "Choose your favorite from four unique NyankoHeroes and battle your way upwards by defeating mobs. Each defeated enemy drops power-up items that boost your hero’s abilities, setting you up for the ultimate showdown with the boss!",
      howTo:
        "1. Swipe up to perform a regular jump.\n2. Swipe up again while in mid-air to execute a double jump.\n3. Tap and hold near an enemy to attack.\n4. Defeat all mobs as you ascend the stage and prepare to face the boss!",
    },
    category: "Action",
    gamePath: "/games/ninja-go-go/index.html",
  },
  MYTHIC_SWING: {
    id: "MYTHIC_SWING",
    name: "Mythic Swing",
    winCondition: "CHALLENGE",
    enabled: true,
    sparkedEmitTerasSelf: new Prisma.Decimal(40),
    sparkedEmitTerasOther: new Prisma.Decimal(40),
    hotGame: true,
    craftRecipe: {
      minUpperCabinetGrade: 2,
      minLowerCabinetGrade: 1,
    },
    rarity: {
      rom: 2,
      junk: 2,
    },
    publisherId: "AKIVERSE",
    order: 13,
    onlyTournament: true,
    help: {
      description:
        "Swing by tapping on the screen to collect coins while moving forward in search of the BIG gem. Achieve the target score by first finding, then capturing the big gem to win!",
      howTo:
        "1. Tap to latch rope to an anchor point\n2. Release to detach from the anchor point\n3. Use your momentum to move forward\n4. Collect coins, bonus while moving forward in search of the BIG gem\n5. Find and capture the BIG gem to win in the allotted time.\n6. Fall into the lava at the bottom and it’s game over!",
    },
    category: "Action",
    gamePath: "/games/mythic-swing/index.html",
  },
};
