"""
The Dragon's Shadow - Web Server
Flask application serving the browser-based D&D adventure.
"""

import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()
import json
import secrets
from flask import Flask, render_template, request, jsonify, session, send_from_directory
from functools import wraps

from engine import (
    GameState, create_character, create_enemy_from_llm, Enemy,
    player_attack, enemy_attack, use_class_ability, attempt_flee,
    check_combat_end, skill_check, use_item, save_game, load_game,
    format_stats, format_inventory, format_quests, CLASSES, dice
)
from llm_dm import DungeonMaster, AVAILABLE_MODELS, DEFAULT_MODEL, check_api_key
from image_gen import generate_scene_image, generate_enemy_image

# =============================================================================
# APP CONFIGURATION
# =============================================================================

# Check if React frontend is built
REACT_BUILD_PATH = os.path.join(os.path.dirname(__file__), 'frontend', 'dist')
USE_REACT = os.path.exists(REACT_BUILD_PATH)

if USE_REACT:
    app = Flask(__name__, static_folder=os.path.join(REACT_BUILD_PATH, 'assets'), static_url_path='/assets')
else:
    app = Flask(__name__)
    
app.secret_key = os.environ.get('FLASK_SECRET_KEY', secrets.token_hex(32))

# Store active game sessions (in production, use Redis or database)
game_sessions = {}

def get_dm():
    """Get or create DungeonMaster instance."""
    api_key = os.environ.get('OPENROUTER_API_KEY')
    model = session.get('model', DEFAULT_MODEL)
    return DungeonMaster(api_key=api_key, model=model)

def get_game_state():
    """Get current game state from session."""
    session_id = session.get('session_id')
    if session_id and session_id in game_sessions:
        return game_sessions[session_id]
    return None

def set_game_state(state):
    """Store game state in session."""
    if 'session_id' not in session:
        session['session_id'] = secrets.token_hex(16)
    game_sessions[session['session_id']] = state

# =============================================================================
# ROUTES - PAGES
# =============================================================================

@app.route('/')
def index():
    """Main game page."""
    if USE_REACT:
        return send_from_directory(REACT_BUILD_PATH, 'index.html')
    else:
        has_key, _ = check_api_key()
        models = [(k, v['name'], v['description']) for k, v in AVAILABLE_MODELS.items()]
        return render_template('index.html', 
                             has_api_key=has_key,
                             models=models,
                             default_model=DEFAULT_MODEL)

