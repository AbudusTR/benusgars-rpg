import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, PlayerStats, Enemy, Item, Aura, Rarity } from './types';
import { ZONES, ITEMS, LEVEL_UP_BASE, MAX_INVENTORY_SLOTS } from './constants';
import GameScene from './components/GameScene';
import { Sword, Heart, Shield, Backpack, ShoppingBag, Map, X, Sparkles, Skull, ShoppingCart, Zap, Key, Save, RotateCcw } from 'lucide-react';
import { generateAuraDetails } from './services/gemini';
import BlockCharacter from './components/BlockCharacter'; // Imported for particle effect visual logic if needed

// --- HELPER COMPONENTS (Inline for single-file constraints in standard structure, but organized) ---

const Modal = ({ title, onClose, children }: { title: string, onClose: () => void, children?: React.ReactNode }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
    <div className="bg-slate-900 border-2 border-white w-11/12 max-w-2xl p-6 rounded-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-6 border-b-2 border-slate-700 pb-2">
        <h2 className="text-2xl font-bold text-white pixel-font">{title}</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition"><X size={24} /></button>
      </div>
      {children}
    </div>
  </div>
);

const INITIAL_PLAYER_STATE: PlayerStats = {
    name: 'Ben_Usgar',
    hp: 100,
    maxHp: 100,
    xp: 0,
    level: 1,
    gold: 0,
    currentZone: 0,
    dropRateMultiplier: 1,
    inventory: [ITEMS.STICK, ITEMS.APPLE],
    auras: [],
    equippedWeapon: ITEMS.STICK,
    equippedArmor: null
};

