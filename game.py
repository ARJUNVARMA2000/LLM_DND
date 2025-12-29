#!/usr/bin/env python3
"""
THE DRAGON'S SHADOW
An LLM-Powered D&D Text Adventure

Run with: python game.py

Set OPENROUTER_API_KEY environment variable before running.
"""

import os
import sys
import random
from typing import Optional

# Import game modules
from engine import (
    GameState, DiceRoller, dice, set_dice_seed,
    create_character, create_enemy_from_llm, Enemy,
    player_attack, enemy_attack, use_class_ability, attempt_flee,
    check_combat_end, skill_check, use_item,
    save_game, load_game, list_saves,
    format_stats, format_inventory, format_quests, get_status_line,
    CLASSES, WEAPONS, ITEMS, DEBUG as ENGINE_DEBUG
)
from llm_dm import (
    DungeonMaster, AVAILABLE_MODELS, DEFAULT_MODEL,
    list_available_models, get_model_display_name, check_api_key,
    DEBUG as LLM_DEBUG
)

# =============================================================================
# CONFIGURATION
# =============================================================================

DEBUG = False  # Master debug flag

GAME_TITLE = """
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║     ████████╗██╗  ██╗███████╗    ██████╗ ██████╗  █████╗  ██████╗  ██████╗   ║
║     ╚══██╔══╝██║  ██║██╔════╝    ██╔══██╗██╔══██╗██╔══██╗██╔════╝ ██╔═══██╗  ║
║        ██║   ███████║█████╗      ██║  ██║██████╔╝███████║██║  ███╗██║   ██║  ║
║        ██║   ██╔══██║██╔══╝      ██║  ██║██╔══██╗██╔══██║██║   ██║██║   ██║  ║
║        ██║   ██║  ██║███████╗    ██████╔╝██║  ██║██║  ██║╚██████╔╝╚██████╔╝  ║
║        ╚═╝   ╚═╝  ╚═╝╚══════╝    ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝  ╚═════╝   ║
║                                                                              ║
║                         ███████╗██╗  ██╗ █████╗ ██████╗  ██████╗ ██╗    ██╗  ║
║                         ██╔════╝██║  ██║██╔══██╗██╔══██╗██╔═══██╗██║    ██║  ║
║                         ███████╗███████║███████║██║  ██║██║   ██║██║ █╗ ██║  ║
║                         ╚════██║██╔══██║██╔══██║██║  ██║██║   ██║██║███╗██║  ║
║                         ███████║██║  ██║██║  ██║██████╔╝╚██████╔╝╚███╔███╔╝  ║
║                         ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝  ╚═════╝  ╚══╝╚══╝   ║
║                                                                              ║
║                      An LLM-Powered D&D Text Adventure                       ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

HELP_TEXT = """
╔══════════════════════════════════════════════════════════════════════════════╗
║                               COMMANDS                                       ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  inventory / i  - View your items and equipment                              ║
║  stats / s      - View your character stats                                  ║
║  quests / q     - View your quest log                                        ║
║  save           - Save your game                                             ║
║  load           - Load a saved game                                          ║
║  help / h / ?   - Show this help message                                     ║
║  quit / exit    - Exit the game (prompts to save)                            ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  During gameplay, enter a number to select a choice.                         ║
║  The AI Dungeon Master will guide your adventure!                            ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

# =============================================================================
# DISPLAY UTILITIES
# =============================================================================

def clear_screen() -> None:
    """Clear the terminal screen."""
    os.system('cls' if os.name == 'nt' else 'clear')

def print_separator(char: str = "━", width: int = 78) -> None:
    """Print a separator line."""
    print(char * width)

def print_boxed(text: str, width: int = 78) -> None:
    """Print text in a box."""
    print("┌" + "─" * (width - 2) + "┐")
    for line in text.split("\n"):
        padding = width - 4 - len(line)
        print(f"│ {line}" + " " * padding + " │")
    print("└" + "─" * (width - 2) + "┘")

