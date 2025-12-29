"""
D&D Text Adventure - LLM Dungeon Master
Handles OpenRouter API integration, prompt engineering, and response parsing.

=== EXTENSION GUIDE ===

To modify DM personality:
    Edit SYSTEM_PROMPT to change tone, style, or rules

To add new prompt types:
    Add a new method to DungeonMaster class following the pattern of
    generate_location(), generate_combat_narration(), etc.

To change the default model:
    Modify DEFAULT_MODEL constant

To add new models:
    Add to AVAILABLE_MODELS dict with cost tier info
"""

import os
import json
import urllib.request
import urllib.error
from typing import Optional, Any
from dataclasses import dataclass

# =============================================================================
# CONFIGURATION
# =============================================================================

DEBUG = False

def debug_log(message: str) -> None:
    """Print debug message if DEBUG mode is enabled."""
    if DEBUG:
        print(f"[LLM DEBUG] {message}")

# OpenRouter API configuration
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = "meta-llama/llama-3.1-70b-instruct"

# Available models with descriptions
AVAILABLE_MODELS = {
    "meta-llama/llama-3.1-8b-instruct": {
        "name": "Llama 3.1 8B",
        "tier": "cheap",
        "description": "Fast and cheap, good for testing"
    },
    "meta-llama/llama-3.1-70b-instruct": {
        "name": "Llama 3.1 70B", 
        "tier": "balanced",
        "description": "Great balance of quality and cost"
    },
    "anthropic/claude-3.5-haiku": {
        "name": "Claude 3.5 Haiku",
        "tier": "balanced", 
        "description": "Fast, smart, good at following formats"
    },
    "anthropic/claude-sonnet-4": {
        "name": "Claude Sonnet 4",
        "tier": "premium",
        "description": "Excellent quality, higher cost"
    },
    "openai/gpt-4o": {
        "name": "GPT-4o",
        "tier": "premium",
        "description": "Top quality, highest cost"
    },
    "openai/gpt-4o-mini": {
        "name": "GPT-4o Mini",
        "tier": "balanced",
        "description": "Good quality, reasonable cost"
    }
}

# =============================================================================
# SYSTEM PROMPTS
# =============================================================================

SYSTEM_PROMPT = """You are an expert Dungeon Master running a D&D 5e-style text adventure game. 

PERSONALITY:
- Adventurous fantasy tone with occasional light humor (never cringe)
- Descriptive but concise - short punchy paragraphs, no walls of text
- Fair but challenging - reward clever thinking, punish recklessness
- Immersive - stay in character, maintain narrative consistency

RULES:
1. Always respond with valid JSON matching the requested format
2. Keep descriptions to 2-3 sentences maximum
3. Provide 3-5 meaningful choices per turn
4. Include skill checks when actions have uncertain outcomes
5. Track narrative threads - remember key NPCs, plot points, player choices
6. Create consequences for player actions
7. Build toward dramatic moments and satisfying conclusions

COMBAT STYLE:
- Make combat feel dynamic and dangerous
- Describe attacks viscerally but briefly
- Enemies should feel threatening but beatable
- Include tactical options when appropriate

QUEST DESIGN:
- Main quest should have clear stakes and progression
- Side quests should offer meaningful rewards or story
- Multiple solutions to problems when possible
- Consequences that matter"""

# =============================================================================
# PROMPT TEMPLATES
# =============================================================================

LOCATION_PROMPT = """Generate a location scene for the player.

CURRENT STATE:
- Location type: {location_type}
- Player: {player_name} the {player_class}
- HP: {hp}/{max_hp}, Gold: {gold}
- Inventory: {inventory}
- Active quest: {active_quest}
- Recent events: {story_summary}
- World flags: {world_flags}

REQUIREMENTS:
- Create an atmospheric 2-3 sentence description
- Provide 3-5 meaningful choices
- Include a mix of: exploration, interaction, and potential danger
- If appropriate, hint at the main quest or include a random encounter chance

Respond with this exact JSON structure:
{{
    "location_name": "Name of this place",
    "description": "2-3 sentence atmospheric description",
    "choices": [
        {{"id": 1, "text": "Choice text", "type": "explore|talk|combat|rest|quest"}},
        {{"id": 2, "text": "Choice text", "type": "..."}},
        ...
    ],
    "requires_check": {{"skill": "STR|DEX|INT|CHA", "dc": 10-18, "choice_id": 1}} or null,
    "hidden_info": {{"key": "value"}} or null,
    "possible_encounter": {{"chance": 0.0-0.3, "enemy_type": "..."}} or null
}}"""

