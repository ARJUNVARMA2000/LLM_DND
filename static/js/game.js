/**
 * The Dragon's Shadow - Game Client
 * Frontend JavaScript for the browser-based D&D adventure
 */

// =============================================================================
// STATE
// =============================================================================

const GameState = {
    player: null,
    currentChoices: [],
    inCombat: false,
    enemy: null,
    currentLocation: '',
    loading: false
};

// =============================================================================
// DOM ELEMENTS
// =============================================================================

const screens = {
    title: document.getElementById('title-screen'),
    character: document.getElementById('character-screen'),
    game: document.getElementById('game-screen'),
    combat: document.getElementById('combat-screen')
};

const elements = {
    // Title
    btnNewGame: document.getElementById('btn-new-game'),
    btnContinue: document.getElementById('btn-continue'),
    modelSelect: document.getElementById('model-select'),
    
    // Character
    charName: document.getElementById('char-name'),
    classCards: document.querySelectorAll('.class-card'),
    btnStartAdventure: document.getElementById('btn-start-adventure'),
    
    // Game
    sceneImage: document.getElementById('scene-image'),
    locationName: document.getElementById('location-name'),
    narrativeText: document.getElementById('narrative-text'),
    notifications: document.getElementById('notifications'),
    choicesContainer: document.getElementById('choices-container'),
    questName: document.getElementById('quest-name'),
    
    // HUD
    hudName: document.getElementById('hud-name'),
    hudClass: document.getElementById('hud-class'),
    hudClassIcon: document.getElementById('hud-class-icon'),
    hudHp: document.getElementById('hud-hp'),
    hudHpFill: document.getElementById('hud-hp-fill'),
    hudGold: document.getElementById('hud-gold'),
    hudAbility: document.getElementById('hud-ability'),
    
    // Combat
    enemyImage: document.getElementById('enemy-image'),
    enemyName: document.getElementById('enemy-name'),
    enemyHpFill: document.getElementById('enemy-hp-fill'),
    enemyHpText: document.getElementById('enemy-hp-text'),
    combatNarrative: document.getElementById('combat-narrative'),
    combatHpFill: document.getElementById('combat-hp-fill'),
    combatHpText: document.getElementById('combat-hp-text'),
    combatAbilityBtn: document.getElementById('combat-ability-btn'),
    combatAbilityName: document.getElementById('combat-ability-name'),
    combatResult: document.getElementById('combat-result'),
    resultTitle: document.getElementById('result-title'),
    resultRewards: document.getElementById('result-rewards'),
    btnContinueAfterCombat: document.getElementById('btn-continue-after-combat'),
    
    // Modals
    inventoryModal: document.getElementById('inventory-modal'),
    statsModal: document.getElementById('stats-modal'),
    inventoryGrid: document.getElementById('inventory-grid'),
    inventoryGold: document.getElementById('inventory-gold'),
    statsDisplay: document.getElementById('stats-display'),
    
    // Loading
    loadingOverlay: document.getElementById('loading-overlay'),
    diceDisplay: document.getElementById('dice-display'),
    diceResult: document.getElementById('dice-result')
};

// =============================================================================
// API CALLS
// =============================================================================

async function apiCall(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(`/api/${endpoint}`, options);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'API request failed');
        }
        
        return result;
    } catch (error) {
        console.error(`API Error (${endpoint}):`, error);
        throw error;
    }
}

// =============================================================================
// SCREEN MANAGEMENT
// =============================================================================

function showScreen(screenName) {
    Object.values(screens).forEach(screen => {
        screen.classList.remove('active');
    });
    
    if (screens[screenName]) {
        screens[screenName].classList.add('active');
    }
}

function showLoading(show = true) {
    GameState.loading = show;
    elements.loadingOverlay.classList.toggle('hidden', !show);
}

// =============================================================================
// TITLE SCREEN
// =============================================================================

function initTitleScreen() {
    elements.btnNewGame.addEventListener('click', () => {
        showScreen('character');
    });
    
    elements.btnContinue.addEventListener('click', async () => {
        showLoading(true);
        try {
            const result = await apiCall('load', 'POST', { filename: 'save.json' });
            if (result.success) {
                GameState.player = result.player;
                updateHUD();
                showScreen('game');
                // Regenerate current scene
                await generateScene();
            }
        } catch (error) {
            showNotification('No save file found', 'error');
        }
        showLoading(false);
    });
    
    elements.modelSelect.addEventListener('change', async () => {
        const model = elements.modelSelect.value;
        await apiCall('set_model', 'POST', { model });
    });
}

