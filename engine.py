"""
D&D Text Adventure - Game Engine
Handles game state, dice mechanics, combat, and save/load functionality.

=== EXTENSION GUIDE ===

To add a new class:
    Add an entry to CLASSES dict with:
    - base_hp: Starting hit points
    - primary_stat: Main stat for the class (STR, DEX, INT, CHA)
    - ability: Dict with name, description, uses, cooldown_type, effect

To add a new weapon:
    Add an entry to WEAPONS dict with:
    - name: Display name
    - damage_dice: Tuple of (num_dice, die_size) e.g. (1, 8) for 1d8
    - stat: Which stat modifier to add (STR or DEX)
    - description: Flavor text

To modify stat generation:
    Edit generate_stats() function
"""

from dataclasses import dataclass, field, asdict
from typing import Optional
import random
import json
import os
from datetime import datetime

# =============================================================================
# CONFIGURATION
# =============================================================================

DEBUG = False  # Set to True to print state transitions and rolls

def debug_log(message: str) -> None:
    """Print debug message if DEBUG mode is enabled."""
    if DEBUG:
        print(f"[DEBUG] {message}")

# =============================================================================
# GAME DATA - Classes, Weapons, Items
# =============================================================================

CLASSES = {
    "fighter": {
        "base_hp": 18,
        "primary_stat": "STR",
        "starting_gold": 10,
        "starting_items": ["Longsword", "Chain Mail", "Health Potion"],
        "ability": {
            "name": "Second Wind",
            "description": "Heal 1d10 + 2 HP",
            "uses": 1,
            "cooldown_type": "rest",
            "effect": "heal"
        }
    },
    "rogue": {
        "base_hp": 12,
        "primary_stat": "DEX",
        "starting_gold": 15,
        "starting_items": ["Dagger", "Leather Armor", "Lockpicks", "Health Potion"],
        "ability": {
            "name": "Sneak Attack",
            "description": "Deal +2d6 extra damage on your next attack",
            "uses": 1,
            "cooldown_type": "combat",
            "effect": "damage_boost"
        }
    },
    "mage": {
        "base_hp": 10,
        "primary_stat": "INT",
        "starting_gold": 12,
        "starting_items": ["Staff", "Robes", "Spell Component Pouch", "Health Potion", "Mana Potion"],
        "ability": {
            "name": "Fireball",
            "description": "Unleash 3d6 fire damage",
            "uses": 2,
            "cooldown_type": "day",
            "effect": "direct_damage"
        }
    }
}

WEAPONS = {
    "Longsword": {
        "damage_dice": (1, 8),
        "stat": "STR",
        "description": "A reliable blade for any warrior"
    },
    "Dagger": {
        "damage_dice": (1, 4),
        "stat": "DEX",
        "description": "Quick and deadly in skilled hands"
    },
    "Staff": {
        "damage_dice": (1, 6),
        "stat": "INT",
        "description": "A focus for arcane power"
    },
    "Rusty Sword": {
        "damage_dice": (1, 6),
        "stat": "STR",
        "description": "Seen better days, but still sharp"
    },
    "Hand Axe": {
        "damage_dice": (1, 6),
        "stat": "STR",
        "description": "Good for chopping wood... or enemies"
    }
}

ITEMS = {
    "Health Potion": {
        "type": "consumable",
        "effect": "heal",
        "value": "2d4+2",
        "description": "Restores health when consumed"
    },
    "Mana Potion": {
        "type": "consumable",
        "effect": "restore_ability",
        "value": 1,
        "description": "Restores one ability use"
    },
    "Lockpicks": {
        "type": "tool",
        "effect": "skill_bonus",
        "skill": "DEX",
        "bonus": 2,
        "description": "Grants +2 to lockpicking attempts"
    },
    "Chain Mail": {
        "type": "armor",
        "ac_bonus": 3,
        "description": "Heavy but protective"
    },
    "Leather Armor": {
        "type": "armor",
        "ac_bonus": 2,
        "description": "Light and flexible"
    },
    "Robes": {
        "type": "armor",
        "ac_bonus": 1,
        "description": "Comfortable but not very protective"
    },
    "Spell Component Pouch": {
        "type": "tool",
        "effect": "enables_magic",
        "description": "Required for casting spells"
    },
    "Rusty Key": {
        "type": "key_item",
        "description": "Opens something... somewhere"
    },
    "Ancient Amulet": {
        "type": "key_item",
        "description": "Pulses with mysterious energy"
    },
    "Gold Coins": {
        "type": "treasure",
        "value": 10,
        "description": "Shiny and spendable"
    },
    "Torch": {
        "type": "tool",
        "effect": "light",
        "description": "Illuminates dark places"
    }
}