def print_location(name: str, description: str, state: GameState) -> None:
    """Print the current location with status."""
    print()
    print_separator()
    print(f"  {name.upper()}")
    print_separator()
    print()
    # Word wrap description
    words = description.split()
    lines = []
    current_line = ""
    for word in words:
        if len(current_line) + len(word) + 1 > 74:
            lines.append(current_line)
            current_line = word
        else:
            current_line = f"{current_line} {word}".strip()
    if current_line:
        lines.append(current_line)
    for line in lines:
        print(f"  {line}")
    print()
    print_separator("─")
    print(f"  {get_status_line(state)}")
    print_separator("─")

def print_choices(choices: list, in_combat: bool = False) -> None:
    """Print available choices."""
    print()
    if in_combat:
        print("  YOUR TURN:")
    else:
        print("  What do you do?")
    print()
    for choice in choices:
        if isinstance(choice, dict):
            print(f"    [{choice['id']}] {choice['text']}")
        else:
            print(f"    {choice}")
    print()

def print_combat_status(state: GameState, enemy: Enemy) -> None:
    """Print combat status."""
    player_bar = create_health_bar(state.hp, state.max_hp, 20)
    enemy_bar = create_health_bar(enemy.hp, enemy.max_hp, 20)
    
    print()
    print_separator("═")
    print("  ⚔️  COMBAT  ⚔️")
    print_separator("─")
    print(f"  YOU: {player_bar} {state.hp}/{state.max_hp} HP")
    print(f"  {enemy.name.upper()}: {enemy_bar} {enemy.hp}/{enemy.max_hp} HP")
    print_separator("═")

def create_health_bar(current: int, maximum: int, width: int = 20) -> str:
    """Create a text health bar."""
    if maximum <= 0:
        return "[" + "?" * width + "]"
    ratio = max(0, min(1, current / maximum))
    filled = int(ratio * width)
    empty = width - filled
    return "[" + "█" * filled + "░" * empty + "]"

def print_roll(roll_display: str) -> None:
    """Print a dice roll result."""
    print(f"  {roll_display}")

def print_dm_thinking() -> None:
    """Show that the DM is thinking."""
    print("  [The Dungeon Master is crafting your story...]")

def print_error(message: str) -> None:
    """Print an error message."""
    print(f"\n  [!] {message}\n")

def print_success(message: str) -> None:
    """Print a success message."""
    print(f"\n  [✓] {message}\n")

# =============================================================================
# INPUT HANDLING
# =============================================================================

def get_input(prompt: str = "> ") -> str:
    """Get input from the user, handling commands."""
    try:
        return input(f"  {prompt}").strip()
    except (EOFError, KeyboardInterrupt):
        return "quit"

def get_choice(choices: list, state: GameState, dm: DungeonMaster) -> tuple[str, Optional[dict]]:
    """
    Get a valid choice from the player.
    Returns (action_type, choice_data)
    action_type: "choice", "command", "quit"
    """
    valid_ids = [c['id'] if isinstance(c, dict) else i+1 for i, c in enumerate(choices)]
    
    while True:
        user_input = get_input()
        lower = user_input.lower()
        
        # Handle commands
        if lower in ("inventory", "i"):
            print()
            print(format_inventory(state))
            print()
            continue
        elif lower in ("stats", "s"):
            print()
            print(format_stats(state))
            print()
            continue
        elif lower in ("quests", "q"):
            print()
            print(format_quests(state))
            print()
            continue
        elif lower == "save":
            success, msg = save_game(state)
            if success:
                print_success(msg)
            else:
                print_error(msg)
            continue
        elif lower == "load":
            loaded, msg = load_game()
            if loaded:
                print_success(msg)
                return "load", {"state": loaded}
            else:
                print_error(msg)
            continue
        elif lower in ("help", "h", "?"):
            print(HELP_TEXT)
            continue
        elif lower in ("quit", "exit"):
            return "quit", None
        
        # Handle numeric choice
        try:
            choice_num = int(user_input)
            if choice_num in valid_ids:
                for c in choices:
                    if isinstance(c, dict) and c['id'] == choice_num:
                        return "choice", c
                # Fallback for simple lists
                return "choice", {"id": choice_num, "text": str(choices[choice_num-1])}
        except ValueError:
            pass
        
        print_error(f"Invalid choice. Enter a number from the options above, or type 'help'.")
        print_choices(choices)

