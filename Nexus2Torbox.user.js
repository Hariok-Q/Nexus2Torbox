// ==UserScript==
// @name         Nexus2Torbox
// @namespace    https://github.com/Hariok-Q/Nexus2Torbox
// @version      1.0.0
// @author       Hariok-Q
// @description  Add Nexus Mods downloads to TorBox.
// @license      MIT
// @homepageURL  https://github.com/Hariok-Q/Nexus2Torbox
// @supportURL   https://github.com/Hariok-Q/Nexus2Torbox/issues
// @downloadURL  https://raw.githubusercontent.com/Hariok-Q/Nexus2Torbox/main/Nexus2Torbox.user.js
// @updateURL    https://raw.githubusercontent.com/Hariok-Q/Nexus2Torbox/main/Nexus2Torbox.user.js
// @match        https://www.nexusmods.com/*/mods/*
// @run-at       document-idle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM.xmlHttpRequest
// @grant        GM_xmlhttpRequest
// @connect      api.torbox.app
// ==/UserScript==

(() => {
    'use strict'

    const STORAGE_KEY = 'torboxApiKey'
    const API_URL = 'https://api.torbox.app/v1/api/webdl/createwebdownload'
    const request = typeof GM !== 'undefined' && GM.xmlHttpRequest
        ? GM.xmlHttpRequest.bind(GM) : GM_xmlhttpRequest
    const styles = document.createElement('style')
    styles.textContent = 'a.btn.inline-flex.n2t-button{color:#34ba90;background:transparent;box-shadow:inset 0 0 0 1px currentColor}'
    document.head.append(styles)

    function openSettings() {
        document.querySelector('#n2t-settings')?.remove()
        const dialog = document.createElement('dialog')
        dialog.id = 'n2t-settings'
        dialog.style.cssText = 'position:fixed;inset:50% auto auto 50%;transform:translate(-50%,-50%);margin:0;box-sizing:border-box;width:min(520px,calc(100vw - 32px));max-height:calc(100vh - 32px);overflow:auto;background:#2f2f2f;color:#ddd;border:1px solid #555;border-radius:6px;padding:28px;box-shadow:0 20px 60px #000'
        dialog.innerHTML = `
            <style>
                #n2t-settings { --accent:var(--theme-primary,#da8e35) }
                #n2t-settings::backdrop { background:rgba(0,0,0,.78);backdrop-filter:blur(2px) }
                #n2t-settings form { display:grid;gap:18px;font:14px Arial,sans-serif }
                #n2t-settings input { box-sizing:border-box;width:100%;padding:10px;background:#222;color:#fff;border:1px solid #555;border-radius:4px }
                #n2t-settings .actions { display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin-top:6px }
                #n2t-settings button { min-width:105px;padding:10px 16px;font:600 14px Arial,sans-serif;border-radius:4px;cursor:pointer }
                #n2t-settings .clear { margin-right:auto;background:transparent;color:#ef9a9a;border:1px solid #a55 }
                #n2t-settings .cancel { background:transparent;color:#ddd;border:1px solid #777 }
                #n2t-settings .save { background:var(--accent);color:#181818;border:1px solid var(--accent) }
            </style>
            <form method="dialog">
                <strong style="color:var(--accent);font-size:20px">Nexus2Torbox Settings</strong>
                <label style="display:grid;gap:8px">TorBox API key
                    <input type="password" required autocomplete="off" spellcheck="false">
                </label>
                <small>Available from <a href="https://torbox.app/settings" target="_blank" rel="noopener" style="color:var(--accent)">TorBox Settings</a>.</small>
                <div class="actions">
                    <button type="button" class="clear">Clear Key</button>
                    <button type="button" class="cancel">Cancel</button>
                    <button class="save">Save</button>
                </div>
            </form>`
        const input = dialog.querySelector('input')
        input.value = GM_getValue(STORAGE_KEY, '')
        dialog.querySelector('form').onsubmit = event => {
            event.preventDefault()
            const key = input.value.trim()
            if (!key) return input.focus()
            GM_setValue(STORAGE_KEY, key)
            dialog.close()
        }
        dialog.querySelector('.clear').onclick = () => {
            GM_setValue(STORAGE_KEY, '')
            dialog.close()
        }
        dialog.querySelector('.cancel').onclick = () => dialog.close()
        dialog.onclose = () => dialog.remove()
        document.body.append(dialog)
        dialog.showModal()
        input.focus()
    }

    function submitToTorBox(link, key) {
        return new Promise((resolve, reject) => request({
            method: 'POST',
            url: API_URL,
            timeout: 30000,
            headers: {
                Authorization: `Bearer ${key}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: new URLSearchParams({ link }).toString(),
            onload: response => {
                let data
                try { data = JSON.parse(response.responseText) }
                catch { return reject(new Error('TorBox returned an invalid response.')) }
                if (!data || typeof data !== 'object' || Array.isArray(data)) return reject(new Error('TorBox returned an invalid response.'))
                if (response.status >= 200 && response.status < 300 && data.success !== false) resolve()
                else {
                    const error = data.detail || data.error || `TorBox returned HTTP ${response.status}`
                    reject(new Error(typeof error === 'string' ? error : JSON.stringify(error)))
                }
            },
            onerror: () => reject(new Error('Could not reach TorBox.')),
            ontimeout: () => reject(new Error('The TorBox request timed out.'))
        }))
    }

    function createButton(fileId) {
        const item = document.createElement('li')
        item.className = fileId ? 'n2t-file' : ''
        if (!fileId) item.id = 'action-torbox'
        // Keep the href inert so Nexus download-intercepting userscripts ignore it.
        item.innerHTML = `<a class="btn inline-flex show-btn-icon n2t-button" href="#" title="Add to TorBox">
            <svg class="icon" viewBox="300 250 900 1000" aria-hidden="true">
                <path d="M750 308 1133 529v442l-383 221-383-221V529l383-221Zm-383 221 383 221 383-221M750 750v442"
                    fill="none" stroke="currentColor" stroke-width="80" stroke-linecap="round" stroke-linejoin="round"/>
            </svg><span class="flex-label">TorBox</span></a>`
        const button = item.firstElementChild
        button.onclick = async event => {
            event.preventDefault()
            if (button.dataset.busy) return
            const key = GM_getValue(STORAGE_KEY, '')
            if (!key) return openSettings()
            button.dataset.busy = '1'
            const label = button.querySelector('.flex-label')
            label.textContent = 'Sending...'
            try {
                const link = `${location.origin}${location.pathname}${fileId ? `?tab=files&file_id=${encodeURIComponent(fileId)}` : ''}`
                await submitToTorBox(link, key)
                label.textContent = 'Added!'
            } catch (error) {
                label.textContent = 'Error'
                alert(`Nexus2Torbox: ${error.message}`)
            } finally {
                setTimeout(() => {
                    label.textContent = 'TorBox'
                    delete button.dataset.busy
                }, 3000)
            }
        }
        return item
    }

    function addFileButton(entry, fileId) {
        const downloads = entry.matches('dd')
            ? entry.querySelector('ul.accordion-downloads')
            : entry.closest('dt')?.nextElementSibling?.querySelector('ul.accordion-downloads')
        if (!downloads || downloads.querySelector('.n2t-file')) return
        const spacer = [...downloads.children].find(item =>
            item.matches('li') && !item.textContent.trim() && !item.querySelector('a,button'))
        if (spacer) downloads.append(spacer.cloneNode())
        downloads.append(createButton(fileId))
    }

    function addButtons() {
        const actions = document.querySelector('ul.modactions')
        if (actions && !document.querySelector('#action-torbox')) actions.append(createButton())

        document.querySelectorAll('dd[data-id]').forEach(entry => addFileButton(entry, entry.dataset.id))
        document.querySelectorAll('.file-expander-header[data-id]').forEach(entry => addFileButton(entry, entry.dataset.id))
    }

    GM_registerMenuCommand('TorBox API key', openSettings)
    addButtons()
    let timer
    new MutationObserver(() => {
        clearTimeout(timer)
        timer = setTimeout(addButtons, 100)
    }).observe(document.body, { childList: true, subtree: true })
})()