CHOICE_RESULT_PROMPT = """The player made a choice. Generate the result.

CURRENT STATE:
- Location: {location_name}
- Player: {player_name} the {player_class}
- HP: {hp}/{max_hp}, Gold: {gold}
- Inventory: {inventory}
- Active quest: {active_quest}
- Recent events: {story_summary}

PLAYER'S CHOICE: {choice_text}
CHOICE TYPE: {choice_type}
{skill_check_result}

REQUIREMENTS:
- Describe what happens (2-3 sentences)
- If this leads to a new location, include the transition
- If this triggers combat, provide enemy data
- If this advances a quest, note the progress
- Include consequences that feel meaningful

Respond with this exact JSON structure:
{{
    "narration": "What happens as a result of this choice",
    "new_location": "location_id" or null,
    "triggers_combat": false,
    "enemy": {{"name": "...", "hp": 10-50, "ac": 10-16, "attack_bonus": 1-5, "damage_dice": [1, 6], "damage_bonus": 1-3, "behavior": "aggressive|defensive", "description": "...", "xp": 20-100, "gold_drop": [1, 10], "loot": []}} or null,
    "items_found": ["item1", "item2"] or [],
    "gold_found": 0,
    "quest_update": {{"quest_id": "...", "status": "started|progressed|completed", "name": "...", "description": "..."}} or null,
    "flag_changes": {{"flag_name": value}} or {{}},
    "requires_another_check": {{"skill": "...", "dc": ..., "for": "description"}} or null,
    "follow_up_choices": [...] or null
}}"""

COMBAT_NARRATION_PROMPT = """Narrate this combat exchange.

COMBAT STATE:
- Player: {player_name} the {player_class}, HP: {hp}/{max_hp}
- Enemy: {enemy_name}, HP: {enemy_hp}/{enemy_max_hp}
- Turn: {turn_number}

LAST ACTIONS:
- Player action: {player_action}
- Player result: {player_result}
- Enemy action: {enemy_action}  
- Enemy result: {enemy_result}

REQUIREMENTS:
- Write 1-2 punchy sentences describing the exchange
- Make it feel dynamic and dangerous
- Vary your descriptions - don't repeat the same phrases
- If someone is low on HP, reflect the desperation

Respond with this exact JSON structure:
{{
    "narration": "Brief, vivid combat description",
    "player_status": "fighting|wounded|desperate|victorious|defeated",
    "enemy_status": "fighting|wounded|desperate|defeated",
    "tactical_hint": "Optional hint for player" or null
}}"""

ENEMY_GENERATION_PROMPT = """Generate an enemy for this encounter.

CONTEXT:
- Location: {location_type}
- Player level equivalent: {player_power}
- Situation: {situation}
- Story context: {story_summary}

REQUIREMENTS:
- Enemy should be appropriate for the location
- Difficulty should match player power (1=easy, 2=medium, 3=hard)
- Include interesting flavor, not just generic monsters
- Loot should be thematically appropriate

Respond with this exact JSON structure:
{{
    "name": "Enemy name",
    "description": "1-2 sentence description of appearance/behavior",
    "hp": 8-60,
    "ac": 10-18,
    "attack_bonus": 1-6,
    "damage_dice": [1, 6],
    "damage_bonus": 0-4,
    "behavior": "aggressive|defensive|random",
    "xp": 20-150,
    "gold_drop": [min, max],
    "loot": ["possible item 1", "possible item 2"]
}}"""