# =============================================================================
# DICE SYSTEM
# =============================================================================

class DiceRoller:
    """Handles all dice rolling with formatted output."""
    
    def __init__(self, seed: Optional[int] = None):
        self.rng = random.Random(seed)
        self.seed = seed
    
    def get_seed(self) -> int:
        """Return current seed for saving."""
        return self.seed if self.seed else random.randint(0, 999999)
    
    def roll(self, num_dice: int, die_size: int) -> tuple[list[int], int]:
        """Roll multiple dice and return individual rolls and total."""
        rolls = [self.rng.randint(1, die_size) for _ in range(num_dice)]
        total = sum(rolls)
        debug_log(f"Rolled {num_dice}d{die_size}: {rolls} = {total}")
        return rolls, total
    
    def roll_d20(self, modifier: int = 0, stat_name: str = "", 
                 advantage: bool = False, disadvantage: bool = False) -> tuple[int, int, str]:
        """
        Roll a d20 with modifier.
        Returns (raw_roll, total, display_string)
        """
        if advantage and not disadvantage:
            roll1 = self.rng.randint(1, 20)
            roll2 = self.rng.randint(1, 20)
            raw = max(roll1, roll2)
            adv_str = f" (ADV: {roll1}, {roll2})"
        elif disadvantage and not advantage:
            roll1 = self.rng.randint(1, 20)
            roll2 = self.rng.randint(1, 20)
            raw = min(roll1, roll2)
            adv_str = f" (DIS: {roll1}, {roll2})"
        else:
            raw = self.rng.randint(1, 20)
            adv_str = ""
        
        total = raw + modifier
        
        if stat_name and modifier != 0:
            sign = "+" if modifier >= 0 else ""
            display = f"d20: {raw}{adv_str} {sign} {stat_name}({modifier}) = {total}"
        elif modifier != 0:
            sign = "+" if modifier >= 0 else ""
            display = f"d20: {raw}{adv_str} {sign}{modifier} = {total}"
        else:
            display = f"d20: {raw}{adv_str}"
        
        debug_log(f"D20 Roll: {display}")
        return raw, total, display
    
    def roll_damage(self, num_dice: int, die_size: int, modifier: int = 0, 
                    stat_name: str = "") -> tuple[int, str]:
        """
        Roll damage dice with modifier.
        Returns (total_damage, display_string)
        """
        rolls, dice_total = self.roll(num_dice, die_size)
        total = dice_total + modifier
        
        if len(rolls) == 1:
            rolls_str = str(rolls[0])
        else:
            rolls_str = f"({'+'.join(map(str, rolls))})"
        
        if stat_name and modifier != 0:
            sign = "+" if modifier >= 0 else ""
            display = f"{num_dice}d{die_size}: {rolls_str} {sign} {stat_name}({modifier}) = {total}"
        elif modifier != 0:
            sign = "+" if modifier >= 0 else ""
            display = f"{num_dice}d{die_size}: {rolls_str} {sign}{modifier} = {total}"
        else:
            display = f"{num_dice}d{die_size}: {rolls_str} = {total}"
        
        return max(1, total), display  # Minimum 1 damage

# Global dice roller instance
dice = DiceRoller()

def set_dice_seed(seed: int) -> None:
    """Set the global dice roller seed."""
    global dice
    dice = DiceRoller(seed)

# =============================================================================
# GAME STATE
# =============================================================================