# =============================================================================
# GAME SETUP
# =============================================================================

def setup_game() -> tuple[Optional[GameState], Optional[DungeonMaster]]:
    """Set up a new game or load an existing one."""
    clear_screen()
    print(GAME_TITLE)
    
    # Check API key
    has_key, key_msg = check_api_key()
    if not has_key:
        print_error(key_msg)
        print("  To play, set your OpenRouter API key:")
        print("    Windows: set OPENROUTER_API_KEY=your_key_here")
        print("    Linux/Mac: export OPENROUTER_API_KEY=your_key_here")
        print()
        print("  Get a free key at: https://openrouter.ai/keys")
        print()
        input("  Press Enter to exit...")
        return None, None
    
    print(f"  ✓ API key configured")
    
    # Model selection
    print(f"\n  Current model: {get_model_display_name(DEFAULT_MODEL)}")
    print()
    change_model = get_input("  Change model? (y/n): ").lower()
    
    selected_model = DEFAULT_MODEL
    if change_model in ("y", "yes"):
        print("\n  Available models:")
        models = list_available_models()
        for i, (model_id, name, desc) in enumerate(models, 1):
            print(f"    [{i}] {name} - {desc}")
        print()
        
        while True:
            model_choice = get_input("  Select model (1-6): ")
            try:
                idx = int(model_choice) - 1
                if 0 <= idx < len(models):
                    selected_model = models[idx][0]
                    break
            except ValueError:
                pass
            print_error("Invalid choice")
    
    # Create DM
    dm = DungeonMaster(model=selected_model)
    print(f"\n  ✓ Dungeon Master ready ({get_model_display_name(selected_model)})")
    
    # New game or load
    print()
    print_separator("─")
    print()
    saves = list_saves()
    if saves:
        print("  [1] New Game")
        print("  [2] Continue (load save)")
        print()
        choice = get_input("  Choose: ")
        if choice == "2":
            # Show available saves
            print("\n  Available saves:")
            for i, save in enumerate(saves, 1):
                print(f"    [{i}] {save}")
            print()
            save_choice = get_input("  Load which save? (1-N or filename): ")
            
            try:
                idx = int(save_choice) - 1
                if 0 <= idx < len(saves):
                    loaded, msg = load_game(saves[idx])
                    if loaded:
                        print_success(msg)
                        return loaded, dm
                    else:
                        print_error(msg)
            except ValueError:
                loaded, msg = load_game(save_choice)
                if loaded:
                    print_success(msg)
                    return loaded, dm
                else:
                    print_error(msg)
    
    # Character creation
    print()
    print_separator("═")
    print("  CREATE YOUR CHARACTER")
    print_separator("─")
    print()
    
    name = get_input("  Enter your name: ")
    if not name:
        name = "Adventurer"
    
    print()
    print("  Choose your class:")
    print()
    print("    [1] FIGHTER - Strong and tough. Can heal in battle.")
    print("        HP: 18 | Primary: STR | Ability: Second Wind")
    print()
    print("    [2] ROGUE - Quick and sneaky. Deadly precision strikes.")
    print("        HP: 12 | Primary: DEX | Ability: Sneak Attack")
    print()
    print("    [3] MAGE - Powerful magic. Devastating spells.")
    print("        HP: 10 | Primary: INT | Ability: Fireball")
    print()
    
    while True:
        class_choice = get_input("  Choose class (1-3): ")
        if class_choice == "1":
            player_class = "fighter"
            break
        elif class_choice == "2":
            player_class = "rogue"
            break
        elif class_choice == "3":
            player_class = "mage"
            break
        print_error("Invalid choice. Enter 1, 2, or 3.")
    
    # Create character
    state = create_character(name, player_class)
    
    print()
    print_separator("─")
    print(f"\n  {name} the {player_class.title()} is ready for adventure!")
    print()
    print(format_stats(state))
    print()
    input("  Press Enter to begin your adventure...")
    
    return state, dm

