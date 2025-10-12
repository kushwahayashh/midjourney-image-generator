// Settings Modal Functionality

// Default settings
const Settings = {
    autoSave: true,
    notifications: true,
    darkMode: true,
    imageQuality: 'high',
    imagesPerBatch: 4,
    autoRefresh: false
};

function openSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (!modal) return;
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Load current settings into UI
    loadSettingsUI();
    
    // Re-initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function closeSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (!modal) return;
    
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function loadSettingsUI() {
    // Load toggle switches
    document.getElementById('autoSaveToggle')?.classList.toggle('active', Settings.autoSave);
    document.getElementById('notificationsToggle')?.classList.toggle('active', Settings.notifications);
    document.getElementById('autoRefreshToggle')?.classList.toggle('active', Settings.autoRefresh);
    
    // Load select values
    const qualitySelect = document.getElementById('imageQuality');
    if (qualitySelect) qualitySelect.value = Settings.imageQuality;
    
    // Load number inputs
    const batchInput = document.getElementById('imagesPerBatch');
    if (batchInput) batchInput.value = Settings.imagesPerBatch;
}

function toggleSetting(settingName) {
    Settings[settingName] = !Settings[settingName];
    
    const toggle = document.getElementById(`${settingName}Toggle`);
    if (toggle) {
        toggle.classList.toggle('active', Settings[settingName]);
    }
    
    // Save to localStorage
    saveSettings();
    
    // Show feedback
    if (window.toast) {
        window.toast.success('Setting updated', `${settingName} is now ${Settings[settingName] ? 'enabled' : 'disabled'}`);
    }
}

function updateSelectSetting(settingName, value) {
    Settings[settingName] = value;
    saveSettings();
    
    if (window.toast) {
        window.toast.success('Setting updated', `${settingName} changed to ${value}`);
    }
}

function updateNumberSetting(settingName, value) {
    Settings[settingName] = parseInt(value);
    saveSettings();
    
    if (window.toast) {
        window.toast.success('Setting updated', `${settingName} set to ${value}`);
    }
}

function saveSettings() {
    try {
        localStorage.setItem('vibeSettings', JSON.stringify(Settings));
    } catch (e) {
        console.error('Failed to save settings:', e);
    }
}

function loadSettings() {
    try {
        const saved = localStorage.getItem('vibeSettings');
        if (saved) {
            Object.assign(Settings, JSON.parse(saved));
        }
        // Apply theme on load
        applyTheme();
    } catch (e) {
        console.error('Failed to load settings:', e);
    }
}

function applyTheme() {
    if (Settings.darkMode) {
        document.body.classList.remove('light-mode');
    } else {
        document.body.classList.add('light-mode');
    }
    updateThemeIcon();
}

function toggleTheme() {
    Settings.darkMode = !Settings.darkMode;
    applyTheme();
    saveSettings();
    
    // Show feedback
    if (window.toast) {
        window.toast.success('Theme changed', Settings.darkMode ? 'Dark mode enabled' : 'Light mode enabled');
    }
}

function updateThemeIcon() {
    const themeIcon = document.getElementById('themeIcon');
    if (!themeIcon) return;
    
    // Change icon based on current theme
    // Moon icon for dark mode (click to go light), Sun icon for light mode (click to go dark)
    const iconName = Settings.darkMode ? 'moon' : 'sun';
    themeIcon.setAttribute('data-lucide', iconName);
    
    // Re-initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function setupSettingsListeners() {
    // Close modal when clicking outside
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeSettingsModal();
            }
        });
    }
    
    // Close on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const modal = document.getElementById('settingsModal');
            if (modal && modal.classList.contains('active')) {
                closeSettingsModal();
            }
        }
    });
}

// Initialize settings on page load
document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    setupSettingsListeners();
});