// =============================================================================
// CHARACTER CREATION
// =============================================================================

let selectedClass = null;

function initCharacterScreen() {
    elements.classCards.forEach(card => {
        card.addEventListener('click', () => {
            elements.classCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedClass = card.dataset.class;
            updateStartButton();
        });
    });
    
    elements.charName.addEventListener('input', updateStartButton);
    
    elements.btnStartAdventure.addEventListener('click', startNewGame);
}

function updateStartButton() {
    const hasName = elements.charName.value.trim().length > 0;
    const hasClass = selectedClass !== null;
    elements.btnStartAdventure.disabled = !(hasName && hasClass);
}

async function startNewGame() {
    const name = elements.charName.value.trim() || 'Adventurer';
    const playerClass = selectedClass || 'fighter';
    
    showLoading(true);
    
    try {
        const result = await apiCall('new_game', 'POST', {
            name,
            class: playerClass
        });
        
        if (result.success) {
            GameState.player = result.player;
            GameState.currentLocation = result.location;
            GameState.currentChoices = result.choices;
            
            // Update UI
            updateHUD();
            updateScene(result.image_url, result.location, result.opening);
            renderChoices(result.choices);
            
            if (result.quest) {
                elements.questName.textContent = result.quest;
            }
            
            showScreen('game');
        }
    } catch (error) {
        showNotification('Failed to start game: ' + error.message, 'error');
    }
    
    showLoading(false);
}

// =============================================================================
// GAME SCREEN
// =============================================================================

function initGameScreen() {
    // HUD buttons
    document.getElementById('btn-inventory').addEventListener('click', showInventory);
    document.getElementById('btn-stats').addEventListener('click', showStats);
    document.getElementById('btn-save').addEventListener('click', saveGame);
    document.getElementById('btn-menu').addEventListener('click', () => showScreen('title'));
    
    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            elements.inventoryModal.classList.add('hidden');
            elements.statsModal.classList.add('hidden');
        });
    });
    
    // Close modals on background click
    [elements.inventoryModal, elements.statsModal].forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    });
}

function updateHUD() {
    if (!GameState.player) return;
    
    const p = GameState.player;
    
    elements.hudName.textContent = p.name;
    elements.hudClass.textContent = p.class.charAt(0).toUpperCase() + p.class.slice(1);
    elements.hudHp.textContent = `${p.hp}/${p.max_hp}`;
    elements.hudHpFill.style.width = `${(p.hp / p.max_hp) * 100}%`;
    elements.hudGold.textContent = p.gold;
    elements.hudAbility.textContent = `${p.ability_uses}/${p.ability_max}`;
    
    // Class icon
    const icons = { fighter: '⚔️', rogue: '🗡️', mage: '🔮' };
    elements.hudClassIcon.textContent = icons[p.class] || '⚔️';
    
    // Quest
    if (p.quest) {
        elements.questName.textContent = p.quest;
    }
}

function updateScene(imageUrl, locationName, narrative) {
    if (imageUrl) {
        elements.sceneImage.src = imageUrl;
    }
    
    if (locationName) {
        elements.locationName.textContent = locationName;
        GameState.currentLocation = locationName;
    }
    
    if (narrative) {
        // Animate text appearance
        elements.narrativeText.innerHTML = '';
        const paragraphs = narrative.split('\n\n');
        paragraphs.forEach((para, i) => {
            const p = document.createElement('p');
            p.textContent = para;
            p.style.animationDelay = `${i * 0.2}s`;
            p.classList.add('fade-in');
            elements.narrativeText.appendChild(p);
        });
    }
}

function renderChoices(choices) {
    elements.choicesContainer.innerHTML = '';
    GameState.currentChoices = choices;
    
    choices.forEach((choice, index) => {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.innerHTML = `
            <span class="choice-num">${index + 1}</span>
            <span class="choice-text">${choice.text}</span>
        `;
        btn.addEventListener('click', () => handleChoice(choice));
        elements.choicesContainer.appendChild(btn);
    });
}