# =============================================================================
# COMBAT LOOP
# =============================================================================

def run_combat(state: GameState, dm: DungeonMaster, enemy_data: dict) -> bool:
    """
    Run a combat encounter.
    Returns True if player won, False if player fled or died.
    """
    # Create enemy
    enemy = create_enemy_from_llm(enemy_data)
    state.current_enemy = enemy.to_dict()
    state.in_combat = True
    state.sneak_attack_available = True
    
    turn = 0
    
    clear_screen()
    print()
    print_separator("═")
    print(f"  ⚔️  {enemy.name.upper()} ATTACKS!  ⚔️")
    print_separator("═")
    print()
    if enemy.description:
        print(f"  {enemy.description}")
        print()
    
    while True:
        turn += 1
        enemy = Enemy.from_dict(state.current_enemy)
        
        # Show combat status
        print_combat_status(state, enemy)
        
        # Player choices
        choices = [
            {"id": 1, "text": f"Attack with {state.equipped_weapon}"},
        ]
        
        # Class ability
        ability = state.get_ability_info()
        if state.ability_uses > 0:
            choices.append({"id": 2, "text": f"Use {ability['name']} ({state.ability_uses} left)"})
        
        # Items
        usable_items = [item for item in state.inventory 
                       if item in ITEMS and ITEMS[item].get("type") == "consumable"]
        if usable_items:
            choices.append({"id": 3, "text": f"Use Item ({len(usable_items)} available)"})
        
        choices.append({"id": 4, "text": "Attempt to Flee"})
        
        print_choices(choices, in_combat=True)
        
        action, choice_data = get_choice(choices, state, dm)
        
        if action == "quit":
            save_prompt = get_input("  Save before quitting? (y/n): ")
            if save_prompt.lower() in ("y", "yes"):
                save_game(state)
            return False
        
        if action == "load":
            # Loaded a different game
            return False
        
        choice_id = choice_data["id"]
        player_action = ""
        player_result = ""
        
        # Process player action
        if choice_id == 1:
            # Attack
            sneak = state.player_class == "rogue" and state.sneak_attack_available
            result = player_attack(state, use_sneak_attack=sneak)
            player_action = "attack"
            print()
            print_roll(result.roll_display)
            if result.success:
                print_success(f"{result.message} Dealt {result.damage} damage!")
                player_result = f"hit for {result.damage} damage"
            else:
                print_error(result.message)
                player_result = "missed"
                
        elif choice_id == 2:
            # Class ability
            success, msg, value = use_class_ability(state)
            player_action = ability['name']
            if success:
                print_success(msg)
                player_result = msg
            else:
                print_error(msg)
                player_result = "ability failed"
                
        elif choice_id == 3:
            # Use item
            print("\n  Choose item to use:")
            for i, item in enumerate(usable_items, 1):
                print(f"    [{i}] {item}")
            print()
            item_choice = get_input("  Item number: ")
            try:
                idx = int(item_choice) - 1
                if 0 <= idx < len(usable_items):
                    success, msg = use_item(state, usable_items[idx])
                    player_action = f"use {usable_items[idx]}"
                    if success:
                        print_success(msg)
                        player_result = msg
                    else:
                        print_error(msg)
                        player_result = "item use failed"
                else:
                    print_error("Invalid item")
                    continue
            except ValueError:
                print_error("Invalid choice")
                continue
                
        elif choice_id == 4:
            # Flee
            success, msg = attempt_flee(state)
            player_action = "flee"
            print()
            print_roll(msg)
            if success:
                print_success("You escape from combat!")
                state.log_event(f"Fled from {enemy.name}")
                return False
            else:
                print_error("Failed to escape!")
                player_result = "failed to flee"
        
        # Check if enemy is dead
        ended, result, rewards = check_combat_end(state)
        if ended:
            if result == "victory":
                print()
                print_separator("═")
                print(f"  ⚔️  VICTORY!  ⚔️")
                print_separator("═")
                print()
                print(f"  You have defeated the {enemy.name}!")
                print(f"  +{rewards['gold']} gold")
                if rewards.get('loot'):
                    for item in rewards['loot']:
                        print(f"  Found: {item}")
                print()
                state.log_event(f"Defeated {enemy.name}")
                input("  Press Enter to continue...")
                return True
            elif result == "defeat":
                return False
        
        # Enemy turn
        enemy = Enemy.from_dict(state.current_enemy)  # Refresh after damage
        if enemy.hp > 0:
            print()
            print(f"  {enemy.name}'s turn...")
            result = enemy_attack(state)
            print_roll(result.roll_display)
            if result.success:
                print_error(f"{result.message} You take {result.damage} damage!")
            else:
                print(f"  {result.message}")
            
            # Check player death
            if state.is_dead():
                print()
                print_separator("═")
                print("  ☠️  YOU HAVE FALLEN  ☠️")
                print_separator("═")
                print()
                print(f"  The {enemy.name} has slain you.")
                print("  Your adventure ends here...")
                print()
                state.game_over = True
                state.ending = "death"
                return False
        
        # Get combat narration from DM
        if DEBUG:
            print_dm_thinking()
            success, narration, error = dm.generate_combat_narration(
                state.name, state.player_class,
                state.hp, state.max_hp,
                enemy.name, enemy.hp, enemy.max_hp,
                turn,
                player_action, player_result,
                "attack", result.message if result else ""
            )
            if success and narration.get("tactical_hint"):
                print(f"\n  [Hint: {narration['tactical_hint']}]")
        
        print()
        input("  Press Enter to continue...")
        clear_screen()