STORY_START_PROMPT = """Create the opening scene for a new adventure.

PLAYER:
- Name: {player_name}
- Class: {player_class}
- Starting items: {inventory}

REQUIREMENTS:
- Set the scene in a classic tavern setting
- Introduce a hook for the main quest (missing villagers, dark rumors, etc.)
- Create an immediate choice that sets the tone
- Make the player feel like an adventurer about to embark on something big

Respond with this exact JSON structure:
{{
    "opening_text": "2-3 paragraph opening narration setting the scene",
    "location_name": "The Rusty Tankard" or similar,
    "main_quest_hook": {{
        "id": "main_quest",
        "name": "Quest name",
        "description": "Brief description",
        "rumors": ["Hint 1", "Hint 2"]
    }},
    "npcs_present": [
        {{"name": "NPC name", "role": "bartender|patron|stranger", "appearance": "brief description"}}
    ],
    "choices": [
        {{"id": 1, "text": "Choice", "type": "talk|explore|quest"}},
        ...
    ]
}}"""

ENDING_PROMPT = """Generate an ending for the adventure.

FINAL STATE:
- Player: {player_name} the {player_class}
- HP: {hp}/{max_hp}
- Gold: {gold}
- Key achievements: {achievements}
- Quests completed: {quests}
- Major choices: {major_choices}
- Ending type: {ending_type}

REQUIREMENTS:
- Write a satisfying 2-3 paragraph epilogue
- Reference the player's specific journey and choices
- Match the tone to the ending type (victory, sacrifice, etc.)
- Leave room for imagination about what comes next

Respond with this exact JSON structure:
{{
    "title": "Ending title (e.g., 'The Hero's Return')",
    "epilogue": "2-3 paragraph ending narration",
    "final_stats": "Brief summary of the adventure",
    "credits_note": "A fun closing line"
}}"""

# =============================================================================
# API CLIENT
# =============================================================================

@dataclass
class LLMResponse:
    """Response from the LLM API."""
    success: bool
    content: Optional[dict]
    raw_text: str
    error: Optional[str]
    model_used: str

class OpenRouterClient:
    """Client for OpenRouter API using only standard library."""
    
    def __init__(self, api_key: Optional[str] = None, model: str = DEFAULT_MODEL):
        self.api_key = api_key or os.environ.get("OPENROUTER_API_KEY")
        self.model = model
        self.last_error: Optional[str] = None
        
    def is_configured(self) -> bool:
        """Check if API key is set."""
        return bool(self.api_key)
    
    def set_model(self, model: str) -> None:
        """Change the model."""
        if model in AVAILABLE_MODELS:
            self.model = model
            debug_log(f"Model set to: {model}")
        else:
            debug_log(f"Unknown model: {model}, keeping {self.model}")
    
    def call(self, system_prompt: str, user_prompt: str, 
             temperature: float = 0.8, max_tokens: int = 1000) -> LLMResponse:
        """
        Make an API call to OpenRouter.
        Returns LLMResponse with parsed JSON content if possible.
        """
        if not self.api_key:
            return LLMResponse(
                success=False,
                content=None,
                raw_text="",
                error="No API key configured. Set OPENROUTER_API_KEY environment variable.",
                model_used=self.model
            )
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/dnd-adventure",
            "X-Title": "D&D Text Adventure"
        }
        
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        
        debug_log(f"API call to {self.model}")
        debug_log(f"User prompt: {user_prompt[:200]}...")
        
        try:
            data = json.dumps(payload).encode("utf-8")
            request = urllib.request.Request(
                OPENROUTER_API_URL,
                data=data,
                headers=headers,
                method="POST"
            )
            
            with urllib.request.urlopen(request, timeout=30) as response:
                result = json.loads(response.read().decode("utf-8"))
            
            # Extract the message content
            raw_text = result.get("choices", [{}])[0].get("message", {}).get("content", "")
            debug_log(f"Raw response: {raw_text[:300]}...")
            
            # Try to parse as JSON
            content = self._parse_json_response(raw_text)
            
            return LLMResponse(
                success=True,
                content=content,
                raw_text=raw_text,
                error=None,
                model_used=self.model
            )
            
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8") if e.fp else ""
            error_msg = f"HTTP {e.code}: {error_body[:200]}"
            self.last_error = error_msg
            debug_log(f"API error: {error_msg}")
            return LLMResponse(
                success=False,
                content=None,
                raw_text="",
                error=error_msg,
                model_used=self.model
            )
            
        except urllib.error.URLError as e:
            error_msg = f"Connection error: {e.reason}"
            self.last_error = error_msg
            debug_log(f"API error: {error_msg}")
            return LLMResponse(
                success=False,
                content=None,
                raw_text="",
                error=error_msg,
                model_used=self.model
            )
            
        except Exception as e:
            error_msg = f"Unexpected error: {str(e)}"
            self.last_error = error_msg
            debug_log(f"API error: {error_msg}")
            return LLMResponse(
                success=False,
                content=None,
                raw_text="",
                error=error_msg,
                model_used=self.model
            )
    
    def _parse_json_response(self, text: str) -> Optional[dict]:
        """Extract and parse JSON from LLM response."""
        # First try direct parse
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass
        
        # Try to find JSON in markdown code blocks
        import re
        patterns = [
            r"```json\s*(.*?)\s*```",
            r"```\s*(.*?)\s*```",
            r"\{.*\}"
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, text, re.DOTALL)
            for match in matches:
                try:
                    # Clean up the match
                    clean = match.strip()
                    if not clean.startswith("{"):
                        continue
                    return json.loads(clean)
                except json.JSONDecodeError:
                    continue
        
        debug_log("Failed to parse JSON from response")
        return None

