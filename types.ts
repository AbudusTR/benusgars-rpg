export enum GameState {
  ROAMING = 'ROAMING',
  COMBAT = 'COMBAT',
  SHOP = 'SHOP',
  INVENTORY = 'INVENTORY',
  GAMEPASS = 'GAMEPASS'
}

export enum Rarity {
  COMMON = 'Common',
  UNCOMMON = 'Uncommon',
  RARE = 'Rare',
  LEGENDARY = 'Legendary',
  MYTHICAL = 'Mythical'
}

export interface Aura {
  id: string;
  name: string;
  description: string;
  power: number;
  rarity: Rarity;
  color: string;
}

export interface Item {
  id: string;
  name: string;
  type: 'HEAL' | 'WEAPON' | 'ARMOR';
  value: number; // Heal amount or Damage or Armor HP
  price: number;
  description: string;
}

export interface PlayerStats {
  name: string;
  hp: number;
  maxHp: number;
  xp: number;
  level: number;
  gold: number;
  currentZone: number;
  dropRateMultiplier: number;
  inventory: Item[];
  auras: Aura[];
  equippedWeapon: Item | null;
  equippedArmor: Item | null;
}

export interface Enemy {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  damage: number;
  xpReward: number;
  goldReward: number;
  isBoss: boolean;
  color: string;
  dropTable: {
    chance: number;
    item?: Item;
    auraRarityCap?: Rarity;
  }[];
}

export interface Zone {
  id: number;
  name: string;
  requiredTotalPower: number;
  requiredUniqueAuras: number;
  enemies: Enemy[];
  boss: Enemy;
  environmentColor: string;
}