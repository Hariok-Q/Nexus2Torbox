// ==UserScript==
// @name         Nexus2Torbox
// @namespace    Nexus2Torbox
// @version      1.0.0
// @description  Add Nexus Mods downloads to TorBox.
// @match        https://www.nexusmods.com/*/mods/*
// @run-at       document-idle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @connect      api.torbox.app
// ==/UserScript==

(() => {
    'use strict'

    const KEY = 'torboxApiKey'
    const API = 'https://api.torbox.app/v1/api/webdl/createwebdownload'

    function settings() {
        document.querySelector('#n2t-settings')?.remove()
        const dialog = document.createElement('dialog')
        dialog.id = 'n2t-settings'
        dialog.style.cssText = 'background:#2f2f2f;color:#ddd;border:1px solid #555;border-radius:5px;padding:22px;min-width:320px'
        dialog.innerHTML = `
            <form method="dialog" style="display:grid;gap:12px;font:14px Arial,sans-serif">
                <strong style="color:#da8e35;font-size:18px">Nexus2Torbox Settings</strong>
                <label>TorBox API key
                    <input type="password" style="box-sizing:border-box;width:100%;margin-top:5px;padding:8px;background:#222;color:#fff;border:1px solid #555">
                </label>
                <small>Available from <a href="https://torbox.app/settings" target="_blank" style="color:#da8e35">TorBox Settings</a>.</small>
                <div style="display:flex;justify-content:flex-end;gap:8px">
                    <button value="cancel">Cancel</button><button type="button" class="save">Save</button>
                </div>
            </form>`
        const input = dialog.querySelector('input')
        input.value = GM_getValue(KEY, '')
        dialog.querySelector('.save').onclick = () => {
            GM_setValue(KEY, input.value.trim())
            dialog.close()
        }
        dialog.onclose = () => dialog.remove()
        document.body.append(dialog)
        dialog.showModal()
        input.focus()
    }

    function submit(link) {
        const key = GM_getValue(KEY, '')
        if (!key) {
            settings()
            return Promise.reject(new Error('Set your TorBox API key first.'))
        }
        return new Promise((resolve, reject) => GM_xmlhttpRequest({
            method: 'POST',
            url: API,
            headers: {
                Authorization: `Bearer ${key}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: new URLSearchParams({ link }).toString(),
            onload: response => {
                let data = {}
                try { data = JSON.parse(response.responseText) } catch {}
                if (response.status >= 200 && response.status < 300 && data.success !== false) resolve()
                else reject(new Error(data.detail || data.error || `TorBox returned HTTP ${response.status}`))
            },
            onerror: () => reject(new Error('Could not reach TorBox.')),
            ontimeout: () => reject(new Error('The TorBox request timed out.'))
        }))
    }

    function makeButton(link, id) {
        const item = document.createElement('li')
        item.className = id ? 'n2t-file' : ''
        if (!id) item.id = 'action-torbox'
        item.innerHTML = '<a class="btn inline-flex" href="#" title="Add to TorBox"><span class="flex-label">TorBox</span></a>'
        const button = item.firstElementChild
        button.onclick = async event => {
            event.preventDefault()
            if (button.dataset.busy) return
            button.dataset.busy = '1'
            const label = button.querySelector('.flex-label')
            label.textContent = 'Sending...'
            try {
                await submit(link)
                label.textContent = 'Added!'
            } catch (error) {
                label.textContent = 'Error'
                if (GM_getValue(KEY, '')) alert(`Nexus2Torbox: ${error.message}`)
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
        const link = `${location.origin}${location.pathname}?tab=files&file_id=${encodeURIComponent(id)}`
        downloads.append(makeButton(link, id))
    }

    function addButtons() {
        const manual = document.querySelector('#action-manual')
        if (manual && !document.querySelector('#action-torbox'))
            manual.after(makeButton(`${location.origin}${location.pathname}`))

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