# =============================================================================
# MAIN GAME LOOP
# =============================================================================

def run_game(state: GameState, dm: DungeonMaster) -> None:
    """Main game loop."""
    
    # Generate opening if new game
    if not state.visited_locations:
        clear_screen()
        print_dm_thinking()
        
        success, opening, error = dm.generate_story_start(
            state.name, state.player_class, state.inventory
        )
        
        if not success:
            print_error(f"DM error: {error}")
            print("  Using fallback content...")
        
        # Process opening
        state.location = opening.get("location_name", "The Rusty Tankard")
        state.visited_locations.append(state.location)
        
        # Set up main quest
        if "main_quest_hook" in opening:
            quest = opening["main_quest_hook"]
            state.add_quest(quest["id"], {
                "name": quest["name"],
                "description": quest["description"],
                "status": "active",
                "hints": quest.get("rumors", [])
            })
        
        state.log_event(f"Adventure begins at {state.location}")
        
        clear_screen()
        print()
        # Display opening text with word wrap
        opening_text = opening.get("opening_text", "Your adventure begins...")
        for para in opening_text.split("\n\n"):
            words = para.split()
            line = ""
            for word in words:
                if len(line) + len(word) + 1 > 74:
                    print(f"  {line}")
                    line = word
                else:
                    line = f"{line} {word}".strip()
            if line:
                print(f"  {line}")
            print()
        
        choices = opening.get("choices", [
            {"id": 1, "text": "Look around", "type": "explore"}
        ])
        
        # Store current location data for reference
        current_location = {
            "name": state.location,
            "description": opening_text,
            "choices": choices
        }
    else:
        # Continuing from save - generate current location
        clear_screen()
        print_dm_thinking()
        
        success, location_data, error = dm.generate_location(
            state.location, state.name, state.player_class,
            state.hp, state.max_hp, state.gold, state.inventory,
            state.active_quest, " | ".join(state.story_log[-3:]),
            state.world_flags
        )
        
        current_location = location_data
        choices = location_data.get("choices", [
            {"id": 1, "text": "Look around", "type": "explore"}
        ])
    
    # Main loop
    while not state.game_over:
        state.turn_count += 1
        
        # Display current location
        clear_screen()
        print_location(
            current_location.get("name", state.location),
            current_location.get("description", "You are here."),
            state
        )
        
        # Display choices
        choices = current_location.get("choices", [
            {"id": 1, "text": "Continue exploring", "type": "explore"}
        ])
        
        # Add rest option if injured
        if state.hp < state.max_hp:
            rest_exists = any(c.get("type") == "rest" for c in choices if isinstance(c, dict))
            if not rest_exists:
                choices.append({"id": len(choices) + 1, "text": "Rest and recover", "type": "rest"})
        
        print_choices(choices)
        
        # Get player choice
        action, choice_data = get_choice(choices, state, dm)
        
        if action == "quit":
            save_prompt = get_input("  Save before quitting? (y/n): ")
            if save_prompt.lower() in ("y", "yes"):
                save_game(state)
            print("\n  Thanks for playing!\n")
            return
        
        if action == "load":
            # Player loaded a different game
            if choice_data and "state" in choice_data:
                state = choice_data["state"]
                # Regenerate location
                print_dm_thinking()
                success, location_data, error = dm.generate_location(
                    state.location, state.name, state.player_class,
                    state.hp, state.max_hp, state.gold, state.inventory,
                    state.active_quest, " | ".join(state.story_log[-3:]),
                    state.world_flags
                )
                current_location = location_data
                continue
        
        # Process the choice
        clear_screen()
        choice_text = choice_data.get("text", "continue")
        choice_type = choice_data.get("type", "explore")
        
        # Handle rest specially
        if choice_type == "rest":
            state.rest()
            print()
            print_separator("─")
            print("\n  You take a moment to rest and recover.")
            print(f"  HP restored to {state.hp}/{state.max_hp}")
            ability = state.get_ability_info()
            if ability.get("cooldown_type") == "rest":
                print(f"  {ability['name']} restored!")
            print()
            state.log_event("Rested and recovered")
            input("  Press Enter to continue...")
            continue
        
        # Check for skill check requirement
        skill_check_result = ""
        if current_location.get("requires_check"):
            check = current_location["requires_check"]
            if check.get("choice_id") == choice_data["id"]:
                skill = check["skill"]
                dc = check["dc"]
                success_check, display = skill_check(state, skill, dc, 
                    description=f"{skill} Check")
                print()
                print_roll(display)
                skill_check_result = f"{'SUCCESS' if success_check else 'FAILURE'}: {display}"
                print()
        
        # Generate result from DM
        print_dm_thinking()
        
        success, result, error = dm.generate_choice_result(
            current_location.get("name", state.location),
            state.name, state.player_class,
            state.hp, state.max_hp, state.gold, state.inventory,
            state.active_quest, " | ".join(state.story_log[-3:]),
            choice_text, choice_type, skill_check_result
        )
        
        if not success:
            print_error(f"DM hiccup: {error}")
            print("  (Using fallback content)")
        
        clear_screen()
        print()
        
        # Display narration
        narration = result.get("narration", "You continue on your journey...")
        words = narration.split()
        line = ""
        for word in words:
            if len(line) + len(word) + 1 > 74:
                print(f"  {line}")
                line = word
            else:
                line = f"{line} {word}".strip()
        if line:
            print(f"  {line}")
        print()
        
        # Process rewards
        if result.get("items_found"):
            for item in result["items_found"]:
                state.add_to_inventory(item)
                print(f"  [Found: {item}]")
        
        if result.get("gold_found", 0) > 0:
            state.add_gold(result["gold_found"])
            print(f"  [+{result['gold_found']} gold]")
        
        # Process quest updates
        if result.get("quest_update"):
            qu = result["quest_update"]
            state.add_quest(qu.get("quest_id", "side_quest"), {
                "name": qu.get("name", "New Quest"),
                "description": qu.get("description", ""),
                "status": qu.get("status", "active")
            })
            if qu.get("status") == "started":
                print(f"  [Quest Started: {qu.get('name')}]")
            elif qu.get("status") == "completed":
                print(f"  [Quest Completed: {qu.get('name')}!]")
                state.complete_quest(qu.get("quest_id"))
        
        # Process flag changes
        for flag, value in result.get("flag_changes", {}).items():
            state.set_flag(flag, value)
        
        # Log event
        state.log_event(f"{choice_text} -> {narration[:50]}...")
        
        input("  Press Enter to continue...")
        
        # Check for combat trigger
        if result.get("triggers_combat") and result.get("enemy"):
            won = run_combat(state, dm, result["enemy"])
            if state.game_over:
                break
        
        # Check for random encounter from location data
        elif current_location.get("possible_encounter"):
            enc = current_location["possible_encounter"]
            if random.random() < enc.get("chance", 0):
                # Generate enemy
                print_dm_thinking()
                success, enemy_data, _ = dm.generate_enemy(
                    state.location,
                    2,  # Medium difficulty
                    enc.get("enemy_type", "wandering creature"),
                    " | ".join(state.story_log[-3:])
                )
                won = run_combat(state, dm, enemy_data)
                if state.game_over:
                    break
        
        # Update location
        if result.get("new_location"):
            state.location = result["new_location"]
            state.visited_locations.append(state.location)
        
        # Generate new location or use follow-up choices
        if result.get("follow_up_choices"):
            current_location = {
                "name": current_location.get("name", state.location),
                "description": narration,
                "choices": result["follow_up_choices"]
            }
        else:
            # Generate new location content
            print_dm_thinking()
            success, location_data, error = dm.generate_location(
                state.location, state.name, state.player_class,
                state.hp, state.max_hp, state.gold, state.inventory,
                state.active_quest, " | ".join(state.story_log[-3:]),
                state.world_flags
            )
            current_location = location_data
    
    # Game over
    if state.game_over:
        show_ending(state, dm)