# =============================================================================
# DUNGEON MASTER CLASS
# =============================================================================

class DungeonMaster:
    """
    The AI Dungeon Master that generates game content.
    Uses OpenRouter API for dynamic content generation.
    """
    
    def __init__(self, api_key: Optional[str] = None, model: str = DEFAULT_MODEL):
        self.client = OpenRouterClient(api_key, model)
        self.retry_count = 2
        self.fallback_enabled = True
    
    def is_ready(self) -> bool:
        """Check if the DM is ready to run (API configured)."""
        return self.client.is_configured()
    
    def set_model(self, model: str) -> None:
        """Change the LLM model."""
        self.client.set_model(model)
    
    def get_model(self) -> str:
        """Get current model."""
        return self.client.model
    
    def _call_with_retry(self, system: str, prompt: str, 
                         fallback: Optional[dict] = None) -> tuple[bool, dict, Optional[str]]:
        """
        Call the API with retries.
        Returns (success, content, error_message)
        """
        for attempt in range(self.retry_count + 1):
            response = self.client.call(system, prompt)
            
            if response.success and response.content:
                return True, response.content, None
            
            if attempt < self.retry_count:
                debug_log(f"Retry {attempt + 1}/{self.retry_count}")
        
        # All retries failed
        if self.fallback_enabled and fallback:
            debug_log("Using fallback content")
            return False, fallback, response.error
        
        return False, {}, response.error
    
    def generate_story_start(self, player_name: str, player_class: str, 
                            inventory: list) -> tuple[bool, dict, Optional[str]]:
        """Generate the opening scene of the adventure."""
        prompt = STORY_START_PROMPT.format(
            player_name=player_name,
            player_class=player_class,
            inventory=", ".join(inventory) if inventory else "basic equipment"
        )
        
        fallback = {
            "opening_text": (
                f"The rain hammers against the windows of The Rusty Tankard as you push through the door. "
                f"Warmth and the smell of ale wash over you. {player_name}, a {player_class} seeking fortune, "
                f"you've heard rumors of trouble in this remote village.\n\n"
                f"The tavern is half-empty tonight. A worried-looking bartender polishes glasses. "
                f"In the corner, a hooded figure nurses a drink. On the notice board, you spot a weathered poster."
            ),
            "location_name": "The Rusty Tankard",
            "main_quest_hook": {
                "id": "main_quest",
                "name": "The Missing Villagers",
                "description": "Villagers have been disappearing near the old mill",
                "rumors": ["Strange lights at night", "No bodies ever found"]
            },
            "npcs_present": [
                {"name": "Gruff Bartender", "role": "bartender", "appearance": "tired, worried eyes"},
                {"name": "Hooded Stranger", "role": "stranger", "appearance": "face hidden, watching"}
            ],
            "choices": [
                {"id": 1, "text": "Talk to the bartender about the troubles", "type": "talk"},
                {"id": 2, "text": "Approach the hooded stranger", "type": "talk"},
                {"id": 3, "text": "Check the notice board", "type": "quest"},
                {"id": 4, "text": "Order a drink and listen to conversations", "type": "explore"}
            ]
        }
        
        return self._call_with_retry(SYSTEM_PROMPT, prompt, fallback)
    
    def generate_location(self, location_type: str, player_name: str, player_class: str,
                         hp: int, max_hp: int, gold: int, inventory: list,
                         active_quest: Optional[str], story_summary: str,
                         world_flags: dict) -> tuple[bool, dict, Optional[str]]:
        """Generate a location scene with choices."""
        prompt = LOCATION_PROMPT.format(
            location_type=location_type,
            player_name=player_name,
            player_class=player_class,
            hp=hp,
            max_hp=max_hp,
            gold=gold,
            inventory=", ".join(inventory[:5]) if inventory else "nothing notable",
            active_quest=active_quest or "none",
            story_summary=story_summary or "The adventure begins...",
            world_flags=json.dumps(world_flags) if world_flags else "{}"
        )
        
        fallback = {
            "location_name": location_type.replace("_", " ").title(),
            "description": f"You find yourself in {location_type.replace('_', ' ')}. The air is thick with mystery and potential danger.",
            "choices": [
                {"id": 1, "text": "Look around carefully", "type": "explore"},
                {"id": 2, "text": "Move forward cautiously", "type": "explore"},
                {"id": 3, "text": "Search for useful items", "type": "explore"},
                {"id": 4, "text": "Rest for a moment", "type": "rest"}
            ],
            "requires_check": None,
            "hidden_info": None,
            "possible_encounter": {"chance": 0.2, "enemy_type": "wandering creature"}
        }
        
        return self._call_with_retry(SYSTEM_PROMPT, prompt, fallback)
    
    def generate_choice_result(self, location_name: str, player_name: str, player_class: str,
                               hp: int, max_hp: int, gold: int, inventory: list,
                               active_quest: Optional[str], story_summary: str,
                               choice_text: str, choice_type: str,
                               skill_check_result: str = "") -> tuple[bool, dict, Optional[str]]:
        """Generate the result of a player's choice."""
        prompt = CHOICE_RESULT_PROMPT.format(
            location_name=location_name,
            player_name=player_name,
            player_class=player_class,
            hp=hp,
            max_hp=max_hp,
            gold=gold,
            inventory=", ".join(inventory[:5]) if inventory else "nothing notable",
            active_quest=active_quest or "none",
            story_summary=story_summary or "The adventure continues...",
            choice_text=choice_text,
            choice_type=choice_type,
            skill_check_result=f"\nSKILL CHECK: {skill_check_result}" if skill_check_result else ""
        )
        
        fallback = {
            "narration": f"You {choice_text.lower()}. The result is uncertain but you press on.",
            "new_location": None,
            "triggers_combat": False,
            "enemy": None,
            "items_found": [],
            "gold_found": 0,
            "quest_update": None,
            "flag_changes": {},
            "requires_another_check": None,
            "follow_up_choices": None
        }
        
        return self._call_with_retry(SYSTEM_PROMPT, prompt, fallback)
    
    def generate_combat_narration(self, player_name: str, player_class: str,
                                  hp: int, max_hp: int,
                                  enemy_name: str, enemy_hp: int, enemy_max_hp: int,
                                  turn_number: int,
                                  player_action: str, player_result: str,
                                  enemy_action: str, enemy_result: str) -> tuple[bool, dict, Optional[str]]:
        """Generate narration for a combat exchange."""
        prompt = COMBAT_NARRATION_PROMPT.format(
            player_name=player_name,
            player_class=player_class,
            hp=hp,
            max_hp=max_hp,
            enemy_name=enemy_name,
            enemy_hp=enemy_hp,
            enemy_max_hp=enemy_max_hp,
            turn_number=turn_number,
            player_action=player_action,
            player_result=player_result,
            enemy_action=enemy_action,
            enemy_result=enemy_result
        )
        
        fallback = {
            "narration": f"Steel clashes as the battle continues. {player_result}. {enemy_result}.",
            "player_status": "wounded" if hp < max_hp // 2 else "fighting",
            "enemy_status": "wounded" if enemy_hp < enemy_max_hp // 2 else "fighting",
            "tactical_hint": None
        }
        
        return self._call_with_retry(SYSTEM_PROMPT, prompt, fallback)
    
    def generate_enemy(self, location_type: str, player_power: int,
                       situation: str, story_summary: str) -> tuple[bool, dict, Optional[str]]:
        """Generate an enemy for an encounter."""
        prompt = ENEMY_GENERATION_PROMPT.format(
            location_type=location_type,
            player_power=player_power,
            situation=situation,
            story_summary=story_summary or "An adventure in progress"
        )
        
        # Scale fallback based on power level
        base_hp = 8 + (player_power * 4)
        fallback = {
            "name": "Shadowy Figure",
            "description": "A mysterious hostile creature emerges from the darkness.",
            "hp": base_hp,
            "ac": 10 + player_power,
            "attack_bonus": player_power,
            "damage_dice": [1, 6],
            "damage_bonus": player_power - 1,
            "behavior": "aggressive",
            "xp": 20 + (player_power * 10),
            "gold_drop": [1, 5 * player_power],
            "loot": []
        }
        
        return self._call_with_retry(SYSTEM_PROMPT, prompt, fallback)
    
    def generate_ending(self, player_name: str, player_class: str,
                        hp: int, max_hp: int, gold: int,
                        achievements: list, quests: dict,
                        major_choices: list, ending_type: str) -> tuple[bool, dict, Optional[str]]:
        """Generate the ending of the adventure."""
        prompt = ENDING_PROMPT.format(
            player_name=player_name,
            player_class=player_class,
            hp=hp,
            max_hp=max_hp,
            gold=gold,
            achievements=", ".join(achievements) if achievements else "survived",
            quests=json.dumps(quests) if quests else "{}",
            major_choices=", ".join(major_choices) if major_choices else "made their way",
            ending_type=ending_type
        )
        
        fallback = {
            "title": "The End",
            "epilogue": (
                f"And so the tale of {player_name} the {player_class} comes to a close. "
                f"With {gold} gold coins and countless memories, the adventurer's legend will be told for generations."
            ),
            "final_stats": f"HP: {hp}/{max_hp}, Gold: {gold}",
            "credits_note": "Thanks for playing!"
        }
        
        return self._call_with_retry(SYSTEM_PROMPT, prompt, fallback)

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def list_available_models() -> list[tuple[str, str, str]]:
    """Return list of (model_id, name, description) tuples."""
    return [
        (model_id, info["name"], info["description"])
        for model_id, info in AVAILABLE_MODELS.items()
    ]

