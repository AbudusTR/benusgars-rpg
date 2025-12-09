import { Zone, Enemy, Item, Rarity } from './types';

export const LEVEL_UP_BASE = 100;
export const MAX_INVENTORY_SLOTS = 20;

export const ITEMS: Record<string, Item> = {
  STICK: { id: 'stick', name: 'Wooden Stick', type: 'WEAPON', value: 5, price: 0, description: 'Better than nothing.' },
  KNIFE: { id: 'knife', name: 'Toy Knife', type: 'WEAPON', value: 12, price: 100, description: 'A classic starting weapon.' },
  GUN: { id: 'gun', name: 'Yellow Gun', type: 'WEAPON', value: 25, price: 500, description: 'Shoots pellets of justice.' },
  APPLE: { id: 'apple', name: 'Apple', type: 'HEAL', value: 20, price: 10, description: 'Heals 20 HP.' },
  PIE: { id: 'pie', name: 'Butterscotch Pie', type: 'HEAL', value: 100, price: 150, description: 'Full heal.' },
  BASIC_ARMOR: { id: 'armor_1', name: 'Leather Vest', type: 'ARMOR', value: 20, price: 200, description: '+20 Max HP' },
  IRON_ARMOR: { id: 'armor_2', name: 'Iron Plate', type: 'ARMOR', value: 50, price: 1000, description: '+50 Max HP' },
};

const Z1_ENEMIES: Enemy[] = [
  { id: 'slime', name: 'Green Slime', hp: 30, maxHp: 30, damage: 3, xpReward: 10, goldReward: 5, isBoss: false, color: '#4ade80', dropTable: [{ chance: 0.3, item: ITEMS.APPLE }] },
  { id: 'wolf', name: 'Block Wolf', hp: 50, maxHp: 50, damage: 5, xpReward: 15, goldReward: 8, isBoss: false, color: '#94a3b8', dropTable: [{ chance: 0.1, item: ITEMS.APPLE }] }
];

const Z1_BOSS: Enemy = {
  id: 'z1_boss', name: 'King Slime', hp: 200, maxHp: 200, damage: 10, xpReward: 100, goldReward: 50, isBoss: true, color: '#166534',
  dropTable: [{ chance: 1.0, item: ITEMS.KNIFE }]
};

const Z2_ENEMIES: Enemy[] = [
  { id: 'dummy', name: 'Mad Dummy', hp: 100, maxHp: 100, damage: 8, xpReward: 30, goldReward: 15, isBoss: false, color: '#fca5a5', dropTable: [{ chance: 0.2, item: ITEMS.APPLE }] },
  { id: 'guard', name: 'Royal Guard', hp: 150, maxHp: 150, damage: 12, xpReward: 45, goldReward: 25, isBoss: false, color: '#fde047', dropTable: [{ chance: 0.05, item: ITEMS.PIE }] }
];

const Z2_BOSS: Enemy = {
  id: 'z2_boss', name: 'Undying Hero', hp: 500, maxHp: 500, damage: 20, xpReward: 300, goldReward: 200, isBoss: true, color: '#2563eb',
  dropTable: [{ chance: 1.0, item: ITEMS.GUN }]
};

export const ZONES: Zone[] = [
  {
    id: 0,
    name: 'Green Fields',
    requiredTotalPower: 0,
    requiredUniqueAuras: 0,
    enemies: Z1_ENEMIES,
    boss: Z1_BOSS,
    environmentColor: '#86efac'
  },
  {
    id: 1,
    name: 'Dusty Dunes',
    requiredTotalPower: 100, // Total aura power needed
    requiredUniqueAuras: 3,   // Number of unique auras needed
    enemies: Z2_ENEMIES,
    boss: Z2_BOSS,
    environmentColor: '#fdba74'
  }
];