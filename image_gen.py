"""
Image Generation using Pollinations.ai
Free AI image generation - no API key required!

Pollinations.ai provides free access to various image generation models.
We use their simple URL-based API for generating scene and enemy images.
"""

import urllib.parse
import hashlib
import os

# =============================================================================
# CONFIGURATION
# =============================================================================

# Pollinations.ai URL format
POLLINATIONS_URL = "https://image.pollinations.ai/prompt/{prompt}"

# Image settings
DEFAULT_WIDTH = 1024
DEFAULT_HEIGHT = 576  # 16:9 aspect for cinematic feel

# Style presets for consistent dark fantasy aesthetic
STYLE_SUFFIX = ", dark fantasy art style, dramatic lighting, atmospheric fog, detailed, cinematic composition, 4k, artstation"

SCENE_STYLE = "dark medieval fantasy environment, moody atmosphere, volumetric lighting, mist, shadows" + STYLE_SUFFIX

ENEMY_STYLE = "dark fantasy creature portrait, menacing, dramatic pose, dark background, glowing eyes" + STYLE_SUFFIX

# Cache directory for generated images (optional optimization)
CACHE_DIR = "static/generated"

# =============================================================================
# IMAGE GENERATION
# =============================================================================

def generate_image_url(prompt: str, width: int = DEFAULT_WIDTH, 
                       height: int = DEFAULT_HEIGHT, seed: int = None) -> str:
    """
    Generate a Pollinations.ai URL for the given prompt.
    
    Args:
        prompt: The image description
        width: Image width in pixels
        height: Image height in pixels  
        seed: Optional seed for reproducibility
    
    Returns:
        URL string that will generate the image when loaded
    """
    # Clean and encode the prompt
    full_prompt = prompt.strip()
    encoded_prompt = urllib.parse.quote(full_prompt)
    
    # Build URL with parameters
    url = f"https://image.pollinations.ai/prompt/{encoded_prompt}"
    
    params = []
    if width != 1024:
        params.append(f"width={width}")
    if height != 1024:
        params.append(f"height={height}")
    if seed is not None:
        params.append(f"seed={seed}")
    
    # Add nologo to remove watermark
    params.append("nologo=true")
    
    if params:
        url += "?" + "&".join(params)
    
    return url

def generate_scene_image(description: str, location_type: str = None) -> str:
    """
    Generate an image URL for a scene/location.
    
    Args:
        description: Description of the scene
        location_type: Optional location type for style hints
    
    Returns:
        Pollinations.ai URL for the scene image
    """
    # Build the prompt
    prompt = description
    
    # Add style modifiers based on location type
    if location_type:
        location_styles = {
            "tavern": "cozy medieval tavern interior, fireplace, wooden beams, candlelight",
            "forest": "dark enchanted forest path, twisted trees, mysterious fog, moonlight",
            "dungeon": "underground dungeon corridor, stone walls, torches, ancient ruins",
            "castle": "gothic castle interior, grand halls, stained glass, dramatic shadows",
            "cave": "deep cave system, stalactites, bioluminescent fungi, underground lake",
            "town": "medieval town square, cobblestone streets, timber buildings, market stalls",
            "ruins": "ancient temple ruins, overgrown vines, crumbling pillars, mystical glow",
            "swamp": "murky swamp, dead trees, fog, eerie atmosphere, will-o-wisps",
            "mountain": "treacherous mountain pass, snow, cliff edges, storm clouds",
            "crypt": "underground crypt, sarcophagi, cobwebs, ghostly presence"
        }
        if location_type.lower() in location_styles:
            prompt = f"{location_styles[location_type.lower()]}, {description}"
    
    # Add consistent style
    prompt = f"{prompt}, {SCENE_STYLE}"
    
    # Generate consistent seed from description for caching
    seed = int(hashlib.md5(description.encode()).hexdigest()[:8], 16) % 1000000
    
    return generate_image_url(prompt, DEFAULT_WIDTH, DEFAULT_HEIGHT, seed)

def generate_enemy_image(enemy_name: str, description: str = "") -> str:
    """
    Generate an image URL for an enemy/creature.
    
    Args:
        enemy_name: Name of the enemy
        description: Optional description of the enemy
    
    Returns:
        Pollinations.ai URL for the enemy image
    """
    # Build enemy prompt
    if description:
        prompt = f"{enemy_name}, {description}"
    else:
        prompt = f"{enemy_name}, fantasy monster"
    
    # Add enemy-specific style
    prompt = f"{prompt}, {ENEMY_STYLE}"
    
    # Generate consistent seed from name for caching
    seed = int(hashlib.md5(enemy_name.encode()).hexdigest()[:8], 16) % 1000000
    
    return generate_image_url(prompt, 768, 768, seed)  # Square for portraits

def generate_item_image(item_name: str, item_type: str = "item") -> str:
    """
    Generate an image URL for an item.
    
    Args:
        item_name: Name of the item
        item_type: Type of item (weapon, armor, potion, etc.)
    
    Returns:
        Pollinations.ai URL for the item image
    """
    type_styles = {
        "weapon": "fantasy weapon, detailed metalwork, ornate handle",
        "armor": "fantasy armor piece, detailed craftsmanship, battle-worn",
        "potion": "magical potion bottle, glowing liquid, mystical",
        "key": "ornate fantasy key, ancient, magical runes",
        "scroll": "ancient scroll, magical symbols, glowing text",
        "ring": "magical ring, gemstone, enchanted glow",
        "amulet": "mystical amulet, ancient symbols, magical energy"
    }
    
    style = type_styles.get(item_type.lower(), "fantasy item, detailed")
    prompt = f"{item_name}, {style}, dark background, studio lighting, game item icon style"
    
    seed = int(hashlib.md5(item_name.encode()).hexdigest()[:8], 16) % 1000000
    
    return generate_image_url(prompt, 256, 256, seed)

def generate_character_portrait(name: str, player_class: str) -> str:
    """
    Generate a character portrait.
    
    Args:
        name: Character name
        player_class: Character class (fighter, rogue, mage)
    
    Returns:
        Pollinations.ai URL for the character portrait
    """
    class_styles = {
        "fighter": "armored warrior, battle-scarred, determined expression, sword and shield",
        "rogue": "hooded rogue, daggers, mysterious, shadows, cunning eyes",
        "mage": "powerful wizard, magical staff, arcane symbols, mystical aura"
    }
    
    style = class_styles.get(player_class.lower(), "fantasy adventurer")
    prompt = f"fantasy character portrait, {style}, {STYLE_SUFFIX}"
    
    # Use name for seed so same character gets same portrait
    seed = int(hashlib.md5(f"{name}_{player_class}".encode()).hexdigest()[:8], 16) % 1000000
    
    return generate_image_url(prompt, 512, 512, seed)

# =============================================================================
# TESTING
# =============================================================================

if __name__ == "__main__":
    print("Testing Pollinations.ai image generation...")
    print()
    
    # Test scene
    scene_url = generate_scene_image("A mysterious tavern filled with shadowy figures", "tavern")
    print(f"Scene URL: {scene_url[:100]}...")
    print()
    
    # Test enemy
    enemy_url = generate_enemy_image("Goblin Shaman", "small green creature with tribal markings and a wooden staff")
    print(f"Enemy URL: {enemy_url[:100]}...")
    print()
    
    # Test character
    char_url = generate_character_portrait("Vex", "rogue")
    print(f"Character URL: {char_url[:100]}...")
    print()
    
    print("Copy any URL to browser to see the generated image!")