def show_ending(state: GameState, dm: DungeonMaster) -> None:
    """Display the game ending."""
    clear_screen()
    
    # Determine ending type
    ending_type = state.ending or "neutral"
    
    achievements = []
    if state.get_flag("saved_villagers"):
        achievements.append("Saved the villagers")
    if state.get_flag("defeated_boss"):
        achievements.append("Defeated the great evil")
    if state.gold > 100:
        achievements.append("Amassed a fortune")
    
    major_choices = list(state.story_log[-5:])
    
    print_dm_thinking()
    success, ending, error = dm.generate_ending(
        state.name, state.player_class,
        state.hp, state.max_hp, state.gold,
        achievements,
        {k: v for k, v in state.quests.items() if v.get("status") == "complete"},
        major_choices,
        ending_type
    )
    
    print()
    print_separator("═")
    print(f"  {ending.get('title', 'THE END').upper()}")
    print_separator("═")
    print()
    
    epilogue = ending.get("epilogue", "And so the adventure ends...")
    for para in epilogue.split("\n"):
        words = para.split()
        line = ""
        for word in words:
            if len(line) + len(word) + 1 > 74:
                print(f"  {line}")
                line = word
            else:
                line = f"{line} {word}".strip()
        if line:
            print(f"  {line}")
        print()
    
    print_separator("─")
    print(f"  {ending.get('final_stats', f'Gold: {state.gold} | Turns: {state.turn_count}')}")
    print_separator("─")
    print()
    print(f"  {ending.get('credits_note', 'Thanks for playing!')}")
    print()
    print_separator("═")
    print()
    input("  Press Enter to exit...")

# =============================================================================
# MAIN ENTRY POINT
# =============================================================================

def main() -> None:
    """Main entry point."""
    try:
        state, dm = setup_game()
        if state and dm:
            run_game(state, dm)
    except KeyboardInterrupt:
        print("\n\n  Game interrupted. Progress not saved.")
        print("  Thanks for playing!\n")
        sys.exit(0)
    except Exception as e:
        print(f"\n\n  An error occurred: {e}")
        if DEBUG:
            import traceback
            traceback.print_exc()
        print("  Please report this bug!")
        sys.exit(1)

if __name__ == "__main__":
    main()

