'use client'

import { useEffect, useState } from 'react'

interface AudioInputSelectorProps { value: string; onChange: (deviceId: string) => void }

export function AudioInputSelector({ value, onChange }: AudioInputSelectorProps) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [error, setError] = useState(false)

  const refresh = async () => {
    try {
      const list = await navigator.mediaDevices?.enumerateDevices()
      setDevices((list ?? []).filter(device => device.kind === 'audioinput'))
      setError(false)
    } catch { setError(true) }
  }

  useEffect(() => { refresh(); navigator.mediaDevices?.addEventListener('devicechange', refresh); return () => navigator.mediaDevices?.removeEventListener('devicechange', refresh) }, [])

  return (
    <label data-testid="audio-input-selector" className="flex min-w-[180px] flex-col gap-1 font-mono text-[8px] uppercase tracking-wider text-on-surface-variant/45">
      Input device
      <select value={value} onChange={e => onChange(e.target.value)} onFocus={refresh} className="rounded-lg border border-outline-variant/15 bg-surface-container-low px-2 py-1.5 text-[10px] normal-case tracking-normal text-on-surface outline-none">
        <option value="">Default microphone / interface</option>
        {devices.map(device => <option key={device.deviceId} value={device.deviceId}>{device.label || `Audio input ${device.deviceId.slice(0, 6)}`}</option>)}
      </select>
      {error && <span className="normal-case tracking-normal text-red-300/70">Input devices unavailable</span>}
    </label>
  )
}