const App: React.FC = () => {
  // --- STATE ---
  const [gameState, setGameState] = useState<GameState>(GameState.ROAMING);
  
  // Player State with Load Logic
  const [player, setPlayer] = useState<PlayerStats>(() => {
    try {
        const saved = localStorage.getItem('aura_chronicles_save');
        return saved ? { ...INITIAL_PLAYER_STATE, ...JSON.parse(saved) } : INITIAL_PLAYER_STATE;
    } catch (e) {
        console.error("Save data error", e);
        return INITIAL_PLAYER_STATE;
    }
  });

  // Combat State
  const [currentEnemy, setCurrentEnemy] = useState<Enemy | null>(null);
  const [combatLog, setCombatLog] = useState<string[]>([]);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [combatMenuState, setCombatMenuState] = useState<'MAIN' | 'ITEM' | 'ATTACK_MINIGAME'>('MAIN');
  const [attackBarPos, setAttackBarPos] = useState(0);
  const attackAnimRef = useRef<number>();

  // Notifications
  const [notification, setNotification] = useState<string | null>(null);

  // --- GAMEPLAY LOGIC ---

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // Auto-Save Effect
  useEffect(() => {
    const saveState = () => {
        localStorage.setItem('aura_chronicles_save', JSON.stringify(player));
    };
    saveState();
  }, [player.xp, player.gold, player.inventory, player.auras, player.currentZone, player.level, player.equippedWeapon, player.equippedArmor]);

  const manualSave = () => {
      localStorage.setItem('aura_chronicles_save', JSON.stringify(player));
      showNotification("Game Saved Successfully!");
  };

  const resetGame = () => {
      if(confirm("Are you sure you want to reset all progress? This cannot be undone.")) {
          localStorage.removeItem('aura_chronicles_save');
          setPlayer(INITIAL_PLAYER_STATE);
          setGameState(GameState.ROAMING);
          showNotification("Save Data Reset.");
      }
  };

  const calculateRequiredXp = (lvl: number) => Math.floor(LEVEL_UP_BASE * Math.pow(1.2, lvl - 1));

  const addXp = (amount: number) => {
    setPlayer(prev => {
      let newXp = prev.xp + amount;
      let newLevel = prev.level;
      let newMaxHp = prev.maxHp;
      let leveledUp = false;

      while (newXp >= calculateRequiredXp(newLevel)) {
        newXp -= calculateRequiredXp(newLevel);
        newLevel++;
        newMaxHp += 10;
        leveledUp = true;
      }

      if (leveledUp) showNotification(`Level Up! You are now level ${newLevel}`);

      return {
        ...prev,
        xp: newXp,
        level: newLevel,
        maxHp: newMaxHp,
        hp: leveledUp ? newMaxHp : Math.min(prev.hp, newMaxHp) // Heal on level up
      };
    });
  };

  const addToInventory = (item: Item) => {
    setPlayer(prev => {
      if (prev.inventory.length >= MAX_INVENTORY_SLOTS) {
        showNotification("Inventory Full!");
        return prev;
      }
      return { ...prev, inventory: [...prev.inventory, item] };
    });
  };

  const startCombat = (enemyTemplate: Enemy) => {
    // Clone enemy so we don't modify the constant
    setCurrentEnemy({ ...enemyTemplate });
    setGameState(GameState.COMBAT);
    setCombatMenuState('MAIN');
    setIsPlayerTurn(true);
    setCombatLog([`You encountered ${enemyTemplate.name}!`]);
  };

  // --- COMBAT SYSTEM ---

  const handleRun = () => {
    const success = Math.random() > 0.3;
    if (success) {
        setCombatLog(prev => [...prev, `${player.name} ran away...`]);
        setTimeout(() => {
            setGameState(GameState.ROAMING);
            setCurrentEnemy(null);
        }, 1000);
    } else {
        setCombatLog(prev => [...prev, "Couldn't escape!"]);
        setIsPlayerTurn(false);
    }
  };

  const handleUseItem = (item: Item, index: number) => {
    if (item.type === 'HEAL') {
      const healAmount = item.value;
      setPlayer(prev => {
        const newInventory = [...prev.inventory];
        newInventory.splice(index, 1);
        return {
          ...prev,
          hp: Math.min(prev.maxHp, prev.hp + healAmount),
          inventory: newInventory
        };
      });
      setCombatLog(prev => [...prev, `Used ${item.name}. Healed ${healAmount} HP.`]);
      setIsPlayerTurn(false);
      setCombatMenuState('MAIN');
    }
  };

  const startAttack = () => {
    setCombatMenuState('ATTACK_MINIGAME');
    // Start sliding bar logic
    const startTime = Date.now();
    const animate = () => {
        const elapsed = Date.now() - startTime;
        // Simple ping pong 0-100
        const duration = 1000; // 1 second loop
        const raw = (elapsed % duration) / duration;
        const pos = raw < 0.5 ? raw * 200 : (1 - raw) * 200; // 0 to 100 back to 0
        setAttackBarPos(pos);
        attackAnimRef.current = requestAnimationFrame(animate);
    };
    attackAnimRef.current = requestAnimationFrame(animate);
  };

  const confirmAttack = () => {
    if (attackAnimRef.current) cancelAnimationFrame(attackAnimRef.current);
    
    // 50 is center (0-100 scale in logic, mapped to UI width)
    const accuracy = 100 - Math.abs(50 - attackBarPos) * 2; // 100 is perfect, 0 is miss
    const baseDmg = player.equippedWeapon ? player.equippedWeapon.value : 1;
    const finalDmg = Math.max(0, Math.floor((baseDmg + (player.level * 2)) * (accuracy / 100)));

    setCombatLog(prev => [...prev, `You hit for ${finalDmg} damage!`]);

    if (currentEnemy) {
        const newHp = currentEnemy.hp - finalDmg;
        if (newHp <= 0) {
            handleVictory();
        } else {
            setCurrentEnemy({ ...currentEnemy, hp: newHp });
            setIsPlayerTurn(false);
            setCombatMenuState('MAIN');
        }
    }
  };

  const handleVictory = async () => {
    if (!currentEnemy) return;

    setCombatLog(prev => [...prev, `Victory! Gained ${currentEnemy.xpReward} XP.`]);
    
    // XP & Gold
    addXp(currentEnemy.xpReward);
    setPlayer(p => ({...p, gold: p.gold + currentEnemy.goldReward}));

    // Drops
    // 1. Items
    currentEnemy.dropTable.forEach(drop => {
        if (drop.item && Math.random() < (drop.chance * player.dropRateMultiplier)) {
            addToInventory(drop.item);
            showNotification(`Dropped: ${drop.item.name}`);
        }
    });

    // 2. Auras (Special Drop Logic)
    // 10% chance to trigger aura roll
    if (Math.random() < 0.1) {
        const rarityRoll = Math.random();
        let rarity = Rarity.COMMON;
        let power = 10;
        
        if (rarityRoll > 0.98) { rarity = Rarity.MYTHICAL; power = 10000; }
        else if (rarityRoll > 0.90) { rarity = Rarity.LEGENDARY; power = 1000; }
        else if (rarityRoll > 0.75) { rarity = Rarity.RARE; power = 100; }
        else if (rarityRoll > 0.50) { rarity = Rarity.UNCOMMON; power = 50; }

        const zoneName = ZONES[player.currentZone].name;
        // Call Gemini for flavor
        const details = await generateAuraDetails(rarity, zoneName);
        
        const newAura: Aura = {
            id: Math.random().toString(36).substr(2, 9),
            name: details.name,
            description: details.description,
            power: power * (Math.random() * 0.5 + 0.75), // Variance
            rarity: rarity,
            color: rarity === Rarity.LEGENDARY ? 'gold' : 'cyan'
        };

        setPlayer(prev => ({
            ...prev,
            auras: [...prev.auras, newAura]
        }));
        showNotification(`AURA OBTAINED: ${newAura.name} (${rarity})`);
    }

    setTimeout(() => {
        setGameState(GameState.ROAMING);
        setCurrentEnemy(null);
    }, 2000);
  };

  // Enemy Turn Effect
  useEffect(() => {
    if (gameState === GameState.COMBAT && !isPlayerTurn && currentEnemy && currentEnemy.hp > 0) {
        const timer = setTimeout(() => {
            const dmg = Math.max(1, currentEnemy.damage - (player.equippedArmor ? (player.equippedArmor.value / 10) : 0)); // Armor reduces dmg slightly
            const actualDmg = Math.floor(dmg);
            
            setPlayer(prev => ({
                ...prev,
                hp: Math.max(0, prev.hp - actualDmg)
            }));
            
            setCombatLog(prev => [...prev, `${currentEnemy.name} attacks! Took ${actualDmg} dmg.`]);

            if (player.hp - actualDmg <= 0) {
                // Player Death
                setGameState(GameState.ROAMING);
                setPlayer(prev => ({ ...prev, hp: prev.maxHp, xp: Math.floor(prev.xp * 0.8) })); // Respawn penalty
                showNotification("You died! Lost some XP.");
                setCurrentEnemy(null);
            } else {
                setIsPlayerTurn(true);
            }

        }, 1500);
        return () => clearTimeout(timer);
    }
  }, [isPlayerTurn, gameState, currentEnemy, player.hp, player.equippedArmor]);


  // --- ZONE TRAVERSAL ---
  const tryChangeZone = (direction: 'next' | 'prev') => {
    const nextZoneId = player.currentZone + (direction === 'next' ? 1 : -1);
    
    if (nextZoneId < 0 || nextZoneId >= ZONES.length) return;

    const targetZone = ZONES[nextZoneId];
    
    if (direction === 'next') {
        const totalPower = player.auras.reduce((acc, curr) => acc + curr.power, 0);
        const uniqueAuras = new Set(player.auras.map(a => a.name)).size; // Simplified unique check by name

        if (totalPower < targetZone.requiredTotalPower) {
            showNotification(`Need ${targetZone.requiredTotalPower} Total Aura Power! (Current: ${totalPower.toFixed(0)})`);
            return;
        }
        if (uniqueAuras < targetZone.requiredUniqueAuras) {
            showNotification(`Need ${targetZone.requiredUniqueAuras} Unique Auras! (Current: ${uniqueAuras})`);
            return;
        }
    }

    setPlayer(prev => ({ ...prev, currentZone: nextZoneId }));
    showNotification(`Entered ${targetZone.name}`);
  };

  // --- RENDERING HELPERS ---
  const currentZoneData = ZONES[player.currentZone];

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black text-white select-none">
      {/* 3D LAYER */}
      <GameScene 
        gameState={gameState} 
        currentZoneColor={currentZoneData.environmentColor}
        currentEnemy={currentEnemy}
      />

      {/* --- UI OVERLAY --- */}

      {/* HUD: Left Top - Player Stats (Undertaleish position modified for better web ux) */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
         <div className="bg-black/80 border-2 border-white p-3 rounded-lg min-w-[200px]">
             <div className="flex justify-between items-center mb-2">
                 <span className="font-bold text-yellow-400 pixel-font">{player.name}</span>
                 <span className="text-xs text-gray-400">LV {player.level}</span>
             </div>
             
             {/* HP Bar */}
             <div className="flex items-center gap-2 mb-1">
                 <span className="text-xs font-bold w-6">HP</span>
                 <div className="w-full h-4 bg-red-900 rounded overflow-hidden border border-white/20">
                     <div 
                        className="h-full bg-yellow-400" 
                        style={{ width: `${(player.hp / player.maxHp) * 100}%` }} 
                     />
                 </div>
                 <span className="text-xs">{player.hp}/{player.maxHp}</span>
             </div>
             
             {/* XP Bar */}
             <div className="flex items-center gap-2">
                 <span className="text-xs font-bold w-6">XP</span>
                 <div className="w-full h-2 bg-slate-800 rounded overflow-hidden">
                     <div 
                        className="h-full bg-blue-400" 
                        style={{ width: `${(player.xp / calculateRequiredXp(player.level)) * 100}%` }} 
                     />
                 </div>
             </div>
             <div className="mt-2 text-xs flex gap-2">
                <span className="text-yellow-200">Gold: {player.gold}</span>
             </div>

             {/* Save Controls */}
             <div className="mt-2 flex gap-2 border-t border-white/20 pt-2">
                <button onClick={manualSave} className="p-1 text-slate-300 hover:text-green-400 hover:bg-white/10 rounded transition" title="Save Game">
                    <Save size={18}/>
                </button>
                <button onClick={resetGame} className="p-1 text-slate-300 hover:text-red-400 hover:bg-white/10 rounded transition" title="Reset Progress">
                    <RotateCcw size={18}/>
                </button>
                <span className="text-[10px] text-gray-500 self-center ml-auto">Auto-Save On</span>
             </div>
         </div>

         {/* Zone Info */}
         <div className="bg-black/60 border border-white/50 p-2 rounded text-xs">
            <h3 className="font-bold">{currentZoneData.name}</h3>
            {player.currentZone < ZONES.length - 1 && (
                <div className="text-gray-300 mt-1">
                    Next Zone: {ZONES[player.currentZone + 1].requiredTotalPower} Pwr / {ZONES[player.currentZone + 1].requiredUniqueAuras} Auras
                </div>
            )}
         </div>
      </div>

      {/* HUD: Bottom Controls (Roaming) */}
      {gameState === GameState.ROAMING && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex gap-4">
            <button 
                onClick={() => setGameState(GameState.INVENTORY)}
                className="bg-slate-800 p-3 rounded-full border-2 border-white hover:bg-slate-700 hover:scale-105 transition group"
            >
                <Backpack className="group-hover:text-yellow-400" />
            </button>
            <button 
                onClick={() => {
                   // Find random enemy
                   const rand = Math.random();
                   const enemies = currentZoneData.enemies;
                   const enemy = enemies[Math.floor(rand * enemies.length)];
                   // 10% Boss chance if last enemy died or manual trigger logic (simplified here to random encounter button)
                   const isBoss = Math.random() < 0.05;
                   startCombat(isBoss ? currentZoneData.boss : enemy);
                }}
                className="bg-red-600 px-8 py-3 rounded-xl border-2 border-white font-bold text-lg hover:bg-red-500 hover:scale-105 transition shadow-lg shadow-red-900/50 pixel-font flex items-center gap-2"
            >
               <Sword size={20} /> HUNT
            </button>
            <button 
                 onClick={() => setGameState(GameState.SHOP)}
                 className="bg-slate-800 p-3 rounded-full border-2 border-white hover:bg-slate-700 hover:scale-105 transition group"
            >
                <ShoppingCart className="group-hover:text-green-400" />
            </button>
             <button 
                 onClick={() => setGameState(GameState.GAMEPASS)}
                 className="bg-purple-800 p-3 rounded-full border-2 border-white hover:bg-purple-700 hover:scale-105 transition group"
            >
                <Sparkles className="group-hover:text-pink-400" />
            </button>
        </div>
      )}

      {/* Navigation Buttons */}
      {gameState === GameState.ROAMING && (
          <>
            {player.currentZone > 0 && (
                 <button 
                    onClick={() => tryChangeZone('prev')}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 p-4 rounded hover:bg-black/80 border border-white/20"
                 >
                    Prev Zone
                 </button>
            )}
            {player.currentZone < ZONES.length - 1 && (
                 <button 
                    onClick={() => tryChangeZone('next')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 p-4 rounded hover:bg-black/80 border border-white/20"
                 >
                    Next Zone
                 </button>
            )}
          </>
      )}

      {/* --- COMBAT UI --- */}
      {gameState === GameState.COMBAT && currentEnemy && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-3xl z-20">
            {/* Enemy HP (Top Right per prompt) - Actually placing it absolute top right relative to screen */}
            <div className="absolute -top-[70vh] right-[-20vw] w-64 bg-black/80 border-2 border-red-500 p-3 rounded transform rotate-1">
                <div className="flex justify-between font-bold mb-1">
                    <span className="uppercase">{currentEnemy.name}</span>
                </div>
                <div className="w-full bg-red-900 h-6 border border-white/30">
                    <div className="bg-green-500 h-full transition-all duration-300" style={{ width: `${(currentEnemy.hp / currentEnemy.maxHp) * 100}%` }}></div>
                </div>
            </div>

            {/* Main Battle Box */}
            <div className="bg-black border-4 border-white p-6 rounded-lg shadow-2xl min-h-[200px] flex flex-col relative">
                
                {/* Combat Log Area */}
                <div className="flex-grow mb-4 font-mono text-lg leading-relaxed h-24 overflow-hidden">
                     {combatMenuState === 'ATTACK_MINIGAME' ? (
                         <div className="w-full h-full flex items-center justify-center flex-col">
                             <div className="w-full h-8 bg-slate-800 border-2 border-white relative overflow-hidden cursor-pointer" onClick={confirmAttack}>
                                 {/* Center Target */}
                                 <div className="absolute left-1/2 top-0 bottom-0 w-4 -ml-2 bg-red-500/50 z-0"></div>
                                 {/* Moving Bar */}
                                 <div 
                                    className="absolute top-0 bottom-0 w-3 bg-white shadow-[0_0_10px_white] z-10"
                                    style={{ left: `${attackBarPos}%` }}
                                 ></div>
                             </div>
                             <p className="mt-2 text-sm text-gray-400">Click to hit center!</p>
                         </div>
                     ) : (
                         combatLog.slice(-2).map((log, i) => <div key={i}>* {log}</div>)
                     )}
                </div>

                {/* Buttons: Fight, Item, Run (Top Left of control area logic) */}
                <div className="grid grid-cols-3 gap-4 border-t-2 border-white pt-4">
                     <button 
                        disabled={!isPlayerTurn || combatMenuState !== 'MAIN'}
                        onClick={startAttack}
                        className="flex items-center justify-center gap-2 py-4 border-2 border-orange-500 text-orange-500 font-bold text-xl hover:bg-orange-500 hover:text-white uppercase pixel-font disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-orange-500"
                     >
                        <Sword /> FIGHT
                     </button>
                     
                     <button 
                        disabled={!isPlayerTurn || combatMenuState !== 'MAIN'}
                        onClick={() => setCombatMenuState('ITEM')}
                        className="flex items-center justify-center gap-2 py-4 border-2 border-blue-500 text-blue-500 font-bold text-xl hover:bg-blue-500 hover:text-white uppercase pixel-font disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-blue-500"
                     >
                        <ShoppingBag /> ITEM
                     </button>

                     <button 
                        disabled={!isPlayerTurn || combatMenuState !== 'MAIN'}
                        onClick={handleRun}
                        className="flex items-center justify-center gap-2 py-4 border-2 border-gray-500 text-gray-500 font-bold text-xl hover:bg-gray-500 hover:text-white uppercase pixel-font disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-gray-500"
                     >
                        <Zap /> RUN
                     </button>
                </div>

                {/* Item Sub-menu Overlay */}
                {combatMenuState === 'ITEM' && (
                    <div className="absolute inset-0 bg-black p-4 z-30 flex flex-col">
                        <h3 className="text-white border-b mb-2">Select Item</h3>
                        <div className="flex-grow overflow-y-auto grid grid-cols-2 gap-2">
                            {player.inventory.filter(i => i.type === 'HEAL').map((item, idx) => (
                                <button 
                                    key={idx}
                                    onClick={() => handleUseItem(item, idx)}
                                    className="text-left p-2 border border-gray-600 hover:bg-gray-800"
                                >
                                    {item.name} (+{item.value} HP)
                                </button>
                            ))}
                            {player.inventory.filter(i => i.type === 'HEAL').length === 0 && <div className="p-2 text-gray-500">No healing items.</div>}
                        </div>
                        <button onClick={() => setCombatMenuState('MAIN')} className="mt-2 text-red-400">Cancel</button>
                    </div>
                )}
            </div>
        </div>
      )}

      {/* --- MODALS --- */}

      {/* INVENTORY */}
      {gameState === GameState.INVENTORY && (
        <Modal title="Inventory" onClose={() => setGameState(GameState.ROAMING)}>
            <div className="flex gap-4">
                {/* Equipment Panel */}
                <div className="w-1/3 border-r border-slate-700 pr-4">
                    <h3 className="font-bold mb-2 text-yellow-500">Equipped</h3>
                    <div className="mb-4">
                        <p className="text-xs text-gray-400">Weapon</p>
                        <div className="border border-slate-600 p-2 rounded flex items-center gap-2">
                             <Sword size={16} /> {player.equippedWeapon?.name || "Fists"}
                        </div>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400">Armor</p>
                        <div className="border border-slate-600 p-2 rounded flex items-center gap-2">
                             <Shield size={16} /> {player.equippedArmor?.name || "None"}
                        </div>
                    </div>
                    
                    <h3 className="font-bold mt-6 mb-2 text-cyan-500">Auras Collected</h3>
                    <div className="text-sm space-y-2 max-h-40 overflow-y-auto">
                        {player.auras.length === 0 && <span className="text-gray-500 italic">No Auras yet.</span>}
                        {player.auras.map((aura, i) => (
                            <div key={i} className="p-2 bg-slate-800 rounded border border-slate-600">
                                <p className={`font-bold ${aura.rarity === Rarity.LEGENDARY ? 'text-yellow-400' : 'text-cyan-400'}`}>{aura.name}</p>
                                <p className="text-[10px] text-gray-400">{aura.description}</p>
                                <p className="text-[10px] text-gray-500">Power: {Math.floor(aura.power)}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Items Grid */}
                <div className="w-2/3">
                    <div className="grid grid-cols-4 gap-2">
                        {player.inventory.map((item, i) => (
                            <div key={i} className="bg-slate-800 p-2 rounded border border-slate-700 hover:border-white cursor-pointer group relative">
                                <div className="flex justify-center mb-1">
                                    {item.type === 'WEAPON' && <Sword className="text-red-400" />}
                                    {item.type === 'HEAL' && <Heart className="text-pink-400" />}
                                    {item.type === 'ARMOR' && <Shield className="text-blue-400" />}
                                </div>
                                <p className="text-xs text-center truncate">{item.name}</p>
                                
                                {/* Equip/Use logic would go here, simplistic for now */}
                                <div className="absolute inset-0 bg-black/80 hidden group-hover:flex items-center justify-center text-xs">
                                    {item.type === 'WEAPON' && <button onClick={() => setPlayer(p => ({...p, equippedWeapon: item}))}>Equip</button>}
                                    {item.type === 'ARMOR' && <button onClick={() => setPlayer(p => ({...p, equippedArmor: item}))}>Equip</button>}
                                    {item.type === 'HEAL' && <span className="text-gray-400">Battle Only</span>}
                                </div>
                            </div>
                        ))}
                        {[...Array(MAX_INVENTORY_SLOTS - player.inventory.length)].map((_, i) => (
                            <div key={`empty-${i}`} className="bg-slate-900/50 p-2 rounded border border-slate-800 border-dashed"></div>
                        ))}
                    </div>
                </div>
            </div>
        </Modal>
      )}

      {/* SHOP */}
      {gameState === GameState.SHOP && (
        <Modal title="Item Shop" onClose={() => setGameState(GameState.ROAMING)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.values(ITEMS).filter(i => i.price > 0).map((item) => (
                    <div key={item.id} className="flex justify-between items-center bg-slate-800 p-4 rounded border border-slate-700">
                        <div>
                            <h4 className="font-bold">{item.name}</h4>
                            <p className="text-xs text-gray-400">{item.description}</p>
                            <p className="text-xs text-yellow-400 mt-1">Cost: {item.price} G</p>
                        </div>
                        <button 
                            onClick={() => {
                                if (player.gold >= item.price) {
                                    setPlayer(p => ({...p, gold: p.gold - item.price}));
                                    addToInventory(item);
                                    showNotification("Purchased!");
                                } else {
                                    showNotification("Not enough Gold!");
                                }
                            }}
                            className="bg-green-600 px-4 py-2 rounded text-xs font-bold hover:bg-green-500"
                        >
                            BUY
                        </button>
                    </div>
                ))}
            </div>
        </Modal>
      )}

      {/* GAMEPASS */}
      {gameState === GameState.GAMEPASS && (
          <Modal title="Gamepasses (Store)" onClose={() => setGameState(GameState.ROAMING)}>
              <div className="grid grid-cols-1 gap-4">
                  <div className="bg-gradient-to-r from-purple-900 to-slate-900 p-6 rounded border border-purple-500 flex justify-between items-center">
                      <div>
                          <h3 className="text-xl font-bold text-purple-300">2x Loot Chance</h3>
                          <p className="text-sm text-gray-300">Doubles drop rates for items and auras.</p>
                      </div>
                      <button className="bg-white text-purple-900 font-bold px-6 py-3 rounded hover:scale-105 transition">
                          499 R$
                      </button>
                  </div>
                   <div className="bg-gradient-to-r from-blue-900 to-slate-900 p-6 rounded border border-blue-500 flex justify-between items-center">
                      <div>
                          <h3 className="text-xl font-bold text-blue-300">Extra Inventory</h3>
                          <p className="text-sm text-gray-300">+20 Slots for your items.</p>
                      </div>
                      <button className="bg-white text-blue-900 font-bold px-6 py-3 rounded hover:scale-105 transition">
                          199 R$
                      </button>
                  </div>
              </div>
          </Modal>
      )}

      {/* NOTIFICATION TOAST */}
      {notification && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-white text-black px-6 py-2 rounded-full font-bold shadow-[0_0_15px_rgba(255,255,255,0.5)] z-50 animate-bounce">
            {notification}
        </div>
      )}

    </div>
  );
};

export default App;