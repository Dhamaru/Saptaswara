import { NextResponse } from 'next/server'
import { z } from 'zod'
import MidiWriter from 'midi-writer-js'
import { createClient } from '@supabase/supabase-js'

const LayerSchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string(),
  sequence: z.array(z.any()),
  visible: z.boolean().optional(),
  muted: z.boolean().optional(),
})

const MidiExportSchema = z.object({
  composition: z.object({
    layers: z.array(LayerSchema).min(1, 'layers must have at least 1 element'),
    bpm: z.number().min(60).max(200),
    name: z.string().min(1, 'name must not be empty'),
  }),
})

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: userData, error: authError } = await authClient.auth.getUser(token)
    if (authError || !userData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = MidiExportSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }
    const { composition } = parsed.data
    const { layers, bpm, name } = composition

    const tracks = layers.map(layer => {
      const track = new MidiWriter.Track()
      track.setTempo(bpm)
      const activeSteps = layer.sequence.filter(s => s !== null && s !== undefined)
      if (activeSteps.length === 0) {
        track.addEvent(new MidiWriter.NoteEvent({ pitch: ['C4'], duration: '1' }))
        return track
      }
      layer.sequence.forEach((step: any) => {
        if (step && step.frequency) {
          const midiNote = Math.round(12 * Math.log2(step.frequency / 440) + 69)
          const clampedNote = Math.max(0, Math.min(127, midiNote))
          track.addEvent(new MidiWriter.NoteEvent({ pitch: [clampedNote], duration: '4' }))
        } else {
          track.addEvent(new MidiWriter.NoteEvent({ pitch: ['C4'], duration: '4', velocity: 0 }))
        }
      })
      return track
    })

    const writer = new MidiWriter.Writer(tracks)
    const midiBuffer = Buffer.from(writer.buildFile())
    const safeName = name.replace(/[^a-zA-Z0-9_\- ]/g, '').slice(0, 50) || 'composition'

    return new Response(midiBuffer, {
      headers: {
        'Content-Type': 'audio/midi',
        'Content-Disposition': `attachment; filename="${safeName}.mid"`,
      },
    })
  } catch (error) {
    console.error('MIDI export error:', error) // intentional
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