@dataclass
class GameState:
    """Complete game state - all data needed to save/load a game."""
    
    # Player identity
    name: str = "Adventurer"
    player_class: str = "fighter"
    
    # Stats: scores and derived modifiers
    stats: dict = field(default_factory=lambda: {
        "STR": {"score": 10, "modifier": 0},
        "DEX": {"score": 10, "modifier": 0},
        "INT": {"score": 10, "modifier": 0},
        "CHA": {"score": 10, "modifier": 0}
    })
    
    # Combat stats
    hp: int = 18
    max_hp: int = 18
    ac: int = 10  # Armor class
    
    # Resources
    gold: int = 10
    inventory: list = field(default_factory=list)
    equipped_weapon: str = "Fists"
    
    # Ability tracking
    ability_uses: int = 1
    ability_max_uses: int = 1
    sneak_attack_available: bool = True  # Resets each combat for rogues
    
    # World state
    location: str = "tavern"
    visited_locations: list = field(default_factory=list)
    world_flags: dict = field(default_factory=dict)
    
    # Quest tracking
    quests: dict = field(default_factory=dict)  # quest_id: {status, progress, etc}
    active_quest: Optional[str] = None
    
    # Combat state
    in_combat: bool = False
    current_enemy: Optional[dict] = None
    
    # Session tracking
    turn_count: int = 0
    story_summary: str = ""
    story_log: list = field(default_factory=list)  # Key events for LLM context
    
    # Game meta
    game_started: bool = False
    game_over: bool = False
    ending: Optional[str] = None
    
    def get_modifier(self, stat: str) -> int:
        """Get the modifier for a stat."""
        return self.stats.get(stat, {}).get("modifier", 0)
    
    def get_score(self, stat: str) -> int:
        """Get the score for a stat."""
        return self.stats.get(stat, {}).get("score", 10)
    
    def get_ac(self) -> int:
        """Calculate total AC from base + armor + DEX."""
        base_ac = 10 + self.get_modifier("DEX")
        armor_bonus = 0
        for item in self.inventory:
            if item in ITEMS and ITEMS[item].get("type") == "armor":
                armor_bonus = max(armor_bonus, ITEMS[item].get("ac_bonus", 0))
        return base_ac + armor_bonus
    
    def add_to_inventory(self, item: str) -> None:
        """Add item to inventory."""
        self.inventory.append(item)
        debug_log(f"Added {item} to inventory")
    
    def remove_from_inventory(self, item: str) -> bool:
        """Remove item from inventory. Returns True if successful."""
        if item in self.inventory:
            self.inventory.remove(item)
            debug_log(f"Removed {item} from inventory")
            return True
        return False
    
    def has_item(self, item: str) -> bool:
        """Check if player has an item."""
        return item in self.inventory
    
    def add_gold(self, amount: int) -> None:
        """Add gold (can be negative but won't go below 0)."""
        self.gold = max(0, self.gold + amount)
        debug_log(f"Gold changed by {amount}, now {self.gold}")
    
    def heal(self, amount: int) -> int:
        """Heal HP up to max. Returns amount actually healed."""
        actual = min(amount, self.max_hp - self.hp)
        self.hp += actual
        debug_log(f"Healed {actual} HP, now {self.hp}/{self.max_hp}")
        return actual
    
    def take_damage(self, amount: int) -> int:
        """Take damage. Returns actual damage taken."""
        actual = min(amount, self.hp)
        self.hp -= actual
        debug_log(f"Took {actual} damage, now {self.hp}/{self.max_hp}")
        return actual
    
    def is_dead(self) -> bool:
        """Check if player is dead."""
        return self.hp <= 0
    
    def set_flag(self, flag: str, value: any = True) -> None:
        """Set a world flag."""
        self.world_flags[flag] = value
        debug_log(f"Flag set: {flag} = {value}")
    
    def get_flag(self, flag: str, default: any = None) -> any:
        """Get a world flag value."""
        return self.world_flags.get(flag, default)
    
    def add_quest(self, quest_id: str, quest_data: dict) -> None:
        """Add or update a quest."""
        self.quests[quest_id] = quest_data
        if self.active_quest is None:
            self.active_quest = quest_id
        debug_log(f"Quest added/updated: {quest_id}")
    
    def complete_quest(self, quest_id: str) -> None:
        """Mark a quest as complete."""
        if quest_id in self.quests:
            self.quests[quest_id]["status"] = "complete"
            if self.active_quest == quest_id:
                self.active_quest = None
            debug_log(f"Quest completed: {quest_id}")
    
    def log_event(self, event: str) -> None:
        """Add an event to story log (keeps last 10)."""
        self.story_log.append(event)
        if len(self.story_log) > 10:
            self.story_log = self.story_log[-10:]
        debug_log(f"Event logged: {event}")
    
    def get_equipped_weapon_data(self) -> dict:
        """Get the currently equipped weapon's data."""
        if self.equipped_weapon in WEAPONS:
            return WEAPONS[self.equipped_weapon]
        return {"damage_dice": (1, 2), "stat": "STR", "description": "Bare fists"}
    
    def get_class_data(self) -> dict:
        """Get the player's class data."""
        return CLASSES.get(self.player_class, CLASSES["fighter"])
    
    def get_ability_info(self) -> dict:
        """Get the player's class ability info."""
        return self.get_class_data().get("ability", {})
    
    def use_ability(self) -> bool:
        """Try to use class ability. Returns True if successful."""
        if self.ability_uses > 0:
            self.ability_uses -= 1
            debug_log(f"Ability used, {self.ability_uses} uses remaining")
            return True
        return False
    
    def restore_ability_use(self, amount: int = 1) -> None:
        """Restore ability uses."""
        self.ability_uses = min(self.ability_max_uses, self.ability_uses + amount)
    
    def rest(self) -> None:
        """Take a rest - restore HP and some abilities."""
        self.hp = self.max_hp
        # Restore abilities with "rest" cooldown
        if self.get_ability_info().get("cooldown_type") == "rest":
            self.ability_uses = self.ability_max_uses
        debug_log("Rested - HP and rest-based abilities restored")

