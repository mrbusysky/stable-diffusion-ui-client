// Saving settings
let saveSettingsConfigTable = document.getElementById("save-settings-config-table")
let saveSettingsConfigOverlay = document.getElementById("save-settings-config")
let resetImageSettingsButton = document.getElementById("reset-image-settings")

const SETTINGS_KEY = "user_settings_v2"

const SETTINGS = {} // key=id. dict initialized in initSettings. { element, default, value, ignore }
const SETTINGS_IDS_LIST = [
    "prompt",
    "seed",
    "random_seed",
    "num_outputs_total",
    "num_outputs_parallel",
    "stable_diffusion_model",
    "sampler",
    "width",
    "height",
    "num_inference_steps",
    "guidance_scale",
    "prompt_strength",
    "output_format",
    "negative_prompt",
    "stream_image_progress",
    "use_face_correction",
    "use_upscale",
    "show_only_filtered_image",
    "upscale_model",
    "preview-image",
    "modifier-card-size-slider",
    "theme",
    "save_to_disk",
    "diskPath",
    "sound_toggle",
    "turbo",
    "use_cpu",
    "use_full_precision",
    "auto_save_settings"
]

const IGNORE_BY_DEFAULT = [
    "prompt"
]

const SETTINGS_SECTIONS = [ // gets the "keys" property filled in with an ordered list of settings in this section via initSettings
    { id: "editor-inputs",   name: "Prompt" },
    { id: "editor-settings", name: "Image Settings" },
    { id: "system-settings", name: "System Settings" },
    { id: "container",       name: "Other" }
]

async function initSettings() {
    SETTINGS_IDS_LIST.forEach(id => {
        var element = document.getElementById(id)
        var label = document.querySelector(`label[for='${element.id}']`)
        SETTINGS[id] = {
            key: id,
            element: element,
            label: getSettingLabel(element),
            default: getSetting(element),
            value: getSetting(element),
            ignore: IGNORE_BY_DEFAULT.includes(id)
        }
        element.addEventListener("input", settingChangeHandler)
        element.addEventListener("change", settingChangeHandler)
    })
    var unsorted_settings_ids = [...SETTINGS_IDS_LIST]
    SETTINGS_SECTIONS.forEach(section => {
        var name = section.name
        var element = document.getElementById(section.id)
        var children = Array.from(element.querySelectorAll(unsorted_settings_ids.map(id => `#${id}`).join(",")))
        section.keys = []
        children.forEach(e => {
            section.keys.push(e.id)
        })
        unsorted_settings_ids = unsorted_settings_ids.filter(id => children.find(e => e.id == id) == undefined)
    })
    loadSettings()
}

function getSetting(element) {
    if (typeof element === "string" || element instanceof String) {
        element = SETTINGS[element].element
    }
    if (element.type == "checkbox") {
        return element.checked
    }
    return element.value
}
function setSetting(element, value) {
    if (typeof element === "string" || element instanceof String) {
        element = SETTINGS[element].element
    }
    SETTINGS[element.id].value = value
    if (getSetting(element) == value) {
        return // no setting necessary
    }
    if (element.type == "checkbox") {
        element.checked = value
    }
    else {
        element.value = value
    }
    element.dispatchEvent(new Event("input"))
    element.dispatchEvent(new Event("change"))
}

function saveSettings() {
    var saved_settings = Object.values(SETTINGS).map(setting => {
        return {
            key: setting.key,
            value: setting.value,
            ignore: setting.ignore
        }
    })
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(saved_settings))
}

var CURRENTLY_LOADING_SETTINGS = false
function loadSettings() {
    var saved_settings_text = localStorage.getItem(SETTINGS_KEY)
    if (saved_settings_text) {
        var saved_settings = JSON.parse(saved_settings_text)
        if (saved_settings.find(s => s.key == "auto_save_settings").value == false) {
            setSetting("auto_save_settings", false)
            return
        }
        CURRENTLY_LOADING_SETTINGS = true
        saved_settings.map(saved_setting => {
            var setting = SETTINGS[saved_setting.key]
            if (setting === undefined) {
                return
            }
            setting.ignore = saved_setting.ignore
            if (!setting.ignore) {
                setting.value = saved_setting.value
                setSetting(setting.element, setting.value)
            }
        })
        CURRENTLY_LOADING_SETTINGS = false
    }
    else {
        CURRENTLY_LOADING_SETTINGS = true
        tryLoadOldSettings();
        CURRENTLY_LOADING_SETTINGS = false
        saveSettings()
    }
}

function loadDefaultSettingsSection(section_id) {
    CURRENTLY_LOADING_SETTINGS = true
    var section = SETTINGS_SECTIONS.find(s => s.id == section_id);
    section.keys.forEach(key => {
        var setting = SETTINGS[key];
        setting.value = setting.default
        setSetting(setting.element, setting.value)
    })
    CURRENTLY_LOADING_SETTINGS = false
    saveSettings()
}