# Serve React app for any non-API routes (SPA support)
@app.route('/<path:path>')
def serve_react(path):
    """Serve React app static files or fallback to index.html."""
    if USE_REACT:
        # Try to serve static file first
        file_path = os.path.join(REACT_BUILD_PATH, path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return send_from_directory(REACT_BUILD_PATH, path)
        # Fallback to index.html for SPA routing
        return send_from_directory(REACT_BUILD_PATH, 'index.html')
    return "Not found", 404

# =============================================================================
# ROUTES - API
# =============================================================================

@app.route('/api/status')
def api_status():
    """Check API and game status."""
    has_key, msg = check_api_key()
    state = get_game_state()
    return jsonify({
        'api_configured': has_key,
        'api_message': msg,
        'has_game': state is not None,
        'game_started': state.game_started if state else False
    })

@app.route('/api/models')
def api_models():
    """Get available models."""
    return jsonify({
        'models': [
            {'id': k, 'name': v['name'], 'description': v['description'], 'tier': v['tier']}
            for k, v in AVAILABLE_MODELS.items()
        ],
        'default': DEFAULT_MODEL,
        'current': session.get('model', DEFAULT_MODEL)
    })

@app.route('/api/set_model', methods=['POST'])
def api_set_model():
    """Set the LLM model."""
    data = request.json
    model = data.get('model', DEFAULT_MODEL)
    if model in AVAILABLE_MODELS:
        session['model'] = model
        return jsonify({'success': True, 'model': model})
    return jsonify({'success': False, 'error': 'Invalid model'}), 400

@app.route('/api/new_game', methods=['POST'])
def api_new_game():
    """Start a new game."""
    data = request.json
    name = data.get('name', 'Adventurer')
    player_class = data.get('class', 'fighter')
    
    # Create character
    state = create_character(name, player_class)
    set_game_state(state)
    
    # Generate opening with DM
    dm = get_dm()
    success, opening, error = dm.generate_story_start(
        state.name, state.player_class, state.inventory
    )
    
    if not success:
        opening = opening or {}
    
    # Update state
    state.location = opening.get('location_name', 'The Rusty Tankard')
    state.visited_locations.append(state.location)
    
    # Set up main quest
    if 'main_quest_hook' in opening:
        quest = opening['main_quest_hook']
        state.add_quest(quest.get('id', 'main_quest'), {
            'name': quest.get('name', 'Unknown Quest'),
            'description': quest.get('description', ''),
            'status': 'active'
        })
    
    state.log_event(f"Adventure begins at {state.location}")
    set_game_state(state)
    
    # Generate scene image
    image_prompt = f"dark fantasy tavern interior, {state.location}, moody lighting, medieval, atmospheric fog, dramatic shadows"
    image_url = generate_scene_image(image_prompt)
    
    return jsonify({
        'success': True,
        'opening': opening.get('opening_text', 'Your adventure begins...'),
        'location': state.location,
        'choices': opening.get('choices', [{'id': 1, 'text': 'Look around', 'type': 'explore'}]),
        'image_url': image_url,
        'player': {
            'name': state.name,
            'class': state.player_class,
            'hp': state.hp,
            'max_hp': state.max_hp,
            'gold': state.gold,
            'stats': state.stats,
            'inventory': state.inventory,
            'ability_uses': state.ability_uses,
            'ability_max': state.ability_max_uses,
            'ability_name': state.get_ability_info()['name']
        },
        'quest': state.quests.get(state.active_quest, {}).get('name') if state.active_quest else None
    })

@app.route('/api/choice', methods=['POST'])
def api_choice():
    """Process a player choice."""
    state = get_game_state()
    if not state:
        return jsonify({'error': 'No active game'}), 400
    
    data = request.json
    choice = data.get('choice', {})
    choice_text = choice.get('text', 'continue')
    choice_type = choice.get('type', 'explore')
    
    state.turn_count += 1
    dm = get_dm()
    
    # Handle rest
    if choice_type == 'rest':
        state.rest()
        state.log_event("Rested and recovered")
        set_game_state(state)
        
        return jsonify({
            'success': True,
            'narration': 'You take a moment to rest. Your wounds begin to heal and your strength returns.',
            'rest': True,
            'player': get_player_data(state),
            'continue': True
        })
    
    # Check for skill check
    skill_check_result = ""
    current_check = data.get('requires_check')
    if current_check:
        skill = current_check.get('skill', 'DEX')
        dc = current_check.get('dc', 12)
        success_check, display = skill_check(state, skill, dc)
        skill_check_result = f"{'SUCCESS' if success_check else 'FAILURE'}: {display}"
    
    # Generate result
    success, result, error = dm.generate_choice_result(
        state.location, state.name, state.player_class,
        state.hp, state.max_hp, state.gold, state.inventory,
        state.active_quest, " | ".join(state.story_log[-3:]),
        choice_text, choice_type, skill_check_result
    )
    
    # Process rewards
    items_found = result.get('items_found', [])
    for item in items_found:
        state.add_to_inventory(item)
    
    gold_found = result.get('gold_found', 0)
    if gold_found > 0:
        state.add_gold(gold_found)
    
    # Process quest updates
    quest_update = result.get('quest_update')
    if quest_update:
        state.add_quest(quest_update.get('quest_id', 'side_quest'), {
            'name': quest_update.get('name', 'New Quest'),
            'description': quest_update.get('description', ''),
            'status': quest_update.get('status', 'active')
        })
        if quest_update.get('status') == 'completed':
            state.complete_quest(quest_update.get('quest_id'))
    
    # Process flag changes
    for flag, value in result.get('flag_changes', {}).items():
        state.set_flag(flag, value)
    
    state.log_event(f"{choice_text}")
    
    # Update location
    if result.get('new_location'):
        state.location = result['new_location']
        state.visited_locations.append(state.location)
    
    set_game_state(state)
    
    # Generate image for new scene
    image_prompt = f"dark fantasy {state.location}, moody lighting, medieval, atmospheric fog, dramatic shadows, cinematic"
    image_url = generate_scene_image(image_prompt)
    
    # Check for combat
    if result.get('triggers_combat') and result.get('enemy'):
        enemy_data = result['enemy']
        enemy = create_enemy_from_llm(enemy_data)
        state.current_enemy = enemy.to_dict()
        state.in_combat = True
        state.sneak_attack_available = True
        set_game_state(state)
        
        # Generate enemy image
        enemy_image = generate_enemy_image(enemy.name, enemy.description)
        
        return jsonify({
            'success': True,
            'narration': result.get('narration', ''),
            'combat': True,
            'enemy': {
                'name': enemy.name,
                'hp': enemy.hp,
                'max_hp': enemy.max_hp,
                'description': enemy.description,
                'image_url': enemy_image
            },
            'player': get_player_data(state),
            'image_url': image_url,
            'items_found': items_found,
            'gold_found': gold_found,
            'quest_update': quest_update,
            'skill_check': skill_check_result if skill_check_result else None
        })
    
    # Generate next choices
    if result.get('follow_up_choices'):
        choices = result['follow_up_choices']
    else:
        _, location_data, _ = dm.generate_location(
            state.location, state.name, state.player_class,
            state.hp, state.max_hp, state.gold, state.inventory,
            state.active_quest, " | ".join(state.story_log[-3:]),
            state.world_flags
        )
        choices = location_data.get('choices', [{'id': 1, 'text': 'Continue', 'type': 'explore'}])
        
        # Update image for new location
        if location_data.get('location_name'):
            state.location = location_data.get('location_name', state.location)
            image_prompt = f"dark fantasy {state.location}, moody lighting, medieval, atmospheric fog, dramatic shadows"
            image_url = generate_scene_image(image_prompt)
    
    set_game_state(state)
    
    return jsonify({
        'success': True,
        'narration': result.get('narration', 'You continue on...'),
        'location': state.location,
        'choices': choices,
        'image_url': image_url,
        'player': get_player_data(state),
        'items_found': items_found,
        'gold_found': gold_found,
        'quest_update': quest_update,
        'skill_check': skill_check_result if skill_check_result else None
    })

@app.route('/api/combat_action', methods=['POST'])
def api_combat_action():
    """Handle combat actions."""
    state = get_game_state()
    if not state or not state.in_combat:
        return jsonify({'error': 'Not in combat'}), 400
    
    data = request.json
    action = data.get('action', 'attack')
    
    dm = get_dm()
    enemy = Enemy.from_dict(state.current_enemy)
    result_data = {'player_action': action}
    
    # Player action
    if action == 'attack':
        sneak = state.player_class == 'rogue' and state.sneak_attack_available
        result = player_attack(state, use_sneak_attack=sneak)
        result_data['player_result'] = {
            'success': result.success,
            'message': result.message,
            'damage': result.damage,
            'roll': result.roll_display,
            'critical': result.critical
        }
    
    elif action == 'ability':
        success, msg, value = use_class_ability(state)
        result_data['player_result'] = {
            'success': success,
            'message': msg,
            'value': value
        }
    
    elif action == 'item':
        item_name = data.get('item', 'Health Potion')
        success, msg = use_item(state, item_name)
        result_data['player_result'] = {
            'success': success,
            'message': msg
        }
    
    elif action == 'flee':
        success, msg = attempt_flee(state)
        result_data['player_result'] = {
            'success': success,
            'message': msg
        }
        if success:
            state.log_event(f"Fled from {enemy.name}")
            set_game_state(state)
            return jsonify({
                'success': True,
                'fled': True,
                'message': msg,
                'player': get_player_data(state)
            })
    
    # Check if enemy is dead
    ended, combat_result, rewards = check_combat_end(state)
    if ended and combat_result == 'victory':
        state.log_event(f"Defeated {enemy.name}")
        set_game_state(state)
        return jsonify({
            'success': True,
            'victory': True,
            'rewards': rewards,
            'player': get_player_data(state),
            **result_data
        })
    
    # Enemy turn
    enemy = Enemy.from_dict(state.current_enemy)
    if enemy.hp > 0:
        enemy_result = enemy_attack(state)
        result_data['enemy_result'] = {
            'success': enemy_result.success,
            'message': enemy_result.message,
            'damage': enemy_result.damage,
            'roll': enemy_result.roll_display
        }
    
    # Check player death
    if state.is_dead():
        state.game_over = True
        state.ending = 'death'
        set_game_state(state)
        return jsonify({
            'success': True,
            'defeat': True,
            'message': f'The {enemy.name} has slain you. Your adventure ends here...',
            **result_data
        })
    
    # Get combat narration
    enemy = Enemy.from_dict(state.current_enemy)
    _, narration, _ = dm.generate_combat_narration(
        state.name, state.player_class,
        state.hp, state.max_hp,
        enemy.name, enemy.hp, enemy.max_hp,
        state.turn_count,
        action, str(result_data.get('player_result', {})),
        'attack', str(result_data.get('enemy_result', {}))
    )
    
    set_game_state(state)
    
    return jsonify({
        'success': True,
        'combat_continues': True,
        'narration': narration.get('narration', 'The battle rages on...'),
        'player': get_player_data(state),
        'enemy': {
            'name': enemy.name,
            'hp': enemy.hp,
            'max_hp': enemy.max_hp
        },
        **result_data
    })

@app.route('/api/save', methods=['POST'])
def api_save():
    """Save the game."""
    state = get_game_state()
    if not state:
        return jsonify({'error': 'No active game'}), 400
    
    data = request.json
    filename = data.get('filename', f"{state.name.lower()}_save.json")
    success, msg = save_game(state, filename)
    
    return jsonify({'success': success, 'message': msg})

@app.route('/api/load', methods=['POST'])
def api_load():
    """Load a saved game."""
    data = request.json
    filename = data.get('filename', 'save.json')
    
    state, msg = load_game(filename)
    if state:
        set_game_state(state)
        
        # Generate current scene image
        image_prompt = f"dark fantasy {state.location}, moody lighting, medieval, atmospheric fog"
        image_url = generate_scene_image(image_prompt)
        
        return jsonify({
            'success': True,
            'message': msg,
            'player': get_player_data(state),
            'location': state.location,
            'image_url': image_url
        })
    
    return jsonify({'success': False, 'error': msg}), 400

@app.route('/api/inventory')
def api_inventory():
    """Get player inventory."""
    state = get_game_state()
    if not state:
        return jsonify({'error': 'No active game'}), 400
    
    return jsonify({
        'inventory': state.inventory,
        'gold': state.gold,
        'equipped_weapon': state.equipped_weapon
    })

@app.route('/api/stats')
def api_stats():
    """Get player stats."""
    state = get_game_state()
    if not state:
        return jsonify({'error': 'No active game'}), 400
    
    return jsonify(get_player_data(state))

# =============================================================================
# HELPERS
# =============================================================================

def get_player_data(state):
    """Get player data dict for JSON response."""
    return {
        'name': state.name,
        'class': state.player_class,
        'hp': state.hp,
        'max_hp': state.max_hp,
        'gold': state.gold,
        'ac': state.get_ac(),
        'stats': state.stats,
        'inventory': state.inventory,
        'equipped_weapon': state.equipped_weapon,
        'ability_uses': state.ability_uses,
        'ability_max': state.ability_max_uses,
        'ability_name': state.get_ability_info()['name'],
        'quest': state.quests.get(state.active_quest, {}).get('name') if state.active_quest else None,
        'turn': state.turn_count
    }

# =============================================================================
# MAIN
# =============================================================================

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    app.run(host='0.0.0.0', port=port, debug=debug)