def get_model_display_name(model_id: str) -> str:
    """Get display name for a model."""
    if model_id in AVAILABLE_MODELS:
        return AVAILABLE_MODELS[model_id]["name"]
    return model_id

def check_api_key() -> tuple[bool, str]:
    """Check if API key is configured and valid format."""
    key = os.environ.get("OPENROUTER_API_KEY", "")
    if not key:
        return False, "OPENROUTER_API_KEY environment variable not set"
    if len(key) < 10:
        return False, "API key appears too short"
    return True, "API key configured"


# =============================================================================
# TEST
# =============================================================================

if __name__ == "__main__":
    DEBUG = True
    print("Testing LLM DM...")
    
    # Check API key
    has_key, msg = check_api_key()
    print(f"API Key: {msg}")
    
    if has_key:
        dm = DungeonMaster()
        print(f"Model: {dm.get_model()}")
        
        # Test story start generation
        print("\nGenerating story start...")
        success, content, error = dm.generate_story_start("Vex", "rogue", ["Dagger", "Lockpicks"])
        
        if success:
            print("SUCCESS!")
            print(json.dumps(content, indent=2)[:500])
        else:
            print(f"Error: {error}")
            print(f"Fallback content: {content}")
    else:
        print("\nTo test API calls, set OPENROUTER_API_KEY environment variable")
        
        # Test fallback
        dm = DungeonMaster()
        dm.client.api_key = None  # Force fallback
        
        print("\nTesting fallback content...")
        success, content, error = dm.generate_story_start("Vex", "rogue", ["Dagger"])
        print(f"Fallback used: {not success}")
        print(f"Content: {content.get('location_name', 'N/A')}")

