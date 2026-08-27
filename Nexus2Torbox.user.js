// ==UserScript==
// @name         Nexus2Torbox
// @namespace    Nexus2Torbox
// @version      1.0.0
// @description  Add Nexus Mods downloads to TorBox.
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

    const KEY = 'torboxApiKey'
    const API = 'https://api.torbox.app/v1/api/webdl/createwebdownload'
    const request = typeof GM !== 'undefined' && GM.xmlHttpRequest
        ? GM.xmlHttpRequest.bind(GM) : GM_xmlhttpRequest

    function settings() {
        document.querySelector('#n2t-settings')?.remove()
        const dialog = document.createElement('dialog')
        dialog.id = 'n2t-settings'
        dialog.style.cssText = 'box-sizing:border-box;width:320px;max-width:calc(100vw - 32px);background:#2f2f2f;color:#ddd;border:1px solid #555;border-radius:5px;padding:22px'
        dialog.innerHTML = `
            <form method="dialog" style="display:grid;gap:12px;font:14px Arial,sans-serif">
                <strong style="color:#da8e35;font-size:18px">Nexus2Torbox Settings</strong>
                <label>TorBox API key
                    <input type="password" required autocomplete="off" spellcheck="false" style="box-sizing:border-box;width:100%;margin-top:5px;padding:8px;background:#222;color:#fff;border:1px solid #555">
                </label>
                <small>Available from <a href="https://torbox.app/settings" target="_blank" rel="noopener" style="color:#da8e35">TorBox Settings</a>.</small>
                <div style="display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px">
                    <button type="button" class="clear">Clear key</button><button type="button" class="cancel">Cancel</button><button>Save</button>
                </div>
            </form>`
        const input = dialog.querySelector('input')
        input.value = GM_getValue(KEY, '')
        dialog.querySelector('form').onsubmit = event => {
            event.preventDefault()
            const key = input.value.trim()
            if (!key) return input.focus()
            GM_setValue(KEY, key)
            dialog.close()
        }
        dialog.querySelector('.clear').onclick = () => {
            GM_setValue(KEY, '')
            dialog.close()
        }
        dialog.querySelector('.cancel').onclick = () => dialog.close()
        dialog.onclose = () => dialog.remove()
        document.body.append(dialog)
        dialog.showModal()
        input.focus()
    }

    function submit(link, key) {
        return new Promise((resolve, reject) => request({
            method: 'POST',
            url: API,
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

    function makeButton(id) {
        const item = document.createElement('li')
        item.className = id ? 'n2t-file' : ''
        if (!id) item.id = 'action-torbox'
        item.innerHTML = '<a class="btn inline-flex" href="#" title="Add to TorBox"><span class="flex-label">TorBox</span></a>'
        const button = item.firstElementChild
        button.onclick = async event => {
            event.preventDefault()
            if (button.dataset.busy) return
            const key = GM_getValue(KEY, '')
            if (!key) return settings()
            button.dataset.busy = '1'
            const label = button.querySelector('.flex-label')
            label.textContent = 'Sending...'
            try {
                const link = `${location.origin}${location.pathname}${id ? `?tab=files&file_id=${encodeURIComponent(id)}` : ''}`
                await submit(link, key)
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

    function addFileButton(entry, id) {
        const downloads = entry.matches('dd')
            ? entry.querySelector('ul.accordion-downloads')
            : entry.closest('dt')?.nextElementSibling?.querySelector('ul.accordion-downloads')
        if (!downloads || downloads.querySelector('.n2t-file')) return
        downloads.append(makeButton(id))
    }

    function addButtons() {
        const actions = document.querySelector('ul.modactions')
        if (actions && !document.querySelector('#action-torbox')) actions.append(makeButton())

        document.querySelectorAll('dd[data-id]').forEach(entry => addFileButton(entry, entry.dataset.id))
        document.querySelectorAll('.file-expander-header[data-id]').forEach(entry => addFileButton(entry, entry.dataset.id))
    }

    GM_registerMenuCommand('TorBox API key', settings)
    addButtons()
    let timer
    new MutationObserver(() => {
        clearTimeout(timer)
        timer = setTimeout(addButtons, 100)
    }).observe(document.body, { childList: true, subtree: true })
})()