async function handleChoice(choice) {
    if (GameState.loading) return;
    
    showLoading(true);
    clearNotifications();
    
    try {
        const result = await apiCall('choice', 'POST', { choice });
        
        if (result.success) {
            GameState.player = result.player;
            updateHUD();
            
            // Show skill check result
            if (result.skill_check) {
                await showDiceRoll(result.skill_check);
            }
            
            // Show rewards
            if (result.items_found && result.items_found.length > 0) {
                result.items_found.forEach(item => {
                    showNotification(`Found: ${item}`, 'item');
                });
            }
            
            if (result.gold_found > 0) {
                showNotification(`+${result.gold_found} gold`, 'gold');
            }
            
            if (result.quest_update) {
                const status = result.quest_update.status === 'started' ? 'Quest Started' : 
                              result.quest_update.status === 'completed' ? 'Quest Completed' : 'Quest Updated';
                showNotification(`${status}: ${result.quest_update.name}`, 'quest');
            }
            
            // Check for combat
            if (result.combat) {
                GameState.inCombat = true;
                GameState.enemy = result.enemy;
                showNotification(`${result.enemy.name} attacks!`, 'combat');
                
                setTimeout(() => {
                    enterCombat(result.enemy, result.narration);
                }, 1500);
            } else if (result.rest) {
                updateScene(null, null, result.narration);
                await generateScene();
            } else {
                updateScene(result.image_url, result.location, result.narration);
                renderChoices(result.choices);
            }
        }
    } catch (error) {
        showNotification('Error: ' + error.message, 'error');
    }
    
    showLoading(false);
}

async function generateScene() {
    // This regenerates the current location choices
    showLoading(true);
    try {
        const result = await apiCall('choice', 'POST', { 
            choice: { text: 'Look around', type: 'explore' } 
        });
        
        if (result.success) {
            updateScene(result.image_url, result.location, result.narration);
            renderChoices(result.choices);
        }
    } catch (error) {
        console.error('Failed to generate scene:', error);
    }
    showLoading(false);
}

// =============================================================================
// COMBAT
// =============================================================================

function initCombatScreen() {
    document.querySelectorAll('.combat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!GameState.loading) {
                handleCombatAction(btn.dataset.action);
            }
        });
    });
    
    elements.btnContinueAfterCombat.addEventListener('click', exitCombat);
}

function enterCombat(enemy, narration) {
    GameState.inCombat = true;
    GameState.enemy = enemy;
    
    // Update combat UI
    elements.enemyImage.src = enemy.image_url || '';
    elements.enemyName.textContent = enemy.name;
    updateEnemyHP(enemy.hp, enemy.max_hp);
    updateCombatPlayerHP();
    
    elements.combatNarrative.textContent = narration || `${enemy.name} attacks!`;
    
    // Update ability button
    const abilityName = GameState.player.ability_name;
    elements.combatAbilityName.textContent = abilityName;
    updateAbilityButton();
    
    // Hide result overlay
    elements.combatResult.classList.add('hidden');
    
    showScreen('combat');
}

function updateEnemyHP(current, max) {
    const percent = Math.max(0, (current / max) * 100);
    elements.enemyHpFill.style.width = `${percent}%`;
    elements.enemyHpText.textContent = `${current}/${max}`;
}

function updateCombatPlayerHP() {
    const p = GameState.player;
    const percent = Math.max(0, (p.hp / p.max_hp) * 100);
    elements.combatHpFill.style.width = `${percent}%`;
    elements.combatHpText.textContent = `${p.hp}/${p.max_hp}`;
}

function updateAbilityButton() {
    const disabled = GameState.player.ability_uses <= 0;
    elements.combatAbilityBtn.disabled = disabled;
}

async function handleCombatAction(action) {
    if (GameState.loading) return;
    
    showLoading(true);
    
    try {
        const data = { action };
        
        // If using item, we need to specify which one
        if (action === 'item') {
            // For simplicity, use first available health potion
            data.item = 'Health Potion';
        }
        
        const result = await apiCall('combat_action', 'POST', data);
        
        if (result.success) {
            GameState.player = result.player;
            updateCombatPlayerHP();
            updateAbilityButton();
            
            // Show dice rolls
            if (result.player_result?.roll) {
                await showDiceRoll(result.player_result.roll);
            }
            
            // Update narrative
            if (result.narration) {
                elements.combatNarrative.textContent = result.narration;
            }
            
            // Check outcomes
            if (result.victory) {
                showVictory(result.rewards);
            } else if (result.defeat) {
                showDefeat();
            } else if (result.fled) {
                showNotification('You escaped!', 'info');
                exitCombat();
            } else {
                // Update enemy HP
                if (result.enemy) {
                    updateEnemyHP(result.enemy.hp, result.enemy.max_hp);
                    GameState.enemy = result.enemy;
                }
            }
        }
    } catch (error) {
        showNotification('Combat error: ' + error.message, 'error');
    }
    
    showLoading(false);
}