function settingChangeHandler(event) {
    if (!CURRENTLY_LOADING_SETTINGS) {
        var element = event.target
        var value = getSetting(element)
        if (value != SETTINGS[element.id].value) {
            SETTINGS[element.id].value = value
            saveSettings()
        }
    }
}

function getSettingLabel(element) {
    var labelElement = document.querySelector(`label[for='${element.id}']`)
    var label = labelElement?.innerText || element.id
    var truncate_length = 30
    if (label.includes(" (")) {
        label = label.substring(0, label.indexOf(" ("))
    }
    if (label.length > truncate_length) {
        label = label.substring(0, truncate_length - 3) + "..."
    }
    label = label.replace("➕", "")
    label = label.replace("➖", "")
    return label
}

function fillSaveSettingsConfigTable() {
    saveSettingsConfigTable.textContent = ""
    SETTINGS_SECTIONS.forEach(section => {
        var section_row = `<tr><th>${section.name}</th><td></td></tr>`
        saveSettingsConfigTable.insertAdjacentHTML("beforeend", section_row)
        section.keys.forEach(key => {
            var setting = SETTINGS[key]
            var element = setting.element
            var checkbox_id = `shouldsave_${element.id}`
            var is_checked = setting.ignore ? "" : "checked"
            var value = setting.value
            var value_truncate_length = 30
            if ((typeof value === "string" || value instanceof String) && value.length > value_truncate_length) {
                value = value.substring(0, value_truncate_length - 3) + "..."
            }
            var newrow = `<tr><td><label for="${checkbox_id}">${setting.label}</label></td><td><input id="${checkbox_id}" name="${checkbox_id}" ${is_checked} type="checkbox" ></td><td><small>(${value})</small></td></tr>`
            saveSettingsConfigTable.insertAdjacentHTML("beforeend", newrow)
            var checkbox = document.getElementById(checkbox_id)
            checkbox.addEventListener("input", event => {
                setting.ignore = !checkbox.checked
                saveSettings()
            })
        })
    })
}

document.getElementById("save-settings-config-close-btn").addEventListener('click', () => {
    saveSettingsConfigOverlay.style.display = 'none'
})
document.getElementById("configureSettingsSaveBtn").addEventListener('click', () => {
    fillSaveSettingsConfigTable()
    saveSettingsConfigOverlay.style.display = 'block'
})
saveSettingsConfigOverlay.addEventListener('click', (event) => {
    if (event.target.id == saveSettingsConfigOverlay.id) {
        saveSettingsConfigOverlay.style.display = 'none'
    }
})
document.getElementById("save-settings-config-close-btn").addEventListener('click', () => {
    saveSettingsConfigOverlay.style.display = 'none'
})
resetImageSettingsButton.addEventListener('click', event => {
    loadDefaultSettingsSection("editor-settings");
    event.stopPropagation()
})


function tryLoadOldSettings() {
    console.log("Loading old user settings")
    // load v1 auto-save.js settings
    var old_map = {
        "guidance_scale_slider": "guidance_scale",
        "prompt_strength_slider": "prompt_strength"
    }
    var settings_key_v1 = "user_settings"
    var saved_settings_text = localStorage.getItem(settings_key_v1)
    if (saved_settings_text) {
        var saved_settings = JSON.parse(saved_settings_text)
        Object.keys(saved_settings.should_save).forEach(key => {
            key = key in old_map ? old_map[key] : key
            SETTINGS[key].ignore = !saved_settings.should_save[key]
        });
        Object.keys(saved_settings.values).forEach(key => {
            key = key in old_map ? old_map[key] : key
            var setting = SETTINGS[key]
            if (!setting.ignore) {
                setting.value = saved_settings.values[key]
                setSetting(setting.element, setting.value)
            }
        });
        localStorage.removeItem(settings_key_v1)
    }

    // load old individually stored items
    var individual_settings_map = { // maps old localStorage-key to new SETTINGS-key
        "soundEnabled": "sound_toggle",
        "saveToDisk": "save_to_disk",
        "useCPU": "use_cpu",
        "useFullPrecision": "use_full_precision",
        "useTurboMode": "turbo",
        "diskPath": "diskPath",
        "useFaceCorrection": "use_face_correction",
        "useUpscaling": "use_upscale",
        "showOnlyFilteredImage": "show_only_filtered_image",
        "streamImageProgress": "stream_image_progress",
        "outputFormat": "output_format",
        "autoSaveSettings": "auto_save_settings",
    };
    Object.keys(individual_settings_map).forEach(localStorageKey => {
        var localStorageValue = localStorage.getItem(localStorageKey);
        if (localStorageValue !== null) {
            var setting = SETTINGS[individual_settings_map[localStorageKey]]
            if (setting == null || setting == undefined) {
                return
            }
            if (setting.element.type == "checkbox" && (typeof localStorageValue === "string" || localStorageValue instanceof String)) {
                localStorageValue = localStorageValue == "true"
            }
            setting.value = localStorageValue
            setSetting(setting.element, setting.value)
            localStorage.removeItem(localStorageKey);
        }
    })
}
