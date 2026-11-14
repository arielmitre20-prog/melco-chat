import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseTitleUnread } from '../src/shared/unread.ts'
import { CATALOG, resolveUrl } from '../src/shared/catalog.ts'

test('parses unread counts from common title formats', () => {
  assert.deepEqual(parseTitleUnread('(3) WhatsApp'), { count: 3, indirect: false })
  assert.deepEqual(parseTitleUnread('Inbox (1,204) - me@gmail.com - Gmail'), { count: 1204, indirect: false })
  assert.deepEqual(parseTitleUnread('[12] Element'), { count: 12, indirect: false })
  assert.deepEqual(parseTitleUnread('(99+) Discord'), { count: 99, indirect: false })
  assert.deepEqual(parseTitleUnread('• Slack | general'), { count: 0, indirect: true })
  assert.deepEqual(parseTitleUnread('ChatGPT'), { count: 0, indirect: false })
  assert.deepEqual(parseTitleUnread('(0) Telegram'), { count: 0, indirect: false })
})

test('catalog ids are unique and URLs are https or templates', () => {
  const ids = CATALOG.map((s) => s.id)
  assert.equal(new Set(ids).size, ids.length)
  for (const s of CATALOG) {
    if (s.template) assert.ok(s.url.includes('{workspace}'), s.id)
    else assert.match(s.url, /^https:\/\//, s.id)
    assert.match(s.color, /^#[0-9a-f]{6}$/i, s.id)
  }
})

test('the four core AI chats are present', () => {
  for (const id of ['chatgpt', 'claude', 'gemini', 'venice']) {
    assert.equal(CATALOG.find((s) => s.id === id)?.status, 'core', id)
  }
})

test('template URLs resolve from bare values or full URLs', () => {
  const get = (id: string) => CATALOG.find((s) => s.id === id)!
  assert.equal(resolveUrl(get('slack'), 'my-team'), 'https://my-team.slack.com/')
  assert.equal(resolveUrl(get('mattermost'), 'https://chat.example.com/'), 'https://chat.example.com/')
  assert.equal(resolveUrl(get('custom'), 'app.example.com/x'), 'https://app.example.com/x')
  assert.equal(resolveUrl(get('chatgpt')), 'https://chatgpt.com/')
})
