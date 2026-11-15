import type { CatalogService, Category } from './types'

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'ai', label: 'AI Chats' },
  { id: 'messaging', label: 'Messaging' },
  { id: 'email', label: 'Email & Calendar' },
  { id: 'work', label: 'Work & Productivity' },
  { id: 'social', label: 'Social' },
  { id: 'media', label: 'Media' },
  { id: 'custom', label: 'Custom' }
]

type Entry = Omit<CatalogService, 'unread' | 'status'> &
  Partial<Pick<CatalogService, 'unread' | 'status'>>

const ai = (e: Omit<Entry, 'category'>): CatalogService => ({
  unread: 'none',
  status: 'candidate',
  ...e,
  category: 'ai'
})
const svc = (category: Category, e: Omit<Entry, 'category'>): CatalogService => ({
  unread: 'title',
  status: 'core',
  ...e,
  category
})

export const CATALOG: CatalogService[] = [
  // ── AI chats ─────────────────────────────────────────────────────────────
  ai({ id: 'chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com/', color: '#10a37f', status: 'core', description: 'OpenAI' }),
  ai({ id: 'claude', name: 'Claude', url: 'https://claude.ai/', color: '#d97757', status: 'core', description: 'Anthropic' }),
  ai({ id: 'gemini', name: 'Gemini', url: 'https://gemini.google.com/app', color: '#4285f4', status: 'core', description: 'Google' }),
  ai({ id: 'venice', name: 'Venice', url: 'https://venice.ai/chat', color: '#c4452f', status: 'core', description: 'Private, uncensored AI' }),
  ai({ id: 'perplexity', name: 'Perplexity', url: 'https://www.perplexity.ai/', color: '#20808d', description: 'Answer engine' }),
  ai({ id: 'grok', name: 'Grok', url: 'https://grok.com/', color: '#111111', description: 'xAI' }),
  ai({ id: 'copilot', name: 'Microsoft Copilot', url: 'https://copilot.microsoft.com/', color: '#0f6cbd', description: 'Microsoft (consumer)' }),
  ai({ id: 'm365copilot', name: 'Microsoft 365 Copilot', url: 'https://m365.cloud.microsoft/chat', color: '#5b5fc7', description: 'Microsoft (work/school)' }),
  ai({ id: 'lechat', name: 'Le Chat', url: 'https://chat.mistral.ai/', color: '#fa520f', description: 'Mistral AI' }),
  ai({ id: 'deepseek', name: 'DeepSeek', url: 'https://chat.deepseek.com/', color: '#4d6bfe', description: 'DeepSeek' }),
  ai({ id: 'metaai', name: 'Meta AI', url: 'https://www.meta.ai/', color: '#0866ff', description: 'Meta' }),
  ai({ id: 'qwen', name: 'Qwen Chat', url: 'https://chat.qwen.ai/', color: '#615ced', description: 'Alibaba' }),
  ai({ id: 'kimi', name: 'Kimi', url: 'https://www.kimi.com/', color: '#1f1f1f', description: 'Moonshot AI' }),
  ai({ id: 'zai', name: 'Z.ai', url: 'https://chat.z.ai/', color: '#2d2d2d', description: 'Zhipu GLM' }),
  ai({ id: 'poe', name: 'Poe', url: 'https://poe.com/', color: '#5d5cde', description: 'Many models, one account' }),
  ai({ id: 'huggingchat', name: 'HuggingChat', url: 'https://huggingface.co/chat/', color: '#ffbd45', description: 'Open models' }),
  ai({ id: 'openrouter', name: 'OpenRouter Chat', url: 'https://openrouter.ai/chat', color: '#6467f2', description: 'Bring-your-own-model chat' }),
  ai({ id: 'duckai', name: 'Duck.ai', url: 'https://duck.ai/', color: '#de5833', description: 'DuckDuckGo private AI chat' }),
  ai({ id: 'lmarena', name: 'LMArena', url: 'https://lmarena.ai/', color: '#2b2b2b', description: 'Compare models side by side' }),
  ai({ id: 't3chat', name: 'T3 Chat', url: 'https://t3.chat/', color: '#a3004c', description: 'Fast multi-model chat' }),
  ai({ id: 'notebooklm', name: 'NotebookLM', url: 'https://notebooklm.google.com/', color: '#1a73e8', description: 'Google research notebooks' }),
  ai({ id: 'aistudio', name: 'Google AI Studio', url: 'https://aistudio.google.com/', color: '#1e8e3e', description: 'Gemini playground' }),
  ai({ id: 'githubcopilot', name: 'GitHub Copilot Chat', url: 'https://github.com/copilot', color: '#24292f', description: 'GitHub' }),
  ai({ id: 'pi', name: 'Pi', url: 'https://pi.ai/', color: '#2f4f3f', description: 'Inflection' }),
  ai({ id: 'characterai', name: 'Character.AI', url: 'https://character.ai/', color: '#18181b', description: 'Character chats' }),
  ai({ id: 'youcom', name: 'You.com', url: 'https://you.com/', color: '#6c47ff', description: 'Search + chat' }),
  ai({ id: 'manus', name: 'Manus', url: 'https://manus.im/app', color: '#34322d', description: 'Agentic assistant' }),

  // ── Messaging ────────────────────────────────────────────────────────────
  svc('messaging', { id: 'whatsapp', name: 'WhatsApp', url: 'https://web.whatsapp.com/', color: '#25d366' }),
  svc('messaging', { id: 'telegram', name: 'Telegram', url: 'https://web.telegram.org/a/', color: '#2aabee' }),
  svc('messaging', { id: 'slack', name: 'Slack', url: 'https://{workspace}.slack.com/', color: '#4a154b', template: { label: 'Workspace', placeholder: 'my-team' } }),
  svc('messaging', { id: 'discord', name: 'Discord', url: 'https://discord.com/app', color: '#5865f2' }),
  svc('messaging', { id: 'messenger', name: 'Messenger', url: 'https://www.messenger.com/', color: '#0866ff' }),
  svc('messaging', { id: 'teams', name: 'Microsoft Teams', url: 'https://teams.microsoft.com/v2/', color: '#5b5fc7' }),
  svc('messaging', { id: 'googlechat', name: 'Google Chat', url: 'https://chat.google.com/', color: '#00ac47' }),
  svc('messaging', { id: 'googlemessages', name: 'Google Messages', url: 'https://messages.google.com/web', color: '#1a73e8' }),
  svc('messaging', { id: 'element', name: 'Element', url: 'https://app.element.io/', color: '#0dbd8b' }),
  svc('messaging', { id: 'instagram', name: 'Instagram DMs', url: 'https://www.instagram.com/direct/inbox/', color: '#e1306c' }),
  svc('messaging', { id: 'linkedin', name: 'LinkedIn Messaging', url: 'https://www.linkedin.com/messaging/', color: '#0a66c2' }),
  svc('messaging', { id: 'wechat', name: 'WeChat', url: 'https://web.wechat.com/', color: '#07c160', status: 'candidate' }),
  svc('messaging', { id: 'wire', name: 'Wire', url: 'https://app.wire.com/', color: '#0667c8', status: 'candidate' }),
  svc('messaging', { id: 'zalo', name: 'Zalo', url: 'https://chat.zalo.me/', color: '#0068ff', status: 'candidate' }),
  svc('messaging', { id: 'webex', name: 'Webex', url: 'https://web.webex.com/', color: '#00bceb', status: 'candidate' }),
  svc('messaging', { id: 'mattermost', name: 'Mattermost', url: 'https://{workspace}/', color: '#1e325c', template: { label: 'Server host', placeholder: 'chat.example.com' } }),
  svc('messaging', { id: 'rocketchat', name: 'Rocket.Chat', url: 'https://{workspace}/', color: '#f5455c', template: { label: 'Server host', placeholder: 'chat.example.com' } }),
  svc('messaging', { id: 'zulip', name: 'Zulip', url: 'https://{workspace}.zulipchat.com/', color: '#6492fe', template: { label: 'Organization', placeholder: 'my-org' } }),

  // ── Email & calendar ─────────────────────────────────────────────────────
  svc('email', { id: 'gmail', name: 'Gmail', url: 'https://mail.google.com/mail/u/0/', color: '#ea4335' }),
  svc('email', { id: 'gcal', name: 'Google Calendar', url: 'https://calendar.google.com/', color: '#4285f4', unread: 'none' }),
  svc('email', { id: 'outlook', name: 'Outlook', url: 'https://outlook.live.com/mail/', color: '#0f6cbd' }),
  svc('email', { id: 'outlook365', name: 'Outlook (Microsoft 365)', url: 'https://outlook.office.com/mail/', color: '#0f6cbd' }),
  svc('email', { id: 'proton', name: 'Proton Mail', url: 'https://mail.proton.me/', color: '#6d4aff' }),
  svc('email', { id: 'tuta', name: 'Tuta', url: 'https://app.tuta.com/', color: '#850122' }),
  svc('email', { id: 'fastmail', name: 'Fastmail', url: 'https://app.fastmail.com/', color: '#0067b9' }),
  svc('email', { id: 'icloudmail', name: 'iCloud Mail', url: 'https://www.icloud.com/mail', color: '#3693f3' }),
  svc('email', { id: 'yahoomail', name: 'Yahoo Mail', url: 'https://mail.yahoo.com/', color: '#6001d2' }),
  svc('email', { id: 'zohomail', name: 'Zoho Mail', url: 'https://mail.zoho.com/', color: '#e42527' }),
  svc('email', { id: 'hey', name: 'HEY', url: 'https://app.hey.com/', color: '#5522fa', status: 'candidate' }),

  // ── Work & productivity ──────────────────────────────────────────────────
  svc('work', { id: 'notion', name: 'Notion', url: 'https://www.notion.so/', color: '#191919', unread: 'none' }),
  svc('work', { id: 'linear', name: 'Linear', url: 'https://linear.app/', color: '#5e6ad2' }),
  svc('work', { id: 'github', name: 'GitHub', url: 'https://github.com/notifications', color: '#24292f', unread: 'none' }),
  svc('work', { id: 'gitlab', name: 'GitLab', url: 'https://gitlab.com/dashboard/todos', color: '#fc6d26', unread: 'none' }),
  svc('work', { id: 'jira', name: 'Jira', url: 'https://{workspace}.atlassian.net/jira', color: '#0c66e4', unread: 'none', template: { label: 'Site', placeholder: 'my-company' } }),
  svc('work', { id: 'asana', name: 'Asana', url: 'https://app.asana.com/', color: '#f06a6a', unread: 'none' }),
  svc('work', { id: 'trello', name: 'Trello', url: 'https://trello.com/', color: '#0c66e4', unread: 'none' }),
  svc('work', { id: 'clickup', name: 'ClickUp', url: 'https://app.clickup.com/', color: '#7b68ee', unread: 'none' }),
  svc('work', { id: 'todoist', name: 'Todoist', url: 'https://app.todoist.com/', color: '#e44332', unread: 'none' }),
  svc('work', { id: 'mstodo', name: 'Microsoft To Do', url: 'https://to-do.office.com/tasks/', color: '#2564cf', unread: 'none' }),
  svc('work', { id: 'figma', name: 'Figma', url: 'https://www.figma.com/files/', color: '#a259ff', unread: 'none' }),
  svc('work', { id: 'gdrive', name: 'Google Drive', url: 'https://drive.google.com/', color: '#1fa463', unread: 'none' }),
  svc('work', { id: 'keep', name: 'Google Keep', url: 'https://keep.google.com/', color: '#fbbc04', unread: 'none' }),

  // ── Social ───────────────────────────────────────────────────────────────
  svc('social', { id: 'x', name: 'X', url: 'https://x.com/home', color: '#000000' }),
  svc('social', { id: 'bluesky', name: 'Bluesky', url: 'https://bsky.app/', color: '#1185fe' }),
  svc('social', { id: 'mastodon', name: 'Mastodon', url: 'https://{workspace}/', color: '#6364ff', template: { label: 'Instance', placeholder: 'mastodon.social' } }),
  svc('social', { id: 'threads', name: 'Threads', url: 'https://www.threads.com/', color: '#000000' }),
  svc('social', { id: 'reddit', name: 'Reddit', url: 'https://www.reddit.com/', color: '#ff4500' }),
  svc('social', { id: 'facebook', name: 'Facebook', url: 'https://www.facebook.com/', color: '#0866ff' }),

  // ── Media ────────────────────────────────────────────────────────────────
  svc('media', { id: 'ytmusic', name: 'YouTube Music', url: 'https://music.youtube.com/', color: '#ff0000', unread: 'none' }),
  svc('media', { id: 'youtube', name: 'YouTube', url: 'https://www.youtube.com/', color: '#ff0000', unread: 'none' }),
  svc('media', {
    id: 'spotify', name: 'Spotify', url: 'https://open.spotify.com/', color: '#1db954', unread: 'none', status: 'candidate',
    note: 'Playback needs Widevine DRM, which stock Electron does not ship. Browsing works; playback may not.'
  }),

  // ── Custom ───────────────────────────────────────────────────────────────
  svc('custom', { id: 'custom', name: 'Custom web app', url: '{workspace}', color: '#8e8e93', template: { label: 'URL', placeholder: 'https://app.example.com' } })
]

export const getService = (id: string): CatalogService | undefined => CATALOG.find((s) => s.id === id)

/** Fill a template URL. Accepts a bare host or a full URL for host-style templates. */
export function resolveUrl(service: CatalogService, value?: string): string {
  if (!service.template) return service.url
  let v = (value ?? '').trim()
  if (service.url === '{workspace}') {
    if (!/^https?:\/\//i.test(v)) v = `https://${v}`
    return v
  }
  v = v.replace(/^https?:\/\//i, '').replace(/\/+$/, '')
  return service.url.replace('{workspace}', v)
}