function showVictory(rewards) {
    elements.resultTitle.textContent = 'Victory!';
    elements.resultTitle.className = 'result-title victory';
    
    let rewardsHtml = '';
    if (rewards.gold) {
        rewardsHtml += `<div class="reward">+${rewards.gold} Gold</div>`;
    }
    if (rewards.xp) {
        rewardsHtml += `<div class="reward">+${rewards.xp} XP</div>`;
    }
    if (rewards.loot && rewards.loot.length > 0) {
        rewards.loot.forEach(item => {
            rewardsHtml += `<div class="reward">Found: ${item}</div>`;
        });
    }
    
    elements.resultRewards.innerHTML = rewardsHtml;
    elements.combatResult.classList.remove('hidden');
}

function showDefeat() {
    elements.resultTitle.textContent = 'Defeated...';
    elements.resultTitle.className = 'result-title defeat';
    elements.resultRewards.innerHTML = '<div class="reward">Your adventure ends here.</div>';
    elements.combatResult.classList.remove('hidden');
}

async function exitCombat() {
    GameState.inCombat = false;
    GameState.enemy = null;
    
    updateHUD();
    showScreen('game');
    
    // Generate new scene after combat
    await generateScene();
}

// =============================================================================
// NOTIFICATIONS & DICE
// =============================================================================