# =============================================================================
# CHARACTER CREATION
# =============================================================================

def calculate_modifier(score: int) -> int:
    """Calculate ability modifier from score (D&D 5e style)."""
    return (score - 10) // 2

def generate_stats(player_class: str) -> dict:
    """Generate stats with slight bias toward class primary stat."""
    class_data = CLASSES.get(player_class, CLASSES["fighter"])
    primary = class_data["primary_stat"]
    
    stats = {}
    for stat in ["STR", "DEX", "INT", "CHA"]:
        # Roll 4d6, drop lowest
        rolls = sorted([dice.rng.randint(1, 6) for _ in range(4)])
        score = sum(rolls[1:])  # Drop lowest
        
        # Bonus for primary stat
        if stat == primary:
            score = min(18, score + 2)
        
        stats[stat] = {
            "score": score,
            "modifier": calculate_modifier(score)
        }
    
    debug_log(f"Generated stats for {player_class}: {stats}")
    return stats

def create_character(name: str, player_class: str) -> GameState:
    """Create a new character with the given name and class."""
    player_class = player_class.lower()
    if player_class not in CLASSES:
        player_class = "fighter"
    
    class_data = CLASSES[player_class]
    stats = generate_stats(player_class)
    
    state = GameState(
        name=name,
        player_class=player_class,
        stats=stats,
        hp=class_data["base_hp"],
        max_hp=class_data["base_hp"],
        gold=class_data["starting_gold"],
        inventory=list(class_data["starting_items"]),
        ability_uses=class_data["ability"]["uses"],
        ability_max_uses=class_data["ability"]["uses"],
        game_started=True
    )
    
    # Equip first weapon found
    for item in state.inventory:
        if item in WEAPONS:
            state.equipped_weapon = item
            break
    
    # Calculate AC
    state.ac = state.get_ac()
    
    debug_log(f"Character created: {name} the {player_class}")
    return state

# =============================================================================
# COMBAT SYSTEM
# =============================================================================

