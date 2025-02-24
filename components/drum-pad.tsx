"use client"

import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"

interface DrumPadProps {
  audioContext: AudioContext | null
}

const DRUM_SAMPLES = [
  { name: "Kick", key: "1", url: "/samples/kick.wav" },
  { name: "Snare", key: "2", url: "/samples/snare.wav" },
  { name: "Hi-Hat", key: "3", url: "/samples/hihat.wav" },
  { name: "Tom", key: "4", url: "/samples/tom.wav" },
  { name: "Clap", key: "5", url: "/samples/clap.wav" },
  { name: "Rim", key: "6", url: "/samples/rim.wav" },
  { name: "Cymbal", key: "7", url: "/samples/cymbal.wav" },
  { name: "Perc", key: "8", url: "/samples/perc.wav" },
]

export function DrumPad({ audioContext }: DrumPadProps) {
  const samplesRef = useRef<{ [key: string]: AudioBuffer }>({})

  useEffect(() => {
    if (!audioContext) return

    DRUM_SAMPLES.forEach(async (sample) => {
      try {
        const response = await fetch(sample.url)
        const arrayBuffer = await response.arrayBuffer()
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
        samplesRef.current[sample.name] = audioBuffer
      } catch (error) {
        console.error(`Failed to load sample: ${sample.name}`)
      }
    })
  }, [audioContext])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const sample = DRUM_SAMPLES.find(s => s.key === e.key)
      if (sample) {
        playDrum(sample.name)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [audioContext])

  const playDrum = (name: string) => {
    if (!audioContext || !samplesRef.current[name]) return

    const source = audioContext.createBufferSource()
    source.buffer = samplesRef.current[name]
    source.connect(audioContext.destination)
    source.start()
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <h2 className="text-lg font-semibold mb-4">Drum Machine</h2>
      <div className="grid grid-cols-4 gap-2">
        {DRUM_SAMPLES.map((sample) => (
          <Button
            key={sample.name}
            variant="outline"
            className="h-24 text-center"
            onMouseDown={() => playDrum(sample.name)}
          >
            <div className="flex flex-col items-center gap-2">
              <span>{sample.name}</span>
              <span className="text-xs text-muted-foreground">
                Key: {sample.key}
              </span>
            </div>
          </Button>
        ))}
      </div>
    </div>
  )
}