function showNotification(message, type = 'info') {
    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    notif.textContent = message;
    elements.notifications.appendChild(notif);
    
    // Auto-remove after delay
    setTimeout(() => {
        notif.style.opacity = '0';
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

function clearNotifications() {
    elements.notifications.innerHTML = '';
}

async function showDiceRoll(rollText) {
    elements.diceResult.innerHTML = formatRollText(rollText);
    elements.diceDisplay.classList.remove('hidden');
    
    return new Promise(resolve => {
        setTimeout(() => {
            elements.diceDisplay.classList.add('hidden');
            resolve();
        }, 2000);
    });
}

function formatRollText(text) {
    // Highlight success/failure and numbers
    let formatted = text
        .replace(/SUCCESS/g, '<span class="roll-success">SUCCESS</span>')
        .replace(/FAILURE/g, '<span class="roll-fail">FAILURE</span>')
        .replace(/HIT/g, '<span class="roll-success">HIT</span>')
        .replace(/MISS/g, '<span class="roll-fail">MISS</span>')
        .replace(/(\d+)/g, '<span class="roll-value">$1</span>');
    
    return formatted;
}

// =============================================================================
// INVENTORY & STATS
// =============================================================================

async function showInventory() {
    try {
        const result = await apiCall('inventory');
        
        elements.inventoryGold.textContent = `${result.gold} Gold`;
        elements.inventoryGrid.innerHTML = '';
        
        const itemIcons = {
            'Longsword': '🗡️',
            'Dagger': '🔪',
            'Staff': '🪄',
            'Health Potion': '🧪',
            'Mana Potion': '💧',
            'Lockpicks': '🔧',
            'Torch': '🔦',
            'Key': '🔑',
            'Chain Mail': '🛡️',
            'Leather Armor': '🥋',
            'Robes': '👘'
        };
        
        result.inventory.forEach(item => {
            const div = document.createElement('div');
            div.className = 'inventory-item';
            const icon = itemIcons[item] || '📦';
            const isEquipped = item === result.equipped_weapon;
            div.innerHTML = `
                <div class="item-icon">${icon}</div>
                <div class="item-name">${item}${isEquipped ? ' [E]' : ''}</div>
            `;
            elements.inventoryGrid.appendChild(div);
        });
        
        if (result.inventory.length === 0) {
            elements.inventoryGrid.innerHTML = '<p style="color: var(--text-muted); text-align: center;">Empty</p>';
        }
        
        elements.inventoryModal.classList.remove('hidden');
    } catch (error) {
        showNotification('Failed to load inventory', 'error');
    }
}

async function showStats() {
    try {
        const result = await apiCall('stats');
        
        let html = `
            <div class="stat-row">
                <span class="stat-name">Name</span>
                <span class="stat-value">${result.name}</span>
            </div>
            <div class="stat-row">
                <span class="stat-name">Class</span>
                <span class="stat-value">${result.class}</span>
            </div>
            <div class="stat-row">
                <span class="stat-name">HP</span>
                <span class="stat-value">${result.hp}/${result.max_hp}</span>
            </div>
            <div class="stat-row">
                <span class="stat-name">AC</span>
                <span class="stat-value">${result.ac}</span>
            </div>
        `;
        
        // Stats
        for (const [stat, data] of Object.entries(result.stats)) {
            const mod = data.modifier >= 0 ? `+${data.modifier}` : data.modifier;
            html += `
                <div class="stat-row">
                    <span class="stat-name">${stat}</span>
                    <span class="stat-value">${data.score} (${mod})</span>
                </div>
            `;
        }
        
        html += `
            <div class="stat-row">
                <span class="stat-name">${result.ability_name}</span>
                <span class="stat-value">${result.ability_uses}/${result.ability_max} uses</span>
            </div>
            <div class="stat-row">
                <span class="stat-name">Turn</span>
                <span class="stat-value">${result.turn}</span>
            </div>
        `;
        
        elements.statsDisplay.innerHTML = html;
        elements.statsModal.classList.remove('hidden');
    } catch (error) {
        showNotification('Failed to load stats', 'error');
    }
}

async function saveGame() {
    try {
        const result = await apiCall('save', 'POST', {});
        if (result.success) {
            showNotification('Game saved!', 'info');
        } else {
            showNotification('Failed to save: ' + result.message, 'error');
        }
    } catch (error) {
        showNotification('Save error: ' + error.message, 'error');
    }
}

// =============================================================================
// PARTICLES (Atmospheric Effect)
// =============================================================================

function initParticles() {
    const container = document.getElementById('particles');
    const particleCount = 30;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.style.cssText = `
            position: absolute;
            width: ${Math.random() * 4 + 1}px;
            height: ${Math.random() * 4 + 1}px;
            background: rgba(255, 255, 255, ${Math.random() * 0.3 + 0.1});
            border-radius: 50%;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            animation: particle-float ${Math.random() * 10 + 10}s ease-in-out infinite;
            animation-delay: ${Math.random() * 5}s;
        `;
        container.appendChild(particle);
    }
    
    // Add particle animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes particle-float {
            0%, 100% { transform: translate(0, 0) rotate(0deg); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translate(${Math.random() > 0.5 ? '' : '-'}50px, -100px) rotate(180deg); opacity: 0; }
        }
        
        .fade-in {
            animation: textFadeIn 0.5s ease forwards;
            opacity: 0;
        }
        
        @keyframes textFadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(style);
}

// =============================================================================
// KEYBOARD SHORTCUTS
// =============================================================================

function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Number keys for choices
        if (e.key >= '1' && e.key <= '9') {
            const index = parseInt(e.key) - 1;
            if (GameState.currentChoices[index] && !GameState.loading && !GameState.inCombat) {
                handleChoice(GameState.currentChoices[index]);
            }
        }
        
        // Combat shortcuts
        if (GameState.inCombat && !GameState.loading) {
            switch (e.key.toLowerCase()) {
                case 'a': handleCombatAction('attack'); break;
                case 's': handleCombatAction('ability'); break;
                case 'd': handleCombatAction('item'); break;
                case 'f': handleCombatAction('flee'); break;
            }
        }
        
        // Escape to close modals
        if (e.key === 'Escape') {
            elements.inventoryModal.classList.add('hidden');
            elements.statsModal.classList.add('hidden');
        }
        
        // I for inventory
        if (e.key.toLowerCase() === 'i' && !GameState.inCombat) {
            showInventory();
        }
    });
}

// =============================================================================
// INITIALIZATION
// =============================================================================

function init() {
    initTitleScreen();
    initCharacterScreen();
    initGameScreen();
    initCombatScreen();
    initParticles();
    initKeyboardShortcuts();
    
    // Show title screen
    showScreen('title');
    
    console.log('🐉 The Dragon\'s Shadow initialized');
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', init);

