import { redirect } from 'next/navigation'

/**
 * Workspace redirect
 * The main creation logic is hosted at /studio.
 * This ensures the page is a valid module for Vercel builds.
 */
export default function WorkspacePage() {
  redirect('/studio')
}