@dataclass
class Enemy:
    """Enemy data structure."""
    name: str
    hp: int
    max_hp: int
    ac: int
    attack_bonus: int
    damage_dice: tuple  # (num_dice, die_size)
    damage_bonus: int
    xp: int
    gold_drop: tuple  # (min, max)
    behavior: str  # "aggressive", "defensive", "random"
    description: str = ""
    loot: list = field(default_factory=list)  # Possible item drops
    
    def to_dict(self) -> dict:
        """Convert to dictionary for state storage."""
        return {
            "name": self.name,
            "hp": self.hp,
            "max_hp": self.max_hp,
            "ac": self.ac,
            "attack_bonus": self.attack_bonus,
            "damage_dice": list(self.damage_dice),
            "damage_bonus": self.damage_bonus,
            "xp": self.xp,
            "gold_drop": list(self.gold_drop),
            "behavior": self.behavior,
            "description": self.description,
            "loot": self.loot
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> 'Enemy':
        """Create Enemy from dictionary."""
        data["damage_dice"] = tuple(data["damage_dice"])
        data["gold_drop"] = tuple(data["gold_drop"])
        return cls(**data)

def create_enemy_from_llm(enemy_data: dict) -> Enemy:
    """Create an enemy from LLM-generated data with validation."""
    # Provide sensible defaults and clamp values
    name = enemy_data.get("name", "Mysterious Creature")
    hp = max(1, min(100, enemy_data.get("hp", 10)))
    ac = max(8, min(20, enemy_data.get("ac", 12)))
    attack_bonus = max(-2, min(8, enemy_data.get("attack_bonus", 2)))
    
    damage_dice = enemy_data.get("damage_dice", [1, 6])
    if isinstance(damage_dice, list) and len(damage_dice) == 2:
        num_dice = max(1, min(4, damage_dice[0]))
        die_size = max(4, min(12, damage_dice[1]))
        damage_dice = (num_dice, die_size)
    else:
        damage_dice = (1, 6)
    
    damage_bonus = max(0, min(5, enemy_data.get("damage_bonus", 1)))
    xp = max(10, min(500, enemy_data.get("xp", 25)))
    
    gold_drop = enemy_data.get("gold_drop", [1, 5])
    if isinstance(gold_drop, list) and len(gold_drop) == 2:
        gold_drop = (max(0, gold_drop[0]), max(gold_drop[0], gold_drop[1]))
    else:
        gold_drop = (1, 5)
    
    return Enemy(
        name=name,
        hp=hp,
        max_hp=hp,
        ac=ac,
        attack_bonus=attack_bonus,
        damage_dice=damage_dice,
        damage_bonus=damage_bonus,
        xp=xp,
        gold_drop=gold_drop,
        behavior=enemy_data.get("behavior", "aggressive"),
        description=enemy_data.get("description", ""),
        loot=enemy_data.get("loot", [])
    )

class CombatResult:
    """Result of a combat action."""
    def __init__(self, success: bool, message: str, damage: int = 0, 
                 roll_display: str = "", critical: bool = False):
        self.success = success
        self.message = message
        self.damage = damage
        self.roll_display = roll_display
        self.critical = critical

def player_attack(state: GameState, use_sneak_attack: bool = False) -> CombatResult:
    """Player attacks the current enemy."""
    if not state.current_enemy:
        return CombatResult(False, "No enemy to attack!")
    
    enemy = Enemy.from_dict(state.current_enemy)
    weapon = state.get_equipped_weapon_data()
    stat_name = weapon["stat"]
    modifier = state.get_modifier(stat_name)
    
    # Roll to hit
    raw, total, roll_display = dice.roll_d20(modifier, stat_name)
    
    critical = raw == 20
    critical_miss = raw == 1
    
    if critical_miss:
        return CombatResult(False, "Critical miss! Your attack goes wide.", 
                          0, roll_display)
    
    if total >= enemy.ac or critical:
        # Hit! Roll damage
        num_dice, die_size = weapon["damage_dice"]
        if critical:
            num_dice *= 2  # Double dice on crit
        
        damage, dmg_display = dice.roll_damage(num_dice, die_size, modifier, stat_name)
        
        # Add sneak attack if applicable
        if use_sneak_attack and state.player_class == "rogue" and state.sneak_attack_available:
            sneak_rolls, sneak_total = dice.roll(2, 6)
            damage += sneak_total
            dmg_display += f" + Sneak({sneak_total})"
            state.sneak_attack_available = False
        
        enemy.hp -= damage
        state.current_enemy = enemy.to_dict()
        
        crit_text = " CRITICAL HIT!" if critical else ""
        return CombatResult(True, f"Hit!{crit_text}", damage, 
                          f"[Attack] {roll_display} vs AC {enemy.ac}\n[Damage] {dmg_display}")
    else:
        return CombatResult(False, f"Miss! AC {enemy.ac} needed.", 
                          0, f"[Attack] {roll_display} vs AC {enemy.ac}")

def enemy_attack(state: GameState) -> CombatResult:
    """Enemy attacks the player."""
    if not state.current_enemy:
        return CombatResult(False, "No enemy!")
    
    enemy = Enemy.from_dict(state.current_enemy)
    player_ac = state.get_ac()
    
    raw, total, roll_display = dice.roll_d20(enemy.attack_bonus, "ATK")
    
    critical = raw == 20
    critical_miss = raw == 1
    
    if critical_miss:
        return CombatResult(False, f"The {enemy.name}'s attack misses wildly!", 
                          0, roll_display)
    
    if total >= player_ac or critical:
        num_dice, die_size = enemy.damage_dice
        if critical:
            num_dice *= 2
        
        damage, dmg_display = dice.roll_damage(num_dice, die_size, enemy.damage_bonus)
        state.take_damage(damage)
        
        crit_text = " CRITICAL!" if critical else ""
        return CombatResult(True, f"The {enemy.name} hits you!{crit_text}", 
                          damage, f"[Enemy Attack] {roll_display}\n[Damage] {dmg_display}")
    else:
        return CombatResult(False, f"The {enemy.name}'s attack misses.", 
                          0, f"[Enemy Attack] {roll_display} vs AC {player_ac}")

def use_class_ability(state: GameState) -> tuple[bool, str, int]:
    """
    Use the player's class ability.
    Returns (success, message, value)
    """
    if state.ability_uses <= 0:
        return False, "No ability uses remaining!", 0
    
    ability = state.get_ability_info()
    state.use_ability()
    
    if ability["effect"] == "heal":
        # Second Wind: 1d10 + 2
        _, heal_amount = dice.roll(1, 10)
        heal_amount += 2
        actual = state.heal(heal_amount)
        return True, f"Second Wind! Healed {actual} HP.", actual
    
    elif ability["effect"] == "direct_damage":
        # Fireball: 3d6
        _, damage = dice.roll(3, 6)
        if state.current_enemy:
            enemy = Enemy.from_dict(state.current_enemy)
            enemy.hp -= damage
            state.current_enemy = enemy.to_dict()
        return True, f"Fireball! Dealt {damage} fire damage!", damage
    
    elif ability["effect"] == "damage_boost":
        # Sneak Attack is handled in player_attack
        state.sneak_attack_available = True
        state.ability_uses += 1  # Refund - it's used on attack
        return True, "Sneak Attack ready! Use Attack to deal bonus damage.", 0
    
    return False, "Unknown ability!", 0

def attempt_flee(state: GameState) -> tuple[bool, str]:
    """Attempt to flee from combat."""
    dex_mod = state.get_modifier("DEX")
    raw, total, roll_display = dice.roll_d20(dex_mod, "DEX")
    
    # DC 12 to flee
    if total >= 12:
        state.in_combat = False
        state.current_enemy = None
        state.sneak_attack_available = True
        return True, f"[Flee] {roll_display} vs DC 12 - Escaped!"
    else:
        return False, f"[Flee] {roll_display} vs DC 12 - Failed to escape!"

def check_combat_end(state: GameState) -> tuple[bool, str, dict]:
    """
    Check if combat has ended.
    Returns (ended, result, rewards)
    result: "victory", "defeat", "fled", or ""
    """
    if not state.in_combat:
        return True, "fled", {}
    
    if state.is_dead():
        return True, "defeat", {}
    
    if state.current_enemy:
        enemy = Enemy.from_dict(state.current_enemy)
        if enemy.hp <= 0:
            # Victory!
            gold = dice.rng.randint(*enemy.gold_drop)
            state.add_gold(gold)
            
            # Check for loot
            loot = []
            for item in enemy.loot:
                if dice.rng.random() < 0.3:  # 30% drop chance
                    loot.append(item)
                    state.add_to_inventory(item)
            
            state.in_combat = False
            state.current_enemy = None
            state.sneak_attack_available = True
            
            # Restore combat-based abilities
            if state.get_ability_info().get("cooldown_type") == "combat":
                state.ability_uses = state.ability_max_uses
            
            return True, "victory", {"gold": gold, "xp": enemy.xp, "loot": loot}
    
    return False, "", {}

# =============================================================================
# SKILL CHECKS
# =============================================================================

def skill_check(state: GameState, stat: str, dc: int, 
                bonus: int = 0, description: str = "") -> tuple[bool, str]:
    """
    Perform a skill check.
    Returns (success, display_string)
    """
    modifier = state.get_modifier(stat) + bonus
    raw, total, roll_display = dice.roll_d20(modifier, stat)
    
    # Check for tool bonuses
    for item in state.inventory:
        if item in ITEMS:
            item_data = ITEMS[item]
            if item_data.get("effect") == "skill_bonus" and item_data.get("skill") == stat:
                total += item_data.get("bonus", 0)
                roll_display += f" + {item}(+{item_data.get('bonus', 0)})"
    
    success = total >= dc
    result = "SUCCESS!" if success else "FAILED"
    
    desc = f"[{description}] " if description else ""
    display = f"{desc}{roll_display} vs DC {dc} - {result}"
    
    debug_log(f"Skill check: {display}")
    return success, display

# =============================================================================
# ITEM USAGE
# =============================================================================

def use_item(state: GameState, item_name: str) -> tuple[bool, str]:
    """
    Use a consumable item.
    Returns (success, message)
    """
    if not state.has_item(item_name):
        return False, f"You don't have {item_name}!"
    
    if item_name not in ITEMS:
        return False, f"{item_name} cannot be used."
    
    item = ITEMS[item_name]
    
    if item["type"] != "consumable":
        return False, f"{item_name} is not consumable."
    
    if item["effect"] == "heal":
        # Parse value like "2d4+2"
        value = item["value"]
        if isinstance(value, str) and "d" in value:
            parts = value.replace("+", " ").replace("-", " -").split()
            total = 0
            for part in parts:
                if "d" in part:
                    num, die = part.split("d")
                    num = int(num) if num else 1
                    _, roll_total = dice.roll(num, int(die))
                    total += roll_total
                else:
                    total += int(part)
        else:
            total = int(value)
        
        actual = state.heal(total)
        state.remove_from_inventory(item_name)
        return True, f"Used {item_name}! Restored {actual} HP."
    
    elif item["effect"] == "restore_ability":
        state.restore_ability_use(item["value"])
        state.remove_from_inventory(item_name)
        ability_name = state.get_ability_info()["name"]
        return True, f"Used {item_name}! Restored {ability_name} use."
    
    return False, f"Don't know how to use {item_name}."

# =============================================================================
# SAVE/LOAD SYSTEM
# =============================================================================

SAVE_VERSION = "1.0"
SAVE_DIR = "saves"
DEFAULT_SAVE = "save.json"

def ensure_save_dir() -> None:
    """Ensure the saves directory exists."""
    if not os.path.exists(SAVE_DIR):
        os.makedirs(SAVE_DIR)
        debug_log(f"Created save directory: {SAVE_DIR}")

def save_game(state: GameState, filename: str = DEFAULT_SAVE) -> tuple[bool, str]:
    """
    Save the game state to a JSON file.
    Returns (success, message)
    """
    try:
        ensure_save_dir()
        filepath = os.path.join(SAVE_DIR, filename)
        
        save_data = {
            "version": SAVE_VERSION,
            "timestamp": datetime.now().isoformat(),
            "game_state": asdict(state),
            "rng_seed": dice.get_seed()
        }
        
        with open(filepath, "w") as f:
            json.dump(save_data, f, indent=2)
        
        debug_log(f"Game saved to {filepath}")
        return True, f"Game saved to {filepath}"
    
    except Exception as e:
        debug_log(f"Save failed: {e}")
        return False, f"Failed to save: {e}"

def load_game(filename: str = DEFAULT_SAVE) -> tuple[Optional[GameState], str]:
    """
    Load game state from a JSON file.
    Returns (state or None, message)
    """
    try:
        filepath = os.path.join(SAVE_DIR, filename)
        
        if not os.path.exists(filepath):
            return None, f"Save file not found: {filepath}"
        
        with open(filepath, "r") as f:
            save_data = json.load(f)
        
        # Version check
        if save_data.get("version") != SAVE_VERSION:
            return None, f"Incompatible save version"
        
        # Restore RNG seed
        if "rng_seed" in save_data:
            set_dice_seed(save_data["rng_seed"])
        
        # Reconstruct GameState
        state_data = save_data["game_state"]
        state = GameState(**state_data)
        
        debug_log(f"Game loaded from {filepath}")
        return state, f"Game loaded from {filepath}"
    
    except Exception as e:
        debug_log(f"Load failed: {e}")
        return None, f"Failed to load: {e}"

def list_saves() -> list[str]:
    """List available save files."""
    ensure_save_dir()
    saves = []
    for f in os.listdir(SAVE_DIR):
        if f.endswith(".json"):
            saves.append(f)
    return saves

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def format_stats(state: GameState) -> str:
    """Format player stats for display."""
    lines = [f"=== {state.name} the {state.player_class.title()} ==="]
    lines.append(f"HP: {state.hp}/{state.max_hp} | AC: {state.get_ac()} | Gold: {state.gold}")
    lines.append("")
    for stat, data in state.stats.items():
        mod = data["modifier"]
        sign = "+" if mod >= 0 else ""
        lines.append(f"  {stat}: {data['score']} ({sign}{mod})")
    lines.append("")
    ability = state.get_ability_info()
    lines.append(f"Ability: {ability['name']} ({state.ability_uses}/{state.ability_max_uses} uses)")
    lines.append(f"  {ability['description']}")
    return "\n".join(lines)

def format_inventory(state: GameState) -> str:
    """Format inventory for display."""
    lines = [f"=== Inventory ({len(state.inventory)} items) ==="]
    lines.append(f"Gold: {state.gold}")
    lines.append(f"Equipped: {state.equipped_weapon}")
    lines.append("")
    
    if not state.inventory:
        lines.append("  (empty)")
    else:
        for item in state.inventory:
            marker = " [E]" if item == state.equipped_weapon else ""
            if item in ITEMS:
                desc = ITEMS[item].get("description", "")
                lines.append(f"  • {item}{marker}")
                if desc:
                    lines.append(f"      {desc}")
            else:
                lines.append(f"  • {item}{marker}")
    
    return "\n".join(lines)

def format_quests(state: GameState) -> str:
    """Format quest log for display."""
    lines = ["=== Quest Log ==="]
    
    if not state.quests:
        lines.append("  No quests yet.")
        return "\n".join(lines)
    
    for quest_id, quest in state.quests.items():
        status = quest.get("status", "active")
        marker = "✓" if status == "complete" else "○" if status == "active" else "✗"
        active = " [ACTIVE]" if quest_id == state.active_quest else ""
        lines.append(f"  {marker} {quest.get('name', quest_id)}{active}")
        if "description" in quest:
            lines.append(f"      {quest['description']}")
    
    return "\n".join(lines)

def get_status_line(state: GameState) -> str:
    """Get the status line shown each turn."""
    items = [i for i in state.inventory if i in ITEMS and ITEMS[i].get("type") == "key_item"]
    items_str = ", ".join(items[:3]) if items else "None"
    
    quest_str = "None"
    if state.active_quest and state.active_quest in state.quests:
        quest_str = state.quests[state.active_quest].get("name", state.active_quest)
    
    return (f"HP: {state.hp}/{state.max_hp} | Gold: {state.gold} | "
            f"{state.player_class.title()} | Items: {items_str}\n"
            f"Quest: {quest_str}")


if __name__ == "__main__":
    # Quick test
    DEBUG = True
    print("Testing engine...")
    
    state = create_character("TestHero", "rogue")
    print(format_stats(state))
    print()
    print(format_inventory(state))
    
    # Test dice
    print("\nTesting dice:")
    raw, total, display = dice.roll_d20(3, "DEX")
    print(f"  {display}")
    
    # Test save/load
    print("\nTesting save/load:")
    success, msg = save_game(state, "test_save.json")
    print(f"  Save: {msg}")
    
    loaded, msg = load_game("test_save.json")
    print(f"  Load: {msg}")
    if loaded:
        print(f"  Loaded character: {loaded.name}")

