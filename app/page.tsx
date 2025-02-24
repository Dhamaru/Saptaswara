import { Metadata } from "next"
import { Studio } from "@/components/studio"

export const metadata: Metadata = {
  title: "Saptaswara - Music Creation Studio",
  description: "Create and record music with virtual instruments",
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Studio />
    </div>
  )
}